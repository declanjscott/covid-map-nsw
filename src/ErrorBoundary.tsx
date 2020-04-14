import React, { ErrorInfo } from "react";
import * as Sentry from "@sentry/browser";
import "./App.css";

import "@blueprintjs/core/lib/css/blueprint.css";

type ErrorProps = {};

type ErrorState = {
  hasError: boolean;
};

class ErrorBoundary extends React.Component<ErrorProps, ErrorState> {
  constructor(props: ErrorProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error) {
    // Update state so the next render will show the fallback UI.
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    Sentry.captureException(error);
  }

  render() {
    if (this.state.hasError) {
      // You can render any custom fallback UI
      return (
        <div className="loading bp3-dark">
          <h1 className="bp3-heading">
            Sorry, something went wrong. Please refresh and try again!
          </h1>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
