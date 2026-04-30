// delivery-dashboard/js/live-tracking.js
const LiveTracking = (function() {
    let pollingInterval = null;
    let lastEventTimestamp = null;
    const POLL_INTERVAL_SECONDS = 10;

    async function fetchLatestEvents(orderId) {
        try {
            const events = await DataLoader.getTrackingEvents();
            // Filter for order and newer than last timestamp
            let filtered = events;
            if (orderId) {
                filtered = events.filter(e => e.orderId === orderId);
            }
            if (lastEventTimestamp) {
                filtered = filtered.filter(e => new Date(e.timestamp) > new Date(lastEventTimestamp));
            }
            if (filtered.length > 0) {
                lastEventTimestamp = filtered[filtered.length - 1].timestamp;
            }
            return filtered;
        } catch (err) {
            console.error('Live tracking fetch error:', err);
            return [];
        }
    }

    function updateOrderStatusInUI(event) {
        // Find order badge and update
        const statusCells = document.querySelectorAll(`[data-order-id="${event.orderId}"] .order-status`);
        statusCells.forEach(cell => {
            cell.textContent = event.status.replace('_', ' ');
            cell.className = `order-status status-${event.status}`;
        });
        // If map is visible, move marker
        if (MapUtils.getMap() && event.location) {
            // Assume we have a marker reference stored somewhere or we just re-add.
            // For simplicity, we'll dispatch a custom event for the specific dashboard to handle.
            const updateEvent = new CustomEvent('tracking-update', { detail: event });
            document.dispatchEvent(updateEvent);
        }
    }

    function updateETACountdown(estimatedMinutes) {
        const etaEl = document.getElementById('eta-countdown');
        if (etaEl) {
            const arrival = new Date(Date.now() + estimatedMinutes * 60000);
            etaEl.textContent = `ETA: ${arrival.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}`;
        }
    }

    async function pollUpdates(orderId) {
        const events = await fetchLatestEvents(orderId);
        events.forEach(event => {
            updateOrderStatusInUI(event);
            // Simulate ETA based on status
            if (event.status === 'in_transit') {
                updateETACountdown(8); // random demo
            } else if (event.status === 'arrived_destination') {
                updateETACountdown(2);
            }
        });
    }

    function startTracking(orderId) {
        stopTracking();
        pollUpdates(orderId); // immediate run
        pollingInterval = setInterval(() => pollUpdates(orderId), POLL_INTERVAL_SECONDS * 1000);
    }

    function stopTracking() {
        if (pollingInterval) {
            clearInterval(pollingInterval);
            pollingInterval = null;
        }
    }

    return {
        startTracking,
        stopTracking
    };
})();
