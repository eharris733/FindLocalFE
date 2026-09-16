/* FindLocal embeddable widget loader — https://findlocal.community/developers/widgets
 * Usage: <script src="https://findlocal.community/widget.js" data-widget="literary-new-england"></script>
 * Attributes: data-widget | data-region | data-city | data-cat | data-when | data-view (list|calendar|map)
 *             data-theme (light|dark|auto) | data-limit (1-300) | data-height (initial px) | data-partner
 *             data-authors="1" (only events with a known author on the bill)
 *             data-filters="on|off" (the in-widget filter toolbar; on by default)
 *             data-near="<lat>,<lng>" + data-radius (km, default 25) — open on a proximity search
 *             data-free="1" (free events only)
 * Injects an auto-resizing iframe after the script tag. No dependencies, no cookies, no tracking.
 * The URL rules mirror web/src/lib/embed.ts::buildEmbedSrc — keep both in sync. */
(function () {
  var script = document.currentScript;
  if (!script || !script.src) return;
  var origin = new URL(script.src, location.href).origin;
  var PRESETS = {
    'literary-new-england': { region: 'new-england', cat: 'literary' },
    'literary-new-england-authors': { region: 'new-england', cat: 'literary', authors: '1' },
    'new-england': { region: 'new-england' }
  };
  var KEYS = ['region', 'city', 'cat', 'when', 'view', 'theme', 'limit', 'partner', 'authors', 'filters', 'near', 'radius', 'free'];
  /* data-* attributes whose query key differs from the attribute name. */
  var ATTR_KEY = { radius: 'radius_km' };
  var VIEWS = ['list', 'calendar', 'map'];
  var THEMES = ['light', 'dark', 'auto'];
  var OFF = ['off', '0', 'false', 'no'];

  function attr(name) {
    var v = script.getAttribute('data-' + name);
    return v ? v.trim() : '';
  }

  function round3(n) {
    return Math.round(n * 1000) / 1000;
  }

  /* '<lat>,<lng>' -> the rounded pair the site's filter contract uses, or ''. */
  function nearValue(raw) {
    var parts = String(raw).split(',');
    if (parts.length !== 2) return '';
    var lat = Number(parts[0]);
    var lng = Number(parts[1]);
    if (!isFinite(lat) || !isFinite(lng) || Math.abs(lat) > 90 || Math.abs(lng) > 180) return '';
    return round3(lat) + ',' + round3(lng);
  }

  var merged = {};
  var preset = PRESETS[attr('widget').toLowerCase()];
  if (preset) for (var pk in preset) merged[pk] = preset[pk];
  for (var i = 0; i < KEYS.length; i++) {
    var v = attr(KEYS[i]);
    if (v) merged[ATTR_KEY[KEYS[i]] || KEYS[i]] = v;
  }
  if (merged.region) delete merged.city;
  if (merged.view === 'list' || (merged.view && VIEWS.indexOf(merged.view) < 0)) delete merged.view;
  if (merged.theme === 'auto' || (merged.theme && THEMES.indexOf(merged.theme) < 0)) delete merged.theme;
  if (merged.when === 'anytime') delete merged.when;
  if (merged.authors !== undefined && merged.authors !== '1') delete merged.authors;
  if (merged.free !== undefined && merged.free !== '1') delete merged.free;
  var filtersOn = !(merged.filters !== undefined && OFF.indexOf(String(merged.filters).toLowerCase()) >= 0);
  if (filtersOn) delete merged.filters;
  else merged.filters = '0';
  if (merged.near !== undefined) {
    merged.near = nearValue(merged.near);
    if (!merged.near) delete merged.near;
  }
  if (merged.near === undefined) delete merged.radius_km;
  if (merged.radius_km !== undefined) {
    var km = Number(merged.radius_km);
    if (!(km > 0) || km === 25) delete merged.radius_km;
    else merged.radius_km = String(Math.round(Math.min(km, 200) * 100) / 100);
  }
  if (merged.limit !== undefined) {
    var n = parseInt(merged.limit, 10);
    if (!(n >= 1) || n === 100) delete merged.limit;
    else merged.limit = String(Math.min(n, 300));
  }
  var params = new URLSearchParams(merged);
  params.sort();
  var q = params.toString();
  var src = origin + '/embed/events' + (q ? '?' + q : '');

  var height = parseInt(attr('height'), 10);
  if (!(height > 0)) height = 320;
  var iframe = document.createElement('iframe');
  iframe.src = src;
  iframe.title = 'FindLocal events widget';
  iframe.loading = 'lazy';
  iframe.setAttribute('scrolling', 'no');
  /* The toolbar's "Use my location" button needs the delegated geolocation
   * permission (the visitor still has to grant it); with the toolbar off the
   * frame asks for nothing. */
  iframe.setAttribute('allow', filtersOn ? 'geolocation' : "geolocation 'none'");
  iframe.style.cssText = 'width:100%;border:0;display:block;min-height:' + height + 'px;height:' + height + 'px;';
  script.parentNode.insertBefore(iframe, script.nextSibling);

  window.addEventListener('message', function (ev) {
    if (ev.source !== iframe.contentWindow || ev.origin !== origin) return;
    var d = ev.data;
    if (!d || d.type !== 'findlocal:resize' || typeof d.height !== 'number') return;
    iframe.style.height = Math.max(120, Math.ceil(d.height)) + 'px';
  });
})();
