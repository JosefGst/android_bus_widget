import type { RouteMarker } from '../utils/route_stop_map'
import { LEAFLET_CSS, LEAFLET_JS } from './generated/leaflet_assets'

/** Props shared by both StopMap hosts (StopMap.tsx on Android, StopMap.web.tsx on Web). */
export interface StopMapProps {
  markers: RouteMarker[]
}

const BASEMAP_URL = 'https://mapapi.geodata.gov.hk/gs/api/v1.0.0/xyz/basemap/WGS84/{z}/{x}/{y}.png'
const LABEL_URL = 'https://mapapi.geodata.gov.hk/gs/api/v1.0.0/xyz/label/hk/en/WGS84/{z}/{x}/{y}.png'
const ATTRIBUTION = '&copy; Map information from Lands Department'

// Runs inside the map page. Plain ES5 so it works in older Android WebViews.
// The app talks to the page by calling window.receive(msg); the page answers
// with send(msg), via ReactNativeWebView on Android or window.parent on Web.
const PAGE_SCRIPT = `
(function () {
  var map = L.map('map', { zoomControl: true }).setView([22.35, 114.1], 11);
  L.tileLayer(${JSON.stringify(BASEMAP_URL)}, { maxZoom: 19, attribution: ${JSON.stringify(ATTRIBUTION)} }).addTo(map);
  L.tileLayer(${JSON.stringify(LABEL_URL)}, { maxZoom: 19 }).addTo(map);
  var layer = L.layerGroup().addTo(map);

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

  function icon(m) {
    return L.divIcon({
      className: 'stop-marker',
      html: '<div class="stop-pin" data-stop="' + esc(m.stop) + '">' + esc(m.seq) + '</div>',
      iconSize: [28, 28],
      iconAnchor: [14, 14],
    });
  }

  function setMarkers(markers) {
    layer.clearLayers();
    var points = [];
    markers.forEach(function (m) {
      var marker = L.marker([m.lat, m.lng], { icon: icon(m), title: m.name, keyboard: false });
      marker.on('click', function () { send({ type: 'markerPress', stop: m.stop }); });
      marker.addTo(layer);
      points.push([m.lat, m.lng]);
    });
    if (points.length === 1) map.setView(points[0], 16);
    else if (points.length > 1) map.fitBounds(points, { padding: [24, 24] });
  }

  window.receive = function (msg) {
    if (!msg || typeof msg !== 'object') return;
    if (msg.type === 'setMarkers' && Array.isArray(msg.markers)) setMarkers(msg.markers);
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
