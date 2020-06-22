﻿using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace MapService.Models.ToolOptions
{
    public class LayerGroup
    {
        public string id { get; set; }

        public string parent { get; set; }

        public string name { get; set; }

        public bool toggled { get; set; }

        public bool expanded { get; set; }

        public List<MapWMSLayerInfo> layers { get; set; }

        public List<LayerGroup> groups { get; set; }
    }

    public class LayerMenuOptions
    {
        public List<MapWMSLayerInfo> baselayers { get; set; }

        public List<LayerGroup> groups { get; set; }

        public bool active { get; set; }

        public bool visibleAtStart { get; set; }

        public bool backgroundSwitcherBlack { get; set; }

        public bool backgroundSwitcherWhite { get; set; }

        public bool enableOSM { get; set; }

        public bool showBreadcrumbs { get; set; }

        public string target { get; set; }

        public string position { get; set; }

        public int width { get; set; }

        public int height { get; set; }

        public string title { get; set; }

        public string description { get; set; }

        public bool dropdownThemeMaps { get; set; }

        public string themeMapHeaderCaption { get; set; }

        public string instruction { get; set; }
		
		public string[] visibleForGroups { get; set; }


		
    }
}