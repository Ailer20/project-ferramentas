import { refreshToken } from "./main.js";

document.addEventListener("DOMContentLoaded", async () => {
    const toolSelect = document.getElementById("toolSelect");
    const borrowerSelect = document.getElementById("borrowerSelect");
    const borrowedDateInput = document.getElementById("borrowedDate");
    const loanForm = document.getElementById("loanForm");
    const messageDiv = document.getElementById("message");

    // Set today's date for borrowedDate
    const today = new Date();
    borrowedDateInput.value = today.toISOString().split("T")[0];

    // Helper fetch function with retry once on 401
    async function fetchWithAuth(url, options = {}, retry = true) {
        options.headers = options.headers || {};
        options.headers.Authorization = `Bearer ${localStorage.getItem("access_token")}`;

        try {
            const response = await fetch(url, options);
            if (response.status === 401 && retry) {
                const refreshed = await refreshToken();
                if (refreshed) {
                    return fetchWithAuth(url, options, false); // retry once
                } else {
                    window.location.href = "/login";
                    return;
                }
            }
            return response;
        } catch (error) {
            console.error("Fetch error:", error);
            throw error;
        }
    }

    async function fetchTools() {
        try {
            const response = await fetchWithAuth("/api/tools/");
            if (response.ok) {
                const tools = await response.json();
                toolSelect.innerHTML = "<option value=''>Selecione uma ferramenta</option>";
                tools.forEach(tool => {
                    const option = document.createElement("option");
                    option.value = tool.id;
                    option.textContent = `${tool.name} (Disponíveis: ${tool.available_quantity})`;
                    toolSelect.appendChild(option);
                });
            } else {
                console.error("Failed to fetch tools:", response.statusText);
            }
        } catch (error) {
            console.error("Error fetching tools:", error);
        }
    }

    async function fetchUsers() {
        try {
            const response = await fetchWithAuth("/api/users/");
            if (response.ok) {
                const users = await response.json();
                borrowerSelect.innerHTML = "<option value=''>Selecione um usuário</option>";
                users.forEach(user => {
                    const option = document.createElement("option");
                    option.value = user.id;
                    option.textContent = user.username;
                    borrowerSelect.appendChild(option);
                });
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

        if (!toolId || !borrowerId || !dueDate) {
            messageDiv.textContent = "Preencha todos os campos obrigatórios.";
            messageDiv.style.color = "red";
            return;
        }

        try {
            const response = await fetchWithAuth("/api/loans/", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    tool: parseInt(toolId, 10),
                    quantity: parseInt(quantity, 10),
                    borrower: parseInt(borrowerId, 10),
                    borrowed_date: borrowedDate,
                    due_date: dueDate
                }),
            });

            if (response.ok) {
                messageDiv.textContent = "Empréstimo registrado com sucesso!";
                messageDiv.style.color = "green";
                loanForm.reset();
                borrowedDateInput.value = today.toISOString().split("T")[0];
                fetchTools(); // atualizar quantidade disponível
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

    // Inicial fetch
    fetchTools();
    fetchUsers();
});
