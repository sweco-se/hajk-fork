import React, { Component } from "react";
import Observer from "react-event-observer";
import EditModel from "./model.js";
import { createPortal } from "react-dom";
import PanelHeader from "../../components/PanelHeader.js";

import "./style.css";

class Edit extends Component {
  constructor() {
    super();
    this.toggle = this.toggle.bind(this);
    this.state = {
      toggled: false
    };
  }

  componentDidMount() {
    this.observer = Observer();
    this.observer.subscribe("myEvent", message => {
      console.log(message);
    });
    this.editModel = new EditModel({
      map: this.props.tool.map,
      app: this.props.tool.app,
      observer: this.observer
    });
    this.props.tool.instance = this;
  }

  open() {
    this.setState({
      toggled: true
    });
  }

  close() {
    this.setState({
      toggled: false
    });
  }

  minimize() {
    this.setState({
      toggled: false
    });
  }

  toggle() {
    if (!this.state.toggled) {
      this.props.toolbar.hide();
    }
    this.setState({
      toggled: !this.state.toggled
    });
    this.props.tool.app.togglePlugin("edit");
  }

  getActiveClass() {
    return this.state.toggled
      ? "tool-toggle-button active"
      : "tool-toggle-button";
  }

  getVisibilityClass() {
    return this.state.toggled
      ? "tool-panel edit-panel"
      : "tool-panel edit-panel hidden";
  }

  renderPanel() {
    return createPortal(
      <div className={this.getVisibilityClass()}>
        <PanelHeader title="Redigera" toggle={this.toggle} />
        <div className="tool-panel-content">Redigera</div>
      </div>,
      document.getElementById("map")
    );
  }

  render() {
    return (
      <div>
        <div className={this.getActiveClass()} onClick={this.toggle}>
          <i className="material-icons">edit</i>
          <i className="tool-text">Redigera</i>
        </div>
        {this.renderPanel()}
      </div>
    );
  }
}

export default Edit;