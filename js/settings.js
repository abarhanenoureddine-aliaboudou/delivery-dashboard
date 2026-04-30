// delivery-dashboard/js/settings.js
(function() {
    'use strict';

    window.initSettings = function() {
        const companyNameInput = document.getElementById('company-name');
        const supportEmailInput = document.getElementById('support-email');
        const pollingIntervalInput = document.getElementById('polling-interval');
        const themeSwitch = document.getElementById('theme-switch');
        const saveBtn = document.getElementById('save-settings-btn');

        // Load current settings
        async function loadSettings() {
            const settings = await DataLoader.getSettings();
            // Merge with localStorage overrides
            const local = JSON.parse(localStorage.getItem('app_settings') || '{}');
            const merged = { ...settings, ...local };
            companyNameInput.value = merged.companyName || 'DelDash';
            supportEmailInput.value = merged.supportEmail || 'support@deldash.com';
            pollingIntervalInput.value = merged.notificationPollingIntervalSeconds || 15;
            themeSwitch.checked = merged.theme === 'dark';
            applyTheme(merged.theme || 'light');
        }

        function applyTheme(theme) {
            document.documentElement.setAttribute('data-theme', theme);
            themeSwitch.checked = theme === 'dark';
        }

        saveBtn.addEventListener('click', () => {
            const newSettings = {
                companyName: companyNameInput.value.trim(),
                supportEmail: supportEmailInput.value.trim(),
                notificationPollingIntervalSeconds: parseInt(pollingIntervalInput.value) || 15,
                theme: themeSwitch.checked ? 'dark' : 'light'
            };
            localStorage.setItem('app_settings', JSON.stringify(newSettings));
            applyTheme(newSettings.theme);
            // Update notification simulator interval
            if (typeof NotificationSimulator !== 'undefined') {
                NotificationSimulator.stop();
                NotificationSimulator.start(newSettings.notificationPollingIntervalSeconds);
            }
            // Show toast feedback
            const toast = document.createElement('div');
            toast.className = 'toast success';
            toast.innerHTML = '<i class="fas fa-check-circle"></i> Settings saved';
            document.body.appendChild(toast);
            setTimeout(() => toast.remove(), 3000);
        });

        // Toggle theme live
        themeSwitch.addEventListener('change', () => {
            applyTheme(themeSwitch.checked ? 'dark' : 'light');
        });

        loadSettings();
    };
})();
