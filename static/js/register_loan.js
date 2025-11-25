import { refreshToken } from "./main.js";

document.addEventListener("DOMContentLoaded", async () => {
    // Inicializar variáveis
    const toolSelect = $("#toolSelect"); // Usando jQuery para Select2
    const employeeSelect = $("#employeeSelect"); // Usando jQuery para Select2
    const borrowedDateInput = document.getElementById("borrowedDate");
    const loanForm = document.getElementById("loanForm");
    const messageDiv = document.getElementById("message");

    const today = new Date();
    borrowedDateInput.value = today.toISOString().split("T")[0];

    // --- Configuração do Fetch com Auth para o Select2 ---
    // O Select2 usa jQuery ajax, então precisamos interceptar ou passar o token
    const accessToken = localStorage.getItem("access_token");

    // 1. Inicializar Select2 para Ferramentas (Opcional, mas bom para busca)
    toolSelect.select2();
    
    // 2. Inicializar Select2 para Funcionários
    employeeSelect.select2();

    // Função auxiliar de fetch (a mesma que você já tem)
    async function fetchWithAuth(url, options = {}) {
         options.headers = options.headers || {};
         options.headers.Authorization = `Bearer ${localStorage.getItem("access_token")}`;
         // ... (lógica de retry igual ao seu arquivo original)
         try {
            const response = await fetch(url, options);
            if (response.status === 401) {
                const refreshed = await refreshToken();
                if (refreshed) return fetchWithAuth(url, options); 
                else window.location.href = "/login";
            }
            return response;
        } catch (e) { console.error(e); }
    }

    // Carregar dados iniciais
    async function loadData() {
        // Carregar Ferramentas
        const toolsRes = await fetchWithAuth("/api/tools/");
        if (toolsRes && toolsRes.ok) {
            const tools = await toolsRes.json();
            // Limpa e adiciona
            toolSelect.empty();
            toolSelect.append(new Option("Selecione uma ferramenta", ""));
            tools.forEach(tool => {
                const text = `${tool.name} (Disp: ${tool.available_quantity})`;
                // Desabilita se não tiver estoque
                const disabled = tool.available_quantity <= 0;
                const option = new Option(text, tool.id, false, false);
                if(disabled) option.disabled = true;
                toolSelect.append(option);
            });
            toolSelect.trigger('change'); // Atualiza Select2
        }

        // Carregar Funcionários
        const empRes = await fetchWithAuth("/api/employees/");
        if (empRes && empRes.ok) {
            const employees = await empRes.json();
            employeeSelect.empty();
            employeeSelect.append(new Option("Selecione um funcionário", ""));
            employees.forEach(emp => {
                const text = `${emp.name} - Matrícula: ${emp.registration_number}`;
                employeeSelect.append(new Option(text, emp.id));
            });
            employeeSelect.trigger('change');
        }
    }

    loanForm.addEventListener("submit", async (e) => {
        e.preventDefault();
        
        // Pega os valores do Select2 (jQuery)
        const toolId = toolSelect.val();
        const employeeId = employeeSelect.val();
        const quantity = document.getElementById("quantity").value;
        const dueDate = document.getElementById("dueDate").value;

        if (!toolId || !employeeId || !dueDate) {
            messageDiv.textContent = "Preencha todos os campos.";
            messageDiv.style.color = "red";
            return;
        }

        const body = {
            tool: parseInt(toolId),
            employee: parseInt(employeeId), // Mudou de 'borrower' para 'employee'
            quantity: parseInt(quantity),
            borrowed_date: borrowedDateInput.value,
            due_date: dueDate
        };

        const response = await fetchWithAuth("/api/loans/", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(body),
        });

        if (response && response.ok) {
            messageDiv.textContent = "Empréstimo registrado!";
            messageDiv.style.color = "green";
            loanForm.reset();
            // Resetar Select2
            toolSelect.val(null).trigger('change');
            employeeSelect.val(null).trigger('change');
            loadData(); // Recarrega para atualizar estoque visual
        } else {
            const err = await response.json();
            messageDiv.textContent = "Erro: " + JSON.stringify(err);
            messageDiv.style.color = "red";
        }
    });

    loadData();
});