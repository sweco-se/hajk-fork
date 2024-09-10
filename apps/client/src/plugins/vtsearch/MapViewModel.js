import PropTypes from "prop-types";
import VectorLayer from "ol/layer/Vector";
import VectorSource from "ol/source/Vector";
import { Fill, Stroke, Style, Circle, Text } from "ol/style";
import "ol/ol.css";
import Draw from "ol/interaction/Draw.js";
import WKT from "ol/format/WKT";
import { createBox } from "ol/interaction/Draw";
import Point from "ol/geom/Point";
import Feature from "ol/Feature";

/**
 * @summary ViewModel to handle interactions with map
 * @description Functionality used to interact with map.
 * This functionality does not fit in either the searchModel or the actual view.
 * @class MapViewModel
 */

const mapContainer = document.getElementById("map");
const appContainer = document.getElementById("appBox");
export default class MapViewModel {
  constructor(settings) {
    this.map = settings.map;
    this.app = settings.app;
    this.model = settings.model;
    this.localObserver = settings.localObserver;
    this.globalObserver = settings.globalObserver;

    this.#bindSubscriptions();
    this.#addShowStopPointsLayerToMap();
    this.#addHighlightLayerToMap();
    this.#addDrawSearch();
  }
  static propTypes = {
    app: PropTypes.object.isRequired,
    map: PropTypes.object.isRequired,
    localObserver: PropTypes.object.isRequired,
  };

  /**
   * Init method to listen for events from other parts of plugin
   *
   * @returns {null}
   * @memberof MapViewModel
   */
  #bindSubscriptions = () => {
    this.localObserver.subscribe(
      "vt-highlight-search-result-feature",
      (payload) => {
        var olFeature = this.#getSearchResultLayerFromId(payload.searchResultId)
          .getSource()
          .getFeatureById(payload.olFeatureId);
        this.#highlightFeature(olFeature);
      }
    );

    this.localObserver.subscribe(
      "vt-zoom-to-search-result-feature",
      (payload) => {
        var olFeature = this.#getSearchResultLayerFromId(payload.searchResultId)
          .getSource()
          .getFeatureById(payload.olFeatureId);

        this.#zoomToExtent(olFeature.getGeometry().getExtent());
      }
    );

    this.localObserver.subscribe(
      "vt-add-search-result-to-map",
      ({ searchResultId, olFeatures, zoomToSearchResult }) => {
        var searchResultLayer = this.#addSearchResultLayerToMap(searchResultId);
        this.#addFeatureToSearchResultLayer(
          olFeatures,
          searchResultLayer,
          zoomToSearchResult
        );
      }
    );

    this.localObserver.subscribe("vt-clear-search-result", (searchResultId) => {
      this.map.removeLayer(this.#getSearchResultLayerFromId(searchResultId));
    });
    this.localObserver.subscribe(
      "vt-deactivate-search",
      this.#deactivateSearch
    );
    this.localObserver.subscribe("vt-activate-search", this.#activateSearch);

    this.localObserver.subscribe("vt-hide-all-layers", () => {
      this.#hideAllLayers();
    });

    this.localObserver.subscribe("vt-close-all-vt-searchLayer", () => {
      const layersToRemove = this.map
        .getLayers()
        .getArray()
        .filter((layer) => {
          if (
            layer.get("type") === "vt-search-result-layer" ||
            layer.get("name") === "vt-search-result-layer"
          )
            return layer;
          return null;
        });
      layersToRemove.forEach((layer) => {
        this.map.removeLayer(layer);
      });
    });

    this.localObserver.subscribe(
      "vt-toggle-visibility",
      ({ setLayerIdVisible, zoomToSearchResult }) => {
        this.#toggleLayerVisibility(setLayerIdVisible, zoomToSearchResult);
      }
    );

    this.localObserver.subscribe("vt-hide-current-layer", () => {
      this.#hideCurrentLayer();
    });

    this.map.on("singleclick", this.#onFeaturesClickedInMap);

    this.localObserver.subscribe("vt-add-search-result", (olFeatures) => {
      this.#addFeatureToSearchResultLayer(olFeatures);
    });

    this.localObserver.subscribe("vt-clear-highlight", () => {
      this.highlightLayer.getSource().clear();
    });

    this.localObserver.subscribe("vt-resize-map", (heightFromBottom) => {
      this.#resizeMap(heightFromBottom);
    });

    this.localObserver.subscribe("vt-journeys-search", this.#journeySearch);

    this.localObserver.subscribe("vt-stops-search", this.#stopSearch);

    this.localObserver.subscribe("vt-routes-search", this.#routesSearch);

    this.localObserver.subscribe("vt-result-done", (result) => {
      this.#clearDrawLayer();
      this.map.on("singleclick", this.#onFeaturesClickedInMap);
    });

    this.localObserver.subscribe(
      "vt-search-show-stop-points-by-line",
      (parameters) => {
        this.model.getStopPointsByLine(
          parameters.internalLineNumber,
          parameters.direction
        );
      }
    );

    this.localObserver.subscribe("vt-search-hide-stop-points-by-line", () => {
      this.#hideStopPoints();
    });

    this.localObserver.subscribe("vt-stop-point-showed", (stopPoints) => {
      this.#showStopPoints(stopPoints);
    });

    this.globalObserver.subscribe("core.zoomEnd", () => {
      this.#adjustStopPointsZoomThreshold();
    });
  };

  /**
   * Private help method that clear all draw graphics, e.g. the polygon and the rectangle tool.
   *
   * @memberof MapViewModel
   */
  #clearDrawLayer = () => {
    this.drawlayer.getSource().clear();
  };

  #resizeMap = (heightFromBottom) => {
    //Not so "reacty" but no other solution possible because if we don't want to rewrite core functionality in Hajk3
    [appContainer, mapContainer].forEach((container) => {
      container.style.bottom = `${heightFromBottom}px`;
    });

    this.map.updateSize();
  };

  #getSearchResultLayerFromId = (searchResultId) => {
    return this.map
      .getLayers()
      .getArray()
      .filter((layer) => {
        return (
          layer.get("name") === "vt-search-result-layer" &&
          layer.get("searchResultId") === searchResultId
        );
      })[0];
  };

  #activateSearch = () => {
    this.#clearDrawLayer();
    this.map.removeInteraction(this.draw);
    this.map.on("singleclick", this.#onFeaturesClickedInMap);
  };

  #deactivateSearch = () => {
    this.map.un("singleclick", this.#onFeaturesClickedInMap);
  };

  #getWktFromUser = (value, geometryFunction) => {
    this.#clearDrawLayer();
    this.draw = new Draw({
      source: this.drawlayer.getSource(),
      type: value,
      stopClick: true,
      geometryFunction: geometryFunction,
    });

    this.map.addInteraction(this.draw);
    return new Promise((resolve) => {
      this.draw.on("drawend", (e) => {
        this.map.removeInteraction(this.draw);
        var format = new WKT();
        var wktFeatureGeom = format.writeGeometry(e.feature.getGeometry());
        resolve(wktFeatureGeom);
      });
    });
  };

  #journeySearch = ({
    selectedFromDate,
    selectedEndDate,
    publicLine,
    internalLineNumber,
    stopArea,
    stopPoint,
    selectedFormType,
    searchCallback,
  }) => {
    var value = selectedFormType;
    var geometryFunction = undefined;
    if (selectedFormType === "Box") {
      value = "Circle";
      geometryFunction = createBox();
    }
    if (selectedFormType === "") {
      this.model.getJourneys(
        selectedFromDate,
        selectedEndDate,
        publicLine,
        internalLineNumber,
        stopArea,
        stopPoint
      );
    } else {
      this.#getWktFromUser(value, geometryFunction).then((wktFeatureGeom) => {
        searchCallback();
        if (wktFeatureGeom != null) {
          this.model.getJourneys(
            selectedFromDate,
            selectedEndDate,
            publicLine,
            internalLineNumber,
            stopArea,
            stopPoint,
            selectedFormType,
            wktFeatureGeom
          );
        }
      });
    }
  };

  #stopSearch = ({
    busStopValue,
    stopNameOrNr,
    publicLine,
    municipality,
    stopPoint,
    internalLineNumber,
    transportCompany,
    selectedFormType,
    searchCallback,
  }) => {
    var value = selectedFormType;
    var geometryFunction = undefined;
    if (selectedFormType === "Box") {
      value = "Circle";
      geometryFunction = createBox();
    }
    if (selectedFormType === "") {
      if (busStopValue === "stopAreas") {
        this.model.getStopAreas(
          stopNameOrNr,
          publicLine,
          municipality,
          internalLineNumber,
          transportCompany
        );
      } else {
        this.model.getStopPoints(
          stopNameOrNr,
          publicLine,
          municipality,
          stopPoint,
          internalLineNumber,
          transportCompany
        );
      }
    } else {
      this.#getWktFromUser(value, geometryFunction).then((wktFeatureGeom) => {
        searchCallback();
        if (busStopValue === "stopAreas") {
          this.model.getStopAreas(
            stopNameOrNr,
            publicLine,
            municipality,
            internalLineNumber,
            transportCompany,
            wktFeatureGeom,
            selectedFormType
          );
        } else {
          this.model.getStopPoints(
            stopNameOrNr,
            publicLine,
            municipality,
            stopPoint,
            internalLineNumber,
            transportCompany,
            wktFeatureGeom,
            selectedFormType
          );
        }
      });
    }
  };

  #routesSearch = ({
    publicLineName,
    internalLineNumber,
    municipality,
    trafficTransport,
    transportCompanyName,
    throughStopArea,
    designation,
    selectedFormType,
    searchCallback,
  }) => {
    var value = selectedFormType;
    var geometryFunction = undefined;
    if (selectedFormType === "Box") {
      value = "Circle";
      geometryFunction = createBox();
    }

    if (selectedFormType === "") {
      this.model.getRoutes(
        publicLineName,
        internalLineNumber,
        municipality,
        trafficTransport,
        transportCompanyName,
        throughStopArea,
        designation
      );
    } else {
      this.#getWktFromUser(value, geometryFunction).then((wktFeatureGeom) => {
        searchCallback();
        this.model.getRoutes(
          publicLineName,
          internalLineNumber,
          municipality,
          trafficTransport,
          transportCompanyName,
          throughStopArea,
          designation,
          wktFeatureGeom
        );
      });
    }
  };

  #addDrawSearch = () => {
    this.drawlayer = new VectorLayer({
      layerType: "system",
      zIndex: 5000,
      source: new VectorSource({}),
    });
    this.map.addLayer(this.drawlayer);
  };

  /**
   * Init method to add a searchresult layer in the map
   * to use for temporary storing of search results
   *
   * @returns {null}
   * @memberof MapViewModel
   */
  #addSearchResultLayerToMap = (searchResultId) => {
    var fill = new Fill({
      color: `rgba(${this.model.mapColors.searchFillColor.r},
        ${this.model.mapColors.searchFillColor.g},
        ${this.model.mapColors.searchFillColor.b},
        ${this.model.mapColors.searchFillColor.a})`,
    });
    var stroke = new Stroke({
      color: `rgba(${this.model.mapColors.searchStrokeColor.r},
        ${this.model.mapColors.searchStrokeColor.g},
        ${this.model.mapColors.searchStrokeColor.b},
        ${this.model.mapColors.searchStrokeColor.a})`,
      width: this.model.mapColors.searchStrokeLineWidth,
    });
    var searchResultLayer = new VectorLayer({
      layerType: "system",
      zIndex: 5000,
      style: new Style({
        image: new Circle({
          fill: fill,
          stroke: stroke,
          radius: this.model.mapColors.searchStrokePointWidth,
        }),
        fill: fill,
        stroke: stroke,
      }),
      source: new VectorSource({}),
    });
    console.log(this.map, "map");
    searchResultLayer.set("name", "vt-search-result-layer");
    searchResultLayer.set("searchResultId", searchResultId);
    searchResultLayer.set("queryable", false);
    searchResultLayer.set("visible", false);

    this.map.addLayer(searchResultLayer);
    return searchResultLayer;
  };

  #addShowStopPointsLayerToMap = () => {
    this.showStopPointsSource = new VectorSource();
    this.showStopPointsLayer = new VectorLayer({
      style: null,
      source: this.showStopPointsSource,
    });
    this.showStopPointsLayer.setZIndex(500);
    this.map.addLayer(this.showStopPointsLayer);
  };

  #getStopPointStyle = () => {
    const fill = new Fill({
      color: `rgba(${this.model.mapColors.searchFillColor.r},
        ${this.model.mapColors.searchFillColor.g},
        ${this.model.mapColors.searchFillColor.b},
        ${this.model.mapColors.searchFillColor.a})`,
    });
    const stroke = new Stroke({
      color: `rgba(${this.model.mapColors.searchFillColor.r},
        ${this.model.mapColors.searchFillColor.g},
        ${this.model.mapColors.searchFillColor.b},
        ${this.model.mapColors.searchFillColor.a})`,
      width: this.model.mapColors.searchStrokeLineWidth,
    });
    return new Style({
      image: new Circle({
        fill: fill,
        stroke: stroke,
        radius: this.model.geoServer.ShowStopPoints.radius,
      }),
      fill: fill,
      stroke: stroke,
    });
  };

  /**
   * Init method to add a highlight layer in the map
   * to use for temporary storing of features that are highlighted
   *
   * @returns {null}
   * @memberof MapViewModel
   */
  #addHighlightLayerToMap = () => {
    var fill = new Fill({
      color: `rgba(${this.model.mapColors.highlightFillColor.r},
        ${this.model.mapColors.highlightFillColor.g},
        ${this.model.mapColors.highlightFillColor.b},
        ${this.model.mapColors.highlightFillColor.a})`,
    });
    var stroke = new Stroke({
      color: `rgba(${this.model.mapColors.highlightStrokeColor.r},
        ${this.model.mapColors.highlightStrokeColor.g},
        ${this.model.mapColors.highlightStrokeColor.b},
        ${this.model.mapColors.highlightStrokeColor.a})`,
      width: this.model.mapColors.highlightStrokeLineWidth,
    });

    this.highlightLayer = new VectorLayer({
      layerType: "system",
      zIndex: 6000,
      style: new Style({
        image: new Circle({
          fill: fill,
          stroke: stroke,
          radius: this.model.mapColors.highlightStrokePointWidth,
        }),
        fill: fill,
        stroke: stroke,
      }),
      source: new VectorSource({}),
    });
    this.highlightLayer.set("name", "vt-highlight-layer");
    this.map.addLayer(this.highlightLayer);
  };

  /**
   * Highlights a openlayers feature and zooms to it
   *
   * @returns {null}
   * @memberof MapViewModel
   * @param {external:"ol.Feature"}
   */

  #highlightFeature = (olFeature) => {
    if (olFeature != null) {
      this.highlightLayer.getSource().clear();
      this.highlightLayer.getSource().addFeature(olFeature);
    }
  };
  /**
   * Adds openlayers feature to search result layer
   *
   * @returns {null}
   * @memberof MapViewModel
   * @param {Array<{external:"ol.feature"}>}
   */
  #addFeatureToSearchResultLayer = (
    olFeatures,
    searchResultLayer,
    zoomToSearchResult
  ) => {
    searchResultLayer.getSource().addFeatures(olFeatures);
    if (zoomToSearchResult)
      this.#zoomToExtent(searchResultLayer.getSource().getExtent());
  };

  /**
   * Zooms map to extent
   *
   * @returns {null}
   * @memberof MapViewModel
   * @param {Array<{external:"ol/interaction/Extent"}>}
   */
  #zoomToExtent = (extent) => {
    this.map.getView().fit(extent, {
      size: this.map.getSize(),
      padding: [10, 10, 10, 10],
    });
  };

  /**
   * Toggles visibility for layer in map with the specified id
   * @returns {null}
   * @param {integer : searchResultId}
   * @memberof MapViewModel
   */
  #toggleLayerVisibility = (searchResultId, zoomToSearchResult = true) => {
    this.map.getLayers().forEach((layer) => {
      if (layer.get("searchResultId") === searchResultId) {
        layer.set("visible", !layer.get("visible"));
        if (zoomToSearchResult)
          this.#zoomToExtent(layer.getSource().getExtent());
      }
    });
  };
  #hideCurrentLayer = (searchResultId) => {
    this.map.getLayers().forEach((layer) => {
      if (layer.get("searchResultId") === searchResultId) {
        layer.set("visible", false);
      }
    });
  };

  /**
   * Sets visible to false for all layers in the map
   * @returns {null}
   * @memberof MapViewModel
   */
  #hideAllLayers = () => {
    this.map.getLayers().forEach((layer) => {
      if (layer.get("name") === "vt-search-result-layer") {
        layer.set("visible", false);
      }
    });
    this.showStopPointsSource.clear();
  };

  /**
   * Zooms map to extent
   * @returns {null}
   * @memberof MapViewModel
   * @param {*} event
   */

  #onFeaturesClickedInMap = (e) => {
    var featuresClicked = this.#getFeaturesAtClickedPixel(e);
    if (featuresClicked.length > 0) {
      this.#highlightFeature(featuresClicked[0]);
      this.localObserver.publish("vt-features-clicked-in-map", featuresClicked);
    }
  };

  /**
   * Returns all features "below" clicked pixel in map
   *
   * @returns {Array<{external:"ol.feature"}>}
   * @memberof MapViewModel
   * @param {*} event
   */
  #getFeaturesAtClickedPixel = (evt) => {
    var features = [];
    this.map.forEachFeatureAtPixel(
      evt.pixel,
      (feature, layer) => {
        if (
          layer.get("type") === "vt-search-result-layer" ||
          layer.get("name") === "vt-search-result-layer"
        ) {
          features.push(feature);
        }
      },
      {
        hitTolerance: 10,
      }
    );
    return features;
  };

  #showStopPoints = (stopPoints) => {
    this.showStopPointsSource.clear();
    const stopPointFeatures = stopPoints.featureCollection.features.map(
      (geoServerFeature) => {
        let stopPointFeature = new Feature({
          geometry: new Point(geoServerFeature.geometry.coordinates),
        });
        stopPointFeature.labelText =
          geoServerFeature.properties.Name +
          " " +
          geoServerFeature.properties.Designation;
        this.#setAdjustThreshold(stopPointFeature);

        return stopPointFeature;
      },
      this
    );
    this.showStopPointsSource.addFeatures(stopPointFeatures);
  };

  #hideStopPoints = () => {
    this.showStopPointsSource.clear();
  };

  #setAdjustThreshold = (feature) => {
    const resolution = this.map.getView().getResolution();
    if (
      resolution <
      this.model.geoServer.ShowStopPoints.visibleStopPointsThresholdResolution
    )
      feature.setStyle(this.#createFeatureStyleStopPoint(feature));
    else feature.setStyle(null);
  };

  #createFeatureStyleStopPoint = (stopPointFeature) => {
    const baseStyle = this.#getStopPointStyle();
    const textStyle = this.#getStopPointFeatureTextStyle(stopPointFeature);
    baseStyle.setText(textStyle);
    return baseStyle;
  };

  #getStopPointFeatureTextStyle = (stopPointFeature) => {
    return new Text({
      textAlign: this.model.geoServer.ShowStopPoints.textHorizontalAlign,
      textBaseline: this.model.geoServer.ShowStopPoints.textVerticalAlign,
      font: this.model.geoServer.ShowStopPoints.textFont,
      text: this.#getText(stopPointFeature),
      fill: new Fill({
        color: `rgba(${this.model.geoServer.ShowStopPoints.textFillColor.r},
        ${this.model.geoServer.ShowStopPoints.textFillColor.g},
        ${this.model.geoServer.ShowStopPoints.textFillColor.b},
        ${this.model.geoServer.ShowStopPoints.textFillColor.a})`,
      }),
      stroke: new Stroke({
        color: `rgba(${this.model.geoServer.ShowStopPoints.textStrokeColor.r},
        ${this.model.geoServer.ShowStopPoints.textStrokeColor.g},
        ${this.model.geoServer.ShowStopPoints.textStrokeColor.b},
        ${this.model.geoServer.ShowStopPoints.textStrokeColor.a})`,
        width: this.model.geoServer.ShowStopPoints.textStrokeWidth,
      }),
      offsetX: this.model.geoServer.ShowStopPoints.textOffsetX,
      offsetY: this.model.geoServer.ShowStopPoints.textOffsetY,
      rotation: this.model.geoServer.ShowStopPoints.textRotation,
      scale: 1,
    });
  };

  #getText = (stopPointFeature) => {
    return stopPointFeature.labelText;
  };

  #adjustStopPointsZoomThreshold = () => {
    const stopPointsFeatures = this.showStopPointsSource.getFeatures();
    if (stopPointsFeatures.length === 0) return;

    stopPointsFeatures.forEach((stopPointsFeature) => {
      this.#setAdjustThreshold(stopPointsFeature);
    }, this);
  };
}
