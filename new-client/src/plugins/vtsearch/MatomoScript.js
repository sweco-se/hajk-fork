export default class MatomoScript {
  static generateScript() {
    const matomoScriptTag = document.createElement("script");
    matomoScriptTag.text =
      "var _paq = window._paq = window._paq || []; " +
      "window._paq = _paq; " +
      '_paq.push(["setExcludedQueryParams", ["projectsearch","vgrform","mobile","p","sort","vgrid","IsPost","wt","d","ht","c","ExtendedMunicipalitySearch","f","src","nh","tagFilter","a","guest","hsaIdentity","t","vgrorgrel","showpersonsinunitname"]]); ' +
      '_paq.push(["trackPageView"]); ' +
      '_paq.push(["enableLinkTracking"]);' +
      "(function() { " +
      ' var u="https://piwik.vgregion.se/"; ' +
      '_paq.push(["setTrackerUrl", u+"matomo.php"]); ' +
      '_paq.push(["setSiteId", "262"]); ' +
      'var d=document, g=d.createElement("script"), s=d.getElementsByTagName("script")[0]; ' +
      'g.async=true; g.src=u+"matomo.js"; s.parentNode.insertBefore(g,s); ' +
      "})();";

    document.body.appendChild(matomoScriptTag);
    return window._paq;
  }
}
