// delivery-dashboard/js/notifications.js
(function() {
    'use strict';

    const notificationsList = [];

    window.initNotifications = function() {
        // Listen for custom notification events from simulator
        document.addEventListener('notification', function(e) {
            const notif = e.detail;
            addNotification(notif);
            showToast(notif);
        });

        // Initialize list from data
        DataLoader.getNotifications().then(seedData => {
            seedData.forEach(n => {
                notificationsList.push(n);
                renderNotificationItem(n);
            });
            updateUnreadCount();
        });

        // Clear all button
        document.getElementById('clear-notifications-btn')?.addEventListener('click', clearNotifications);
    };

    function addNotification(notif) {
        const newNotif = {
            notificationId: 'ntf_' + Date.now(),
            userId: notif.userId || 'system',
            type: notif.type,
            message: notif.message,
            read: false,
            timestamp: notif.timestamp || new Date().toISOString(),
            relatedOrderId: notif.relatedOrderId || null
        };
        notificationsList.push(newNotif);
        renderNotificationItem(newNotif);
        updateUnreadCount();
    }

    function renderNotificationItem(notif) {
        const container = document.getElementById('notification-list') || document.getElementById('dispatcher-notification-list') || document.getElementById('customer-notification-list');
        if (!container) return;
        const li = document.createElement('li');
        li.className = `notification-item ${notif.read ? '' : 'unread'}`;
        li.dataset.id = notif.notificationId;
        li.innerHTML = `
            <span class="notification-message">${notif.message}</span>
            <span class="notification-time">${new Date(notif.timestamp).toLocaleTimeString()}</span>
        `;
        container.prepend(li);
    }

    function showToast(notif) {
        const toastContainer = document.getElementById('toast-container');
        if (!toastContainer) return;
        const toast = document.createElement('div');
        toast.className = `toast ${notif.type === 'system' ? 'info' : 'success'}`;
        toast.innerHTML = `<i class="fas fa-info-circle"></i> ${notif.message}`;
        toastContainer.appendChild(toast);
        setTimeout(() => toast.remove(), 5000);
    }

    function clearNotifications() {
        notificationsList.length = 0;
        const containers = document.querySelectorAll('.notification-list');
        containers.forEach(c => c.innerHTML = '');
        updateUnreadCount();
    }

    function updateUnreadCount() {
        const unread = notificationsList.filter(n => !n.read).length;
        const bubble = document.querySelector('.notification-bubble');
        if (bubble) {
            bubble.textContent = unread > 0 ? unread : '';
            bubble.style.display = unread > 0 ? 'inline-flex' : 'none';
        }
    }
})();
