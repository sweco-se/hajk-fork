import { Circle, Stroke, Fill, Style } from "ol/style.js";
import { Vector as VectorSource } from "ol/source.js";
import { Vector as VectorLayer } from "ol/layer.js";
import Feature from "ol/Feature.js";
import GeoJSON from "ol/format/GeoJSON.js";
import LinearRing from "ol/geom/LinearRing.js";
import {
  Point,
  LineString,
  Polygon,
  MultiPoint,
  MultiLineString,
  MultiPolygon,
} from "ol/geom.js";
import * as jsts from "jsts";
import { hfetch } from "utils/FetchWrapper";

class BufferModel {
  constructor(settings) {
    this.map = settings.map;

    // Will contain new features for clicked objects/features
    this.highlightSource = new VectorSource();
    this.highlightLayer = new VectorLayer({
      source: this.highlightSource,
      name: "bufferSelectionLayer",
      style: new Style({
        fill: new Fill({
          color: "rgba(255, 168, 231, 0.47)",
        }),
        stroke: new Stroke({
          color: "rgba(255, 168, 231, 1)",
          width: 4,
        }),
        image: new Circle({
          radius: 6,
          fill: new Fill({
            color: "rgba(255, 168, 231, 0.47)",
          }),
          stroke: new Stroke({
            color: "rgba(255, 168, 231, 1)",
            width: 1,
          }),
        }),
      }),
    });

    // Will contain the actual buffer zone features
    this.bufferSource = new VectorSource();
    this.bufferLayer = new VectorLayer({
      source: this.bufferSource,
      name: "bufferLayer",
      style: new Style({
        fill: new Fill({
          color: "rgba(255, 255, 255, 0.5)",
        }),
        stroke: new Stroke({
          color: "rgba(75, 100, 115, 1.5)",
          width: 4,
        }),
        image: new Circle({
          radius: 6,
          fill: new Fill({
            color: "rgba(255, 255, 255, 0.5)",
          }),
          stroke: new Stroke({
            color: "rgba(75, 100, 115, 1.5)",
            width: 2,
          }),
        }),
      }),
    });

    // Add layers to map
    this.map.addLayer(this.highlightLayer);
    this.map.addLayer(this.bufferLayer);
  }

  // Called onWindowShow and onWindowHide
  setActive(active) {
    if (active === false) {
      this.activateSelecting(false);
    }
  }

  activateSelecting = (v) => {
    if (v === true) {
      this.map.on("click", this.handleClick);
      this.map.clickLock.add("buffer");
    } else {
      this.map.un("click", this.handleClick);
      this.map.clickLock.delete("buffer");
    }
  };

  handleClick = (e) => {
    // Handle all vector features
    this.map
      // Get all features from all vector sources at given pixel…
      .getFeaturesAtPixel(e.pixel, {
        layerFilter: function (l) {
          const name = l.get("name");
          return name !== "bufferLayer" && name !== "bufferSelectionLayer"; // …but ignore them if they happen to come from buffer layer.
        },
      })
      // Take each of the returned features from any vector layer…
      .forEach((f) => {
        const clonedFeature = f.clone(); // …clone it…
        clonedFeature.setStyle(); // …and reset it's style (so it uses layer's default)…
        this.highlightSource.addFeature(clonedFeature); //…and add it to the highlight source (so we collect them there).
      });

    // We're done with vector sources' features (e.g from WFS layers or the Draw plugin).
    // Still we must handle visible WMS layers, see if we get any features at given coordinate
    // and if so, add them to the highlight source too.
    this.map
      .getLayers() // Grab layers…
      .getArray() // …as array…
      .filter((l) => l.getVisible()) // …only currently visible…
      .filter((l) => l.layersInfo) // …and only those that contain a "layersInfo" property - that means it's a Hajk layer - see ConfigMapper.js.
      // Each of the remaining layers must now be queried separately. Let's do it:
      .map(async (layer) => {
        // Async, as we will await some fetch.
        try {
          const subLayers = Object.values(layer.layersInfo); // Transform the object to an array of objects
          const subLayersToQuery = subLayers
            .filter((subLayer) => subLayer.queryable === true) // Use only those layers that are specifically queryable
            .map((queryableSubLayer) => queryableSubLayer.id); // Grab the id property (which is the name that we'll use in our URL)

          if (e.coordinate !== undefined) {
            const view = this.map.getView();

            const url = layer // Prepare a URL that we'll call to see if there are features at a given coordinate
              .getSource()
              // Get the URL to FeatureInfo for given layer
              .getFeatureInfoUrl(
                e.coordinate, // Use current click event coordinate - that's what we're interested in!
                view.getResolution(),
                view.getProjection().getCode(),
                {
                  INFO_FORMAT: "application/json",
                  QUERY_LAYERS: subLayersToQuery.join(","), // Use the layer names we got earlier in the query
                }
              );

            const response = await hfetch(url);
            const json = await response.json();
            const features = new GeoJSON().readFeatures(json); // Parse OL Features from returned JSON.

            this.highlightSource.addFeatures(features); // Add them to the highlight source.
          }
        } catch (error) {} // There might be errors in the fetch/JSON parse stage, keep them quiet.
      });
  };

  bufferFeatures = (distance) => {
    const arr = [];
    const parser = new jsts.io.OL3Parser();
    parser.inject(
      Point,
      LineString,
      LinearRing,
      Polygon,
      MultiPoint,
      MultiLineString,
      MultiPolygon
    );

    // Grab all selected features from highlight source…
    for (const f of this.highlightSource.getFeatures()) {
      let olGeom = f.getGeometry();
      if (olGeom instanceof Circle) {
        olGeom = Polygon.fromCircle(olGeom, 0b10000000);
      }
      const jstsGeom = parser.read(olGeom);
      const buffered = jstsGeom.buffer(distance);
      // …and create a new feature around it…
      const olf = new Feature();
      olf.setGeometry(parser.write(buffered));
      olf.setId(Math.random() * 1e20);
      // …and push it to an array…
      arr.push(olf);
    }
    // …that finally gets added to the buffer zone features source.
    this.bufferSource.addFeatures(arr);
  };

  clear = () => {
    this.highlightSource.clear();
    this.bufferSource.clear();
  };
}
export default BufferModel;
