// static/js/history.js

import { refreshToken } from "./main.js";

document.addEventListener("DOMContentLoaded", () => {

    // --- Seleção de Elementos ---
    const loanHistoryList = document.getElementById("loan-history-list");
    const historySearch = document.getElementById("historySearch");
    let allLoanHistory = [];

    // --- Funções Auxiliares ---

    // Função genérica para requisições autenticadas
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
                response = await fetch(url, options);
            } else {
                window.location.href = "/login";
                return null;
            }
        }
        return response;
    }
    
    // --- Funções de Renderização ---

    function renderLoanHistory(loans) {
        loanHistoryList.innerHTML = ""; // Limpa a lista
        if (loans.length === 0) {
            loanHistoryList.innerHTML = '<p class="no-results">Nenhum registro encontrado no histórico.</p>';
            return;
        }

        loans.forEach(loan => {
            const loanCard = `
                <div class="card loan-card">
                    <div class="card-header">
                        <h3><i class="fas fa-tools"></i> ${loan.tool_name}</h3>
                        <span class="status-badge status-returned">Devolvido</span>
                    </div>
                    <div class="card-content">
                        <p><i class="fas fa-user"></i> <b>Destinatário:</b> ${loan.borrower_username}</p>
                        <p><i class="fas fa-box"></i> <b>Quantidade:</b> ${loan.quantity}</p>
                        <p><i class="fas fa-calendar-alt"></i> <b>Data do Empréstimo:</b> ${loan.borrowed_date}</p>
                        <p><i class="fas fa-calendar-times"></i> <b>Devolução Prevista:</b> ${loan.due_date}</p>
                        <p><i class="fas fa-calendar-check"></i> <b>Devolvido em:</b> ${loan.returned_date}</p>
                    </div>
                </div>
            `;
            loanHistoryList.insertAdjacentHTML('beforeend', loanCard);
        });
    }

    // --- Funções de API e Lógica Principal ---

    async function fetchAndDisplayHistory() {
        loanHistoryList.innerHTML = '<p class="no-results">Carregando histórico...</p>';
        const response = await fetchWithAuth("/api/loans/loan_history/");
        if (response && response.ok) {
            allLoanHistory = await response.json();
            renderLoanHistory(allLoanHistory);
        } else {
            console.error("Falha ao buscar histórico de empréstimos.");
            loanHistoryList.innerHTML = '<p class="no-results" style="color: #dc3545;">Erro ao carregar o histórico.</p>';
        }
    }

    // --- Adicionando Event Listeners ---

    historySearch.addEventListener("input", (e) => {
        const searchTerm = e.target.value.toLowerCase();
        const filteredLoans = allLoanHistory.filter(loan => 
            loan.tool_name.toLowerCase().includes(searchTerm) || 
            loan.borrower_username.toLowerCase().includes(searchTerm)
        );
        renderLoanHistory(filteredLoans);
    });

    // Carga inicial
    fetchAndDisplayHistory();
});