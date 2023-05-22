using Json.Path;
using MapService.DataAccess;
using MapService.Models;
using MapService.Utility;
using System.Text.Json;
using System.Text.Json.Nodes;

namespace MapService.Business.Config
{
    /// <summary>
    /// Business logic for config endpoints
    /// </summary>
    internal static class ConfigHandler
    {
        internal static IEnumerable<UserSpecificMaps> GetUserSpecificMaps()
        {
            var mapConfigurationFiles = JsonFileDataAccess.GetMapConfigFiles();

            var mapConfigurationsList = new List<UserSpecificMaps>();

            foreach (string mapConfigurationFile in mapConfigurationFiles)
            {
                var mapConfiguration = JsonFileDataAccess.ReadMapFileAsJsonDocument(mapConfigurationFile);

                if (!HasActiveDropDownThemeMap(mapConfiguration))
                    continue;

                string mapConfigurationName = Path.GetFileNameWithoutExtension(mapConfigurationFile);
                string mapConfigurationTitle = JsonUtility.GetPropertyValueFromJsonObjectAsString(GetMapfromMapConfiguration(mapConfiguration), "title");
                var visibleForGroups = GetVisibleForGroups(mapConfiguration);

                var userSpecificMap = new UserSpecificMaps
                {
                    MapConfigurationTitle = mapConfigurationTitle,
                    MapConfigurationName = mapConfigurationName,
                    VisibleForGroups = visibleForGroups
                };

                mapConfigurationsList.Add(userSpecificMap);
            }

            return mapConfigurationsList;
        }

        private static bool HasActiveDropDownThemeMap(JsonDocument mapConfiguration)
        {
            var input = "$.tools[?(@.type == 'layerswitcher')].options.dropdownThemeMaps";
            var result = JsonPathUtility.GetJsonElement(mapConfiguration, input);

            if (result == null) { return false; }

            return result.Value.GetBoolean();
        }

        public static IEnumerable<string>? GetVisibleForGroups(JsonDocument mapConfiguration)
        {
            var input = "$.tools[?(@.type == 'layerswitcher')].options.visibleForGroups";
            var result = JsonPathUtility.GetJsonElement(mapConfiguration, input);

            if (result == null) { return null; }

            return JsonSerializer.Deserialize<IEnumerable<String>>(result.Value.GetRawText());
        }

        private static JsonObject? GetMapfromMapConfiguration(JsonDocument mapConfiguration)
        {
            var input = "$.map";
            var result = JsonPathUtility.GetJsonElement(mapConfiguration, input);

            if (result == null) { return null; }

            return JsonSerializer.Deserialize<JsonObject>(result.Value.GetRawText());
        }

        public static IEnumerable<string>? GetLayerIdsFromMapConfiguration(JsonDocument mapConfiguration)
        {
            List<string>? layerIds = new List<string>();

            // Get layer ids from baselayers in layerswitcher
            var input = "$.tools[?(@.type == 'layerswitcher')].options.baselayers[*].id";
            var result = JsonPathUtility.GetJsonArray(mapConfiguration, input);

            if (result != null)
            {
                foreach (var element in result)
                {
                    string? id = element.Value.GetString();
                    if (string.IsNullOrEmpty(id)) continue;
                    if (layerIds.Contains(id)) continue;

                    layerIds.Add(id);
                }
            }

            // Get layer ids from groups in layerswitcher
            input = "$.tools[?(@.type == 'layerswitcher')].options.groups..layers[*].id";
            result = JsonPathUtility.GetJsonArray(mapConfiguration, input);

            if (result != null)
            {
                foreach (var element in result)
                {
                    string? id = element.Value.GetString();
                    if (string.IsNullOrEmpty(id)) continue;
                    if (layerIds.Contains(id)) continue;

                    layerIds.Add(id);
                }
            }

            // Get layer ids from layers in search
            input = "$.tools[?(@.type == 'search')].options.layers[*].id";
            result = JsonPathUtility.GetJsonArray(mapConfiguration, input);

            if (result != null)
            {
                foreach (var element in result)
                {
                    string? id = element.Value.GetString();
                    if (string.IsNullOrEmpty(id)) continue;
                    if (layerIds.Contains(id)) continue;

                    layerIds.Add(id);
                }
            }

            // Get layer ids from layers in edit
            input = "$.tools[?(@.type == 'edit')].options.activeServices[*].visibleForGroups";
            var resultActiveServices = JsonPathUtility.GetJsonArray(mapConfiguration, input);
            string searchStringActiveServices = "activeServices[*].id";
            if (resultActiveServices == null || resultActiveServices.Count == 0) searchStringActiveServices = "activeServices.*";

            input = "$.tools[?(@.type == 'edit')].options." + searchStringActiveServices;
            result = JsonPathUtility.GetJsonArray(mapConfiguration, input);

            if (result != null)
            {
                foreach (var element in result)
                {
                    string? id = element.Value.GetString();
                    if (string.IsNullOrEmpty(id)) continue;
                    if (layerIds.Contains(id)) continue;

                    layerIds.Add(id);
                }
            }

            return layerIds;
        }
    }
}