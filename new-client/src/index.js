// Removing this causes some of the older but still common devices (e.g. iOS 12, 13)
// to run into trouble.
import "react-app-polyfill/stable";

// iOS 12 and other older touch devices need this polyfill to
// support OpenLayers map interactions through Pointer Events API.
// See: https://github.com/hajkmap/Hajk/issues/606
import "elm-pep";
// In order to support iOS 12 we need this polyfill too:
import "core-js/features/promise/all-settled";

// Since we don't want to download roboto from the Google CDN,
// we use fontSource and import all subsets that MUI relies on here.
import "@fontsource/roboto/300.css";
import "@fontsource/roboto/400.css";
import "@fontsource/roboto/500.css";
import "@fontsource/roboto/700.css";

// We want to support open-sans locally as well (If someone sets open-sans
// in the customTheme.json, we still want to avoid requests to outside CDN)
import "@fontsource/open-sans";

// The documentHandler imports icons in a dynamic way. To avoid requests against
// an outside CDN, we make sure to install the required font for the icons as well.
import "@fontsource/material-icons";

import "ol/ol.css";
import "./custom-ol.css";

import React from "react";
import { createRoot } from "react-dom/client";
import buildConfig from "./buildConfig.json";
import ErrorIcon from "@mui/icons-material/Error";
import HajkThemeProvider from "./components/HajkThemeProvider";
import { initHFetch, hfetch, initFetchWrapper } from "utils/FetchWrapper";
import LocalStorageHelper from "utils/LocalStorageHelper";
import { getMergedSearchAndHashParams } from "utils/getMergedSearchAndHashParams";

initHFetch();

let networkErrorMessage =
  "Nätverksfel. Prova att ladda om applikationen genom att trycka på F5 på ditt tangentbord.";
let parseErrorMessage =
  "Fel när applikationen skulle läsas in. Detta beror troligtvis på ett konfigurationsfel. Försök igen senare.";

const domRoot = createRoot(document.getElementById("root"));

const renderError = (message, err) => {
  console.error(err);
  domRoot.render(
    <div className="start-error">
      <div>
        <ErrorIcon />
      </div>
      <div>{message}</div>
    </div>
  );
};

/**
 * Entry point to Hajk.
 * We start with a fetching appConfig.json, that is expected
 * to be located in the same directory as index.js.
 *
 * appConfig.json includes URL to the backend application (called MapService),
 * as well as the default preferred map configuration's file name.
 */
hfetch("appConfig.json", { cacheBuster: true })
  .then((appConfigResponse) => {
    appConfigResponse.json().then((appConfig) => {
      // Update hfetch with loaded config.
      initFetchWrapper(appConfig);
      // See if we have site-specific error messages
      if (appConfig.networkErrorMessage)
        networkErrorMessage = appConfig.networkErrorMessage;
      if (appConfig.parseErrorMessage)
        parseErrorMessage = appConfig.parseErrorMessage;

      // Grab URL params and save for later use
      const initialURLParams = getMergedSearchAndHashParams();

      // If m param is supplied, try loading a map with that name
      // or else, fall back to default from appConfig.json
      let activeMap = initialURLParams.has("m")
        ? initialURLParams.get("m")
        : appConfig.defaultMap;

      // Check if mapserviceBase is set in appConfig. If it is not, we will
      // fall back on the simple map and layer configurations found in /public.
      const useMapService =
        appConfig.mapserviceBase && appConfig.mapserviceBase.trim().length > 0;

      const useNewApi = appConfig.experimentalNewApi === true;

      // Declare fetchMapConfig() that we'll use later on.
      //
      // The name of map config to fetch comes from appConfig.json's "defaultMap"
      // parameter, but it can be overridden by the "m" URL param.
      //
      // This can lead to a number of problems when users specify non-existing
      // map configs or if a map config's name has been changed.
      //
      // To avoid this, we first try to fetch the user-specified file,
      // but if that fails, we fall back to the hard-coded "defaultMap".
      const fetchMapConfig = async () => {
        // If the optional, experimental, consolidated loading process is active,
        // change the API from v1 to v2:
        const mapserviceBase =
          useNewApi === true
            ? appConfig.mapserviceBase.replace("v1", "v2")
            : appConfig.mapserviceBase;

        // This saves us some keystrokes later on…
        const configUrl = `${appConfig.proxy}${mapserviceBase}/config`;
        try {
          // Try to fetch user-specified config. Return it if OK.
          return await hfetch(`${configUrl}/${activeMap}`);
        } catch {
          // If the previous attempt fails reset "activeMap" to hard-coded value…
          activeMap = appConfig.defaultMap;
          // …and fetch again.
          return await hfetch(`${configUrl}/${activeMap}`);
        }
      };

      if (useNewApi === true) {
        Promise.all([
          fetchMapConfig(),
          hfetch("customTheme.json", { cacheBuster: true }),
        ])
          .then(([mapConfigResponse, customThemeResponse]) => {
            Promise.all([mapConfigResponse.json(), customThemeResponse.json()])
              .then(([mapConfig, customTheme]) => {
                const config = {
                  activeMap: useMapService ? activeMap : "simpleMapConfig", // If we are not utilizing mapService, we know that the active map must be "simpleMapConfig".
                  appConfig: appConfig,
                  layersConfig: mapConfig.layersConfig,
                  mapConfig: mapConfig.mapConfig,
                  userDetails: mapConfig.userDetails,
                  userSpecificMaps: mapConfig.userSpecificMaps,
                  initialURLParams,
                };

                // TODO: Watchout - this can be a controversial introduction!
                // Before we merge, ensure that we really want this!
                // Why am I adding it? The examples/embedded.html shows Hajk running
                // in an IFRAME and allows it to be controlled by changing the SRC
                // attribute of the IFRAME. In that file, there are two buttons (one
                // to increase and another one to decrease the zoom level). However,
                // we don't want to zoom past map's zoom limits. At first I used some
                // hard-coded values for min/max zoom, but these will vary depending on
                // map config. So I figured out that we could expose some of Hajk's settings
                // on the global object. That way, the IFRAME's parent document can read
                // those values and use to check that we don't allow zooming past limits.
                //
                // We can of course add more things that can be "nice to have" for an
                // embedded solution. In addition to parameters, we could expose some API
                // that would control the map itself! But it should be carefully crafted.
                //
                // For the sake of this example, I'm committing this basic object:
                window.hajkPublicApi = {
                  maxZoom: config.mapConfig.map.maxZoom,
                  minZoom: config.mapConfig.map.minZoom,
                };

                // At this stage, we know for sure what activeMap is, so we can initiate the LocalStorageHelper
                LocalStorageHelper.setKeyName(config.activeMap);

                // Invoke React's renderer. Render Theme. Theme will render App.
                domRoot.render(
                  <HajkThemeProvider
                    activeTools={buildConfig.activeTools}
                    config={config}
                    customTheme={customTheme}
                  />
                );
              })
              .catch((err) => renderError(parseErrorMessage, err));
          })
          .catch((err) => renderError(networkErrorMessage, err));
      } else {
        // Next, we do 3 necessary requests to get the map, layers, and customTheme configurations.
        Promise.all([
          // Get the layers configuration from mapService (if mapService is not active, we fall back on the local
          // "simpleLayerConfig" configuration file
          useMapService
            ? hfetch(
                `${appConfig.proxy}${appConfig.mapserviceBase}/config/layers`
              )
            : hfetch("simpleLayersConfig.json", { cacheBuster: true }),
          // Get the specific, requested map configuration (if mapService is not active, we fall back on the local
          // "simpleMapConfig" configuration file).
          useMapService
            ? fetchMapConfig()
            : hfetch("simpleMapConfig.json", { cacheBuster: true }),
          // Additionally, we fetch a custom theme that allows site admins to override
          // the default MUI theme without re-compiling the application.
          hfetch("customTheme.json", { cacheBuster: true }),
        ])
          .then(
            ([
              layersConfigResponse,
              mapConfigResponse,
              customThemeResponse,
            ]) => {
              Promise.all([
                layersConfigResponse.json(),
                mapConfigResponse.json(),
                customThemeResponse.json(),
              ])
                .then(([layersConfig, mapConfig, customTheme]) => {
                  // The fetched files are decoded to Objects and placed in
                  // another object, @name config.
                  const config = {
                    activeMap: useMapService ? activeMap : "simpleMapConfig", // If we are not utilizing mapService, we know that the active map must be "simpleMapConfig".
                    appConfig: appConfig,
                    layersConfig: layersConfig,
                    mapConfig: mapConfig,
                    initialURLParams,
                  };

                  window.hajkPublicApi = {
                    maxZoom: config.mapConfig.map.maxZoom,
                    minZoom: config.mapConfig.map.minZoom,
                  };

                  // At this stage, we know for sure what activeMap is, so we can initiate the LocalStorageHelper
                  LocalStorageHelper.setKeyName(config.activeMap);

                  // Make sure that the current user is allowed to display the current map
                  const layerSwitcherConfig = config.mapConfig.tools.find(
                    (tool) => tool.type === "layerswitcher"
                  );
                  if (layerSwitcherConfig === undefined) {
                    throw new Error(
                      "noLayerSwitcher: " +
                        (config.appConfig.noLayerSwitcherMessage === undefined
                          ? "This map has no layerSwitcher indicating that you are not allowed to use this map!"
                          : config.appConfig.noLayerSwitcherMessage)
                    );
                  }

                  // Invoke React's renderer. Render Theme. Theme will render App.
                  domRoot.render(
                    <HajkThemeProvider
                      activeTools={buildConfig.activeTools}
                      config={config}
                      customTheme={customTheme}
                    />
                  );
                })
                .catch((err) => {
                  console.error("Parse error: ", err.message);
                  let errMsg = parseErrorMessage;
                  if (err.message.startsWith("noLayerSwitcher:")) {
                    errMsg = err.message.substr(err.message.indexOf(":") + 2);
                  }
                  renderError(errMsg, err);
                });
            }
          )
          .catch((err) => {
            renderError(networkErrorMessage, err);
          });
      }
    });
  })
  .catch((err) => {
    renderError(networkErrorMessage, err);
  });
