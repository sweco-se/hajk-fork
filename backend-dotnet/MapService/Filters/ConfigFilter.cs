using MapService.Models;
using System.Text.Json;
using MapService.Business.Config;
using MapService.Utility;
using System.Text.Json.Nodes;
using System.Linq;
using MapService.Business.MapConfig;
using static System.Net.Mime.MediaTypeNames;
using System.Xml.Linq;

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

        internal static JsonObject FilterMaps(string map, IEnumerable<string>? adUserGroups)
        {
            JsonDocument mapDocument = MapConfigHandler.GetMapAsJsonDocument(map);
            JsonObject filteredMapObjects = MapConfigHandler.GetMapAsJsonObject(map);

            if (adUserGroups == null || !adUserGroups.Any()) { return filteredMapObjects; }

            var visibleForGroups = ConfigHandler.GetVisibleForGroups(mapDocument);

            if (visibleForGroups == null || !visibleForGroups.Any()) { return filteredMapObjects; }
            bool isGroupsMatched = false;
            foreach (var visibleForGroup in visibleForGroups)
            {
                if (adUserGroups.Contains(visibleForGroup))
                {
                    isGroupsMatched = true;
                    break;
                }
            }
            //Return all map objects or throw exception
            if (!isGroupsMatched)
            {
                throw new Exception("[getMapConfig] Access to that map not allowed for this user.");
            }

            #region filter baselayers
            var inputOptions = "$.tools[?(@.type == 'layerswitcher')].options";
            var resultOptions = JsonPathUtility.GetJsonElement(mapDocument, inputOptions);
            JsonElement baselayers = resultOptions.Value.GetProperty("baselayers");
            JsonArray filteredBaseLayers = JsonUtility.FilterLayers(adUserGroups, baselayers);

            JsonUtility.SetBaseLayersFromJsonObject(filteredMapObjects, filteredBaseLayers);
            #endregion


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
            #endregion

            FilterToolsInMap(filteredMapObjects, mapDocument, adUserGroups);

            return filteredMapObjects;
        }

        internal static void FilterToolsInMap(JsonObject filteredMapObjects, JsonDocument mapDocument, IEnumerable<string>? adUserGroups)
        {
            if (adUserGroups is null || adUserGroups.Count() == 0)
                return;

            //Get array of all map config tools
            var input = "$.tools[*].type";
            var mapTools = JsonPathUtility.GetJsonArray(mapDocument, input);

            if (mapTools is null)
                return;

            JsonArray filteredToolsArray = new JsonArray();

            //Check the adUserGroups against each tool's visibileForGroups array, and add tool to the filteredToolsArray if it should be visible for this user
            foreach (var mapTool in mapTools)
            {
                var tool = JsonSerializer.Deserialize<string>(mapTool.Value.GetRawText());
                if (tool is null) 
                    continue;

                var inputVisibleForGroups = "$.tools[?(@.type == '" + tool + "')].options.visibleForGroups";
                var resultVisibleForGroups = JsonPathUtility.GetJsonElement(mapDocument, inputVisibleForGroups);

                if (resultVisibleForGroups is null || resultVisibleForGroups.Value.ValueKind != JsonValueKind.Array) //Value not set -> tool is visible for all users
                {
                    var filteredTool = ConfigHandler.GetToolFromMapConfiguration(mapDocument, tool);
                    if (filteredTool is not null )
                        filteredToolsArray.Add(filteredTool);
                    continue;
                }

                var visibleFroGroupsArray = resultVisibleForGroups.Value.EnumerateArray();
                if (visibleFroGroupsArray.Count() == 0) //No groups specified -> tool is visible for all users
                {
                    var filteredTool = ConfigHandler.GetToolFromMapConfiguration(mapDocument, tool);
                    if (filteredTool is not null)
                        filteredToolsArray.Add(filteredTool);
                    continue;
                }

                foreach (var group in visibleFroGroupsArray)
                {
                    if (group.ValueKind != JsonValueKind.String)
                        continue;

                    if (adUserGroups.Contains(group.GetString()))
                    {
                        var filteredTool = ConfigHandler.GetToolFromMapConfiguration(mapDocument, tool);
                        if (filteredTool is not null)
                            filteredToolsArray.Add(filteredTool);
                        break;
                    }
                }
            }

            // Overwrite the current map tools with the filtered tools
            filteredMapObjects["tools"] = filteredToolsArray;
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