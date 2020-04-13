import React from "react";
import "./App.css";
import {
  Slider,
  InputGroup,
  FormGroup,
  ControlGroup,
  Button,
  Dialog,
  Classes,
  AnchorButton,
  Intent,
} from "@blueprintjs/core";
import { ReactComponent as GitHubLogo } from "./assets/github_icon.svg";

import "@blueprintjs/core/lib/css/blueprint.css";
import { PostcodeDict } from "./App";

type HeaderProps = {
  range: number;
  numCases?: number;
  loaded: boolean;
  postcode?: string;
  postcodeDict: PostcodeDict;
  updatePostcode: (newPostCode: string | undefined) => void;
  updateRange: (newRange: number) => void;
};

type HeaderState = {
  postcode: string;
  overlayOpen: boolean;
};

enum PostcodeStatus {
  Invalid,
  Unknown,
  Valid,
}

class Header extends React.Component<HeaderProps, HeaderState> {
  constructor(props: HeaderProps) {
    super(props);
    this.state = {
      postcode: "",
      overlayOpen: false,
    };
  }

  toggleOverlay = () => {
    this.setState({ overlayOpen: !this.state.overlayOpen });
  };

  getRangeSlider = () => {
    return (
      <div className="header-slider-content">
        {this.props.loaded ? (
          <h2 className="bp3-heading">
            {this.props.numCases} COVID-19 cases within {this.props.range}km of{" "}
            {this.props.postcode}
          </h2>
        ) : (
          <h1 className="bp3-heading">Loading</h1>
        )}
        <Slider
          min={0}
          max={20}
          stepSize={0.5}
          labelStepSize={5}
          onChange={this.props.updateRange}
          value={this.props.range}
          labelPrecision={0}
          labelRenderer={(val) => `${val}km`}
        />
      </div>
    );
  };

  validatePostcode = (): PostcodeStatus => {
    const code = this.state.postcode;
    if (this.props.postcodeDict.has(code)) {
      return PostcodeStatus.Valid;
    } else if (code.length !== 4) {
      return PostcodeStatus.Invalid;
    } else if (!/^\d+$/.test(code)) {
      return PostcodeStatus.Invalid;
    } else if (!this.props.postcodeDict.has(code)) {
      return PostcodeStatus.Unknown;
    } else {
      return PostcodeStatus.Invalid;
    }
  };

  postCodeIsSubmittable = () => {
    const result = this.validatePostcode();
    if (result === PostcodeStatus.Valid) {
      return true;
    } else {
      return false;
    }
  };

  getPostCodeResultMessage = (): string => {
    const result = this.validatePostcode();
    const code = this.state.postcode;
    switch (result) {
      case PostcodeStatus.Valid:
        return this.props.postcodeDict.get(code)?.names!.join(", ");
      case PostcodeStatus.Unknown:
        return `${code} is not in our database of NSW postcodes`;
      case PostcodeStatus.Invalid:
        return `Enter a NSW postcode`;
    }
  };

  updatePostcodeInternal = (newPostcode: string) => {
    this.setState({ postcode: newPostcode });
  };

  getPostcodeInput = () => {
    return (
      <div className="header-input-content">
        <h2 className="bp3-heading input-header">Enter your postcode</h2>
        <FormGroup
          className="form-group"
          helperText={this.getPostCodeResultMessage()}
        >
          <ControlGroup>
            <InputGroup
              large={true}
              leftIcon="geolocation"
              onChange={(event: React.FormEvent<HTMLInputElement>) =>
                this.updatePostcodeInternal(event.currentTarget.value)
              }
              placeholder="Postcode"
              value={this.state.postcode}
            />
            <Button
              disabled={!this.postCodeIsSubmittable()}
              onClick={(e: any) =>
                this.props.updatePostcode(this.state.postcode)
              }
            >
              Submit
            </Button>
          </ControlGroup>
        </FormGroup>
      </div>
    );
  };
  render() {
    return (
      <div className="header bp3-dark">
        <div className="header-box">
          {this.props.postcode === undefined
            ? this.getPostcodeInput()
            : this.getRangeSlider()}
        </div>
        <div className="header-buttons">
          <Button
            className={"flat-button"}
            onClick={this.toggleOverlay}
            icon="info-sign"
          >
            About this app
          </Button>
          <Dialog
            className={"bp3-dark"}
            icon="info-sign"
            onClose={this.toggleOverlay}
            title="NSW COVID-19 Map"
            isOpen={this.state.overlayOpen}
          >
            <div className={Classes.DIALOG_BODY}>
              <p>
                This app lets you explore the latest{" "}
                <a
                  target="_blank"
                  rel="noopener noreferrer"
                  href="https://data.nsw.gov.au/data/dataset/covid-19-cases-by-location"
                >
                  NSW Health COVID-19 data
                </a>
                .
              </p>
            </div>
            <div className={Classes.DIALOG_FOOTER}>
              <div className={Classes.DIALOG_FOOTER_ACTIONS}>
                <AnchorButton
                  intent={Intent.PRIMARY}
                  href="https://github.com/declanjscott/covid-map-nsw"
                  target="_blank"
                  icon={<GitHubLogo className="github-logo" />}
                >
                  View on GitHub
                </AnchorButton>
                <Button onClick={this.toggleOverlay}>Close</Button>
              </div>
            </div>
          </Dialog>
          {this.props.postcode && (
            <Button
              icon="edit"
              onClick={(e: any) => {
                this.setState({ postcode: "" });
                this.props.updatePostcode(undefined);
              }}
              className="delete-button"
              intent="danger"
            >
              Change postcode
            </Button>
          )}
        </div>
      </div>
    );
  }
}

export default Header;
