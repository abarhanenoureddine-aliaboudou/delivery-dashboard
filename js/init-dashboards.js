// delivery-dashboard/js/init-dashboards.js
(function() {
    'use strict';

    // ==================== DISPATCHER ====================
    window.initLiveOrders = async function() {
        const orders = await DataLoader.getOrders();
        const users = await DataLoader.getUsers();
        renderLiveOrdersTable(orders, users);
        updateQuickStats(orders);
        // Filter
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
            <div class="kpi-card">
                <div class="kpi-label">Total Orders</div>
                <div class="kpi-value">${stats.total}</div>
            </div>
            <div class="kpi-card">
                <div class="kpi-label">Processing</div>
                <div class="kpi-value">${stats.processing}</div>
            </div>
            <div class="kpi-card">
                <div class="kpi-label">Dispatched</div>
                <div class="kpi-value">${stats.dispatched}</div>
            </div>
            <div class="kpi-card">
                <div class="kpi-label">Delivered</div>
                <div class="kpi-value">${stats.delivered}</div>
            </div>
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
        // also add driver positions from tracking events
        const events = await DataLoader.getTrackingEvents();
        const latestEvents = {};
        events.forEach(e => { latestEvents[e.orderId] = e; });
        Object.values(latestEvents).forEach(evt => {
            if (evt.location) {
                MapUtils.addMarker(evt.location.lat, evt.location.lng, 
                    `<i>Driver ${evt.driverId}</i>`, 'driver');
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
            container.innerHTML = '<p>No assigned orders.</p>';
            return;
        }
        myOrders.forEach(order => {
            const card = document.createElement('div');
            card.className = 'order-card';
            card.innerHTML = `
                <div class="order-address">${order.trackingNumber}</div>
                <div class="order-meta">
                    <span>${order.deliveryAddress.city}</span>
                    <span>${order.status}</span>
                </div>
                <div class="swipe-hint"><i class="fas fa-exchange-alt"></i> Swipe to update</div>
            `;
            card.addEventListener('click', () => {
                document.dispatchEvent(new CustomEvent('select-delivery-order', { detail: { orderId: order.orderId } }));
            });
            container.appendChild(card);
        });
    };

    // ==================== CUSTOMER ====================
    window.initCustomerTracking = async function() {
        const user = getCurrentUserSafe();
        if (!user || user.role !== 'customer') return;
        const orders = await DataLoader.getOrders();
        // Find the latest active order for this customer
        const myOrders = orders.filter(o => o.customerId === user.userId && !['delivered','failed'].includes(o.status));
        const activeOrder = myOrders.length > 0 ? myOrders[0] : null;
        if (!activeOrder) {
            document.getElementById('active-order-details').innerHTML = '<p>No active order.</p>';
            return;
        }
        // Show details
        document.getElementById('active-order-details').innerHTML = `
            <div class="detail-row"><span>Tracking:</span><span>${activeOrder.trackingNumber}</span></div>
            <div class="detail-row"><span>Status:</span><span>${activeOrder.status}</span></div>
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
        }
        // Driver info
        if (activeOrder.assignedDriver) {
            const drivers = await DataLoader.getUsers();
            const driver = drivers.find(d => d.userId === activeOrder.assignedDriver);
            if (driver) {
                document.getElementById('driver-details').innerHTML = `
                    <img src="${driver.profileImageUrl || 'https://i.pravatar.cc/48'}" alt="${driver.firstName}">
                    <div>
                        <strong>${driver.firstName} ${driver.lastName}</strong><br>
                        <small>${driver.phone || ''}</small>
                    </div>
                `;
            }
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
            if (evt) {
                step.classList.add('completed');
            } else if (events.length > 0 && idx <= events.length) {
                step.classList.add('active');
            }
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
        myOrders.forEach(order => {
            const item = document.createElement('div');
            item.className = 'order-history-item';
            item.innerHTML = `
                <span>${order.trackingNumber}</span>
                <span>${order.status}</span>
                <span>${new Date(order.timestamps.created).toLocaleDateString()}</span>
            `;
            container.appendChild(item);
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
            proofViewer.innerHTML = '<p>No delivered orders.</p>';
            return;
        }
        // Simple list to select
        let html = '<p>Select an order to view proof:</p><ul>';
        myDelivered.forEach(order => {
            html += `<li><a href="#" class="view-proof-link" data-order="${order.orderId}">${order.trackingNumber}</a></li>`;
        });
        html += '</ul>';
        proofViewer.innerHTML = html;
        document.querySelectorAll('.view-proof-link').forEach(link => {
            link.addEventListener('click', async function(e) {
                e.preventDefault();
                const orderId = this.dataset.order;
                const proofs = await DataLoader.getDeliveryProofs();
                const proof = proofs.find(p => p.orderId === orderId);
                if (proof && proof.localStorageKey) {
                    const imgData = localStorage.getItem(proof.localStorageKey);
                    if (imgData) {
                        document.getElementById('proof-full-image').src = imgData;
                        document.getElementById('proof-modal').classList.remove('hidden');
                    } else {
                        alert('Proof image not available locally.');
                    }
                } else {
                    alert('No proof found for this order.');
                }
            });
        });
    };

    // Helper to get current user (may be called before auth.js loads or after)
    function getCurrentUserSafe() {
        if (typeof getCurrentUser === 'function') return getCurrentUser();
        const stored = localStorage.getItem('currentUser');
        return stored ? JSON.parse(stored) : null;
    }
})();
