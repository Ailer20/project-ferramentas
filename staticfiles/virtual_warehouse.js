
import { refreshToken } from "/static/main.js";

document.addEventListener("DOMContentLoaded", async () => {
    const accessToken = localStorage.getItem("access_token");
    if (!accessToken) {
        window.location.href = "/login";
        return;
    }

    const warehouseTableBody = document.getElementById("warehouseTableBody");
    const warehouseSearch = document.getElementById("warehouseSearch");

    let allTools = [];

    async function fetchTools() {
        try {
            const response = await fetch("/api/tools/", {
                headers: {
                    Authorization: `Bearer ${accessToken}`,
                },
            });

            if (response.ok) {
                allTools = await response.json();
                renderTools(allTools);
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

    function renderTools(tools) {
        warehouseTableBody.innerHTML = "";
        tools.forEach(tool => {
            const row = `
                <tr>
                    <td><img src="${tool.image || "https://via.placeholder.com/50"}" alt="${tool.name}" class="tool-table-image"></td>
                    <td>${tool.name}</td>
                    <td>R$ ${parseFloat(tool.unit_value).toFixed(2)}</td>
                    <td>${tool.total_quantity}</td>
                    <td>${tool.borrowed_quantity}</td>
                    <td>${tool.available_for_loan}</td>
                    <td><span class="status-badge ${tool.condition === 'maintenance' ? 'status-maintenance' : 'status-available'}">${tool.condition === 'maintenance' ? 'Em Manutenção' : 'Disponível'}</span></td>
                </tr>
            `;
            warehouseTableBody.innerHTML += row;
        });
    }

    warehouseSearch.addEventListener("input", (e) => {
        const searchTerm = e.target.value.toLowerCase();
        const filteredTools = allTools.filter(tool => 
            tool.name.toLowerCase().includes(searchTerm) || 
            tool.description.toLowerCase().includes(searchTerm)
        );
        renderTools(filteredTools);
    });

    fetchTools();
});

