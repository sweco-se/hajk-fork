using MapService.Business.Config;
using MapService.Business.MapConfig;
using MapService.Models;
using MapService.Utility;
using System.Text.Json;
using System.Text.Json.Nodes;

namespace MapService.Filters
{
    internal static class ConfigFilter
    {
        internal static IEnumerable<UserSpecificMaps> FilterUserSpecificMaps(IEnumerable<UserSpecificMaps> userSpecificMaps, IEnumerable<string>? adUserGroups)
        {
            var filteredUserSpecificMaps = new List<UserSpecificMaps>();

            if (adUserGroups == null || !adUserGroups.Any()) { return filteredUserSpecificMaps; }

            foreach (var userSpecificMap in userSpecificMaps)
            {
                if (userSpecificMap.VisibleForGroups == null || !userSpecificMap.VisibleForGroups.Any() ||
                    adUserGroups.Any(adUserGroup => userSpecificMap.VisibleForGroups.Any(visibleForGroup => visibleForGroup == adUserGroup)))
                {
                    filteredUserSpecificMaps.Add(userSpecificMap);
                }
            }

            return filteredUserSpecificMaps;
        }

        internal static JsonObject? FilterMaps(string map, IEnumerable<string>? adUserGroups)
        {
            JsonDocument mapDocument = MapConfigHandler.GetMapAsJsonDocument(map);
            JsonObject filteredMapObjects = MapConfigHandler.GetMapAsJsonObject(map);

            var visibleForGroups = ConfigHandler.GetVisibleForGroups(mapDocument);

            if (visibleForGroups == null || !visibleForGroups.Any()) { return filteredMapObjects; }

            if (adUserGroups == null || !adUserGroups.Any()) { return null; }

            bool isGroupsMatched = false;

            foreach (var visibleForGroup in visibleForGroups)
            {
                if (adUserGroups.Contains(visibleForGroup))
                {
                    isGroupsMatched = true;
                    break;
                }
            }

            if (!isGroupsMatched)
            {
                return null;
            }

            #region filter baselayers

            var inputOptions = "$.tools[?(@.type == 'layerswitcher')].options";
            var resultOptions = JsonPathUtility.GetJsonElement(mapDocument, inputOptions);
            JsonElement baselayers = resultOptions.Value.GetProperty("baselayers");
            JsonArray filteredBaseLayers = JsonUtility.FilterLayers(adUserGroups, baselayers);

            JsonUtility.SetBaseLayersFromJsonObject(filteredMapObjects, filteredBaseLayers);

            #endregion filter baselayers

            #region filter groups

            var inputGroups = "$.tools[?(@.type == 'layerswitcher')].options.groups";
            var resultGroups = JsonPathUtility.GetJsonElement(mapDocument, inputGroups);

            foreach (JsonElement jsonElement in resultGroups.Value.EnumerateArray())
            {
                JsonElement layersInGroup = jsonElement.GetProperty("layers");
                JsonElement idOfGroup = jsonElement.GetProperty("id");
                JsonArray filteredLayersInGroup = JsonUtility.FilterLayers(adUserGroups, layersInGroup);

                JsonUtility.SetLayersInGroupFromJsonObject(filteredMapObjects, filteredLayersInGroup, idOfGroup);
            }

            #endregion filter groups

            return filteredMapObjects;
        }

        internal static JsonObject FilterLayersBasedOnMapConfig(JsonDocument mapConfiguration, JsonDocument layers)
        {
            JsonObject filteredLayers = new JsonObject();
            JsonElement root = layers.RootElement;
            var layerIds = ConfigHandler.GetLayerIdsFromMapConfiguration(mapConfiguration);

            foreach (JsonProperty property in root.EnumerateObject())
            {
                string propertyName = property.Name;
                JsonElement propertyValue = property.Value;

                JsonArray layersArray = new JsonArray();
                foreach (JsonElement jsonElement in propertyValue.EnumerateArray())
                {
                    JsonElement idOfLayer = jsonElement.GetProperty("id");
                    if (layerIds.Contains(idOfLayer.ToString()))
                    {
                        layersArray.Add(jsonElement);
                    }
                }

                // Check if key is already in the resulting JsonObject add the jsonArray it to the existing json node
                if (filteredLayers.ContainsKey(propertyName))
                {
                    JsonArray existingLayersArray = filteredLayers[propertyName].AsArray();

                    foreach (var node in layersArray)
                    {
                        var clonedNode = JsonUtility.CloneJsonNodeFromJsonNode(node);
                        existingLayersArray.Add(clonedNode);
                    }

                    filteredLayers[propertyName] = existingLayersArray;
                }
                else // Create a new json node
                {
                    filteredLayers.Add(propertyName, layersArray);
                }
            }

            return filteredLayers;
        }
    }
}