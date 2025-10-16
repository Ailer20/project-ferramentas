// static/js/dashboard.js

import { refreshToken } from "./main.js";

document.addEventListener("DOMContentLoaded", async () => {
    // Verifica se o usuário está logado
    if (!localStorage.getItem("access_token")) {
        window.location.href = "/login";
        return;
    }

    // Função principal para buscar e exibir os dados
    async function fetchDashboardData() {
        try {
            const response = await fetch('/api/dashboard/', {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('access_token')}`
                }
            });

            if (response.ok) {
                const data = await response.json();
                updateUI(data);
            } else if (response.status === 401) {
                // Se o token expirou, tenta renová-lo
                const refreshed = await refreshToken();
                if (refreshed) {
                    fetchDashboardData(); // Tenta buscar os dados novamente
                } else {
                    window.location.href = "/login";
                }
            } else {
                console.error("Falha ao buscar dados do dashboard:", response.statusText);
            }
        } catch (error) {
            console.error("Erro na requisição do dashboard:", error);
        }
    }

    // Função para atualizar a interface com os dados da API
    function updateUI(data) {
        document.getElementById('total-tool-types').textContent = data.total_tool_types;
        document.getElementById('active-loans-count').textContent = data.active_loans_count;
        document.getElementById('overdue-loans-count').textContent = data.overdue_loans_count;
        document.getElementById('available-in-warehouse').textContent = data.available_in_warehouse;
        document.getElementById('tools-in-maintenance').textContent = data.tools_in_maintenance;
        document.getElementById('total-maintenance-cost').textContent = data.total_maintenance_cost;
        document.getElementById('total-inventory-value').textContent = data.total_inventory_value;
        
        // Lógica para o alerta e o card de empréstimos atrasados
        const overdueCount = parseInt(data.overdue_loans_count, 10);
        const alertBox = document.getElementById('overdue-alert');
        const overdueCard = document.getElementById('overdue-card');

        if (overdueCount > 0) {
            // Se houver empréstimos atrasados, mostra o alerta e colore o card
            document.getElementById('overdue-loans-count-alert').textContent = overdueCount;
            alertBox.style.display = 'flex';
            overdueCard.classList.add('card-danger');
        } else {
            // Caso contrário, esconde o alerta e remove a cor do card
            alertBox.style.display = 'none';
            overdueCard.classList.remove('card-danger');
        }
    }

    // Chama a função para carregar os dados quando a página for aberta
    fetchDashboardData();
});
