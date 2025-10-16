// static/js/virtual_warehouse.js

import { refreshToken } from "./main.js";

document.addEventListener("DOMContentLoaded", () => {
    
    // --- Seleção de Elementos ---
    const tableBody = document.getElementById('warehouseTableBody');
    const searchInput = document.getElementById('warehouseSearch');
    let allTools = []; // Cache para guardar os dados e facilitar a busca

    // --- Funções Auxiliares ---

    // Função genérica para fazer requisições à API com autenticação e refresh de token
    async function fetchWithAuth(url, options = {}) {
        options.headers = {
            ...options.headers,
            'Authorization': `Bearer ${localStorage.getItem('access_token')}`
        };
        let response = await fetch(url, options);
        if (response.status === 401) {
            const refreshed = await refreshToken();
            if (refreshed) {
                options.headers['Authorization'] = `Bearer ${localStorage.getItem('access_token')}`;
                response = await fetch(url, options); // Tenta de novo
            } else {
                window.location.href = "/login"; // Falhou, volta pro login
                return null;
            }
        }
        return response;
    }

    // --- Funções de Renderização ---

    // Converte o nome técnico do status para um texto amigável
    function getStatusText(status) {
        const statusMap = {
            'good': 'Boa Condição',
            'new': 'Novo',
            'recovered': 'Recuperada',
            'maintenance': 'Em Manutenção'
        };
        return statusMap[status] || status; // Retorna o texto ou o nome original se não encontrar
    }

    // Renderiza as linhas da tabela na tela
    function renderTable(tools) {
        tableBody.innerHTML = ''; // Limpa a tabela antes de adicionar novas linhas

        if (tools.length === 0) {
            tableBody.innerHTML = `<tr><td colspan="7" style="text-align: center; color: #a0a0b0;">Nenhuma ferramenta encontrada.</td></tr>`;
            return;
        }

        tools.forEach(tool => {
            const row = `
                <tr>
                    <td>
                        <img src="${tool.image || 'https://via.placeholder.com/50x50'}" alt="${tool.name}" class="tool-table-image">
                    </td>
                    <td><strong>${tool.name}</strong></td>
                    <td>R$ ${parseFloat(tool.unit_value).toFixed(2)}</td>
                    <td>${tool.total_quantity}</td>
                    <td>${tool.borrowed_quantity}</td>
                    <td>${tool.available_quantity}</td>
                    <td>
                        <span class="status-badge status-${tool.condition}">${getStatusText(tool.condition)}</span>
                    </td>
                </tr>
            `;
            // Usar insertAdjacentHTML é um pouco mais performático que innerHTML += em loops
            tableBody.insertAdjacentHTML('beforeend', row);
        });
    }

    // --- Funções de API e Lógica Principal ---

    // Busca os dados das ferramentas e inicia a renderização
    async function fetchAndDisplayTools() {
        // Mostra uma mensagem de carregamento
        tableBody.innerHTML = `<tr><td colspan="7" style="text-align: center; color: #a0a0b0;">Carregando dados...</td></tr>`;

        const response = await fetchWithAuth('/api/tools/');
        if (response && response.ok) {
            allTools = await response.json();
            renderTable(allTools);
        } else {
            console.error("Falha ao buscar dados do armazém.");
            tableBody.innerHTML = `<tr><td colspan="7" style="text-align: center; color: #dc3545;">Erro ao carregar os dados. Tente novamente.</td></tr>`;
        }
    }

    // --- Adicionando Event Listeners ---

    // Event listener para a barra de busca em tempo real
    searchInput.addEventListener('input', (e) => {
        const searchTerm = e.target.value.toLowerCase();
        const filteredTools = allTools.filter(tool => 
            tool.name.toLowerCase().includes(searchTerm)
        );
        renderTable(filteredTools);
    });

    // --- Carga Inicial ---
    fetchAndDisplayTools();
});