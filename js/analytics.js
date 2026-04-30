// delivery-dashboard/js/analytics.js
(function() {
    'use strict';

    let charts = {};

    window.initAnalytics = async function() {
        const data = await DataLoader.getAnalyticsData();
        renderOrderVolumeChart(data.dailyStats);
        renderSuccessRateChart(data.dailyStats);
        // Full analytics panel (super-admin)
        document.getElementById('date-range')?.addEventListener('change', async (e) => {
            const days = parseInt(e.target.value);
            const filtered = filterDailyStats(data.dailyStats, days);
            updateCharts(filtered, data);
        });
        // Initial render with 7 days
        const filtered = filterDailyStats(data.dailyStats, 7);
        renderDailyOrdersChart(filtered);
        renderDriverPerformanceChart(data.driverPerformance);
        renderDeliveryTimeDistributionChart(data.deliveryTimeDistribution);
    };

    function filterDailyStats(stats, days) {
        const cutoff = new Date();
        cutoff.setDate(cutoff.getDate() - days);
        return stats.filter(s => new Date(s.date) >= cutoff);
    }

    function renderOrderVolumeChart(stats) {
        const ctx = document.getElementById('order-volume-chart')?.getContext('2d');
        if (!ctx) return;
        if (charts.orderVolume) charts.orderVolume.destroy();
        charts.orderVolume = new Chart(ctx, {
            type: 'line',
            data: {
                labels: stats.map(s => s.date),
                datasets: [{
                    label: 'Total Orders',
                    data: stats.map(s => s.totalOrders),
                    borderColor: '#0f62fe',
                    tension: 0.2,
                    fill: false
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: { y: { beginAtZero: true } }
            }
        });
    }

    function renderSuccessRateChart(stats) {
        const ctx = document.getElementById('success-rate-chart')?.getContext('2d');
        if (!ctx) return;
        if (charts.successRate) charts.successRate.destroy();
        const successRate = stats.map(s => s.totalOrders ? (s.completed / s.totalOrders * 100).toFixed(1) : 0);
        charts.successRate = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: stats.map(s => s.date),
                datasets: [{
                    label: 'Success Rate %',
                    data: successRate,
                    backgroundColor: '#24a148'
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: { y: { max: 100 } }
            }
        });
    }

    function renderDailyOrdersChart(stats) {
        const ctx = document.getElementById('daily-orders-chart')?.getContext('2d');
        if (!ctx) return;
        if (charts.dailyOrders) charts.dailyOrders.destroy();
        charts.dailyOrders = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: stats.map(s => s.date),
                datasets: [
                    { label: 'Completed', data: stats.map(s => s.completed), backgroundColor: '#24a148' },
                    { label: 'Failed', data: stats.map(s => s.failed), backgroundColor: '#da1e28' }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: { x: { stacked: true }, y: { stacked: true } }
            }
        });
    }

    function renderDriverPerformanceChart(drivers) {
        const ctx = document.getElementById('driver-perf-chart')?.getContext('2d');
        if (!ctx) return;
        if (charts.driverPerf) charts.driverPerf.destroy();
        charts.driverPerf = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: drivers.map(d => d.driverId),
                datasets: [
                    { label: 'Deliveries', data: drivers.map(d => d.deliveriesCompleted), backgroundColor: '#0f62fe' },
                    { label: 'Avg Time (min)', data: drivers.map(d => d.avgDeliveryTimeMinutes), backgroundColor: '#f1c21b' }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: { y: { beginAtZero: true } }
            }
        });
    }

    function renderDeliveryTimeDistributionChart(buckets) {
        const ctx = document.getElementById('delivery-time-distribution-chart')?.getContext('2d');
        if (!ctx) return;
        if (charts.dist) charts.dist.destroy();
        charts.dist = new Chart(ctx, {
            type: 'pie',
            data: {
                labels: ['<15 min', '15-30 min', '30-60 min', '>60 min'],
                datasets: [{
                    data: [buckets.under15, buckets['15to30'], buckets['30to60'], buckets.over60].filter(Boolean),
                    backgroundColor: ['#24a148', '#4589ff', '#f1c21b', '#da1e28']
                }]
            },
            options: { responsive: true, maintainAspectRatio: false }
        });
    }

    function updateCharts(stats, fullData) {
        renderDailyOrdersChart(stats);
        renderDriverPerformanceChart(fullData.driverPerformance);
        renderDeliveryTimeDistributionChart(fullData.deliveryTimeDistribution);
    }

    // Initialize if on super-admin
    if (document.getElementById('panel-analytics')) {
        document.addEventListener('DOMContentLoaded', () => {
            if (typeof initAnalytics === 'function') initAnalytics();
        });
    }
})();
