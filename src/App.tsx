import React from "react";
import "./App.css";
import CaseMap from "./CaseMap";
import Header from "./Header";
import distance from "@turf/distance";
import centerOfMass from "@turf/center-of-mass";
import centroid from "@turf/centroid";
import { point, polygon } from "@turf/helpers";
import { decode } from "geobuf";
import Pbf from "pbf";
import Loading from "./Loading";

type AppProps = {};

type ViewPort = {
  latitude: number;
  longitude: number;
  zoom: number;
};

export type PostcodeDict = Map<
  string,
  { centre: [number, number]; names: string[] }
>;

export type PostcodeDistanceDict = Map<string, number>;

type AppState = {
  mapData?: GeoJSON.FeatureCollection;
  mapDataLoaded: boolean;
  mapInitialised: boolean;
  viewport: ViewPort;
  range: number;
  centreCoordinates?: [number, number];
  centrePostCode?: string;
  postcodeDict: PostcodeDict;
  postcodeDistanceDict: PostcodeDistanceDict;
  distancesDirty: boolean;
};

class App extends React.Component<AppProps, AppState> {
  constructor(props: AppProps) {
    super(props);

    this.state = {
      viewport: {
        latitude: -33.89668,
        longitude: 151.20638,
        zoom: 12,
      },
      mapDataLoaded: false,
      range: 1,
      mapInitialised: false,
      postcodeDict: new Map(),
      postcodeDistanceDict: new Map(),
      distancesDirty: false,
    };
  }

  componentDidMount() {
    let url = process.env.REACT_APP_DATA_URL;
    if (url === undefined) {
      throw new Error("data source URL not defined");
    }
    fetch(url)
      .then((response) => response.arrayBuffer())
      .then((result) => {
        let decoded = decode(new Pbf(result));

        if (decoded.type === "FeatureCollection") {
          this.compute_centres(decoded);
          console.log("unsetting distances");
          this.computeUnsetDistances(decoded);
          this.setState({ mapData: decoded, mapDataLoaded: true });

          if (
            this.state.centrePostCode &&
            this.state.postcodeDict.has(this.state.centrePostCode)
          ) {
            const from = this.state.postcodeDict.get(this.state.centrePostCode)
              ?.centre;
            if (from !== undefined) {
              this.setState({ centreCoordinates: from });
              this.compute_distances(decoded, from);
            }
          }
        }
      })
      .catch((e) => {
        this.setState(() => {
          throw new Error("Network error");
        });
      });
  }

  handleRangeChange = (newRange: number) => {
    this.setState({ range: newRange });
  };

  onMapInitialised = () => {
    this.setState({ mapInitialised: true });
  };

  render() {
    const loading = !(this.state.mapDataLoaded && this.state.mapInitialised);
    return (
      <div className="App">
        <div
          className={
            loading ? "loading-container" : " loading-container hidden"
          }
        >
          <Loading></Loading>
        </div>
        <div className={loading ? "hidden main-container" : "main-container"}>
          <CaseMap
            onMapInitialised={this.onMapInitialised}
            homeLongLat={this.state.centreCoordinates}
            mapData={this.state.mapData}
            range={this.state.range}
            mapDataLoaded={this.state.mapDataLoaded}
            distancesDirty={this.state.distancesDirty}
            updatePostcode={this.updatePostcode}
            postcodeDistanceDict={this.state.postcodeDistanceDict}
            clearDirty={() => {
              this.setState({ distancesDirty: false });
            }}
          ></CaseMap>
          <Header
            updatePostcode={this.updatePostcode}
            numCases={this.countCases(
              this.state.range,
              this.state.postcodeDistanceDict,
              this.state.mapData
            )}
            range={this.state.range}
            loaded={this.state.mapDataLoaded}
            updateRange={this.handleRangeChange}
            postcode={this.state.centrePostCode}
            postcodeDict={this.state.postcodeDict}
          ></Header>
        </div>
      </div>
    );
  }

  updatePostcode = (newPostCode: string | undefined) => {
    this.setState({ centrePostCode: newPostCode });

    if (newPostCode === undefined) {
      this.computeUnsetDistances(this.state.mapData);
      this.setState({ centreCoordinates: undefined });
    } else {
      const new_centre = this.state.postcodeDict.get(newPostCode)?.centre;

      if (this.state.mapData !== undefined && new_centre !== undefined) {
        this.compute_distances(this.state.mapData, new_centre, newPostCode);
        this.setState({ centreCoordinates: new_centre });
      }
    }
  };

  countCases(
    range: number,
    distances: PostcodeDistanceDict,
    mapData?: GeoJSON.FeatureCollection
  ): number {
    if (mapData === undefined) {
      return -1;
    }
    let count = 0;
    mapData.features.forEach((feature) => {
      if (feature.properties != null) {
        const distance = distances.get(feature.id as string);
        if (distance !== undefined && distance <= range) {
          count += feature.properties.cases;
        }
      }
    });
    return count;
  }

  compute_centres = (mapData: GeoJSON.FeatureCollection) => {
    mapData.features.forEach((feature) => {
      if (feature.properties !== null) {
        const names: string[] = feature.properties.names;
        const num_suburbs_to_show = 4;
        if (names.length <= num_suburbs_to_show) {
          feature.properties.names_string = names.join(", ");
        } else {
          const remainder = names.length - num_suburbs_to_show;
          const names_string = `${names
            .slice(undefined, num_suburbs_to_show)
            .join(", ")} and ${names.length - num_suburbs_to_show} more suburb${
            remainder > 1 ? "s" : ""
          }`;
          feature.properties.names_string = names_string;
        }
      }

      if (feature.geometry.type === "Polygon" && feature.properties !== null) {
        const centre = centerOfMass(polygon(feature.geometry.coordinates))
          .geometry.coordinates;
        feature.properties.centre_lng = centre[0];
        feature.properties.centre_lat = centre[1];
      } else if (
        feature.geometry.type === "MultiPolygon" &&
        feature.properties !== null
      ) {
        if (feature.properties !== null) {
          const centre = centroid(feature.geometry).geometry.coordinates;
          feature.properties.centre_lng = centre[0];
          feature.properties.centre_lat = centre[1];
        }
      } else {
        console.error("unknown shape");
      }
      if (feature.properties !== null) {
        const postcode = feature.id as string;
        const centre: [number, number] = [
          feature.properties.centre_lng,
          feature.properties.centre_lat,
        ];
        const names = feature.properties.names;
        this.state.postcodeDict.set(postcode, {
          centre,
          names,
        });
      }
    });
  };

  computeUnsetDistances = (mapData?: GeoJSON.FeatureCollection) => {
    if (mapData === undefined) {
      return;
    }
    mapData.features.forEach((feature) => {
      if (feature.properties !== null) {
        const code = feature.id as string;
        this.state.postcodeDistanceDict.set(code, 2000);
      }
    });
    this.setState({ distancesDirty: true });
  };

  compute_distances = (
    mapData: GeoJSON.FeatureCollection,
    fromCoords: [number, number],
    centrePostcode?: string
  ) => {
    console.log("recomputing distances");
    const from = point(fromCoords);
    mapData.features.forEach((feature) => {
      if (feature.geometry.type === "Polygon" && feature.properties !== null) {
        const points = feature.geometry.coordinates[0];
        let min_distance = Number.MAX_VALUE;
        points.forEach((position) => {
          const to = point([position[0], position[1]]);
          const distance_between = distance(from, to);
          if (distance_between < min_distance) {
            min_distance = distance_between;
          }
        });
        const code = feature.id as string;
        this.state.postcodeDistanceDict.set(code, min_distance);
      } else if (
        feature.geometry.type === "MultiPolygon" &&
        feature.properties !== null
      ) {
        let min_distance = Number.MAX_VALUE;
        feature.geometry.coordinates.forEach((points) => {
          points[0].forEach((position) => {
            const to = point([position[0], position[1]]);
            const distance_between = distance(from, to);
            if (distance_between < min_distance) {
              min_distance = distance_between;
            }
          });
        });
        const code = feature.id as string;
        this.state.postcodeDistanceDict.set(code, min_distance);
      } else {
        console.error("unknown shape");
      }
      if (feature.properties !== null) {
        if (centrePostcode !== undefined && feature.id === centrePostcode) {
          this.state.postcodeDistanceDict.set(centrePostcode, 0);
        }
      }
    });
    this.setState({ distancesDirty: true });
  };
}
export default App;
