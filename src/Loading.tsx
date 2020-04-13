import React from "react";
import "./App.css";

import "@blueprintjs/core/lib/css/blueprint.css";

type LoadingProps = {};

type LoadingState = {};

class Loading extends React.Component<LoadingProps, LoadingState> {
  render() {
    return (
      <div className="loading bp3-dark">
        <h1 className="bp3-heading">Loading</h1>
      </div>
    );
  }
}

export default Loading;
