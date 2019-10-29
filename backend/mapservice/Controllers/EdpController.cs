﻿using System;
using System.IO;
using System.Text;
using System.Web;
using System.Web.Mvc;
using System.Collections.Generic;
using Newtonsoft.Json;
using MapService.Models;
using log4net;
using MapService.Components;
using System.Configuration;
using Newtonsoft.Json.Linq;
using System.Net;
using System.Xml;
using EdpConn;

/// <summary>
/// Denna Controller sköter kommunikation med EDP Vision mha klassen ImplEdpConnectorPublic som finns i projektet EdpConn.
/// Vill man kompilera en mapservice utan referenser till EDP följer man instruktionerna i filen EdpConn.cs i projektet EdpConn.
///
/// För att slå på kommunkationen måste man lägga till följande rader till Web.config i sektion <appSettings>
/// <add key = "edpUUID" value="421623AA-D1D3-42EE-A516-28DC2EEFA544" />
/// <add key = "edpClientName" value="KommunGIS" />
/// <add key = "edpServerUrl" value="http://censrv364:64235/" />
/// <add key = "edpRemoveDomainFromUserName" value="1" />
/// </summary>

namespace MapService.Controllers
{
    public class EdpController : Controller
    {
        ILog _log = LogManager.GetLogger(typeof(EdpController));
        static private Dictionary<string, ImplEdpConnectorPublic> _dictEdpConnections = new Dictionary<string, ImplEdpConnectorPublic>();

        // json = [{"Fnr":"130121047","Fastbet":"BLÅKLINTEN 1"},{"Fnr":"130125494","Fastbet":"GETAKÄRR 4:1"},{"Fnr":"130127043","Fastbet":"GULMÅRAN 1"},{"Fnr":"130125494","Fastbet":"GETAKÄRR 4:1"},{"Fnr":"130125494","Fastbet":"GETAKÄRR 4:1"}]
        [HttpPost]
        public ActionResult SendRealEstateIdentifiers(string json)
        {
            try
            {
                _log.DebugFormat("SendRealEstateIdentifiers: Recieved json: {0}", json);

                // Parse json data
                var realEstateIdentifiersToSend = new List<RealEstateIdentifierPublic>();
                JToken data = JsonConvert.DeserializeObject<JToken>(json);
                foreach (JToken realEstateJSON in data)
                {
                    var estate = new RealEstateIdentifierPublic
                    {
                        Fnr = realEstateJSON.SelectToken("Fnr").ToString(),
                        Municipality = "",
                        Name = realEstateJSON.SelectToken("Fastbet").ToString(),
                        Uuid = ""
                    };

                    realEstateIdentifiersToSend.Add(estate);
                }

#if DEBUG
                var userName = "ADM\\ex_maan002";
#else
                var userName = User.Identity.Name;
#endif
                bool removeDomainFromUserName = int.Parse(string.IsNullOrEmpty(ConfigurationManager.AppSettings["edpRemoveDomainFromUserName"]) ? "0" : ConfigurationManager.AppSettings["edpRemoveDomainFromUserName"]) == 1;
                if (removeDomainFromUserName)
                {
                    userName = userName.Split('\\')[1];
                }

                // Save real estate identifiers for this user
                if (_dictEdpConnections.ContainsKey(userName))
                {
                    _log.DebugFormat("Found user '{0}' in queue.", userName);

                    var edpCon = _dictEdpConnections[userName];
                    edpCon.SetRealEstateIdentifiersToSend(realEstateIdentifiersToSend);
                }
                else
                {
                    _log.DebugFormat("Adding new user '{0}' to queue.", userName);

                    var edpUUID = ConfigurationManager.AppSettings["edpUUID"];
                    var edpClientName = ConfigurationManager.AppSettings["edpClientName"];
                    var edpServerUrl = ConfigurationManager.AppSettings["edpServerUrl"];

                    if (string.IsNullOrEmpty(edpUUID) || string.IsNullOrEmpty(edpClientName) || string.IsNullOrEmpty(edpServerUrl))
                    {
                        _log.Error("EDP is not configured in Web.config.");
                    }
                    else
                    {
                        _log.DebugFormat("Using config params, edpUUID: {0}, edpClientName: {1}, edpServerUrl: {2}", edpUUID, edpClientName, edpServerUrl);

                        var edpCon = new ImplEdpConnectorPublic(userName, edpUUID, edpClientName, edpServerUrl);

                        edpCon.SetRealEstateIdentifiersToSend(realEstateIdentifiersToSend);
                        _dictEdpConnections.Add(userName, edpCon);
                    }
                }

                var res = new HttpStatusCodeResult(HttpStatusCode.OK);
                return res;
            }
            catch (Exception e)
            {
                _log.FatalFormat("SendRealEstateIdentifiers: {0}", e);
                throw e;
            }
        }

        [HttpPost]
        public ActionResult SendCoordinates(string json)
        {
            try
            {
                _log.DebugFormat("SendCoordinates: Recieved json: {0}", json);

                // DO nothing in this version

                var res = new HttpStatusCodeResult(HttpStatusCode.OK);
                return res;
            }
            catch (Exception e)
            {
                _log.FatalFormat("SendCoordinates: {0}", e);
                throw e;
            }
        }
    }

}

