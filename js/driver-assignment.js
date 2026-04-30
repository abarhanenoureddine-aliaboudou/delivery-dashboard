// delivery-dashboard/js/driver-assignment.js
(function() {
    'use strict';

    window.initDriverAssignment = function() {
        loadAssignmentData();
        document.getElementById('assign-btn').addEventListener('click', assignDriverToOrder);
    };

    async function loadAssignmentData() {
        const [orders, users, vehicles] = await Promise.all([
            DataLoader.getOrders(),
            DataLoader.getUsers(),
            DataLoader.getVehicles()
        ]);

        const unassignedOrders = orders.filter(o => !o.assignedDriver || o.status === 'processing');
        const availableDrivers = users.filter(u => u.role === 'delivery-man' && isDriverAvailable(u, vehicles));

        renderUnassignedOrders(unassignedOrders);
        renderAvailableDrivers(availableDrivers);
        populateAssignmentSelects(unassignedOrders, availableDrivers);
    }

    function isDriverAvailable(driver, vehicles) {
        const vehicle = vehicles.find(v => v.currentDriver === driver.userId);
        return vehicle && vehicle.status === 'available';
    }

    function renderUnassignedOrders(orders) {
        const list = document.getElementById('unassigned-orders-list');
        if (!list) return;
        list.innerHTML = '';
        orders.forEach(order => {
            const li = document.createElement('li');
            li.className = 'drag-item';
            li.draggable = true;
            li.dataset.orderId = order.orderId;
            li.innerHTML = `
                <strong>${order.trackingNumber}</strong>
                <small>${order.deliveryAddress.city}</small>
            `;
            li.addEventListener('dragstart', handleDragStart);
            list.appendChild(li);
        });
    }

    function renderAvailableDrivers(drivers) {
        const list = document.getElementById('available-drivers-list');
        if (!list) return;
        list.innerHTML = '';
        drivers.forEach(driver => {
            const li = document.createElement('li');
            li.className = 'drag-item';
            li.draggable = true;
            li.dataset.driverId = driver.userId;
            li.innerHTML = `
                <strong>${driver.firstName} ${driver.lastName}</strong>
                <small>${driver.vehicleId ? 'Vehicle ' + driver.vehicleId : 'No vehicle'}</small>
            `;
            li.addEventListener('dragstart', handleDragStart);
            list.appendChild(li);
        });
    }

    function populateAssignmentSelects(orders, drivers) {
        const orderSelect = document.getElementById('order-select');
        const driverSelect = document.getElementById('driver-select');
        if (orderSelect) {
            orderSelect.innerHTML = '<option value="">Select order</option>';
            orders.forEach(o => {
                orderSelect.innerHTML += `<option value="${o.orderId}">${o.trackingNumber} - ${o.deliveryAddress.city}</option>`;
            });
        }
        if (driverSelect) {
            driverSelect.innerHTML = '<option value="">Select driver</option>';
            drivers.forEach(d => {
                driverSelect.innerHTML += `<option value="${d.userId}">${d.firstName} ${d.lastName}</option>`;
            });
        }
    }

    let draggedItem = null;
    function handleDragStart(e) {
        draggedItem = this;
        e.dataTransfer.effectAllowed = 'move';
    }

    // Allow drop on assignment area (simplified: button-based is more robust)
    async function assignDriverToOrder() {
        const orderId = document.getElementById('order-select').value;
        const driverId = document.getElementById('driver-select').value;
        const feedback = document.getElementById('assignment-feedback');
        if (!orderId || !driverId) {
            feedback.textContent = 'Please select both order and driver.';
            return;
        }
        try {
            const orders = await DataLoader.getOrders();
            const order = orders.find(o => o.orderId === orderId);
            if (!order) {
                feedback.textContent = 'Order not found.';
                return;
            }
            order.assignedDriver = driverId;
            order.status = 'dispatched';
            // Persist in localStorage (simulate server update)
            localStorage.setItem('orders_modified', JSON.stringify(orders));
            feedback.textContent = `Order ${order.trackingNumber} assigned successfully.`;
            // Refresh display
            loadAssignmentData();
            // Notify simulator
            document.dispatchEvent(new CustomEvent('assignment-made', { detail: { orderId, driverId } }));
        } catch (err) {
            feedback.textContent = 'Assignment failed.';
            console.error(err);
        }
    }

    // Merge localStorage modifications with fresh data if needed by data-loader
    // We'll augment DataLoader.getOrders to check localStorage first.
    const originalGetOrders = DataLoader.getOrders;
    DataLoader.getOrders = async function() {
        const local = localStorage.getItem('orders_modified');
        if (local) {
            return JSON.parse(local);
        }
        return originalGetOrders();
    };
})();
