// delivery-dashboard/js/app.js
(function() {
    'use strict';

    const app = {
        init: function(role) {
            this.role = role;
            this.initSidebar();
            this.initLogout();
            this.initGlobalListeners();
            // Boot the specific dashboard module
            const initMap = {
                'super-admin': initSuperAdmin,
                'dispatcher': initDispatcher,
                'delivery-man': initDeliveryMan,
                'customer': initCustomer
            };
            if (initMap[role] && typeof initMap[role] === 'function') {
                initMap[role]();
            } else {
                console.warn('No init function for role: ' + role);
            }
        },
        initSidebar: function() {
            const sidebar = document.getElementById('sidebar');
            const toggleBtn = document.getElementById('sidebar-toggle');
            if (toggleBtn && sidebar) {
                toggleBtn.addEventListener('click', function() {
                    sidebar.classList.toggle('open');
                });
            }
            // Navigation switching
            const navItems = document.querySelectorAll('.nav-item[data-panel]');
            navItems.forEach(item => {
                item.addEventListener('click', function(e) {
                    e.preventDefault();
                    const targetPanelId = this.getAttribute('data-panel');
                    // Set active nav
                    navItems.forEach(n => n.classList.remove('active'));
                    this.classList.add('active');
                    // Show corresponding panel
                    document.querySelectorAll('.panel').forEach(p => p.classList.remove('active'));
                    const panel = document.getElementById('panel-' + targetPanelId);
                    if (panel) panel.classList.add('active');
                });
            });
        },
        initLogout: function() {
            const logoutBtn = document.getElementById('logout-btn');
            if (logoutBtn) {
                logoutBtn.addEventListener('click', function() {
                    if (typeof logout === 'function') {
                        logout();
                    } else {
                        // fallback
                        localStorage.removeItem('currentUser');
                        sessionStorage.clear();
                        window.location.href = 'index.html';
                    }
                });
            }
        },
        initGlobalListeners: function() {
            // close modals
            document.addEventListener('click', function(e) {
                if (e.target.classList.contains('close-modal')) {
                    const modal = e.target.closest('.modal');
                    if (modal) modal.classList.add('hidden');
                }
            });
        }
    };

    // Expose app globally
    window.app = app;

    // Stub init functions to be implemented by role-specific scripts
    window.initSuperAdmin = window.initSuperAdmin || function() {
        console.log('Super admin dashboard loaded');
        if (typeof initUserManagement === 'function') initUserManagement();
        if (typeof initAnalytics === 'function') initAnalytics();
        if (typeof initNotifications === 'function') initNotifications();
        if (typeof initSettings === 'function') initSettings();
    };
    window.initDispatcher = window.initDispatcher || function() {
        if (typeof initLiveOrders === 'function') initLiveOrders();
        if (typeof initDriverAssignment === 'function') initDriverAssignment();
        if (typeof initDispatcherMap === 'function') initDispatcherMap();
        if (typeof initNotifications === 'function') initNotifications();
    };
    window.initDeliveryMan = window.initDeliveryMan || function() {
        if (typeof initAssignedOrders === 'function') initAssignedOrders();
        if (typeof initCompletedDeliveries === 'function') initCompletedDeliveries();
        if (typeof initRouteMap === 'function') initRouteMap();
        if (typeof initDeliveryProof === 'function') initDeliveryProof();
    };
    window.initCustomer = window.initCustomer || function() {
        if (typeof initCustomerTracking === 'function') initCustomerTracking();
        if (typeof initOrderHistory === 'function') initOrderHistory();
        if (typeof initCustomerProof === 'function') initCustomerProof();
        if (typeof initNotifications === 'function') initNotifications();
    };
})();
