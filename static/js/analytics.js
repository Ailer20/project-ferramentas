// static/js/analytics.js
import { refreshToken } from "./main.js";

document.addEventListener("DOMContentLoaded", () => {

    // ✅ PASSO 1: Declarar variáveis para guardar as instâncias dos gráficos
    let toolsByConditionChart, inventoryValueChart, maintenanceCostChart, loanActivityChart;

    async function fetchWithAuth(url, options = {}) {
        options.headers = { ...options.headers, 'Authorization': `Bearer ${localStorage.getItem('access_token')}` };
        let response = await fetch(url, options);
        if (response.status === 401) {
            const refreshed = await refreshToken();
            if (refreshed) {
                options.headers['Authorization'] = `Bearer ${localStorage.getItem('access_token')}`;
                response = await fetch(url, options);
            } else { window.location.href = "/login"; return null; }
        }
        return response;
    }
    
    const conditionLabels = { 'good': 'Boa Condição', 'new': 'Novo', 'recovered': 'Recuperada', 'maintenance': 'Em Manutenção' };
    const chartColors = ['#8e2de2', '#4a00e0', '#17a2b8', '#28a745', '#ffc107', '#dc3545'];

    async function loadAnalytics() {
        const response = await fetchWithAuth('/api/analytics/');
        if (!response || !response.ok) {
            console.error("Falha ao buscar dados de análise.");
            return;
        }
        const data = await response.json();

        // --- Gráfico 1: Ferramentas por Condição (Pizza) ---
        
        // ✅ PASSO 2: Destruir o gráfico antigo antes de criar um novo
        if (toolsByConditionChart) {
            toolsByConditionChart.destroy();
        }
        toolsByConditionChart = new Chart(document.getElementById('toolsByConditionChart'), {
            type: 'doughnut',
            data: {
                labels: data.tools_by_condition.map(item => conditionLabels[item.condition] || item.condition),
                datasets: [{
                    label: 'Ferramentas',
                    data: data.tools_by_condition.map(item => item.count),
                    backgroundColor: chartColors,
                    borderColor: '#1f1f3a',
                }]
            },
            options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { labels: { color: document.body.classList.contains('dark-theme') ? '#fff' : '#333' } } } }
        });

        // --- Gráfico 2: Valor do Inventário (Barras) ---
        if (inventoryValueChart) {
            inventoryValueChart.destroy();
        }
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
            options: { responsive: true, maintainAspectRatio: false, indexAxis: 'y' }
        });

        // --- Gráfico 3: Custos de Manutenção (Linha) ---
        if (maintenanceCostChart) {
            maintenanceCostChart.destroy();
        }
        maintenanceCostChart = new Chart(document.getElementById('maintenanceCostChart'), {
            type: 'line',
            data: {
                labels: data.maintenance_cost_over_time.map(item => item.month),
                datasets: [{
                    label: 'Custo Mensal (R$)',
                    data: data.maintenance_cost_over_time.map(item => item.total_cost),
                    borderColor: '#dc3545',
                    tension: 0.1
                }]
            },
            options: { responsive: true, maintainAspectRatio: false }
        });

        // --- Gráfico 4: Atividade de Empréstimos (Barras) ---
        if (loanActivityChart) {
            loanActivityChart.destroy();
        }
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
            options: { responsive: true, maintainAspectRatio: false }
        });
    }

    loadAnalytics();
});