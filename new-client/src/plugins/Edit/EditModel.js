import { WFS } from "ol/format";
import { Style, Stroke, Fill, Circle, RegularShape } from "ol/style";
import { MultiPoint, Polygon, MultiPolygon } from "ol/geom";
import Vector from "ol/layer/Vector";
import VectorSource from "ol/source/Vector";
import { all as strategyAll } from "ol/loadingstrategy";
import { Select, Modify, Draw, Translate } from "ol/interaction";
import { never } from "ol/events/condition";
import X2JS from "x2js";
import { hfetch } from "utils/FetchWrapper";
import { functionalOk } from "models/Cookie";
import LocalStorageHelper from "utils/LocalStorageHelper";

class EditModel {
  constructor(settings) {
    this.map = settings.map;
    this.app = settings.app;
    this.observer = settings.observer;
    this.options = settings.options;
    this.featureChangeLog = [];
    this.activeServices = this.options.activeServices;
    this.availableSnapLayers = this.options?.availableSnapLayers || [];
    this.sources = this.options.sources;
    this.snapSources = this.options.snapSources;
    this.vectorSource = undefined;
    this.layer = undefined;
    this.multipartTempSource = undefined;
    this.multipartTempLayer = undefined;
    this.select = undefined;
    this.multipartSelect = undefined;
    this.modify = undefined;
    this.key = undefined;
    this.editFeature = undefined;
    this.editFeatureBackup = undefined;
    this.editSource = undefined;
    this.removeFeature = undefined;
    this.shell = undefined;
    this.instruction = "";
    this.filty = false;
    this.removalToolMode = "off";
    this.multipartBaseFeature = undefined;
    this.activeSnapLayers = [];
    this.activeSnapSources = [];

    // Normalize the sources that come from options.
    this.options.sources = this.options.sources.map((s) => {
      // Namespace URI is required for insert. QGIS Server tends to accept this value.
      if (s.uri.trim().length === 0) {
        s.uri = "http://www.opengis.net/wfs";
      }

      // Get rid of the SERVICE=WFS attribute if existing: we will add it on the following requests
      // while QGIS Server's WFS endpoint requires the SERVICE parameter to be preset. We'd
      // end up with duplicate parameters, so the safest way around is to remove it, in a controlled
      // manner, without disturbing the URL.
      const url = new URL(s.url);
      url.searchParams.delete("service");
      s.url = url.href;

      return s;
    });
  }

  write(features) {
    let wfsVersion = this.options?.wfsVersion || "1.1.0";
    var format = new WFS(),
      lr = this.editSource.layers[0].split(":"),
      fp = lr.length === 2 ? lr[0] : "",
      ft = lr.length === 2 ? lr[1] : lr[0],
      options = {
        featureNS: this.editSource.uri,
        featurePrefix: fp,
        featureType: ft,
        hasZ: false,
        version: wfsVersion, // or "1.0.0"
        srsName: this.editSource.projection,
      };

    return format.writeTransaction(
      features.inserts,
      features.updates,
      features.deletes,
      options
    );
  }

  refreshLayer(layerName) {
    var source,
      foundLayer = this.map
        .getLayers()
        .getArray()
        .find((layer) => {
          var match = false;
          if (layer.getSource().getParams) {
            let params = layer.getSource().getParams();
            if (typeof params === "object") {
              // FIXME: Can be a bug here: we can't expect our edited layer to always be of index 0 if a LayerGroup (which gives Array so we must handle that as well)
              let paramName = Array.isArray(params.LAYERS)
                ? params.LAYERS[0].split(":")
                : params.LAYERS.split(":");
              let layerSplit = layerName.split(":");
              if (paramName.length === 2 && layerSplit.length === 2) {
                match = layerName === params.LAYERS;
              }
              if (paramName.length === 1) {
                match = layerSplit[1] === params.LAYERS;
              }
            }
          }
          return match;
        });

    if (foundLayer) {
      source = foundLayer.getSource();
      source.changed();
      source.updateParams({ time: Date.now() });
      this.map.updateSize();
    }
  }

  parseWFSTresponse(response) {
    var str =
      typeof response !== "string"
        ? new XMLSerializer().serializeToString(response)
        : response;
    return new X2JS().xml2js(str);
  }

  transact(features, done) {
    var node = this.write(features),
      serializer = new XMLSerializer(),
      src = this.editSource,
      payload = node ? serializer.serializeToString(node) : undefined;

    if (payload) {
      hfetch(src.url, {
        method: "POST",
        body: payload,
        credentials: "same-origin",
        headers: {
          "Content-Type": "text/xml",
        },
      })
        .then((response) => {
          response.text().then((wfsResponseText) => {
            const resXml = this.parseWFSTresponse(wfsResponseText);
            if (resXml.ExceptionReport || !resXml.TransactionResponse) {
              // do not delete the data so the user can submit it again
              done(resXml);
            } else {
              this.refreshLayer(src.layers[0]);
              this.vectorSource
                .getFeatures()
                .filter((f) => f.modification !== undefined)
                .forEach((f) => (f.modification = undefined));
              done(resXml);
            }
          });
        })
        .catch((response) => {
          response.text().then((errorMessage) => {
            done(errorMessage);
          });
        });
    }
  }

  findUpdatedFeatures() {
    const find = (mode) =>
      this.vectorSource
        .getFeatures()
        .filter((feature) => feature.modification === mode);

    const features = {
      updates: find("updated").map((feature) => {
        feature.unset("boundedBy");
        return feature;
      }),
      inserts: find("added"),
      deletes: find("removed"),
    };

    return features;
  }

  checkPasteIsValid(feature) {
    let allowPolygonToMultipolygon = true; //Have this here to potentially make configurable.

    // Make sure that we have both a feature to paste and a source to paste into.
    if (!feature || !this.editSource || !this.vectorSource)
      return {
        valid: false,
        message: "Kopieringsobjekt eller mållager saknas.",
      };

    let pasteFeatureGeometryType = feature.getGeometry().getType();
    let editSourceGeometryType =
      this.vectorSource.getFeatures().length > 0
        ? this.vectorSource.getFeatures()[0].getGeometry().getType()
        : "empty";

    //Handle the case that we have a Polygon/Multipolygon non-matching geometry type that we may want to copy anyway.
    if (
      allowPolygonToMultipolygon &&
      pasteFeatureGeometryType === "Polygon" &&
      editSourceGeometryType === "MultiPolygon"
    ) {
      return {
        valid: true,
        message: "",
        mixedPolygons: true,
      };
    }

    if (pasteFeatureGeometryType !== editSourceGeometryType) {
      return {
        valid: false,
        message:
          "Kopierad objektet och redigeringslagret har inte samma geometrityp",
      };
    }

    // If we reach here, there are no clear reasons why we shouldn't be able to add the copied feature to the edit layer.
    // Try to paste the feature.
    return { valid: true, message: "" };
  }

  save(done) {
    const features = this.findUpdatedFeatures();

    if (
      features.updates.length === 0 &&
      features.inserts.length === 0 &&
      features.deletes.length === 0
    ) {
      return done();
    }

    this.transact(features, done);
  }

  getSelectStyle(feature) {
    return [
      new Style({
        stroke: new Stroke({
          color: "rgba(0, 255, 255, 1)",
          width: 3,
        }),
        fill: new Fill({
          color: "rgba(0, 0, 0, 0.5)",
        }),
        image: new Circle({
          fill: new Fill({
            color: "rgba(0, 0, 0, 0.5)",
          }),
          stroke: new Stroke({
            color: "rgba(0, 255, 255, 1)",
            width: 2,
          }),
          radius: 3,
        }),
      }),
      new Style({
        image: new RegularShape({
          fill: new Fill({
            color: "rgba(0, 0, 0, 0.2)",
          }),
          stroke: new Stroke({
            color: "rgba(0, 0, 0, 1)",
            width: 2,
          }),
          points: 4,
          radius: 8,
          angle: Math.PI / 4,
        }),
        geometry: (feature) => {
          var coordinates =
            feature.getGeometry() instanceof Polygon
              ? feature.getGeometry().getCoordinates()[0]
              : feature.getGeometry().getCoordinates();
          return new MultiPoint(coordinates);
        },
      }),
    ];
  }

  getVectorStyle(feature) {
    return [
      new Style({
        stroke: new Stroke({
          color: "rgba(0, 0, 0, 1)",
          width: 3,
        }),
        fill: new Fill({
          color: "rgba(0, 0, 0, 0.5)",
        }),
        image: new Circle({
          fill: new Fill({
            color: "rgba(0, 0, 0, 0.5)",
          }),
          stroke: new Stroke({
            color: "rgba(0, 0, 0, 1)",
            width: 3,
          }),
          radius: 4,
        }),
      }),
    ];
  }

  getHiddenStyle(feature) {
    return [
      new Style({
        stroke: new Stroke({
          color: "rgba(0, 0, 0, 0)",
          width: 0,
        }),
        fill: new Fill({
          color: "rgba(1, 2, 3, 0)",
        }),
        image: new Circle({
          fill: new Fill({
            color: "rgba(0, 0, 0, 0)",
          }),
          stroke: new Stroke({
            color: "rgba(0, 0, 0, 0)",
            width: 0,
          }),
          radius: 0,
        }),
      }),
    ];
  }

  getSketchStyle() {
    return [
      new Style({
        fill: new Fill({
          color: "rgba(255, 255, 255, 0.5)",
        }),
        stroke: new Stroke({
          color: "rgba(0, 0, 0, 0.5)",
          width: 4,
        }),
        image: new Circle({
          radius: 6,
          fill: new Fill({
            color: "rgba(0, 0, 0, 0.5)",
          }),
          stroke: new Stroke({
            color: "rgba(255, 255, 255, 0.5)",
            width: 2,
          }),
        }),
      }),
    ];
  }

  getSketchMultipartStyle() {
    return new Style({
      fill: new Fill({
        color: "rgba(0, 0, 0, 0.5)",
      }),
      stroke: new Stroke({
        color: "rgba(255, 255, 0, 1)",
        width: 4,
      }),
      image: new Circle({
        radius: 6,
        fill: new Fill({
          color: "rgba(255, 255, 0, 0.5)",
        }),
        stroke: new Stroke({
          color: "rgba(255, 255, 255, 0.5)",
          width: 2,
        }),
      }),
    });
  }

  getActiveMultipartStyle() {
    return new Style({
      fill: new Fill({
        color: "rgba(255, 255, 0, 0.5)",
      }),
      stroke: new Stroke({
        color: "rgba(255, 255, 255, 1)",
        width: 3,
      }),
    });
  }

  filterByDefaultValue(features) {
    return features.filter((feature) => {
      return this.editSource.editableFields.some((field) => {
        var value = feature.getProperties()[field.name];
        if (field.hidden && value === field.defaultValue) {
          return true;
        }
        return false;
      });
    });
  }

  #filterByMapFilter(features) {
    if (functionalOk) {
      const globalMapState = LocalStorageHelper.get("globalMapState", null);
      const globalFilter = globalMapState.mapFilter;

      // If the current edit layer is marked by the global filter as a layer where the filter should be applied
      // we will need to filter apply the filter to the incoming features.
      if (globalFilter && globalFilter.filterLayers) {
        if (globalFilter.filterLayers.includes(this.editSource.id)) {
          //If it is then we need to apply a filter, on the filterProperty and filterValue
          const filterProperty = globalFilter.filterProperty;
          const filterValue = globalFilter.filterValue;
          features = features.filter((feature) => {
            if (
              feature.getProperties()[filterProperty] === filterValue.toString()
            ) {
              return true;
            }
            return false;
          });
        }
      }

      return features;
    }
    return features;
  }

  createFeatureChangeLog(features) {
    // We store an array of unsaved changes made to each feature before saving. We can use this in order to reset a change,
    // Or cancel an attribute change, without reloading the edit layer and starting from the beginning.

    //Ensure the log is empty when we create it.
    this.featureChangeLog = [];

    features.forEach((f) => {
      let featureLog = { id: f.hajkId, original: f, changes: [] };
      this.featureChangeLog.push(featureLog);
    });
  }

  addNewFeatureToChangeLog(feature) {
    // Add a new feature (for example a newly drawn feature) to the change log. The new feature goes into the changes array. It
    // Nothing gets put in 'original' as it did not exist as a feature when the editLayer was loaded.

    //Create an id that will be shared between the feature in the edit layer and the feature copy stored in the change log.
    const hajkId = Date.now() + "_" + feature.ol_uid;
    feature.hajkId = hajkId;

    const featureLog = {
      id: feature.hajkId,
      original: null,
      changes: [feature.clone()],
    };
    this.featureChangeLog.push(featureLog);
  }

  updateFeatureInChangeLog(feature) {
    // If there is a matching feature in the changelog, we will add a new change entry. Otherwise we will
    // create the first change entry in the changelog for the feature.

    // We clone the feature that we add to the change log, as we need them to actually different objects
    // Otherwise they will both get changed when we edit the feature again.
    const clonedFeature = feature.clone();
    clonedFeature.hajkId = feature.hajkId;

    const existingFeatureLog = this.featureChangeLog.find(
      (f) => (f.id = feature.hajkId)
    );

    if (existingFeatureLog) {
      existingFeatureLog.changes.push(clonedFeature);
    } else {
      this.addNewFeatureToChangeLog(feature);
    }
  }

  //Add an id to be used by the feature log.
  addHajkId(features, originalFeatures) {
    features.forEach((f, index) => {
      const hajkId = Date.now() + "_" + index.toString();
      f.hajkId = hajkId;
      originalFeatures[index].hajkId = hajkId;
    });
  }

  loadDataSuccess = (data) => {
    var format = new WFS();
    var originalFeatures;
    var features;
    try {
      originalFeatures = format.readFeatures(data);
      features = format.readFeatures(data);
    } catch (e) {
      alert("Fel: data kan inte läsas in. Kontrollera koordinatsystem.");
    }

    //If there is a global filter on the map, we take this into account. If there is no filter, all features will be returned.
    originalFeatures = this.#filterByMapFilter(originalFeatures);
    features = this.#filterByMapFilter(features);

    // Make sure we have a name for geometry column. If there are features already,
    // take a look at the first one and get geometry field's name from that first feature.
    // If there are no features however, default to 'geom'. If we don't then OL will
    // fallback to its own default geometry field name, which happens to be 'geometry' and not 'geom.
    this.geometryName =
      features.length > 0
        ? features[0].getGeometryName()
        : this.editSource.geometryField || "geom";

    if (this.editSource.editableFields.some((field) => field.hidden)) {
      originalFeatures = this.#filterByMapFilter(originalFeatures);
      features = this.filterByDefaultValue(features);
    }

    this.addHajkId(features, originalFeatures);

    // After loading the features, we initialize a change log where we will store changes that have been made to each
    // feature, but have not been saved to the server yet. This will be used to cancel/rollback unwanted changes without needing to reload the edit layer and lose other ongoing edits.
    this.createFeatureChangeLog(originalFeatures);

    this.vectorSource.addFeatures(features);
    this.vectorSource.getFeatures().forEach((feature) => {
      feature.on("propertychange", (e) => {
        if (feature.modification === "removed") {
          return;
        }
        if (feature.modification === "added") {
          return;
        }
        feature.modification = "updated";
      });
      feature.on("change", (e) => {
        if (feature.modification === "removed") {
          return;
        }
        if (feature.modification === "added") {
          return;
        }
        feature.modification = "updated";
      });
    });
  };

  loadSnapDataSuccess = (data, source) => {
    var format = new WFS();
    var features;
    try {
      features = format.readFeatures(data);
    } catch (e) {
      alert("Fel: data kan inte läsas in. Kontrollera koordinatsystem.");
    }

    //If there is a global filter on the map, we take this into account. If there is no filter, all features will be returned.
    features = this.#filterByMapFilter(features);
    this.geometryName =
      features.length > 0 ? features[0].getGeometryName() : "geom";

    let snapSource = this.activeSnapSources.find(
      (s) => s.get("snapLayerId") === source.id
    );
    snapSource.addFeatures(features);
  };

  loadSnapData(source, extent, done) {
    const url = new URL(source.url);

    const existingSearchParams = {};
    for (const [k, v] of url.searchParams.entries()) {
      existingSearchParams[k.toUpperCase()] = v;
    }

    let layer;
    if (source.layers) {
      layer = source.layers[0];
    } else {
      layer = source.layer;
    }

    const mergedSearchParams = {
      ...existingSearchParams,
      SERVICE: "WFS",
      version: "1.1.0",
      REQUEST: "GetFeature",
      TYPENAME: layer,
      SRSNAME: source.projection,
    };

    // Create a new URLSearchParams object from the merged object…
    const searchParams = new URLSearchParams(mergedSearchParams);
    // …and update our URL's search string with the new value
    url.search = searchParams.toString();

    // Send a String as HFetch doesn't currently accept true URL objects
    hfetch(url.toString())
      .then((response) => {
        if (response.status !== 200) {
          return done("data-load-error");
        }
        response.text().then((data) => {
          if (data.includes("ows:ExceptionReport")) {
            return done("data-load-error");
          }
          this.loadSnapDataSuccess(data, source);
          return done("data-load-success");
        });
      })
      .catch((error) => {
        console.warn(`Error loading vectorsource... ${error}`);
        return done("data-load-error");
      });
  }

  loadData(source, extent, done) {
    // Prepare the URL for retrieving WFS data. We will want to set
    // some search params later on, but we want to avoid any duplicates.
    // The values we will set below should override any existing, if
    // same key already exists in URL.
    // To ensure it will happen, we read the possible current params…
    const url = new URL(source.url);

    // …and make sure that the keys are in UPPER CASE.
    const existingSearchParams = {};
    for (const [k, v] of url.searchParams.entries()) {
      existingSearchParams[k.toUpperCase()] = v;
    }

    // Now we merge the possible existing params with the rest, defined
    // below. We can be confident that we won't have duplicates and that
    // our values "win", as they are defined last.

    // Quick fix to adjust for the in wfslayers config it's called layers and in
    // vectorlayers config it's called layer.
    let layer;
    if (source.layers) {
      layer = source.layers[0];
    } else {
      layer = source.layer;
    }

    const mergedSearchParams = {
      ...existingSearchParams,
      SERVICE: "WFS",
      version: "1.1.0", // or "1.0.0"
      REQUEST: "GetFeature",
      TYPENAME: layer,
      SRSNAME: source.projection,
    };

    // Create a new URLSearchParams object from the merged object…
    const searchParams = new URLSearchParams(mergedSearchParams);
    // …and update our URL's search string with the new value
    url.search = searchParams.toString();

    // Send a String as HFetch doesn't currently accept true URL objects
    hfetch(url.toString())
      .then((response) => {
        if (response.status !== 200) {
          return done("data-load-error");
        }
        response.text().then((data) => {
          if (data.includes("ows:ExceptionReport")) {
            return done("data-load-error");
          }
          this.loadDataSuccess(data);
          return done("data-load-success");
        });
      })
      .catch((error) => {
        console.warn(`Error loading vectorsource... ${error}`);
        return done("data-load-error");
      });
  }

  editAttributes(feature) {
    this.editFeature = feature;
    this.observer.publish("editFeature", feature);
  }

  featureSelected(event) {
    if (event.selected.length === 0) {
      this.editAttributes(null, null);
    }

    event.selected.forEach((feature) => {
      if (!feature.getId() && feature.getProperties().user) {
        this.select.getFeatures().remove(feature);
      }
      event.mapBrowserEvent.filty = true;
      this.editAttributes(feature);
    });
  }

  refreshEditingLayer() {
    var mapLayers = this.map
      .getLayers()
      .getArray()
      .filter(
        (layer) => layer.getProperties().caption === this.editSource.caption
      );

    mapLayers.forEach((mapLayer) => {
      if (mapLayer.getSource) {
        let s = mapLayer.getSource();
        if (s.clear) {
          s.clear();
        }
        if (s.getParams) {
          var params = s.getParams();
          params.t = new Date().getMilliseconds();
          s.updateParams(params);
        }
        if (s.changed) {
          s.changed();
        }
      }
    });
  }

  setLayer(serviceId, done) {
    this.source = this.sources.find((source) => source.id === serviceId);
    this.filty = true;
    this.vectorSource = new VectorSource({
      loader: (extent) => this.loadData(this.source, extent, done),
      strategy: strategyAll,
      projection: this.source.projection,
    });

    //Add to snapSources so we can use with the snap selector.
    this.activeSnapSources = [];

    this.vectorSource.set("snapLayerId", serviceId);
    this.activeSnapSources.push(this.vectorSource);

    // Create a source and layer to use when drawing multipolygons with the Draw interaction.
    // This is because when adding a new polygon part, we don't actually want the Draw interaction to add a new Feature
    // to our edit layer. We instead want to take the polygon created by Draw and append it to our base feature that we are adding a
    // new part to. We will then discard the temporary layer, with the feature created by Draw. We are in this way updating an existing
    // geometry, not creating a new feature.

    this.multipartTempSource = new VectorSource({
      strategy: strategyAll,
      projection: this.source.projection,
    });

    this.multidrawTempLayer = new Vector({
      layerType: "system",
      zIndex: 5000,
      name: "PluginEditMultipartLayer",
      caption: "Edit layer - Multipart temp layer",
      source: this.multipartTempSource,
      style: this.getHiddenStyle(),
    });

    this.layer = new Vector({
      layerType: "system",
      zIndex: 5000,
      name: "pluginEdit",
      caption: "Edit layer",
      source: this.vectorSource,
      style: this.getVectorStyle(),
    });

    if (this.layer) {
      this.map.removeLayer(this.layer);
    }

    if (this.multidrawTempLayer) {
      this.map.removeLayer(this.layer);
    }

    this.map.addLayer(this.layer);
    this.map.addLayer(this.multidrawTempLayer);
    this.editSource = this.source;
    this.editFeature = null;
    this.observer.publish("editSource", this.source);
    this.observer.publish("editFeature", null);
    this.observer.publish("layerChanged", this.layer);
  }

  #goToFeature = (feature) => {
    if (!feature) {
      return;
    }

    const extent = feature.getGeometry().getExtent();
    this.map.getView().fit(extent);

    //Set the map to a reasonable zoom extent - a full fit to extent was thought to be a little 'aggressive'.
    const suggestedZoomLevel = this.map.getView().getZoom() - 2;

    if (suggestedZoomLevel < this.map.getView().getMinZoom()) return;

    this.map.getView().setZoom(this.map.getView().getZoom() - 2);
  };

  #convertToMultiPolygon = (feature) => {
    if (feature.getGeometry().getType() === "Polygon") {
      let polygonCoordsArray = [feature.getGeometry().getCoordinates()];

      return new MultiPolygon(
        polygonCoordsArray,
        feature.getGeometry().getLayout()
      );
    }
  };

  // At this stage we have done a check on the geometry validity that the geometry types match.
  // The variable mixed polygons, will be true if our feature to paste is a Polygon, and our edit layer is a MultiPolygon.
  pasteFeature(feature, mixedPolygons) {
    // Here we are pasting into draw interaction layer being edited by the edit tool.
    // The Geometry name was set when the draw interaction was created (as this.geometryName), so we need to make sure
    // That when we paste in our feature, we give it the same geometry name as the draw interaction was given.

    let updateGeometry = mixedPolygons
      ? this.#convertToMultiPolygon(feature)
      : feature.getGeometry();

    //If our geometry names differ, add a geometry property under the correct geometry name (the name the edit source is using).
    if (this.geometryName !== feature.getGeometryName()) {
      const newGeometryName = this.geometryName;

      let newGeomProperty = { [newGeometryName]: updateGeometry };

      feature.setProperties(newGeomProperty);
      feature.setGeometryName(newGeometryName);
    }

    //Add our feature to the current edit drawing layer.
    this.vectorSource.addFeature(feature);

    // Add the 'added' flag, so that The edit tool knows that it is changed.
    feature.modification = "added";
    //Center on the feature - as the user has not drawn the feature we need to make it clear which feature has been added.
    this.#goToFeature(feature);

    // Call this.editAttributes otherwise we will never jump to the attribute step in the edit menu.
    this.editAttributes(feature);

    setTimeout(() => {
      this.deactivateInteraction();
    }, 1);
  }

  activateModify() {
    this.select = new Select({
      style: this.getSelectStyle(),
      toggleCondition: never,
      layers: [this.layer],
    });

    this.select.on("select", (event) => {
      this.featureSelected(event, this.source);
    });

    this.modify = new Modify({
      features: this.select.getFeatures(),
    });
    this.map.addInteraction(this.select);
    this.map.addInteraction(this.modify);
    this.map.clickLock.add("edit");
  }

  handleMultipartDrawn = (drawnMultipart) => {
    const existingGeometry = this.multipartBaseFeature.getGeometry();
    const newPartGeometry = drawnMultipart.getGeometry();

    existingGeometry.appendPolygon(newPartGeometry);
    this.multipartBaseFeature.modification = "updated";

    this.observer.publish("multipart-added");
  };

  multipartBaseSelected = (event) => {
    if (event.selected.length === 0) {
      return;
    }

    this.multipartBaseFeature = event.selected[0];
    //Highlight the base feature being edited, to give the user a chance to know what they are adding a part to.
    this.multipartBaseFeature.setStyle(this.getActiveMultipartStyle());

    //Get the correct geometryLayout (XY or XYZ) to provide to the Draw interaction.
    const layout = this.multipartBaseFeature.getGeometry().getLayout();

    //Create and add a draw event for drawing the new part.
    this.draw = new Draw({
      source: this.multipartTempSource,
      traceSource: this.vectorSource,
      trace: false,
      style: this.getSketchMultipartStyle(),
      type: "Polygon",
      stopClick: true,
      geometryName: this.geometryName,
      geometryLayout: layout,
    });
    this.draw.on("drawend", (event) => {
      this.handleMultipartDrawn(event.feature);
      setTimeout(() => {
        // Elsewhere in the Edit tool we have delayed deactivating the Draw interaction
        // In order to avoid an unwanted doubleclick zoom. We do the the same here.
        this.deactivateInteraction();
      }, 1);
    });

    this.map.addInteraction(this.draw);
  };

  activateAdd(geometryType) {
    this.draw = new Draw({
      source: this.vectorSource,
      traceSource: this.vectorSource,
      trace: false,
      style: this.getSketchStyle(),
      type: geometryType,
      stopClick: true,
      geometryName: this.geometryName,
    });
    this.draw.on("drawend", (event) => {
      event.feature.modification = "added";
      this.editAttributes(event.feature);
      // OpenLayers seems to have a problem stopping the clicks if
      // the draw interaction is removed too early. This fix is not pretty,
      // but it gets the job done. It seems to be enough to remove the draw
      // interaction after one cpu-cycle.
      // If this is not added, the user will get a zoom-event when closing
      // a polygon drawing.
      setTimeout(() => {
        this.deactivateInteraction();
      }, 1);
    });
    this.map.addInteraction(this.draw);
    this.map.clickLock.add("edit");
  }

  activateAddMultipart() {
    this.multipartSelect = new Select({
      style: this.getSelectStyle(),
      toggleCondition: never,
      layers: [this.layer],
    });

    this.multipartSelect.on("select", (event) => {
      this.multipartBaseSelected(event, this.source);
    });
    this.map.addInteraction(this.multipartSelect);
  }

  activateRemove() {
    this.remove = true;
    this.map.on("singleclick", this.removeSelected);
  }

  activateRemoveMultipart() {
    this.remove = true;
    this.map.on("singleclick", (event) => {
      this.removeSelectedMultipart(event);
    });
  }

  activateMove() {
    this.move = new Translate({
      layers: [this.layer],
    });
    this.map.addInteraction(this.move);
  }

  activateSnapping() {
    this.map.snapHelper.addWithSources("edit", this.activeSnapSources);

    this.observer.publish("edit-snap-changed", true);
  }

  deactivateSnapping() {
    this.map.snapHelper.delete("edit");
    this.activeSnapLayers.forEach((l) => this.map.removeLayer(l));
    this.observer.publish("edit-snap-changed", false);
  }

  changeSnapLayers(snapLayers) {
    // Remove the existing snap for the edit tool.
    this.map.snapHelper.delete("edit");

    //Remove any existing layers.
    this.activeSnapLayers.forEach((l) => this.map.removeLayer(l));

    //Reset the test layers and sources:
    this.activeSnapLayers = [];
    this.activeSnapSources = [];

    //We will need to make several sources for snapping.
    snapLayers.forEach((snapLayer) => {
      //Special case if the layer is the current editing layer. //In this case we want to push the edit layer vector source and layer to snap.
      if (snapLayer.id === this.layer.id) {
        this.activeSnapSources.push(this.vectorSource);
      } else {
        let snapShadowSource = new VectorSource({
          loader: (extent) => this.loadSnapData(snapLayer, extent, () => {}),
          strategy: strategyAll,
          projection: snapLayer.projection,
        });
        snapShadowSource.set("snapLayerId", snapLayer.id);
        this.activeSnapSources.push(snapShadowSource);

        let snapShadowLayer = new Vector({
          layerType: "system",
          zIndex: 5000,
          name: "pluginEditSnap",
          caption: "Edit layer Snap",
          source: snapShadowSource,
          style: this.getHiddenStyle(),
        });

        this.activeSnapLayers.push(snapShadowLayer);
      }
    });

    if (this.activeSnapSources.length > 0) {
      this.activeSnapLayers.forEach((l) => this.map.addLayer(l));
      this.map.snapHelper.addWithSources("edit", this.activeSnapSources);
    }
  }

  activateTracing() {
    // For tracing to be of any use, we need to have snapping active, so let's activate snapping
    // As a part of activating tracing.
    this.activateSnapping();

    // The setTrace method on the Draw interaction is not mentioned anywhere in the OpenLayers documentation, but is there
    // as a public method in the source code of Draw.js that does just what we need. This way of tracing is fairly new in
    // OpenLayers (https://github.com/openlayers/openlayers/pull/14046).
    if (this.draw) {
      this.draw.setTrace(true);
      this.observer.publish("edit-trace-changed", true);
    }
  }

  deactivateTracing() {
    if (this.draw) {
      this.draw.setTrace(false);
      this.observer.publish("edit-trace-changed", false);
    }
  }

  activateInteraction(type, geometryType) {
    if (type === "add") {
      this.activateAdd(geometryType);
      this.activateSnapping();
    }
    if (type === "move") {
      this.activateMove();
      this.activateSnapping();
    }
    if (type === "modify") {
      this.activateModify();
      this.activateSnapping();
    }
    if (type === "remove") {
      this.map.clickLock.add("edit");
      this.activateRemove();
    }
    if (type === "addMultipart") {
      this.map.clickLock.add("edit");
      this.activateAddMultipart();
    }
    if (type === "removeMultipart") {
      this.map.clickLock.add("edit");
      this.activateRemoveMultipart();
    }
  }

  removeSelected = (e) => {
    this.map.forEachFeatureAtPixel(e.pixel, (feature) => {
      if (this.vectorSource.getFeatures().some((f) => f === feature)) {
        if (feature.modification === "added") {
          feature.modification = undefined;
        } else {
          feature.modification = "removed";
        }
        feature.setStyle(this.getHiddenStyle());
      }
    });
  };

  removeSelectedMultipart = (e) => {
    this.map.forEachFeatureAtPixel(e.pixel, (feature) => {
      // TODO - Is the current behaviour a bug that  if you have for example 4 features on top of each other it would delete all of them.
      // Alternative would be to delete one at a time, which feels more intuitive.
      const clickedCoordinate = this.map.getCoordinateFromPixel(e.pixel);

      if (this.vectorSource.getFeatures().some((f) => f === feature)) {
        // How do we deal with finding out if it should still be "updated".
        // For example, they added 3 polygon parts. And then removed some.
        // Need to do some kind of comparison to the original feature.

        if (feature.getGeometry().getPolygons().length > 1) {
          const remainingPolygons = [];

          feature
            .getGeometry()
            .getPolygons()
            .forEach((polygonPart) => {
              //Keep the polygons that were not clicked on.
              if (!polygonPart.intersectsCoordinate(clickedCoordinate)) {
                remainingPolygons.push(polygonPart);
              }
            });

          feature.setGeometry(
            new MultiPolygon(
              remainingPolygons,
              feature.getGeometry().getLayout()
            )
          );
          //When removing only a part, we want to update the feature, not remove it.
          feature.modification = "updated";
        } else {
          // In this case, we have a MultiPolygon of only one part, and we should delete the entire feature
          // In the same way as the normal delete button.

          if (feature.modification === "added") {
            feature.modification = undefined;
          } else {
            feature.modification = "removed";
          }
          feature.setStyle(this.getHiddenStyle());
        }
      }
    });
  };

  deactivateInteraction() {
    // First remove the snap interaction
    this.deactivateSnapping();
    this.deactivateTracing();

    // Next, remove correct map interaction
    if (this.select) {
      this.map.removeInteraction(this.select);
    }
    if (this.modify) {
      this.map.removeInteraction(this.modify);
    }
    if (this.draw) {
      this.map.removeInteraction(this.draw);
    }
    if (this.move) {
      this.map.removeInteraction(this.move);
    }
    if (this.multipartSelect) {
      this.map.removeInteraction(this.multipartSelect);
    }
    if (this.remove) {
      this.remove = false;
      this.map.clickLock.delete("edit");
      this.map.un("singleclick", this.removeSelected);
    }
  }

  reset() {
    this.featureChangeLog = [];
    this.editSource = undefined;
    this.editFeature = undefined;
    this.removeFeature = undefined;
    this.removalToolMode = "off";
    this.filty = false;
    this.map.clickLock.delete("edit");

    if (this.layer) {
      this.map.removeLayer(this.layer);
      this.layer = undefined;
    }
    if (this.multidrawTempLayer) {
      this.map.removeLayer(this.multidrawTempLayer);
      this.multidrawTempLayer = undefined;
    }
    this.deactivateInteraction();
  }

  resetEditFeature = () => {
    this.editFeatureBackup = this.editFeature;
    this.editFeature = undefined;
    this.observer.publish("editFeature", this.editFeature);
  };

  deactivate() {
    this.reset();
    this.observer.publish("editFeature", this.editFeature);
    this.observer.publish("editSource", this.editSource);
    this.observer.publish("deactivate");
  }

  getSources() {
    return this.options.sources;
  }
}

export default EditModel;
