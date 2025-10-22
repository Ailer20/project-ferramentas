// static/js/analytics.js
import { refreshToken } from "./main.js";

document.addEventListener("DOMContentLoaded", () => {

    // Variáveis para guardar as instâncias dos gráficos
    let toolsByConditionChart, inventoryValueChart, maintenanceCostChart, loanActivityChart, maintenancesPerMonthChart;

    // Função para requisições autenticadas
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
    
    // Função principal para carregar e renderizar os gráficos
    async function loadAnalytics() {
        const response = await fetchWithAuth('/api/analytics/');
        if (!response || !response.ok) {
            console.error("Falha ao buscar dados de análise.");
            return;
        }
        const data = await response.json();

        // ✅ --- CORREÇÃO PRINCIPAL: Definir Cores Padrão Globalmente --- ✅
        const isDarkMode = document.body.classList.contains('dark-theme');
        const legendAndTextColor = isDarkMode ? '#ffffffff' : '#ffffffff'; // Branco para escuro, Preto para claro
        const gridLineColor = isDarkMode ? 'rgba(160, 160, 176, 0.1)' : 'rgba(115, 115, 115, 0.1)';

        // Aplica as cores a TODOS os gráficos que serão criados
        Chart.defaults.color = legendAndTextColor;
        Chart.defaults.borderColor = gridLineColor;
        // Fim da correção principal

        const conditionLabels = { 'good': 'Boa Condição', 'new': 'Novo', 'recovered': 'Recuperada', 'maintenance': 'Em Manutenção' };
        const chartColors = ['#28a745', '#007bff', '#17a2b8', '#dc3545', '#ffc107'];

        // --- 1. Gráfico de Ferramentas por Condição (Pizza) ---
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
            // As opções de cores agora são herdadas do Chart.defaults
            options: { responsive: true, maintainAspectRatio: false }
        });

        // --- 2. Gráfico de Valor do Inventário (Barras) ---
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
            options: { indexAxis: 'y', responsive: true, maintainAspectRatio: false }
        });

        // --- 3. Gráfico de Custos de Manutenção (Linha) ---
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
            options: { responsive: true, maintainAspectRatio: false }
        });

        // --- 4. Gráfico de Atividade de Empréstimos (Barras) ---
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
            options: { responsive: true, maintainAspectRatio: false }
        });

        // --- 5. Gráfico de Quantidade de Manutenções (Barras) ---
        if (maintenancesPerMonthChart) maintenancesPerMonthChart.destroy();
        maintenancesPerMonthChart = new Chart(document.getElementById('maintenancesPerMonthChart'), {
            type: 'bar',
            data: {
                labels: data.maintenances_per_month.map(item => item.month),
                datasets: [{
                    label: 'Nº de Manutenções',
                    data: data.maintenances_per_month.map(item => item.count),
                    backgroundColor: '#ffc107',
                }]
            },
            options: { responsive: true, maintainAspectRatio: false }
        });
    }

    // --- Carga Inicial ---
    loadAnalytics();
});