import TileGrid from "ol/tilegrid/TileGrid";
import ImageLayer from "ol/layer/Image";
import TileLayer from "ol/layer/Tile";
import ImageWMS from "ol/source/ImageWMS";
import TileWMS from "ol/source/TileWMS";
import GeoJSON from "ol/format/GeoJSON";
import LayerInfo from "./LayerInfo.js";
import { equals } from "ol/extent";
import { delay } from "../../utils/Delay";

class WMSLayer {
  constructor(config, proxyUrl, globalObserver) {
    this.proxyUrl = proxyUrl;
    this.globalObserver = globalObserver;
    this.validInfo = true;
    this.legend = config.legend;
    this.attribution = config.attribution;
    this.layerInfo = new LayerInfo(config);
    this.subLayers = config.params["LAYERS"].split(",");

    let source = {
      url: config.url,
      params: config.params,
      projection: config.projection,
      serverType: config.serverType,
      crossOrigin: config.crossOrigin,
      imageFormat: config.imageFormat,
      attributions: config.attribution,
      cacheSize: this.subLayers.length > 1 ? 32 : 2048,
      transition: this.subLayers.length > 1 ? 0 : 100,
    };

    if (config.hidpi !== null) {
      source.hidpi = config.hidpi;
    }
    if (
      config.resolutions &&
      config.resolutions.length > 0 &&
      config.origin &&
      config.origin.length > 0
    ) {
      source.tileGrid = new TileGrid({
        resolutions: config.resolutions,
        origin: config.origin,
      });
      source.extent = config.extent;
    }

    if (config.singleTile) {
      if (config.customRatio >= 1) {
        source.ratio = config.customRatio;
      }
      this.layer = new ImageLayer({
        name: config.name,
        visible: config.visible,
        caption: config.caption,
        opacity: config.opacity,
        source: new ImageWMS(source),
        layerInfo: this.layerInfo,
        url: config.url,
      });
    } else {
      this.layer = new TileLayer({
        name: config.name,
        visible: config.visible,
        caption: config.caption,
        opacity: config.opacity,
        source: new TileWMS(source),
        layerInfo: this.layerInfo,
        url: config.url,
      });
    }

    this.layer.layersInfo = config.layersInfo;
    this.layer.subLayers = this.subLayers;
    this.layer.layerType = this.subLayers.length > 1 ? "group" : "layer";
    this.layer.getSource().set("url", config.url);
    this.type = "wms";
    this.bindHandlers();
  }

  /**
   * Bind handlers for TileWMS and ImageWMS
   * @instance
   */
  bindHandlers() {
    const layerSource = this.layer.getSource();
    if (layerSource instanceof TileWMS) {
      layerSource.on("tileloaderror", this.onTileLoadError);
      layerSource.on("tileloadend", this.onTileLoadOk);
    }
    if (layerSource instanceof ImageWMS) {
      layerSource.on("imageloaderror", this.onImageError);
    }
  }

  /**
   * Triggers when a tile fails to load.
   * @instance
   */
  onTileLoadError = () => {
    this.globalObserver.publish("layerswitcher.wmsLayerLoadStatus", {
      id: this.layer.get("name"),
      status: "loaderror",
    });
  };

  /**
   * Triggers when a tile loads.
   * @instance
   */
  onTileLoadOk = () => {
    this.globalObserver.publish("layerswitcher.wmsLayerLoadStatus", {
      id: this.layer.get("name"),
      status: "ok",
    });
  };

  /**
   * If we get an error while loading Image we try to refresh it once per extent.
   * This check is needed because we don't want to get stuck in an endless loop in case image repeatedly fails
   * @instance
   */
  onImageError = async (e) => {
    const layerSource = this.layer.getSource();
    const previousErrorExtent = e.target.get("previousErrorExtent") || [];
    const currentErrorExtent = e.image.extent;
    if (!equals(previousErrorExtent, currentErrorExtent)) {
      await delay(300); //Delay refresh of layers who caused error to not throttle the canvas and get new errors
      layerSource.refresh();
    }
    e.target.set("previousErrorExtent", currentErrorExtent);
  };

  /**
   * Load feature information.
   * @instance
   * @param {external:"ol.feature"} feature
   * @return {external:"ol.style"} style
   */
  getFeatureInformation(params) {
    try {
      this.validInfo = true;
      this.featureInformationCallback = params.success;

      let url = this.getLayer()
        .getSource()
        .getFeatureInfoUrl(
          params.coordinate,
          params.resolution,
          params.projection,
          {
            INFO_FORMAT:
              this.get("serverType") === "arcgis"
                ? "application/geojson"
                : "application/json",
            feature_count: 100,
          }
        );

      if (url) {
        if (this.proxyUrl) {
          url = encodeURIComponent(url);
        }

        fetch(this.proxyUrl + url)
          .then((response) => {
            response.json().then((data) => {
              var features = new GeoJSON().readFeatures(data);
              this.featureInformationCallback(features, this.getLayer());
            });
          })
          .catch((err) => {
            params.error(err);
          });
      }
    } catch (e) {
      params.error(e);
    }
  }

  /**
   * Get legend url.
   * @instance
   * @param {string} layerName
   * @return {object} legend
   */
  getLegendUrl(layerName) {
    var legend = Object.assign({}, this.legend);
    legend[0].Url = legend[0].Url.replace(/LAYER=.*/, "LAYER=" + layerName);
    return legend;
  }
}

/**
 * WmsLayer module.<br>
 * Use <code>require('layer/wmslayer')</code> for instantiation.
 * @module WMSLayer-module
 * @returns {WMSLayer}
 */
export default WMSLayer;
