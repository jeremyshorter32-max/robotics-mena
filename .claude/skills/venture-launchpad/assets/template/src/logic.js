// Shared page logic, inlined into every page at the /*@logic*/ marker by scripts/assemble.cjs.
// window.SITE_PAGE is the page's @config; window.SITE_DATA holds every data/*.json file by name.
(function () {
  var el = document.getElementById('count'), d = window.SITE_DATA || {};
  if (el && Array.isArray(d.items)) el.textContent = d.items.length + ' record' + (d.items.length === 1 ? '' : 's') + ' · built ' + d.builtAt;
})();
