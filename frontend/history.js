
import { refreshToken } from "/static/main.js";

document.addEventListener("DOMContentLoaded", async () => {
    const accessToken = localStorage.getItem("access_token");
    if (!accessToken) {
        window.location.href = "/login";
        return;
    }

    const loanHistoryList = document.getElementById("loan-history-list");
    const historySearch = document.getElementById("historySearch");

    let allLoanHistory = [];

    async function fetchLoanHistory() {
        try {
            const response = await fetch("/api/loans/loan_history/", {
                headers: {
                    Authorization: `Bearer ${accessToken}`,
                },
            });

            if (response.ok) {
                allLoanHistory = await response.json();
                renderLoanHistory(allLoanHistory);
            } else if (response.status === 401) {
                const refreshed = await refreshToken();
                if (refreshed) {
                    fetchLoanHistory();
                } else {
                    window.location.href = "/login";
                }
            } else {
                console.error("Failed to fetch loan history:", response.statusText);
            }
        } catch (error) {
            console.error("Error fetching loan history:", error);
        }
    }

    function renderLoanHistory(loans) {
        loanHistoryList.innerHTML = "";
        loans.forEach(loan => {
            const loanCard = `
                <div class="card loan-card">
                    <div class="card-header">
                        <h3><i class="fas fa-tools"></i> ${loan.tool_name}</h3>
                        <span class="status-badge status-returned">Devolvido</span>
                    </div>
                    <div class="card-content">
                        <p><i class="fas fa-user"></i> Emprestado para: ${loan.borrower_username}</p>
                        <p><i class="fas fa-calendar-alt"></i> Data do Empréstimo: ${loan.borrowed_date}</p>
                        <p><i class="fas fa-calendar-check"></i> Devolução Prevista: ${loan.due_date}</p>
                        <p><i class="fas fa-calendar-check"></i> Devolvido em: ${loan.returned_date}</p>
                        <p><i class="fas fa-hourglass-half"></i> Quantidade: ${loan.quantity}</p>
                    </div>
                </div>
            `;
            loanHistoryList.innerHTML += loanCard;
        });
    }

    historySearch.addEventListener("input", (e) => {
        const searchTerm = e.target.value.toLowerCase();
        const filteredLoans = allLoanHistory.filter(loan => 
            loan.tool_name.toLowerCase().includes(searchTerm) || 
            loan.borrower_username.toLowerCase().includes(searchTerm)
        );
        renderLoanHistory(filteredLoans);
    });

    fetchLoanHistory();
});

