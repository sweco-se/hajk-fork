import { Circle as CircleStyle, Fill, Stroke, Style, Text } from "ol/style.js";
import { Vector as VectorSource } from "ol/source.js";
import { Vector as VectorLayer } from "ol/layer.js";
import { LineString, Polygon } from "ol/geom.js";
import Draw from "ol/interaction/Draw.js";

import Overlay from "ol/Overlay";

class MeasureModel {
  constructor(settings) {
    this.map = settings.map;
    this.app = settings.app;
    this.localObserver = settings.localObserver;
    this.source = new VectorSource();
    this.vector = new VectorLayer({
      source: this.source,
      style: this.createStyle,
    });
    this.map.addLayer(this.vector);
    this.type = "LineString";
    this.createMeasureTooltip();
  }

  createStyle = (feature, resolution) => {
    const fillColor = "rgba(255, 255, 255, 0.3)";
    const strokeColor = "rgba(0, 0, 0, 0.5)";
    return [
      new Style({
        fill: new Fill({
          color: fillColor,
        }),
        stroke: new Stroke({
          color: strokeColor,
          width: 3,
        }),
        image: new CircleStyle({
          radius: 5,
          stroke: new Stroke({
            color: strokeColor,
          }),
          fill: new Fill({
            color: fillColor,
          }),
        }),
        text: new Text({
          textAlign: "center",
          textBaseline: "middle",
          font: "12pt sans-serif",
          fill: new Fill({ color: "#FFF" }),
          text: this.getLabelText(feature),
          overflow: true,
          stroke: new Stroke({
            color: strokeColor,
            width: 3,
          }),
          offsetX: 0,
          offsetY: -10,
          rotation: 0,
          scale: 1,
        }),
      }),
    ];
  };

  clear = () => {
    this.source.clear();
    this.measureTooltip.setPosition(undefined);
  };

  handleDrawStart = (e) => {
    e.feature.getGeometry().on("change", (e) => {
      var toolTip = "",
        coord = undefined,
        pointerCoord;

      if (this.active) {
        if (this.pointerPosition) {
          pointerCoord = this.pointerPosition.coordinate;
        }

        if (e.target instanceof LineString) {
          toolTip = this.formatLabel("length", e.target.getLength());
          coord = e.target.getLastCoordinate();
        }

        if (e.target instanceof Polygon) {
          toolTip = this.formatLabel("area", e.target.getArea());
          coord = pointerCoord || e.target.getFirstCoordinate();
        }

        this.measureTooltipElement.innerHTML = toolTip;
        this.measureTooltip.setPosition(coord);
      }
    });
  };

  handleDrawEnd = (e) => {
    this.setFeaturePropertiesFromGeometry(e.feature);
    this.measureTooltip.setPosition(undefined);
  };

  setType(type) {
    this.type = type;
    this.removeInteraction();
    this.addInteraction();
  }

  getType() {
    return this.type;
  }

  setFeaturePropertiesFromGeometry(feature) {
    if (!feature) return;
    var geom,
      type = "",
      length = 0,
      radius = 0,
      area = 0,
      position = {
        n: 0,
        e: 0,
      };
    geom = feature.getGeometry();
    type = geom.getType();
    switch (type) {
      case "Point":
        position = {
          n: Math.round(geom.getCoordinates()[1]),
          e: Math.round(geom.getCoordinates()[0]),
        };
        break;
      case "LineString":
        if (geom.getLength() < 1000) {
          length = Math.round(geom.getLength() * 10) / 10;
        } else {
          length = Math.round(geom.getLength());
        }
        break;
      case "Polygon":
        area = Math.round(geom.getArea());
        break;
      case "Circle":
        radius = Math.round(geom.getRadius());
        break;
      default:
        break;
    }
    feature.setProperties({
      type: type,
      length: length,
      area: area,
      radius: radius,
      position: position,
    });
  }

  formatLabel(type, value) {
    let label;

    if (type === "point") {
      label = "Nord: " + value.n + " Öst: " + value.e;
    }

    if (typeof value === "number") {
      if (type === "length" && value < 1000) {
        value = Math.round(value * 10) / 10;
      } else {
        value = Math.round(value);
      }
    }

    if (type === "circle") {
      let unit = " m";
      let squareUnit = " m²";
      if (value >= 1000) {
        unit = " km";
        value = value / 1000;
      }
      label =
        "R = " +
        Number(value).toLocaleString() +
        unit +
        " \nA = " +
        (Math.round(value * value * Math.PI * 1000) / 1000).toLocaleString() +
        squareUnit;
    }

    if (type === "area") {
      if (value > 100000) {
        label =
          Number(Math.round((value / 1000000) * 100) / 100).toLocaleString() +
          " km²";
      } else {
        label = Number(Math.round(value * 100) / 100).toLocaleString() + " m²";
      }
    }

    if (type === "length") {
      let unit = " m";
      if (value >= 1000) {
        unit = " km";
        value = value / 1000;
      }
      label = Number(value).toLocaleString() + unit;
    }

    return label;
  }

  createMeasureTooltip() {
    if (this.measureTooltipElement) {
      this.measureTooltipElement.parentNode.removeChild(
        this.measureTooltipElement
      );
    }
    this.measureTooltipElement = document.createElement("div");
    this.measureTooltipElement.className = "tooltip-draw tooltip-measure";
    this.measureTooltip = new Overlay({
      element: this.measureTooltipElement,
      offset: [0, -15],
      positioning: "bottom-center",
    });
    this.map.addOverlay(this.measureTooltip);
  }

  getLabelText(feature) {
    const props = feature.getProperties();
    const type = feature.getProperties().type;
    switch (type) {
      case "Point":
        return this.formatLabel("point", props.position);
      case "LineString":
        return this.formatLabel("length", props.length);
      case "Circle":
        return this.formatLabel("circle", props.radius);
      case "Polygon":
        return this.formatLabel("area", props.area);
      default:
        return "";
    }
  }

  addInteraction() {
    this.draw = new Draw({
      source: this.source,
      type: this.type,
      style: new Style({
        fill: new Fill({
          color: "rgba(255, 255, 255, 0.2)",
        }),
        stroke: new Stroke({
          color: "rgba(0, 0, 0, 0.5)",
          lineDash: [10, 10],
          width: 2,
        }),
        image: new CircleStyle({
          radius: 5,
          stroke: new Stroke({
            color: "rgba(0, 0, 0, 0.7)",
          }),
          fill: new Fill({
            color: "rgba(255, 255, 255, 0.2)",
          }),
        }),
      }),
    });
    this.draw.on("drawstart", this.handleDrawStart);
    this.draw.on("drawend", this.handleDrawEnd);
    this.map.addInteraction(this.draw);

    // Add snap interactions AFTER measure source has been added
    // this will allow us to snap to the newly added source too
    this.map.snapHelper.add("measure");
  }

  removeInteraction() {
    this.measureTooltip.setPosition(undefined);
    this.map.snapHelper.delete("measure");
    this.map.removeInteraction(this.draw);
  }

  eventHandler = (event) => {
    const key = event.key; // Or const {key} = event; in ES6+
    if (key === "Escape") {
      this.draw.finishDrawing();
    }
  };

  setActive(active) {
    if (active && !this.active) {
      document.addEventListener("keydown", this.eventHandler);
      this.addInteraction();
      this.map.clickLock.add("measure");
    }
    if (active === false) {
      document.removeEventListener("keydown", this.eventHandler);
      this.removeInteraction();
      this.map.clickLock.delete("measure");
    }
    this.active = active;
  }

  getMap() {
    return this.map;
  }
}

export default MeasureModel;
