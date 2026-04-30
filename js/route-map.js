// delivery-dashboard/js/route-map.js
(function() {
    'use strict';

    window.initRouteMap = function() {
        let routeMap = null;
        let currentRoute = null;

        async function loadAndDisplayRoute() {
            // getCurrentUser may be undefined if auth.js not loaded; fallback to localStorage
            var user = null;
            if (typeof getCurrentUser === 'function') {
                user = getCurrentUser();
            } else {
                const stored = localStorage.getItem('currentUser');
                if (stored) user = JSON.parse(stored);
            }

            if (!user || user.role !== 'delivery-man') return;

            const [orders, routes, users] = await Promise.all([
                DataLoader.getOrders(),
                DataLoader.getRoutes(),
                DataLoader.getUsers()
            ]);

            const driverRoutes = routes.filter(r => r.driverId === user.userId);
            if (driverRoutes.length === 0) {
                document.getElementById('stop-count').textContent = 'No routes assigned';
                return;
            }
            // Use active or planned route
            const activeRoute = driverRoutes.find(r => r.status === 'active') || driverRoutes[0];
            currentRoute = activeRoute;

            if (!routeMap) {
                routeMap = MapUtils.initMap('delivery-route-map');
            }

            // Draw route polyline
            MapUtils.drawRoute(activeRoute.waypoints, { color: '#24a148', weight: 5 });

            // Add numbered stop markers
            MapUtils.clearMarkers();
            const orderIds = activeRoute.orderIds;
            const relevantOrders = orders.filter(o => orderIds.includes(o.orderId));
            activeRoute.waypoints.forEach((wp, idx) => {
                const order = relevantOrders.find(o => o.deliveryAddress.lat === wp.lat && o.deliveryAddress.lng === wp.lng);
                const label = order ? `${idx+1}. ${order.trackingNumber}` : `Stop ${idx+1}`;
                MapUtils.addMarker(wp.lat, wp.lng, label, idx === 0 ? 'pickup' : 'delivery');
            });

            // Update summary card
            document.getElementById('stop-count').textContent = `${activeRoute.waypoints.length} stops`;
            document.getElementById('total-distance').textContent = `${activeRoute.totalDistance} km`;
            document.getElementById('estimated-time').textContent = `${activeRoute.estimatedTime} min`;

            // Turn-by-turn summary (simple text)
            const summaryDiv = document.getElementById('turn-by-turn');
            if (summaryDiv) {
                let html = '<ol>';
                activeRoute.waypoints.forEach((wp, i) => {
                    html += `<li>Stop ${i+1}: (${wp.lat.toFixed(4)}, ${wp.lng.toFixed(4)})</li>`;
                });
                html += '</ol>';
                summaryDiv.innerHTML = html;
            }
        }

        loadAndDisplayRoute();
    };
})();
