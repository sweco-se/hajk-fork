import React from "react";
import { createPortal } from "react-dom";
import propTypes from "prop-types";

import { withStyles } from "@material-ui/core/styles";
import { AppBar, Tab, Tabs } from "@material-ui/core";

import BackgroundSwitcher from "./components/BackgroundSwitcher.js";
import LayerGroup from "./components/LayerGroup.js";
import BreadCrumbs from "./components/BreadCrumbs.js";

const styles = theme => ({
  windowContent: {
    margin: -10 // special case, we need to "unset" the padding for Window content that's set in Window.js
  },
  stickyAppBar: {
    top: -10
  },
  tabContent: {
    padding: 10
  }
});

class LayersSwitcherView extends React.PureComponent {
  static propTypes = {
    app: propTypes.object.isRequired,
    classes: propTypes.object.isRequired,
    map: propTypes.object.isRequired,
    model: propTypes.object.isRequired,
    observer: propTypes.object.isRequired,
    options: propTypes.object.isRequired
  };

  constructor(props) {
    super(props);
    this.options = props.options;
    this.state = {
      chapters: [],
      baseLayers: props.model.getBaseLayers(),
      activeTab: 0
    };

    props.app.globalObserver.subscribe("informativeLoaded", chapters => {
      if (Array.isArray(chapters)) {
        this.setState({
          chapters: chapters
        });
      }
    });
  }

  /**
   * LayerSwitcher consists of two Tabs: one shows
   * "regular" layers (as checkboxes, multi select), and the
   * other shows background layers (as radio buttons, one-at-at-time).
   *
   * This method controls which of the two Tabs is visible.
   *
   * @memberof LayersSwitcherView
   */
  handleChangeTabs = (event, activeTab) => {
    this.setState({ activeTab });
  };

  /**
   * @summary Ensure that the selected Tab's indicator has correct width.
   * @description When Tabs are mounted, the indicator (below selected button)
   * can have incorrect width (based on calculations done prior complete render).
   * This function is called once, on mount of <Tabs> and ensures that the
   * indicator gets correct width.
   *
   * @memberof LayersSwitcherView
   */
  handleTabsMounted = ref => {
    // Not beautiful but it works - timeout is needed to ensure rendering is done
    // and parent's element are correct.
    setTimeout(() => {
      ref !== null && ref.updateIndicator();
    }, 1);
  };

  /**
   * @summary Loops through map configuration and
   * renders all groups. Visible only if @param shouldRender is true.
   *
   * @param {boolean} [shouldRender=true]
   * @returns {<div>}
   */
  renderLayerGroups = (shouldRender = true) => {
    return (
      <div
        style={{
          display: shouldRender === true ? "block" : "none"
        }}
      >
        {this.options.groups.map((group, i) => {
          return (
            <LayerGroup
              key={i}
              group={group}
              model={this.props.model}
              chapters={this.state.chapters}
              app={this.props.app}
            />
          );
        })}
      </div>
    );
  };

  /**
   * BreadCrumbs are a feature used to "link" content between LayerSwitcher
   * and Informative plugins. They get rendered directly to #map, as they
   * are not part of LayerSwitcher plugin, at least not visually. To achieve
   * that we use createPortal().
   *
   * @returns
   * @memberof LayersSwitcherView
   */
  renderBreadCrumbs = () => {
    return (
      this.options.showBreadcrumbs &&
      createPortal(
        <BreadCrumbs
          map={this.props.map}
          model={this.props.model}
          app={this.props.app}
        />,
        document.getElementById("map")
      )
    );
  };

  render() {
    const { classes } = this.props;
    return (
      <>
        <div className={classes.windowContent}>
          <AppBar
            position="sticky" // Does not work in IE11
            color="default"
            className={classes.stickyAppBar}
          >
            <Tabs
              action={this.handleTabsMounted}
              indicatorColor="primary"
              onChange={this.handleChangeTabs}
              textColor="primary"
              value={this.state.activeTab}
              variant="fullWidth"
            >
              <Tab label="Kartlager" />
              <Tab label="Bakgrund" />
            </Tabs>
          </AppBar>
          <div className={classes.tabContent}>
            {this.renderLayerGroups(this.state.activeTab === 0)}
            <BackgroundSwitcher
              display={this.state.activeTab === 1}
              layers={this.state.baseLayers}
              layerMap={this.props.model.layerMap}
              backgroundSwitcherBlack={this.options.backgroundSwitcherBlack}
              backgroundSwitcherWhite={this.options.backgroundSwitcherWhite}
              enableOSM={this.options.enableOSM}
              map={this.props.map}
            />
          </div>
        </div>
        {this.renderBreadCrumbs()}
      </>
    );
  }
}

export default withStyles(styles)(LayersSwitcherView);
