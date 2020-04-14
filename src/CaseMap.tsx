import React from "react";
import "./App.css";
import mapboxgl, { Map, Point, GeoJSONSource } from "mapbox-gl";
import { PostcodeDistanceDict } from "./App";

type MapProps = {
  range: number;
  mapDataLoaded: boolean;
  mapData?: GeoJSON.FeatureCollection;
  homeLongLat?: [number, number];
  onMapInitialised: () => void;
  distancesDirty: boolean;
  clearDirty: () => void;
  postcodeDistanceDict: PostcodeDistanceDict;
  updatePostcode: (newPostCode: string | undefined) => void;
};

type MapState = {
  longitude: number;
  latitude: number;
  zoom: number;
};

const mapbox_token = process.env["REACT_APP_MAPBOX_TOKEN"];
if (mapbox_token === undefined) {
  console.error("Missing mapbox token env variable");
} else {
  mapboxgl.accessToken = mapbox_token;
}

class CaseMap extends React.Component<MapProps, MapState> {
  private mapContainer: any;
  private map?: Map;
  private metresPerPixel?: number;

  constructor(props: MapProps) {
    super(props);
    this.state = {
      latitude: -33.89668,
      longitude: 151.20638,
      zoom: 12,
    };
  }

  componentDidMount() {
    this.map = new mapboxgl.Map({
      container: this.mapContainer,
      style: "mapbox://styles/declanjscott/ck8liewzy0orf1ins6tbyuicr/draft",
      center: [this.state.longitude, this.state.latitude],
      zoom: this.state.zoom,
    });
    this.map.on("load", this.onLoadMap);
  }

  setupPopup = () => {
    var popup = new mapboxgl.Popup({
      className: "tooltip",
      closeButton: false,
      maxWidth: "none",
      closeOnClick: false,
    });
    var id: string | undefined = undefined;

    if (this.map) {
      const map = this.map;
      map.on("click", function (e) {
        var features = map.queryRenderedFeatures(e.point, {
          layers: ["suburb-backgrounds"],
        });
        var feature = features[0];
        var newId = feature === undefined ? undefined : (feature.id as string);
        if ((id === newId && popup.isOpen()) || newId === undefined) {
          id = newId;
          popup.remove();
          return;
        }
        id = newId;
        let prop = feature.properties;

        if (
          prop != null &&
          prop.cases != null &&
          prop.centre_lng != null &&
          prop.centre_lat != null
        ) {
          let latlong = {
            lng: Number(prop.centre_lng),
            lat: Number(prop.centre_lat),
          };
          const html = `
            <div class=tooltip-content><strong>${prop.names_string}</strong>: ${prop.cases} cases</div>
          `;
          popup.setLngLat(latlong).setHTML(html).addTo(map);
        }
      });
    }
  };

  addDataLayers = () => {
    this.map?.addLayer({
      id: "range-ring",
      source: "home-loc",
      type: "circle",
      paint: {
        "circle-radius": 50,
        "circle-opacity": 0.6,
        "circle-radius-transition": {
          duration: 300,
          delay: 0,
        },
        "circle-color": "#137cbd",
        "circle-stroke-color": "#48AFF0",
        "circle-stroke-width": 3,
      },
    });

    this.map?.addLayer(
      {
        id: "suburb-outlines",
        source: "nsw-data",
        type: "line",
        paint: {
          "line-color": "#454545",
          "line-width": 3,
        },
      },
      "range-ring"
    );
    this.map?.addLayer(
      {
        id: "suburb-backgrounds",
        source: "nsw-data",
        type: "fill",
        paint: {
          "fill-opacity": 0,
          "fill-opacity-transition": {
            duration: 300,
            delay: 0,
          },
          "fill-color": "#0074D9",
        },
      },
      "suburb-outlines"
    );
    this.map?.addLayer(
      {
        id: "suburb-counts",
        source: "nsw-data",
        type: "symbol",

        layout: {
          "icon-image": "",
          "text-font": ["DIN Pro Medium", "Arial Unicode MS Regular"],
          "text-offset": [0, 0],
          "text-field": ["get", "cases"],
        },
        paint: {
          "text-halo-color": "hsl(185, 0%, 5%)",
          "text-halo-width": 0.5,
          "text-halo-blur": 0.5,
          "text-color": "hsl(185, 0%, 56%)",
        },
      },
      "suburb-outlines"
    );
  };

  onLoadMap = () => {
    const emptyFeatureCollection: GeoJSON.FeatureCollection = {
      type: "FeatureCollection",
      features: [],
    };

    this.map?.addSource("nsw-data", {
      type: "geojson",
      data: emptyFeatureCollection,
    });

    this.map?.addSource("home-loc", {
      type: "geojson",
      data: emptyFeatureCollection,
      generateId: true,
    });

    this.addDataLayers();

    this.map?.on("zoom", () => {
      this.updateMetresPerPixel();
      this.updateFilter(this.props.range);
    });
    //this.setupClickableMap();
    this.props.onMapInitialised();
  };

  setHomeLocation = () => {
    const homeLongLat = this.props.homeLongLat;
    //const pointFeature: GeoJSON.Feature<GeoJSON.Geometry> =  (homeLongLat === undefined) ?
    const homeSource = this.map?.getSource("home-loc");
    if (homeLongLat === undefined) {
      this.map?.setLayoutProperty("range-ring", "visibility", "none");
    } else {
      this.map?.setLayoutProperty("range-ring", "visibility", "visible");
      const pointFeature: GeoJSON.Feature<GeoJSON.Geometry> = {
        type: "Feature",
        geometry: {
          type: "Point",
          coordinates: homeLongLat,
        },
        properties: [],
      };
      (homeSource as GeoJSONSource).setData(pointFeature);
      this.map?.panTo(homeLongLat);
    }
  };

  setMapSourceData = () => {
    const mapSource = this.map?.getSource("nsw-data");
    if (mapSource !== undefined && (mapSource as GeoJSONSource).setData) {
      (mapSource as GeoJSONSource).setData(this.props.mapData!);
      this.setupPopup();
      this.updateFeatureDistances();
      this.updateFilter(this.props.range);
    }
  };

  componentDidUpdate(prevProps: MapProps, prevState: MapState) {
    if (this.props.range !== prevProps.range) {
      this.updateFilter(this.props.range);
    }
    if (this.props.mapDataLoaded && prevProps.mapDataLoaded === false) {
      if (this.map?.loaded()) {
        this.setMapSourceData();
        this.setHomeLocation();
      } else {
        this.map?.on("load", () => {
          this.setMapSourceData();
          this.setHomeLocation();
        });
      }
    }
    if (
      this.props.distancesDirty === true &&
      prevProps.distancesDirty === false
    ) {
      if (this.map?.loaded()) {
        this.updateFeatureDistances();
        this.setHomeLocation();
      } else {
        this.map?.on("load", () => {
          this.updateFeatureDistances();
          this.setHomeLocation();
        });
      }
    }
  }

  updateFeatureDistances = () => {
    this.props.postcodeDistanceDict.forEach((value, key) => {
      this.map?.setFeatureState(
        { id: key, source: "nsw-data" },
        {
          min_distance: value,
        }
      );
    });
    this.props.clearDirty();
  };

  updateFilter = (distance: number) => {
    if (this.map) {
      this.map.setPaintProperty("suburb-backgrounds", "fill-opacity", [
        "case",
        ["<=", ["feature-state", "min_distance"], distance],
        0.2,
        0,
      ]);
      const radius = this.metresToPixels(distance * 1000);
      this.map?.setPaintProperty("range-ring", "circle-radius", radius);
    }
  };
  updateMetresPerPixel = () => {
    const NUM_PIXELS = 100;
    if (this.map === undefined) {
      return;
    }
    const from_pixel =
      this.props.homeLongLat === undefined
        ? this.map.project(this.map.getCenter())
        : this.map.project([
            this.props.homeLongLat[0],
            this.props.homeLongLat[1],
          ]);

    const to_pixel = from_pixel.add(new Point(0, NUM_PIXELS));
    const distance = this.map
      .unproject(from_pixel)
      .distanceTo(this.map.unproject(to_pixel));
    this.metresPerPixel = distance / NUM_PIXELS;
  };
  metresToPixels = (metres: number) => {
    if (this.metresPerPixel === undefined) {
      this.updateMetresPerPixel();
    }
    return metres / this.metresPerPixel!;
  };

  render() {
    return (
      <div className="Map">
        <div ref={(el) => (this.mapContainer = el)} className="mapContainer" />
      </div>
    );
  }
}

export default CaseMap;
