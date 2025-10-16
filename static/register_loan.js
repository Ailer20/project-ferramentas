
import { refreshToken } from "/static/main.js";

document.addEventListener("DOMContentLoaded", async () => {
    const accessToken = localStorage.getItem("access_token");
    if (!accessToken) {
        window.location.href = "/login";
        return;
    }

    const toolSelect = document.getElementById("toolSelect");
    const borrowerSelect = document.getElementById("borrowerSelect");
    const borrowedDateInput = document.getElementById("borrowedDate");
    const loanForm = document.getElementById("loanForm");
    const messageDiv = document.getElementById("message");

    // Set today's date for borrowedDate
    const today = new Date();
    borrowedDateInput.value = today.toISOString().split("T")[0];

    async function fetchTools() {
        try {
            const response = await fetch("/api/tools/", {
                headers: {
                    Authorization: `Bearer ${accessToken}`,
                },
            });
            if (response.ok) {
                const tools = await response.json();
                tools.forEach(tool => {
                    const option = document.createElement("option");
                    option.value = tool.id;
                    option.textContent = `${tool.name} (Disponíveis: ${tool.available_for_loan})`;
                    toolSelect.appendChild(option);
                });
            } else if (response.status === 401) {
                const refreshed = await refreshToken();
                if (refreshed) {
                    fetchTools();
                } else {
                    window.location.href = "/login";
                }
            } else {
                console.error("Failed to fetch tools:", response.statusText);
            }
        } catch (error) {
            console.error("Error fetching tools:", error);
        }
    }

    async function fetchUsers() {
        try {
            const response = await fetch("/api/users/users/", {
                headers: {
                    Authorization: `Bearer ${accessToken}`,
                },
            });
            if (response.ok) {
                const users = await response.json();
                users.forEach(user => {
                    const option = document.createElement("option");
                    option.value = user.id;
                    option.textContent = user.username;
                    borrowerSelect.appendChild(option);
                });
            } else if (response.status === 401) {
                const refreshed = await refreshToken();
                if (refreshed) {
                    fetchUsers();
                } else {
                    window.location.href = "/login";
                }
            } else {
                console.error("Failed to fetch users:", response.statusText);
            }
        } catch (error) {
            console.error("Error fetching users:", error);
        }
    }

    loanForm.addEventListener("submit", async (e) => {
        e.preventDefault();
        const toolId = toolSelect.value;
        const quantity = document.getElementById("quantity").value;
        const borrowerId = borrowerSelect.value;
        const borrowedDate = borrowedDateInput.value;
        const dueDate = document.getElementById("dueDate").value;

        try {
            const response = await fetch("/api/loans/", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${accessToken}`,
                },
                body: JSON.stringify({ tool: toolId, quantity: quantity, borrower: borrowerId, borrowed_date: borrowedDate, due_date: dueDate }),
            });

            if (response.ok) {
                messageDiv.textContent = "Empréstimo registrado com sucesso!";
                messageDiv.style.color = "green";
                loanForm.reset();
                borrowedDateInput.value = today.toISOString().split("T")[0]; // Reset borrowed date
                // Re-fetch tools to update available quantity
                toolSelect.innerHTML = 
                    "<option value=\"\">Selecione uma ferramenta</option>";
                fetchTools();
            } else if (response.status === 401) {
                const refreshed = await refreshToken();
                if (refreshed) {
                    loanForm.dispatchEvent(new Event("submit"));
                } else {
                    window.location.href = "/login";
                }
            } else {
                const errorData = await response.json();
                messageDiv.textContent = `Erro ao registrar empréstimo: ${JSON.stringify(errorData)}`;
                messageDiv.style.color = "red";
            }
        } catch (error) {
            messageDiv.textContent = `Ocorreu um erro: ${error.message}`;
            messageDiv.style.color = "red";
        }
    });

    fetchTools();
    fetchUsers();
});

