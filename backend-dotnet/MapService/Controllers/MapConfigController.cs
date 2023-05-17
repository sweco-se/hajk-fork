﻿using MapService.Business.Ad;
using MapService.Business.MapConfig;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Caching.Memory;
using Swashbuckle.AspNetCore.Annotations;
using System.Text.Json;
using System.Text.Json.Nodes;

namespace MapService.Controllers
{
    [Route("mapconfig")]
    [Produces("application/json")]
    [ApiController]
    public class MapConfigController : ControllerBase
    {
        private readonly IMemoryCache _memoryCache;
        private readonly ILogger<MapConfigController> _logger;

        public MapConfigController(IMemoryCache memoryCache, ILogger<MapConfigController> logger)
        {
            _memoryCache = memoryCache;
            _logger = logger;
        }

        /// <remarks>
        /// List available layers, do not apply any visibility restrictions (required for Admin UI)
        /// </remarks>
        /// <param name="userPrincipalName">User name that will be supplied to AD</param>
        /// <response code="200">All layers were fetched successfully</response>
        /// <response code="403">Forbidden</response>
        /// <response code="500">Internal Server Error</response>
        [HttpGet]
        [Route("layers")]
        [ProducesResponseType(StatusCodes.Status200OK)]
        [ProducesResponseType(StatusCodes.Status403Forbidden)]
        [ProducesResponseType(StatusCodes.Status500InternalServerError)]
        [SwaggerOperation(Tags = new[] { "Admin - Maps and layers" })]
        public ActionResult GetLayers([FromHeader(Name = "X-Control-Header")] string? userPrincipalName = null)
        {
            JsonDocument layers;

            try
            {
                if (AdHandler.AdIsActive)
                {
                    var adHandler = new AdHandler(_memoryCache, _logger);

                    userPrincipalName = adHandler.PickUserNameToUse(Request, userPrincipalName);

                    if (!adHandler.UserIsValid(userPrincipalName) || !AdHandler.UserHasAdAccess(userPrincipalName))
                    {
                        return StatusCode(StatusCodes.Status403Forbidden, "Forbidden");
                    }
                }

                var appDataFolderPath = MapService.Utility.PathUtility.GetPath("DataContent:Path");
                _logger.LogInformation("GetLayers DataFolderPath: {appDataFolderPath} ", appDataFolderPath);

                layers = MapConfigHandler.GetLayersAsJsonDocument();
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Internal Server Error");
                return StatusCode(StatusCodes.Status500InternalServerError, "Internal Server Error");
            }

            return StatusCode(StatusCodes.Status200OK, layers);
        }

        /// <remarks>
        /// Gets a map as a JsonObject
        /// </remarks>
        /// <param name="map">The name of the map including the file ending</param>
        /// <param name="userPrincipalName">User name that will be supplied to AD</param>
        /// <returns>Returns a map as a JsonObject</returns>
        /// <response code="200">The map object fetched successfully</response>
        /// <response code="403">Forbidden</response>
        /// <response code="500">Internal Server Error</response>
        [HttpGet]
        [Route("{map}")]
        [ProducesResponseType(StatusCodes.Status200OK)]
        [ProducesResponseType(StatusCodes.Status403Forbidden)]
        [ProducesResponseType(StatusCodes.Status500InternalServerError)]
        [SwaggerOperation(Tags = new[] { "Admin - Maps and layers" })]
        public ActionResult GetMap(string map, [FromHeader(Name = "X-Control-Header")] string userPrincipalName)
        {
            JsonDocument mapDocument;

            try
            {
                if (AdHandler.AdIsActive)
                {
                    var adHandler = new AdHandler(_memoryCache, _logger);
                    userPrincipalName = adHandler.PickUserNameToUse(Request, userPrincipalName);

                    if (!adHandler.UserIsValid(userPrincipalName) || !AdHandler.UserHasAdAccess(userPrincipalName))
                    {
                        return StatusCode(StatusCodes.Status403Forbidden, "Forbidden");
                    }
                }

                mapDocument = MapConfigHandler.GetMapAsJsonDocument(map);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Internal server error");
                return StatusCode(StatusCodes.Status500InternalServerError, "Internal Server Error");
            }

            return StatusCode(StatusCodes.Status200OK, mapDocument);
        }

        /// <remarks>
        /// Create a new map configuration by duplicating an existing one
        /// </remarks>
        /// <param name="nameFrom">Name of the map to be duplicated</param>
        /// <param name="nameTo">Name of the new map (the duplicate)</param>
        /// <param name="userPrincipalName">User name that will be supplied to AD</param>
        /// <response code="200">Success</response>
        /// <response code="403">Forbidden</response>
        /// <response code="500">Internal Server Error</response>
        [HttpPut]
        [Route("duplicate/{nameFrom}/{nameTo}")]
        [ProducesResponseType(StatusCodes.Status200OK)]
        [ProducesResponseType(StatusCodes.Status403Forbidden)]
        [ProducesResponseType(StatusCodes.Status500InternalServerError)]
        [SwaggerOperation(Tags = new[] { "Admin - Maps and layers" })]
        public ActionResult DuplicateMap(string nameFrom, string nameTo, [FromHeader(Name = "X-Control-Header")] string? userPrincipalName = null)
        {
            try
            {
                if (AdHandler.AdIsActive)
                {
                    var adHandler = new AdHandler(_memoryCache, _logger);

                    userPrincipalName = adHandler.PickUserNameToUse(Request, userPrincipalName);

                    if (!adHandler.UserIsValid(userPrincipalName) || !AdHandler.UserHasAdAccess(userPrincipalName))
                    {
                        return StatusCode(StatusCodes.Status403Forbidden, "Forbidden");
                    }
                }

                var appDataFolderPath = MapService.Utility.PathUtility.GetPath("DataContent:Path");
                _logger.LogInformation("DuplicateMap DataFolderPath: {appDataFolderPath} ", appDataFolderPath);

                MapConfigHandler.DuplicateMap(nameFrom, nameTo);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Internal Server Error");
                return StatusCode(StatusCodes.Status500InternalServerError, "Internal Server Error");
            }

            return StatusCode(StatusCodes.Status200OK);
        }

        /// <remarks>
        /// Delete an existing map configuration
        /// </remarks>
        /// <param name="name">Name of the map to be deleted</param>
        /// <param name="userPrincipalName">User name that will be supplied to AD</param>
        /// <response code="200">Success</response>
        /// <response code="403">Forbidden</response>
        /// <response code="500">Internal Server Error</response>
        [HttpDelete]
        [Route("delete/{name}")]
        [ProducesResponseType(StatusCodes.Status200OK)]
        [ProducesResponseType(StatusCodes.Status403Forbidden)]
        [ProducesResponseType(StatusCodes.Status500InternalServerError)]
        [SwaggerOperation(Tags = new[] { "Admin - Maps and layers" })]
        public ActionResult DeleteMap(string name, [FromHeader(Name = "X-Control-Header")] string? userPrincipalName = null)
        {
            try
            {
                if (AdHandler.AdIsActive)
                {
                    var adHandler = new AdHandler(_memoryCache, _logger);

                    userPrincipalName = adHandler.PickUserNameToUse(Request, userPrincipalName);

                    if (!adHandler.UserIsValid(userPrincipalName) || !AdHandler.UserHasAdAccess(userPrincipalName))
                    {
                        return StatusCode(StatusCodes.Status403Forbidden, "Forbidden");
                    }
                }

                MapConfigHandler.DeleteMap(name);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Internal Server Error");
                return StatusCode(StatusCodes.Status500InternalServerError, "Internal Server Error");
            }

            return StatusCode(StatusCodes.Status200OK);
        }

        /// <remarks>
        /// Delete an existing map configuration
        /// </remarks>
        /// <param name="name">Name of the map to be deleted</param>
        /// <param name="userPrincipalName">User name that will be supplied to AD</param>
        /// <response code="200">Success</response>
        /// <response code="403">Forbidden</response>
        /// <response code="500">Internal Server Error</response>
        [HttpGet]
        [Route("delete/{name}")]
        [ProducesResponseType(StatusCodes.Status200OK)]
        [ProducesResponseType(StatusCodes.Status403Forbidden)]
        [ProducesResponseType(StatusCodes.Status500InternalServerError)]
        [SwaggerOperation(Tags = new[] { "Admin - Maps and layers" })]
        [Obsolete]
        public ActionResult GetDeleteMap(string name, [FromHeader(Name = "X-Control-Header")] string? userPrincipalName = null)
        {
            try
            {
                if (AdHandler.AdIsActive)
                {
                    var adHandler = new AdHandler(_memoryCache, _logger);

                    userPrincipalName = adHandler.PickUserNameToUse(Request, userPrincipalName);

                    if (!adHandler.UserIsValid(userPrincipalName) || !AdHandler.UserHasAdAccess(userPrincipalName))
                    {
                        return StatusCode(StatusCodes.Status403Forbidden, "Forbidden");
                    }
                }

                MapConfigHandler.DeleteMap(name);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Internal Server Error");
                return StatusCode(StatusCodes.Status500InternalServerError, "Internal Server Error");
            }

            return StatusCode(StatusCodes.Status200OK);
        }

        /// <remarks>
        /// Gets all maps names.
        /// </remarks>
        /// <param name="userPrincipalName">User name that will be supplied to AD</param>
        /// <returns>Return all map names. </returns>
        /// <response code="200">All map names were fetched successfully</response>
        /// <response code="403">Forbidden</response>
        /// <response code="500">Internal Server Error</response>
        [HttpGet]
        [Route("list")]
        [ProducesResponseType(StatusCodes.Status200OK)]
        [ProducesResponseType(StatusCodes.Status403Forbidden)]
        [ProducesResponseType(StatusCodes.Status500InternalServerError)]
        [SwaggerOperation(Tags = new[] { "Admin - Maps and layers" })]
        public ActionResult GetMaps([FromHeader(Name = "X-Control-Header")] string? userPrincipalName = null)
        {
            IEnumerable<string> maps;

            try
            {
                if (AdHandler.AdIsActive)
                {
                    var adHandler = new AdHandler(_memoryCache, _logger);

                    userPrincipalName = adHandler.PickUserNameToUse(Request, userPrincipalName);

                    if (!adHandler.UserIsValid(userPrincipalName) || !AdHandler.UserHasAdAccess(userPrincipalName))
                    {
                        return StatusCode(StatusCodes.Status403Forbidden, "Forbidden");
                    }
                }

                maps = MapConfigHandler.GetMaps();
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Internal Server Error");
                return StatusCode(StatusCodes.Status500InternalServerError, "Internal Server Error");
            }

            return StatusCode(StatusCodes.Status200OK, maps);
        }

        /// <remarks>
        /// List available images in the upload folder
        /// </remarks>
        /// <param name="userPrincipalName">User name that will be supplied to AD</param>
        /// <response code="200">Available images were fetched successfully</response>
        /// <response code="403">Forbidden</response>
        /// <response code="500">Internal Server Error</response>
        [HttpGet()]
        [Route("listimage")]
        [ProducesResponseType(StatusCodes.Status200OK)]
        [ProducesResponseType(StatusCodes.Status403Forbidden)]
        [ProducesResponseType(StatusCodes.Status500InternalServerError)]
        [SwaggerOperation(Tags = new[] { "Admin - Maps and layers" })]
        public ActionResult GetListImage([FromHeader(Name = "X-Control-Header")] string? userPrincipalName = null)
        {
            IEnumerable<string> listOfImages;

            try
            {
                if (AdHandler.AdIsActive)
                {
                    var adHandler = new AdHandler(_memoryCache, _logger);

                    userPrincipalName = adHandler.PickUserNameToUse(Request, userPrincipalName);

                    if (!adHandler.UserIsValid(userPrincipalName) || !AdHandler.UserHasAdAccess(userPrincipalName))
                    {
                        return StatusCode(StatusCodes.Status403Forbidden, "Forbidden");
                    }
                }

                listOfImages = MapConfigHandler.GetListOfImages();
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Internal Server Error");
                return StatusCode(StatusCodes.Status500InternalServerError, "Internal Server Error");
            }

            return StatusCode(StatusCodes.Status200OK, listOfImages);
        }

        /// <remarks>
        /// List available videos in the upload folder
        /// </remarks>
        /// <param name="userPrincipalName">User name that will be supplied to AD</param>
        /// <response code="200">Available videos were fetched successfully</response>
        /// <response code="403">Forbidden</response>
        /// <response code="500">Internal Server Error</response>
        [HttpGet()]
        [Route("listvideo")]
        [ProducesResponseType(StatusCodes.Status200OK)]
        [ProducesResponseType(StatusCodes.Status403Forbidden)]
        [ProducesResponseType(StatusCodes.Status500InternalServerError)]
        [SwaggerOperation(Tags = new[] { "Admin - Maps and layers" })]
        public ActionResult GetListVideo([FromHeader(Name = "X-Control-Header")] string? userPrincipalName = null)
        {
            IEnumerable<string> listOfVideos;

            try
            {
                if (AdHandler.AdIsActive)
                {
                    var adHandler = new AdHandler(_memoryCache, _logger);

                    userPrincipalName = adHandler.PickUserNameToUse(Request, userPrincipalName);

                    if (!adHandler.UserIsValid(userPrincipalName) || !AdHandler.UserHasAdAccess(userPrincipalName))
                    {
                        return StatusCode(StatusCodes.Status403Forbidden, "Forbidden");
                    }
                }

                listOfVideos = MapConfigHandler.GetListOfVideos();
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Internal Server Error");
                return StatusCode(StatusCodes.Status500InternalServerError, "Internal Server Error");
            }

            return StatusCode(StatusCodes.Status200OK, listOfVideos);
        }

        /// <remarks>
        /// List available audio files in the upload folder
        /// </remarks>
        /// <param name="userPrincipalName">User name that will be supplied to AD</param>
        /// <response code="200">Available audio files were fetched successfully</response>
        /// <response code="403">Forbidden</response>
        /// <response code="500">Internal Server Error</response>
        [HttpGet()]
        [Route("listaudio")]
        [ProducesResponseType(StatusCodes.Status200OK)]
        [ProducesResponseType(StatusCodes.Status403Forbidden)]
        [ProducesResponseType(StatusCodes.Status500InternalServerError)]
        [SwaggerOperation(Tags = new[] { "Admin - Maps and layers" })]
        public ActionResult GetListAudio([FromHeader(Name = "X-Control-Header")] string? userPrincipalName = null)
        {
            IEnumerable<string> listOfAudioFiles;

            try
            {
                if (AdHandler.AdIsActive)
                {
                    var adHandler = new AdHandler(_memoryCache, _logger);

                    userPrincipalName = adHandler.PickUserNameToUse(Request, userPrincipalName);

                    if (!adHandler.UserIsValid(userPrincipalName) || !AdHandler.UserHasAdAccess(userPrincipalName))
                    {
                        return StatusCode(StatusCodes.Status403Forbidden, "Forbidden");
                    }
                }

                listOfAudioFiles = MapConfigHandler.GetListOfAudioFiles();
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Internal Server Error");
                return StatusCode(StatusCodes.Status500InternalServerError, "Internal Server Error");
            }

            return StatusCode(StatusCodes.Status200OK, listOfAudioFiles);
        }

        /// <remarks>
        /// Exports a map with all available layers in a human-readable format
        /// </remarks>
        /// <param name="map">The name of the map excluding the file ending</param>
        /// <param name="format">Only Json-format is supported</param>
        /// <param name="userPrincipalName">User name that will be supplied to AD</param>
        /// <returns>Returns a map as a JsonObject</returns>
        /// <response code="200">The map object fetched successfully</response>
        /// <response code="403">Forbidden</response>
        /// <response code="500">Internal Server Error</response>
        [HttpGet]
        [Route("export/{map}/{format}")]
        [ProducesResponseType(StatusCodes.Status200OK)]
        [ProducesResponseType(StatusCodes.Status403Forbidden)]
        [ProducesResponseType(StatusCodes.Status500InternalServerError)]
        [SwaggerOperation(Tags = new[] { "Admin - Maps and layers" })]
        public ActionResult ExportMapWithFormat(string map, string format, [FromHeader(Name = "X-Control-Header")] string? userPrincipalName = null)
        {
            JsonObject exportedMapWithFormats;

            try
            {
                if (AdHandler.AdIsActive)
                {
                    var adHandler = new AdHandler(_memoryCache, _logger);

                    userPrincipalName = adHandler.PickUserNameToUse(Request, userPrincipalName);

                    if (!adHandler.UserIsValid(userPrincipalName) || !AdHandler.UserHasAdAccess(userPrincipalName))
                    {
                        return StatusCode(StatusCodes.Status403Forbidden, "Forbidden");
                    }
                }

                exportedMapWithFormats = MapConfigHandler.ExportMapWithFormat(map, format);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Internal Server Error");
                return StatusCode(StatusCodes.Status500InternalServerError, "Internal Server Error");
            }

            return StatusCode(StatusCodes.Status200OK, exportedMapWithFormats);
        }

        /// <remarks>
        /// Create a new map configuration
        /// </remarks>
        /// <param name="name">The name of the map to create </param>
        /// <param name="userPrincipalName">User name that will be supplied to AD</param>
        /// <response code="200">The map configuration was created successfully</response>
        /// <response code="403">Forbidden</response>
        /// <response code="500">Internal Server Error</response>
        [HttpGet]
        [Route("create/{name}")]
        [ProducesResponseType(StatusCodes.Status200OK)]
        [ProducesResponseType(StatusCodes.Status403Forbidden)]
        [ProducesResponseType(StatusCodes.Status500InternalServerError)]
        [SwaggerOperation(Tags = new[] { "Admin - Maps and layers" })]
        [Obsolete]
        public ActionResult CreateDeprecated(string name, [FromHeader(Name = "X-Control-Header")] string? userPrincipalName = null)
        {
            try
            {
                if (AdHandler.AdIsActive)
                {
                    var adHandler = new AdHandler(_memoryCache, _logger);

                    userPrincipalName = adHandler.PickUserNameToUse(Request, userPrincipalName);

                    if (!adHandler.UserIsValid(userPrincipalName) || !AdHandler.UserHasAdAccess(userPrincipalName))
                    {
                        return StatusCode(StatusCodes.Status403Forbidden, "Forbidden");
                    }
                }

                MapConfigHandler.CreateMapConfiguration(name);
            }
            catch (IOException iex)
            {
                _logger.LogError(iex, "Internal Server Error");
                return StatusCode(StatusCodes.Status500InternalServerError, "Kartan " + name + " finns redan. Ta bort kartan " + name + " innan du skapar om den på nytt. ");
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Internal Server Error");
                return StatusCode(StatusCodes.Status500InternalServerError, "Internal Server Error");
            }

            return StatusCode(StatusCodes.Status200OK);
        }

        /// <remarks>
        /// Create a new map configuration
        /// </remarks>
        /// <param name="name">The name of the map to create </param>
        /// <param name="userPrincipalName">User name that will be supplied to AD</param>
        /// <response code="200">The map configuration was created successfully</response>
        /// <response code="403">Forbidden</response>
        /// <response code="500">Internal Server Error</response>
        [HttpPut]
        [Route("create/{name}")]
        [ProducesResponseType(StatusCodes.Status200OK)]
        [ProducesResponseType(StatusCodes.Status403Forbidden)]
        [ProducesResponseType(StatusCodes.Status500InternalServerError)]
        [SwaggerOperation(Tags = new[] { "Admin - Maps and layers" })]
        public ActionResult Create(string name, [FromHeader(Name = "X-Control-Header")] string? userPrincipalName = null)
        {
            try
            {
                if (AdHandler.AdIsActive)
                {
                    var adHandler = new AdHandler(_memoryCache, _logger);

                    userPrincipalName = adHandler.PickUserNameToUse(Request, userPrincipalName);

                    if (!adHandler.UserIsValid(userPrincipalName) || !AdHandler.UserHasAdAccess(userPrincipalName))
                    {
                        return StatusCode(StatusCodes.Status403Forbidden, "Forbidden");
                    }
                }

                MapConfigHandler.CreateMapConfiguration(name);
            }
            catch (IOException iex)
            {
                _logger.LogError(iex, "Internal Server Error");
                return StatusCode(StatusCodes.Status500InternalServerError, "Kartan " + name + " finns redan. Ta bort kartan " + name + " innan du skapar om den på nytt. ");
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Internal Server Error");
                return StatusCode(StatusCodes.Status500InternalServerError, "Internal Server Error");
            }

            return StatusCode(StatusCodes.Status200OK);
        }
    }
}