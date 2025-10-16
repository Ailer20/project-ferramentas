// static/js/analytics.js
import { refreshToken } from "./main.js";

document.addEventListener("DOMContentLoaded", () => {

    // Variables to hold the chart instances
    let toolsByConditionChart, inventoryValueChart, maintenanceCostChart, loanActivityChart, maintenancesPerMonthChart;

    // --- Helper Functions ---

    // Handles authenticated API requests
    async function fetchWithAuth(url, options = {}) {
        options.headers = { ...options.headers, 'Authorization': `Bearer ${localStorage.getItem('access_token')}` };
        let response = await fetch(url, options);
        if (response.status === 401) {
            const refreshed = await refreshToken();
            if (refreshed) {
                options.headers['Authorization'] = `Bearer ${localStorage.getItem('access_token')}`;
                response = await fetch(url, options);
            } else {
                window.location.href = "/login";
                return null;
            }
        }
        return response;
    }
    
    // --- Main Function to Load and Render Charts ---
    
    async function loadAnalytics() {
        const response = await fetchWithAuth('/api/analytics/');
        if (!response || !response.ok) {
            console.error("Failed to fetch analytics data.");
            return;
        }
        const data = await response.json();

        // --- Chart Configuration based on Theme ---
        const isDarkMode = document.body.classList.contains('dark-theme');
        const textColor = isDarkMode ? '#a0a0b0' : '#737373';
        const gridColor = isDarkMode ? 'rgba(160, 160, 176, 0.1)' : 'rgba(115, 115, 115, 0.1)';
        const legendColor = isDarkMode ? '#e0e0e0' : '#081E26';

        const conditionLabels = { 'good': 'Boa Condição', 'new': 'Novo', 'recovered': 'Recuperada', 'maintenance': 'Em Manutenção' };
        const chartColors = ['#28a745', '#007bff', '#17a2b8', '#dc3545', '#ffc107'];

        // --- 1. Tools by Condition Chart (Doughnut) ---
        if (toolsByConditionChart) toolsByConditionChart.destroy();
        toolsByConditionChart = new Chart(document.getElementById('toolsByConditionChart'), {
            type: 'doughnut',
            data: {
                labels: data.tools_by_condition.map(item => conditionLabels[item.condition] || item.condition),
                datasets: [{
                    label: 'Ferramentas',
                    data: data.tools_by_condition.map(item => item.count),
                    backgroundColor: chartColors,
                    borderColor: isDarkMode ? '#1f1f3a' : '#FFFFFF',
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: { legend: { labels: { color: legendColor } } }
            }
        });

        // --- 2. Inventory Value Chart (Bar) ---
        if (inventoryValueChart) inventoryValueChart.destroy();
        inventoryValueChart = new Chart(document.getElementById('inventoryValueChart'), {
            type: 'bar',
            data: {
                labels: data.inventory_value_by_tool.map(item => item.name),
                datasets: [{
                    label: 'Valor Total (R$)',
                    data: data.inventory_value_by_tool.map(item => item.total_value),
                    backgroundColor: '#4a00e0',
                }]
            },
            options: {
                indexAxis: 'y', // Horizontal bars
                responsive: true,
                maintainAspectRatio: false,
                scales: { x: { ticks: { color: textColor }, grid: { color: gridColor } }, y: { ticks: { color: textColor }, grid: { color: gridColor } } },
                plugins: { legend: { labels: { color: legendColor } } }
            }
        });

        // --- 3. Maintenance Cost Chart (Line) ---
        if (maintenanceCostChart) maintenanceCostChart.destroy();
        maintenanceCostChart = new Chart(document.getElementById('maintenanceCostChart'), {
            type: 'line',
            data: {
                labels: data.maintenance_cost_over_time.map(item => item.month),
                datasets: [{
                    label: 'Custo Mensal (R$)',
                    data: data.maintenance_cost_over_time.map(item => item.total_cost),
                    borderColor: '#dc3545',
                    backgroundColor: 'rgba(220, 53, 69, 0.1)',
                    fill: true,
                    tension: 0.2
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: { x: { ticks: { color: textColor }, grid: { color: gridColor } }, y: { ticks: { color: textColor }, grid: { color: gridColor } } },
                plugins: { legend: { labels: { color: legendColor } } }
            }
        });

        // --- 4. Loan Activity Chart (Bar) ---
        if (loanActivityChart) loanActivityChart.destroy();
        loanActivityChart = new Chart(document.getElementById('loanActivityChart'), {
            type: 'bar',
            data: {
                labels: data.loan_activity.map(item => item.month),
                datasets: [{
                    label: 'Nº de Empréstimos',
                    data: data.loan_activity.map(item => item.count),
                    backgroundColor: '#17a2b8',
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: { x: { ticks: { color: textColor }, grid: { color: gridColor } }, y: { ticks: { color: textColor }, grid: { color: gridColor } } },
                plugins: { legend: { labels: { color: legendColor } } }
            }
        });

        // --- 5. Maintenances per Month Chart (Bar) ---
        if (maintenancesPerMonthChart) maintenancesPerMonthChart.destroy();
        maintenancesPerMonthChart = new Chart(document.getElementById('maintenancesPerMonthChart'), {
            type: 'bar',
            data: {
                labels: data.maintenances_per_month.map(item => item.month),
                datasets: [{
                    label: 'Nº de Manutenções',
                    data: data.maintenances_per_month.map(item => item.count),
                    backgroundColor: '#ffc107', // Maintenance yellow color
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: { x: { ticks: { color: textColor }, grid: { color: gridColor } }, y: { ticks: { color: textColor }, grid: { color: gridColor } } },
                plugins: { legend: { labels: { color: legendColor } } }
            }
        });
    }

    // --- Initial Load ---
    loadAnalytics();
});