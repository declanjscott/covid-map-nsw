import React from "react";
import "./App.css";
import {
  Slider,
  InputGroup,
  FormGroup,
  ControlGroup,
  Button,
} from "@blueprintjs/core";

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
};

enum PostcodeStatus {
  Invalid,
  Unknown,
  Valid,
}

class Header extends React.Component<HeaderProps, HeaderState> {
  constructor(props: HeaderProps) {
    super(props);
    console.log("setting header");
    this.state = {
      postcode: "",
    };
  }

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
    console.log("update");
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
          <Button icon="info-sign">About this app</Button>
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
