import React from "react";
import "./App.css";

import { Card, Elevation, Spinner } from "@blueprintjs/core";

type LoadingProps = {};

type LoadingState = {};

class Loading extends React.Component<LoadingProps, LoadingState> {
  render() {
    return (
      <div className="loading bp3-dark">
        <Card
          className="loading-card"
          interactive={true}
          elevation={Elevation.TWO}
        >
          <Spinner />
          <h1 className="bp3-heading loading-text">Loading COVID-19 Map</h1>
        </Card>
      </div>
    );
  }
}

export default Loading;
