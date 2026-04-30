// delivery-dashboard/js/data-loader.js
const DataLoader = (function() {
    const cache = {};
    const basePath = 'data/';

    async function fetchJSON(filename) {
        if (cache[filename]) {
            return Promise.resolve(cache[filename]);
        }
        const response = await fetch(basePath + filename);
        if (!response.ok) {
            throw new Error(`Failed to load ${filename}`);
        }
        const data = await response.json();
        cache[filename] = data;
        return data;
    }

    function invalidateCache(filename) {
        delete cache[filename];
    }

    return {
        getOrders: () => fetchJSON('orders.json'),
        getUsers: () => fetchJSON('users.json'),
        getVehicles: () => fetchJSON('vehicles.json'),
        getRoutes: () => fetchJSON('routes.json'),
        getNotifications: () => fetchJSON('notifications.json'),
        getSettings: () => fetchJSON('settings.json'),
        getDeliveryProofs: () => fetchJSON('delivery-proofs.json'),
        getDriverAssignments: () => fetchJSON('driver-assignments.json'),
        getTrackingEvents: () => fetchJSON('tracking-events.json'),
        getAnalyticsData: () => fetchJSON('analytics-data.json'),
        refresh: (filename) => {
            invalidateCache(filename);
            return fetchJSON(filename);
        }
    };
})();
