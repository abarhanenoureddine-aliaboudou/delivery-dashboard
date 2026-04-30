// delivery-dashboard/js/map-utils.js
const MapUtils = (function() {
    // Default center (Bangalore, India) realistic for demo
    const defaultCenter = [12.9716, 77.5946];
    const defaultZoom = 13;

    let mapInstance = null;
    let markersLayer = null;
    let routeLayer = null;

    function initMap(elementId, options = {}) {
        const mapEl = document.getElementById(elementId);
        if (!mapEl) return null;
        if (mapInstance) {
            mapInstance.remove(); // destroy previous
        }
        mapInstance = L.map(elementId, {
            center: options.center || defaultCenter,
            zoom: options.zoom || defaultZoom,
            zoomControl: options.zoomControl !== false
        });

        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '&copy; OpenStreetMap contributors',
            maxZoom: 19
        }).addTo(mapInstance);

        markersLayer = L.layerGroup().addTo(mapInstance);
        routeLayer = L.layerGroup().addTo(mapInstance);

        // Invalidate size after container shown
        setTimeout(() => mapInstance.invalidateSize(), 100);
        return mapInstance;
    }

    function getMap() {
        return mapInstance;
    }

    function addMarker(lat, lng, popupContent, iconType = 'default') {
        if (!markersLayer) return null;
        const markerIcon = createIcon(iconType);
        const marker = L.marker([lat, lng], { icon: markerIcon }).addTo(markersLayer);
        if (popupContent) {
            marker.bindPopup(popupContent);
        }
        return marker;
    }

    function clearMarkers() {
        if (markersLayer) markersLayer.clearLayers();
    }

    function drawRoute(waypoints, options = {}) {
        if (!routeLayer) return;
        routeLayer.clearLayers();
        if (!waypoints || waypoints.length < 2) return;
        const coords = waypoints.map(wp => [wp.lat, wp.lng]);
        L.polyline(coords, {
            color: options.color || '#0f62fe',
            weight: options.weight || 4,
            opacity: options.opacity || 0.8,
            dashArray: options.dashArray || null
        }).addTo(routeLayer);
        // Fit bounds
        const bounds = L.latLngBounds(coords);
        mapInstance.fitBounds(bounds, { padding: [30, 30] });
    }

    function fitBoundsToPoints(points) {
        if (!mapInstance || points.length === 0) return;
        const bounds = L.latLngBounds(points.map(p => [p.lat, p.lng]));
        mapInstance.fitBounds(bounds, { padding: [30, 30] });
    }

    function createIcon(type) {
        const iconMap = {
            driver: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-blue.png',
            pickup: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-green.png',
            delivery: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png',
            default: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-violet.png'
        };
        const iconUrl = iconMap[type] || iconMap.default;
        return L.icon({
            iconUrl: iconUrl,
            shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
            iconSize: [25, 41],
            iconAnchor: [12, 41],
            popupAnchor: [1, -34],
            shadowSize: [41, 41]
        });
    }

    return {
        initMap,
        getMap,
        addMarker,
        clearMarkers,
        drawRoute,
        fitBoundsToPoints
    };
})();
