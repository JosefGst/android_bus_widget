import type { Language } from '../utils/language'
import type { RouteMarker, UserLocation } from '../utils/route_stop_map'
import { STRINGS } from '../utils/strings'
import { LEAFLET_CSS, LEAFLET_JS } from './generated/leaflet_assets'

/** Props shared by both StopMap hosts (StopMap.tsx on Android, StopMap.web.tsx on Web). */
export interface StopMapProps {
  markers: RouteMarker[]
  selectedStop: string | null
  onMarkerPress: (stop: string) => void
  /** The user's position (Android only; the Web host ignores it). */
  userLocation?: UserLocation | null
  /** Goes up by one on each "locate me" tap; the map then centers on the user once. */
  centerOnUserToken?: number
  /** Goes up by one on each "Show route" tap; the map then fits all Stops once. */
  fitRouteToken?: number
  /** Language of the map's place labels and attribution. */
  language: Language
}

/** Zoom level used when the map focuses on one selected Stop. */
const SELECTED_ZOOM = 17

const BASEMAP_URL = 'https://mapapi.geodata.gov.hk/gs/api/v1.0.0/xyz/basemap/WGS84/{z}/{x}/{y}.png'
// LABEL_LANGUAGE is replaced by en, tc or sc: the Lands Department serves labels in all three.
const LABEL_URL = 'https://mapapi.geodata.gov.hk/gs/api/v1.0.0/xyz/label/hk/LABEL_LANGUAGE/WGS84/{z}/{x}/{y}.png'

// Runs inside the map page. Plain ES5 so it works in older Android WebViews.
// The app talks to the page by calling window.receive(msg); the page answers
// with send(msg), via ReactNativeWebView on Android or window.parent on Web.
const PAGE_SCRIPT = `
(function () {
  var map = L.map('map', { zoomControl: true }).setView([22.35, 114.1], 11);
  L.tileLayer(${JSON.stringify(BASEMAP_URL)}, { maxZoom: 19 }).addTo(map);
  function labelUrl(language) { return ${JSON.stringify(LABEL_URL)}.replace('LABEL_LANGUAGE', language); }
  var labels = L.tileLayer(labelUrl('en'), { maxZoom: 19 }).addTo(map);
  var labelLanguage = 'en';
  var attribution = ${JSON.stringify(STRINGS.en.mapAttribution)};
  map.attributionControl.addAttribution(attribution);
  var layer = L.layerGroup().addTo(map);
  var byStop = {};
  var selected = null;

  function send(msg) {
    var s = JSON.stringify(msg);
    if (window.ReactNativeWebView) window.ReactNativeWebView.postMessage(s);
    else if (window.parent !== window) window.parent.postMessage(s, '*');
  }

  function esc(s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  function icon(m, isSelected) {
    var size = isSelected ? 38 : 28;
    return L.divIcon({
      className: 'stop-marker',
      html: '<div class="stop-pin' + (isSelected ? ' selected' : '') + '" data-stop="' + esc(m.stop) + '">' + esc(m.seq) + '</div>',
      iconSize: [size, size],
      iconAnchor: [size / 2, size / 2],
    });
  }

  function fitAll() {
    var points = Object.keys(byStop).map(function (k) { return [byStop[k].data.lat, byStop[k].data.lng]; });
    if (points.length === 1) map.setView(points[0], 16);
    else if (points.length > 1) map.fitBounds(points, { padding: [24, 24] });
  }

  function setMarkers(markers) {
    layer.clearLayers();
    byStop = {};
    selected = null;
    markers.forEach(function (m) {
      var marker = L.marker([m.lat, m.lng], { icon: icon(m, false), title: m.name, keyboard: false });
      marker.on('click', function () { send({ type: 'markerPress', stop: m.stop }); });
      marker.addTo(layer);
      byStop[m.stop] = { marker: marker, data: m };
    });
    fitAll();
  }

  function select(stop) {
    if (selected && byStop[selected]) {
      byStop[selected].marker.setIcon(icon(byStop[selected].data, false));
      byStop[selected].marker.setZIndexOffset(0);
    }
    selected = stop;
    var entry = stop ? byStop[stop] : null;
    if (!entry) return;  // cleared, or a Stop without a marker: leave the view alone
    entry.marker.setIcon(icon(entry.data, true));
    entry.marker.setZIndexOffset(1000);
    // Not animated: a marker tap also resizes the map, and a resize during Leaflet's zoom
    // animation can leave it stuck, so every later setView/fitBounds is ignored.
    map.setView([entry.data.lat, entry.data.lng], ${SELECTED_ZOOM}, { animate: false });
  }

  // The user's own position: a dot plus an accuracy circle, kept apart from the
  // Stop markers so setMarkers/fitAll never touch it.
  var userDot = null;
  var userCircle = null;

  function setUserLocation(loc) {
    var ok = loc && typeof loc === 'object' && isFinite(loc.lat) && isFinite(loc.lng) && isFinite(loc.accuracy);
    if (!ok) {
      if (userDot) { map.removeLayer(userDot); map.removeLayer(userCircle); }
      userDot = null;
      userCircle = null;
      return;
    }
    var ll = [loc.lat, loc.lng];
    if (!userDot) {
      userCircle = L.circle(ll, { radius: loc.accuracy, className: 'user-accuracy', interactive: false }).addTo(map);
      userDot = L.circleMarker(ll, { radius: 8, className: 'user-dot', interactive: false }).addTo(map);
    } else {
      userCircle.setLatLng(ll).setRadius(loc.accuracy);
      userDot.setLatLng(ll);
    }
  }

  function centerOnUser() {
    if (!userDot) return;
    map.setView(userDot.getLatLng(), Math.max(map.getZoom(), 16));
  }

  function setLanguage(language, text) {
    if (['en', 'tc', 'sc'].indexOf(language) < 0 || typeof text !== 'string' || text === '') return;
    if (language !== labelLanguage) {
      labelLanguage = language;
      labels.setUrl(labelUrl(language));
    }
    if (text !== attribution) {
      map.attributionControl.removeAttribution(attribution).addAttribution(text);
      attribution = text;
    }
  }

  window.receive = function (msg) {
    if (!msg || typeof msg !== 'object') return;
    if (msg.type === 'setMarkers' && Array.isArray(msg.markers)) setMarkers(msg.markers);
    else if (msg.type === 'select') select(typeof msg.stop === 'string' ? msg.stop : null);
    else if (msg.type === 'setUserLocation') setUserLocation(msg.location);
    else if (msg.type === 'centerOnUser') centerOnUser();
    else if (msg.type === 'fitRoute') fitAll();
    else if (msg.type === 'setLanguage') setLanguage(msg.language, msg.attribution);
  };

  // Web host: messages arrive via postMessage from the parent window.
  window.addEventListener('message', function (e) {
    if (e.source !== window.parent || typeof e.data !== 'string') return;
    try { window.receive(JSON.parse(e.data)); } catch (_) {}
  });

  send({ type: 'ready' });
})();
`

const PAGE_CSS = `
html, body, #map { margin: 0; padding: 0; width: 100%; height: 100%; }
.stop-marker { background: transparent; border: 0; }
.stop-pin {
  width: 28px; height: 28px; border-radius: 14px; box-sizing: border-box;
  background: red; color: white; border: 2px solid white;
  font: bold 13px/24px sans-serif; text-align: center;
  box-shadow: 0 1px 3px rgba(0,0,0,0.4);
}
.stop-pin.selected {
  width: 38px; height: 38px; border-radius: 19px;
  background: #007aff; border-width: 3px;
  font-size: 16px; line-height: 32px;
}
.user-dot { fill: #1a73e8; fill-opacity: 1; stroke: white; stroke-width: 3; }
.user-accuracy { fill: #1a73e8; fill-opacity: 0.12; stroke: #1a73e8; stroke-opacity: 0.3; stroke-width: 1; }
`

/** The self-contained Leaflet page shown by both hosts. Built once. */
export const STOP_MAP_HTML = `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no">
<style>${LEAFLET_CSS}</style>
<style>${PAGE_CSS}</style>
</head>
<body>
<div id="map"></div>
<script>${LEAFLET_JS}</script>
<script>${PAGE_SCRIPT}</script>
</body>
</html>`
