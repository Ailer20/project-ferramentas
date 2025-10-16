// static/js/active_overdue_loans.js

import { refreshToken } from "./main.js";

document.addEventListener("DOMContentLoaded", async () => {
    // Checagem inicial de autenticação
    const accessToken = localStorage.getItem("access_token");
    if (!accessToken) {
        window.location.href = "/login";
        return;
    }

    // Elementos da página
    const activeLoansList = document.getElementById("active-loans-list");
    const overdueLoansList = document.getElementById("overdue-loans-list");
    const activeLoansCountTab = document.getElementById("active-loans-count-tab");
    const overdueLoansCountTab = document.getElementById("overdue-loans-count-tab");
    const loanSearch = document.getElementById("loanSearch");
    const tabButtons = document.querySelectorAll(".tab-button");

    // Armazenamento local dos dados
    let allActiveLoans = [];
    let allOverdueLoans = [];
    let currentTab = "active";

    // Busca os dados da API
    async function fetchLoans() {
        try {
            const headers = { Authorization: `Bearer ${localStorage.getItem("access_token")}` };
            const [activeResponse, overdueResponse] = await Promise.all([
                fetch("/api/loans/active_loans/", { headers }),
                fetch("/api/loans/overdue_loans/", { headers })
            ]);

            if (activeResponse.ok && overdueResponse.ok) {
                allActiveLoans = await activeResponse.json();
                allOverdueLoans = await overdueResponse.json();
                activeLoansCountTab.textContent = allActiveLoans.length;
                overdueLoansCountTab.textContent = allOverdueLoans.length;
                renderLoans(); // Renderiza a lista inicial
            } else if (activeResponse.status === 401 || overdueResponse.status === 401) {
                const refreshed = await refreshToken();
                if (refreshed) fetchLoans(); // Tenta buscar novamente
                else window.location.href = "/login";
            } else {
                console.error("Falha ao buscar empréstimos:", activeResponse.statusText, overdueResponse.statusText);
            }
        } catch (error) {
            console.error("Erro ao buscar empréstimos:", error);
        }
    }

    // Renderiza os cards de empréstimo na tela
    function renderLoans(loans = null) {
        activeLoansList.innerHTML = "";
        overdueLoansList.innerHTML = "";

        // CORREÇÃO: Usa a lista de 'loans' passada como argumento (para a busca)
        // ou usa a lista completa da aba atual se nenhum argumento for passado.
        const loansToRender = loans !== null 
            ? loans 
            : (currentTab === "active" ? allActiveLoans : allOverdueLoans);
        
        const targetList = currentTab === "active" ? activeLoansList : overdueLoansList;
        
        if (loansToRender.length === 0) {
            targetList.innerHTML = '<p class="no-results">Nenhum empréstimo encontrado.</p>';
        }

        loansToRender.forEach(loan => {
            const isOverdue = new Date(loan.due_date) < new Date() && !loan.returned_date;
            const cardClass = isOverdue ? "overdue" : "";
            const statusBadge = isOverdue ? "status-overdue" : "status-active";
            const statusText = isOverdue ? "Atrasado" : "Ativo";

            const loanCard = `
                <div class="card loan-card ${cardClass}">
                    <div class="card-header">
                        <h3><i class="fas fa-tools"></i> ${loan.tool_name}</h3>
                        <span class="status-badge ${statusBadge}">${statusText}</span>
                    </div>
                    <div class="card-content">
                        <p><i class="fas fa-user"></i> <b>Destinatário:</b> ${loan.borrower_username}</p>
                        <p><i class="fas fa-box"></i> <b>Quantidade:</b> ${loan.quantity}</p>
                        <p><i class="fas fa-calendar-alt"></i> <b>Data do Empréstimo:</b> ${loan.borrowed_date}</p>
                        <p><i class="fas fa-calendar-check"></i> <b>Devolução Prevista:</b> ${loan.due_date}</p>
                    </div>
                    <div class="card-actions">
                        <button class="return-tool-btn" data-id="${loan.id}"><i class="fas fa-undo-alt"></i> Marcar como Devolvido</button>
                    </div>
                </div>
            `;
            targetList.innerHTML += loanCard;
        });

        // Adiciona os event listeners aos novos botões criados
        document.querySelectorAll(".return-tool-btn").forEach(button => {
            button.addEventListener("click", (e) => returnTool(e.target.closest('button').dataset.id));
        });
    }

    // Função para devolver uma ferramenta
    async function returnTool(loanId) {
        if (!confirm("Tem certeza que deseja marcar esta ferramenta como devolvida?")) return;
        
        try {
            // CORREÇÃO PRINCIPAL: A URL agora é '/return/' e não '/return_tool/'
            const response = await fetch(`/api/loans/${loanId}/return/`, {
                method: "POST",
                headers: {
                    Authorization: `Bearer ${localStorage.getItem("access_token")}`,
                },
            });

            if (response.ok) {
                await fetchLoans(); // Atualiza a lista de empréstimos
            } else if (response.status === 401) {
                const refreshed = await refreshToken();
                if (refreshed) returnTool(loanId); // Tenta de novo após renovar o token
                else window.location.href = "/login";
            } else {
                const errorData = await response.json();
                console.error("Falha ao devolver ferramenta:", errorData);
                alert("Erro ao devolver ferramenta: " + JSON.stringify(errorData.detail || "Erro desconhecido."));
            }
        } catch (error) {
            console.error("Erro na devolução:", error);
            // O erro de "not valid JSON" acontecia aqui porque a resposta era uma página 404 HTML
            alert("Ocorreu um erro de comunicação ao tentar devolver a ferramenta.");
        }
    }

    // Lógica para troca de abas
    tabButtons.forEach(button => {
        button.addEventListener("click", (e) => {
            tabButtons.forEach(btn => btn.classList.remove("active"));
            e.currentTarget.classList.add("active");
            currentTab = e.currentTarget.dataset.tab;
            
            document.getElementById('active-loans-list').classList.toggle('active', currentTab === 'active');
            document.getElementById('overdue-loans-list').classList.toggle('active', currentTab === 'overdue');
            
            renderLoans(); // Re-renderiza a lista para a aba selecionada
        });
    });

    // Lógica da barra de busca
    loanSearch.addEventListener("input", (e) => {
        const searchTerm = e.target.value.toLowerCase();
        const sourceList = currentTab === "active" ? allActiveLoans : allOverdueLoans;
        
        const filteredLoans = sourceList.filter(loan => 
            loan.tool_name.toLowerCase().includes(searchTerm) || 
            loan.borrower_username.toLowerCase().includes(searchTerm)
        );
        
        renderLoans(filteredLoans);
    });

    // Carga inicial dos dados
    fetchLoans();
});