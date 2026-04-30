// delivery-dashboard/js/notification-simulator.js
const NotificationSimulator = (function() {
    let intervalId = null;

    const statusUpdates = [
        'picked_up', 'in_transit', 'arrived_destination', 'delivered'
    ];
    const messageTemplates = {
        order_update: 'Order {tracking} is now {statusText}.',
        assignment: 'Driver {driver} assigned to order {tracking}.',
        system: 'System: {msg}'
    };

    function getRandomElement(arr) {
        return arr[Math.floor(Math.random() * arr.length)];
    }

    function generateEvent(orders, users, vehicles) {
        const eventType = getRandomElement(['order_update', 'assignment', 'system']);
        const order = getRandomElement(orders);
        const driver = getRandomElement(users.filter(u => u.role === 'delivery-man'));

        let message = '';
        if (eventType === 'order_update' && order) {
            const newStatus = getRandomElement(statusUpdates);
            message = messageTemplates.order_update
                .replace('{tracking}', order.trackingNumber)
                .replace('{statusText}', newStatus.replace('_', ' '));
            return {
                type: 'order_update',
                message,
                relatedOrderId: order.orderId,
                timestamp: new Date().toISOString()
            };
        } else if (eventType === 'assignment' && order && driver) {
            message = messageTemplates.assignment
                .replace('{driver}', `${driver.firstName} ${driver.lastName}`)
                .replace('{tracking}', order.trackingNumber);
            return {
                type: 'assignment',
                message,
                relatedOrderId: order.orderId,
                userId: driver.userId,
                timestamp: new Date().toISOString()
            };
        } else {
            message = messageTemplates.system.replace('{msg}', 'Server health check completed.');
            return {
                type: 'system',
                message,
                timestamp: new Date().toISOString()
            };
        }
    }

    function dispatchNotification(notificationData) {
        const event = new CustomEvent('notification', { detail: notificationData });
        document.dispatchEvent(event);
    }

    async function start(intervalSeconds = 15) {
        stop();
        // Load required data
        const [orders, users] = await Promise.all([
            DataLoader.getOrders(),
            DataLoader.getUsers()
        ]);

        intervalId = setInterval(() => {
            // Re-fetch orders/users to stay current (optional)
            Promise.all([DataLoader.getOrders(), DataLoader.getUsers()]).then(([freshOrders, freshUsers]) => {
                const notif = generateEvent(freshOrders, freshUsers, []);
                dispatchNotification(notif);
            }).catch(err => console.warn('Simulator error:', err));
        }, intervalSeconds * 1000);
    }

    function stop() {
        if (intervalId) {
            clearInterval(intervalId);
            intervalId = null;
        }
    }

    return { start, stop };
})();
