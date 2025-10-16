
import { refreshToken } from "/static/main.js";

document.addEventListener("DOMContentLoaded", async () => {
    const accessToken = localStorage.getItem("access_token");
    if (!accessToken) {
        window.location.href = "/login";
        return;
    }

    const toolCardsContainer = document.getElementById("toolCardsContainer");
    const toolModal = document.getElementById("toolModal");
    const closeButton = document.querySelector(".close-button");
    const addNewToolBtn = document.getElementById("addNewToolBtn");
    const toolForm = document.getElementById("toolForm");

    let editingToolId = null;

    async function fetchTools() {
        try {
            const response = await fetch("/api/tools/", {
                headers: {
                    Authorization: `Bearer ${accessToken}`,
                },
            });

            if (response.ok) {
                const tools = await response.json();
                toolCardsContainer.innerHTML = "";
                tools.forEach(tool => {
                    const toolCard = `
                        <div class="card tool-card">
                            <img src="${tool.image || 
                            // Placeholder image
                            "https://via.placeholder.com/100"}" alt="${tool.name}" class="tool-image">
                            <div class="card-content">
                                <h3>${tool.name}</h3>
                                <p>${tool.description || "Sem descrição."}</p>
                                <p><strong>Condição:</strong> ${tool.condition}</p>
                                <p><strong>Total em estoque:</strong> ${tool.total_quantity}</p>
                                <p><strong>Disponíveis:</strong> ${tool.available_for_loan}</p>
                                <p><strong>Valor Unitário:</strong> R$ ${parseFloat(tool.unit_value).toFixed(2)}</p>
                                <div class="card-actions">
                                    <button class="edit-tool-btn" data-id="${tool.id}">Editar</button>
                                    <button class="delete-tool-btn" data-id="${tool.id}">Excluir</button>
                                </div>
                            </div>
                        </div>
                    `;
                    toolCardsContainer.innerHTML += toolCard;
                });

                document.querySelectorAll(".edit-tool-btn").forEach(button => {
                    button.addEventListener("click", (e) => openEditModal(e.target.dataset.id));
                });
                document.querySelectorAll(".delete-tool-btn").forEach(button => {
                    button.addEventListener("click", (e) => deleteTool(e.target.dataset.id));
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

    async function openEditModal(toolId) {
        editingToolId = toolId;
        toolModal.style.display = "block";
        document.querySelector("#toolModal h2").textContent = "Editar Ferramenta";
        document.querySelector("#toolForm button[type=\"submit\"]").textContent = "Salvar Alterações";

        try {
            const response = await fetch(`/api/tools/${toolId}/`, {
                headers: {
                    Authorization: `Bearer ${accessToken}`,
                },
            });
            if (response.ok) {
                const tool = await response.json();
                document.getElementById("toolName").value = tool.name;
                document.getElementById("toolDescription").value = tool.description;
                document.getElementById("toolCondition").value = tool.condition;
                document.getElementById("toolTotalQuantity").value = tool.total_quantity;
                document.getElementById("toolUnitValue").value = tool.unit_value;
                document.getElementById("toolAcquisitionDate").value = tool.acquisition_date;
                document.getElementById("toolMaintenanceCost").value = tool.maintenance_cost;
                document.getElementById("toolLastMaintenanceDate").value = tool.last_maintenance_date;
                document.getElementById("toolNextMaintenanceDate").value = tool.next_maintenance_date;
                document.getElementById("toolSupplier").value = tool.supplier;
            } else if (response.status === 401) {
                const refreshed = await refreshToken();
                if (refreshed) {
                    openEditModal(toolId);
                } else {
                    window.location.href = "/login";
                }
            } else {
                console.error("Failed to fetch tool for editing:", response.statusText);
            }
        } catch (error) {
            console.error("Error fetching tool for editing:", error);
        }
    }

    addNewToolBtn.addEventListener("click", () => {
        editingToolId = null;
        toolForm.reset();
        document.querySelector("#toolModal h2").textContent = "Adicionar Nova Ferramenta";
        document.querySelector("#toolForm button[type=\"submit\"]").textContent = "Adicionar Ferramenta";
        toolModal.style.display = "block";
    });

    closeButton.addEventListener("click", () => {
        toolModal.style.display = "none";
    });

    window.addEventListener("click", (event) => {
        if (event.target == toolModal) {
            toolModal.style.display = "none";
        }
    });

    toolForm.addEventListener("submit", async (e) => {
        e.preventDefault();
        const formData = new FormData(toolForm);
        const method = editingToolId ? "PUT" : "POST";
        const url = editingToolId ? `/api/tools/${editingToolId}/` : "/api/tools/";

        try {
            const response = await fetch(url, {
                method: method,
                headers: {
                    Authorization: `Bearer ${accessToken}`,
                },
                body: formData,
            });

            if (response.ok) {
                toolModal.style.display = "none";
                fetchTools();
            } else if (response.status === 401) {
                const refreshed = await refreshToken();
                if (refreshed) {
                    toolForm.dispatchEvent(new Event("submit"));
                } else {
                    window.location.href = "/login";
                }
            } else {
                const errorData = await response.json();
                console.error("Failed to save tool:", errorData);
                alert("Erro ao salvar ferramenta: " + JSON.stringify(errorData));
            }
        } catch (error) {
            console.error("Error saving tool:", error);
            alert("Ocorreu um erro ao salvar a ferramenta.");
        }
    });

    async function deleteTool(toolId) {
        if (!confirm("Tem certeza que deseja excluir esta ferramenta?")) {
            return;
        }
        try {
            const response = await fetch(`/api/tools/${toolId}/`, {
                method: "DELETE",
                headers: {
                    Authorization: `Bearer ${accessToken}`,
                },
            });

            if (response.ok) {
                fetchTools();
            } else if (response.status === 401) {
                const refreshed = await refreshToken();
                if (refreshed) {
                    deleteTool(toolId);
                } else {
                    window.location.href = "/login";
                }
            } else {
                console.error("Failed to delete tool:", response.statusText);
                alert("Erro ao excluir ferramenta.");
            }
        } catch (error) {
            console.error("Error deleting tool:", error);
            alert("Ocorreu um erro ao excluir a ferramenta.");
        }
    }

    fetchTools();
});

