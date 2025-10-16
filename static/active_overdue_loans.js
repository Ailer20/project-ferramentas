
import { refreshToken } from "/static/main.js";

document.addEventListener("DOMContentLoaded", async () => {
    const accessToken = localStorage.getItem("access_token");
    if (!accessToken) {
        window.location.href = "/login";
        return;
    }

    const activeLoansList = document.getElementById("active-loans-list");
    const overdueLoansList = document.getElementById("overdue-loans-list");
    const activeLoansCountTab = document.getElementById("active-loans-count-tab");
    const overdueLoansCountTab = document.getElementById("overdue-loans-count-tab");
    const loanSearch = document.getElementById("loanSearch");
    const tabButtons = document.querySelectorAll(".tab-button");

    let allActiveLoans = [];
    let allOverdueLoans = [];
    let currentTab = "active";

    async function fetchLoans() {
        try {
            const activeResponse = await fetch("/api/loans/active_loans/", {
                headers: {
                    Authorization: `Bearer ${accessToken}`,
                },
            });
            const overdueResponse = await fetch("/api/loans/overdue_loans/", {
                headers: {
                    Authorization: `Bearer ${accessToken}`,
                },
            });

            if (activeResponse.ok && overdueResponse.ok) {
                allActiveLoans = await activeResponse.json();
                allOverdueLoans = await overdueResponse.json();
                activeLoansCountTab.textContent = allActiveLoans.length;
                overdueLoansCountTab.textContent = allOverdueLoans.length;
                renderLoans();
            } else if (activeResponse.status === 401 || overdueResponse.status === 401) {
                const refreshed = await refreshToken();
                if (refreshed) {
                    fetchLoans();
                } else {
                    window.location.href = "/login";
                }
            } else {
                console.error("Failed to fetch loans:", activeResponse.statusText, overdueResponse.statusText);
            }
        } catch (error) {
            console.error("Error fetching loans:", error);
        }
    }

    function renderLoans() {
        activeLoansList.innerHTML = "";
        overdueLoansList.innerHTML = "";

        const loansToRender = currentTab === "active" ? allActiveLoans : allOverdueLoans;
        const targetList = currentTab === "active" ? activeLoansList : overdueLoansList;

        loansToRender.forEach(loan => {
            const loanCard = `
                <div class="card loan-card ${currentTab === "overdue" ? "overdue" : ""}">
                    <div class="card-header">
                        <h3><i class="fas fa-tools"></i> ${loan.tool_name}</h3>
                        <span class="status-badge ${currentTab === "overdue" ? "status-overdue" : "status-active"}">${currentTab === "overdue" ? "Atrasado" : "Ativo"}</span>
                    </div>
                    <div class="card-content">
                        <p><i class="fas fa-user"></i> Emprestado para: ${loan.borrower_username}</p>
                        <p><i class="fas fa-calendar-alt"></i> Data do Empréstimo: ${loan.borrowed_date}</p>
                        <p><i class="fas fa-calendar-check"></i> Devolução Prevista: ${loan.due_date}</p>
                        <p><i class="fas fa-hourglass-half"></i> Quantidade: ${loan.quantity}</p>
                    </div>
                    <div class="card-actions">
                        <button class="return-tool-btn" data-id="${loan.id}">Marcar como Devolvido</button>
                    </div>
                </div>
            `;
            targetList.innerHTML += loanCard;
        });

        document.querySelectorAll(".return-tool-btn").forEach(button => {
            button.addEventListener("click", (e) => returnTool(e.target.dataset.id));
        });
    }

    tabButtons.forEach(button => {
        button.addEventListener("click", (e) => {
            tabButtons.forEach(btn => btn.classList.remove("active"));
            e.target.classList.add("active");
            currentTab = e.target.dataset.tab;
            activeLoansList.style.display = currentTab === "active" ? "block" : "none";
            overdueLoansList.style.display = currentTab === "overdue" ? "block" : "none";
            renderLoans();
        });
    });

    loanSearch.addEventListener("input", (e) => {
        const searchTerm = e.target.value.toLowerCase();
        const loansToFilter = currentTab === "active" ? allActiveLoans : allOverdueLoans;
        const filteredLoans = loansToFilter.filter(loan => 
            loan.tool_name.toLowerCase().includes(searchTerm) || 
            loan.borrower_username.toLowerCase().includes(searchTerm)
        );
        renderLoans(filteredLoans);
    });

    async function returnTool(loanId) {
        if (!confirm("Tem certeza que deseja marcar esta ferramenta como devolvida?")) {
            return;
        }
        try {
            const response = await fetch(`/api/loans/${loanId}/return_tool/`, {
                method: "POST",
                headers: {
                    Authorization: `Bearer ${accessToken}`,
                },
            });

            if (response.ok) {
                fetchLoans(); // Refresh the list
            } else if (response.status === 401) {
                const refreshed = await refreshToken();
                if (refreshed) {
                    returnTool(loanId);
                } else {
                    window.location.href = "/login";
                }
            } else {
                const errorData = await response.json();
                console.error("Failed to return tool:", errorData);
                alert("Erro ao marcar ferramenta como devolvida: " + JSON.stringify(errorData));
            }
        } catch (error) {
            console.error("Error returning tool:", error);
            alert("Ocorreu um erro ao marcar a ferramenta como devolvida.");
        }
    }

    fetchLoans();
});

