
import { refreshToken } from "/static/main.js";

document.addEventListener("DOMContentLoaded", async () => {
    const accessToken = localStorage.getItem("access_token");
    if (!accessToken) {
        window.location.href = "/login";
        return;
    }

    try {
        const response = await fetch("/api/dashboard/", {
            headers: {
                Authorization: `Bearer ${accessToken}`,
            },
        });

        if (response.ok) {
            const data = await response.json();
            document.getElementById("total-tool-types").textContent = data.total_tool_types;
            document.getElementById("active-loans-count").textContent = data.active_loans_count;
            document.getElementById("overdue-loans-count").textContent = data.overdue_loans_count;
            document.getElementById("overdue-loans-count-alert").textContent = data.overdue_loans_count;
            document.getElementById("available-in-warehouse").textContent = data.available_in_warehouse;
            document.getElementById("tools-in-maintenance").textContent = data.tools_in_maintenance;
            document.getElementById("total-maintenance-cost").textContent = parseFloat(data.total_maintenance_cost).toFixed(2);
            document.getElementById("total-inventory-value").textContent = parseFloat(data.total_inventory_value).toFixed(2);
        } else if (response.status === 401) {
            // Token expirado ou inválido, tentar refresh
            const refreshed = await refreshToken();
            if (refreshed) {
                // Tentar novamente após o refresh
                window.location.reload();
            } else {
                window.location.href = "/login";
            }
        } else {
            console.error("Failed to fetch dashboard data:", response.statusText);
        }
    } catch (error) {
        console.error("Error fetching dashboard data:", error);
    }
});



