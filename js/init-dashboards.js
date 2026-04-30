// delivery-dashboard/js/init-dashboards.js
(function() {
    'use strict';

    // ==================== DISPATCHER ====================
    window.initLiveOrders = async function() {
        const orders = await DataLoader.getOrders();
        const users = await DataLoader.getUsers();
        renderLiveOrdersTable(orders, users);
        updateQuickStats(orders);
        document.getElementById('status-filter')?.addEventListener('change', function(e) {
            const value = e.target.value;
            const filtered = value === 'all' ? orders : orders.filter(o => o.status === value);
            renderLiveOrdersTable(filtered, users);
        });
    };

    function renderLiveOrdersTable(orders, users) {
        const tbody = document.querySelector('#orders-table tbody');
        if (!tbody) return;
        tbody.innerHTML = '';
        orders.forEach(order => {
            const customer = users.find(u => u.userId === order.customerId);
            const driver = order.assignedDriver ? users.find(u => u.userId === order.assignedDriver) : null;
            const tr = document.createElement('tr');
            tr.dataset.orderId = order.orderId;
            tr.innerHTML = `
                <td>${order.trackingNumber}</td>
                <td>${customer ? customer.firstName + ' ' + customer.lastName : 'Unknown'}</td>
                <td>${order.items.map(i=>i.name).join(', ')}</td>
                <td class="order-status">${order.status.replace('_',' ')}</td>
                <td>${driver ? driver.firstName + ' ' + driver.lastName : '—'}</td>
                <td>—</td>
                <td><button class="btn-secondary btn-view-order" data-id="${order.orderId}">View</button></td>
            `;
            tbody.appendChild(tr);
        });
    }

    function updateQuickStats(orders) {
        const stats = {
            total: orders.length,
            processing: orders.filter(o => o.status === 'processing').length,
            dispatched: orders.filter(o => o.status === 'dispatched' || o.status === 'in-transit').length,
            delivered: orders.filter(o => o.status === 'delivered').length,
        };
        const container = document.getElementById('quick-stats-cards');
        if (!container) return;
        container.innerHTML = `
            <div class="kpi-card"><div class="kpi-label">Total Orders</div><div class="kpi-value">${stats.total}</div></div>
            <div class="kpi-card"><div class="kpi-label">Processing</div><div class="kpi-value">${stats.processing}</div></div>
            <div class="kpi-card"><div class="kpi-label">Dispatched</div><div class="kpi-value">${stats.dispatched}</div></div>
            <div class="kpi-card"><div class="kpi-label">Delivered</div><div class="kpi-value">${stats.delivered}</div></div>
        `;
    }

    window.initDispatcherMap = async function() {
        const map = MapUtils.initMap('dispatcher-map');
        if (!map) return;
        const orders = await DataLoader.getOrders();
        const activeOrders = orders.filter(o => ['dispatched','in-transit','ready'].includes(o.status));
        MapUtils.clearMarkers();
        activeOrders.forEach(order => {
            if (order.deliveryAddress && order.deliveryAddress.lat) {
                const statusIcon = order.status === 'in-transit' ? 'driver' : 'delivery';
                MapUtils.addMarker(order.deliveryAddress.lat, order.deliveryAddress.lng, 
                    `<b>${order.trackingNumber}</b><br>${order.status}`, statusIcon);
            }
        });
        const events = await DataLoader.getTrackingEvents();
        const latestEvents = {};
        events.forEach(e => { if (!latestEvents[e.orderId] || new Date(e.timestamp) > new Date(latestEvents[e.orderId].timestamp)) latestEvents[e.orderId] = e; });
        Object.values(latestEvents).forEach(evt => {
            if (evt.location) {
                MapUtils.addMarker(evt.location.lat, evt.location.lng, `<i>${evt.driverId}</i>`, 'driver');
            }
        });
    };

    // ==================== DELIVERY MAN ====================
    window.initAssignedOrders = async function() {
        const user = getCurrentUserSafe();
        if (!user || user.role !== 'delivery-man') return;
        const orders = await DataLoader.getOrders();
        const myOrders = orders.filter(o => o.assignedDriver === user.userId && o.status !== 'delivered');
        const container = document.getElementById('assigned-orders-list');
        if (!container) return;
        container.innerHTML = '';
        if (myOrders.length === 0) {
            container.innerHTML = '<p class="empty-state">You have no assigned orders at the moment.</p>';
            return;
        }
        myOrders.forEach(order => {
            const card = document.createElement('div');
            card.className = 'order-card';
            card.innerHTML = `
                <div class="order-top">
                    <span class="order-tracking">${order.trackingNumber}</span>
                    <span class="order-badge status-${order.status.replace('_','-')}">${order.status.replace('_',' ')}</span>
                </div>
                <div class="order-address">${order.deliveryAddress.street}, ${order.deliveryAddress.city}</div>
                <div class="order-items">${order.items.map(i=>i.name + ' x' + i.quantity).join(', ')}</div>
                <div class="order-actions">
                    <button class="btn-secondary btn-update-status" data-orderid="${order.orderId}">Update Status</button>
                </div>
            `;
            card.addEventListener('click', () => {
                document.dispatchEvent(new CustomEvent('select-delivery-order', { detail: { orderId: order.orderId } }));
            });
            container.appendChild(card);
        });
        // Attach status update handlers
        document.querySelectorAll('.btn-update-status').forEach(btn => {
            btn.addEventListener('click', async function(e) {
                e.stopPropagation();
                const orderId = this.dataset.orderid;
                const newStatus = document.getElementById('new-status-select')?.value;
                if (!newStatus) {
                    alert('Please select a new status.');
                    return;
                }
                try {
                    const orders = await DataLoader.getOrders();
                    const order = orders.find(o => o.orderId === orderId);
                    if (order) {
                        order.status = newStatus;
                        localStorage.setItem('orders_modified', JSON.stringify(orders));
                        // Re-render
                        await window.initAssignedOrders();
                        alert(`Order ${order.trackingNumber} updated to ${newStatus.replace('_',' ')}.`);
                    }
                } catch (err) {
                    console.error(err);
                    alert('Status update failed.');
                }
            });
        });
    };

    window.initCompletedDeliveries = async function() {
        const user = getCurrentUserSafe();
        if (!user || user.role !== 'delivery-man') return;
        const orders = await DataLoader.getOrders();
        const completed = orders.filter(o => o.assignedDriver === user.userId && o.status === 'delivered').sort((a,b)=> new Date(b.timestamps.delivered)-new Date(a.timestamps.delivered));
        const container = document.getElementById('completed-deliveries-list');
        if (!container) return;
        container.innerHTML = '';
        if (completed.length === 0) {
            container.innerHTML = '<p class="empty-state">No completed deliveries yet.</p>';
            return;
        }
        completed.forEach(order => {
            const li = document.createElement('li');
            li.className = 'history-item';
            li.innerHTML = `
                <div class="history-top">
                    <strong>${order.trackingNumber}</strong>
                    <span>${new Date(order.timestamps.delivered).toLocaleDateString()}</span>
                </div>
                <div class="history-detail">${order.deliveryAddress.city} – ${order.items.map(i=>i.name).join(', ')}</div>
            `;
            container.appendChild(li);
        });
    };

    // ==================== CUSTOMER ====================
    window.initCustomerTracking = async function() {
        const user = getCurrentUserSafe();
        if (!user || user.role !== 'customer') return;
        const orders = await DataLoader.getOrders();
        const myActiveOrders = orders.filter(o => o.customerId === user.userId && !['delivered','failed'].includes(o.status)).sort((a,b)=>new Date(b.timestamps.created)-new Date(a.timestamps.created));
        const activeOrder = myActiveOrders.length > 0 ? myActiveOrders[0] : null;

        // Build tracking header
        if (!activeOrder) {
            document.getElementById('active-order-details').innerHTML = '<p class="empty-state">No active order. Place one or check your history.</p>';
            document.getElementById('driver-info-card').style.display = 'none';
            if (document.getElementById('customer-tracking-map')) {
                MapUtils.initMap('customer-tracking-map'); // show empty map
            }
            return;
        }
        // Active order details
        const itemsText = activeOrder.items.map(i => i.name + ' x' + i.quantity).join('<br>');
        document.getElementById('active-order-details').innerHTML = `
            <div class="detail-row"><span>Tracking:</span><span>${activeOrder.trackingNumber}</span></div>
            <div class="detail-row"><span>Status:</span><span>${activeOrder.status.replace('_',' ')}</span></div>
            <div class="detail-row"><span>Items:</span><span>${itemsText}</span></div>
            <div class="detail-row"><span>Total:</span><span>${activeOrder.total} MAD</span></div>
        `;
        // Timeline
        const events = await DataLoader.getTrackingEvents();
        const orderEvents = events.filter(e => e.orderId === activeOrder.orderId).sort((a,b)=> new Date(a.timestamp)-new Date(b.timestamp));
        renderTimeline(orderEvents);
        // Map
        const map = MapUtils.initMap('customer-tracking-map');
        if (map && orderEvents.length > 0) {
            MapUtils.clearMarkers();
            orderEvents.forEach(evt => {
                if (evt.location) {
                    MapUtils.addMarker(evt.location.lat, evt.location.lng, evt.status, 'delivery');
                }
            });
            const lastEvt = orderEvents[orderEvents.length-1];
            if (lastEvt.location) map.setView([lastEvt.location.lat, lastEvt.location.lng], 13);
        } else if (map) {
            // Show general city center
            map.setView([activeOrder.deliveryAddress.lat, activeOrder.deliveryAddress.lng], 13);
        }
        // Driver info
        if (activeOrder.assignedDriver) {
            const users = await DataLoader.getUsers();
            const driver = users.find(d => d.userId === activeOrder.assignedDriver);
            if (driver) {
                document.getElementById('driver-details').innerHTML = `
                    <img src="${driver.profileImageUrl || 'https://i.pravatar.cc/48'}" alt="${driver.firstName}">
                    <div>
                        <strong>${driver.firstName} ${driver.lastName}</strong><br>
                        <small>${driver.phone || ''}</small>
                    </div>
                `;
            }
        } else {
            document.getElementById('driver-details').innerHTML = '<em>Waiting for driver assignment...</em>';
        }
    };

    function renderTimeline(events) {
        const timelineEl = document.getElementById('order-timeline');
        if (!timelineEl) return;
        const stages = ['picked_up','in_transit','arrived_destination','delivered'];
        timelineEl.innerHTML = '';
        stages.forEach((stage, idx) => {
            const step = document.createElement('div');
            step.className = 'timeline-step';
            const evt = events.find(e => e.status === stage);
            if (evt) step.classList.add('completed');
            else if (idx === events.length) step.classList.add('active'); // next step
            step.innerHTML = `
                <div class="step-circle">${idx+1}</div>
                <div class="step-label">${stage.replace('_',' ')}</div>
            `;
            timelineEl.appendChild(step);
        });
    }

    window.initOrderHistory = async function() {
        const user = getCurrentUserSafe();
        if (!user || user.role !== 'customer') return;
        const orders = await DataLoader.getOrders();
        const myOrders = orders.filter(o => o.customerId === user.userId).sort((a,b)=> new Date(b.timestamps.created)-new Date(a.timestamps.created));
        const container = document.getElementById('order-history-list');
        if (!container) return;
        container.innerHTML = '';
        if (myOrders.length === 0) {
            container.innerHTML = '<p class="empty-state">No order history yet.</p>';
            return;
        }
        myOrders.forEach(order => {
            const card = document.createElement('div');
            card.className = 'order-history-item';
            card.innerHTML = `
                <div class="history-header">
                    <span class="tracking">${order.trackingNumber}</span>
                    <span class="status-badge ${order.status}">${order.status}</span>
                    <span class="date">${new Date(order.timestamps.created).toLocaleDateString()}</span>
                </div>
                <div class="history-body">
                    <div>${order.items.map(i=>i.name).join(', ')}</div>
                    <div class="amount">${order.total} MAD</div>
                    <div>${order.deliveryAddress.city}</div>
                </div>
            `;
            container.appendChild(card);
        });
    };

    window.initCustomerProof = async function() {
        const user = getCurrentUserSafe();
        if (!user || user.role !== 'customer') return;
        const orders = await DataLoader.getOrders();
        const myDelivered = orders.filter(o => o.customerId === user.userId && o.status === 'delivered');
        const proofViewer = document.getElementById('proof-viewer');
        if (!proofViewer) return;
        if (myDelivered.length === 0) {
            proofViewer.innerHTML = '<p class="empty-state">No delivered orders to show proof.</p>';
            return;
        }
        let html = '<ul class="proof-order-list">';
        myDelivered.forEach(order => {
            html += `<li><a href="#" class="view-proof-link" data-order="${order.orderId}">${order.trackingNumber} – ${order.deliveryAddress.city}</a></li>`;
        });
        html += '</ul>';
        proofViewer.innerHTML = html;
        document.querySelectorAll('.view-proof-link').forEach(link => {
            link.addEventListener('click', async function(e) {
                e.preventDefault();
                const orderId = this.dataset.order;
                const proofs = await DataLoader.getDeliveryProofs();
                const proof = proofs.find(p => p.orderId === orderId);
                const modalImg = document.getElementById('proof-full-image');
                const modal = document.getElementById('proof-modal');
                if (proof && proof.localStorageKey) {
                    const imgData = localStorage.getItem(proof.localStorageKey);
                    if (imgData) {
                        modalImg.src = imgData;
                        modal.classList.remove('hidden');
                    } else {
                        alert('Proof image not found in local storage. It may have been cleared.');
                    }
                } else {
                    alert('No proof record found for this order.');
                }
            });
        });
    };

    // Helper
    function getCurrentUserSafe() {
        if (typeof getCurrentUser === 'function') return getCurrentUser();
        const stored = localStorage.getItem('currentUser');
        return stored ? JSON.parse(stored) : null;
    }
})();
