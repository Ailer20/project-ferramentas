
import { refreshToken } from "/static/main.js";

document.addEventListener("DOMContentLoaded", async () => {
    const accessToken = localStorage.getItem("access_token");
    if (!accessToken) {
        window.location.href = "/login";
        return;
    }

    const themeToggle = document.getElementById("themeToggle");
    const body = document.body;

    // Load theme preference
    if (localStorage.getItem("theme") === "dark") {
        body.classList.add("dark-theme");
        themeToggle.checked = true;
    }

    // Toggle theme
    themeToggle.addEventListener("change", () => {
        if (themeToggle.checked) {
            body.classList.add("dark-theme");
            localStorage.setItem("theme", "dark");
        } else {
            body.classList.remove("dark-theme");
            localStorage.setItem("theme", "light");
        }
    });

    // Export buttons
    document.getElementById("exportToolsBtn").addEventListener("click", () => exportData("/api/export/export_tools/"));
    document.getElementById("exportActiveOverdueLoansBtn").addEventListener("click", () => exportData("/api/export/export_active_overdue_loans/"));
    document.getElementById("exportLoanHistoryBtn").addEventListener("click", () => exportData("/api/export/export_loan_history/"));

    async function exportData(url) {
        try {
            const response = await fetch(url, {
                headers: {
                    Authorization: `Bearer ${accessToken}`,
                },
            });

            if (response.ok) {
                const blob = await response.blob();
                const contentDisposition = response.headers.get("Content-Disposition");
                let filename = "export.csv";
                if (contentDisposition) {
                    const filenameMatch = contentDisposition.match(/filename="(.+)"/);
                    if (filenameMatch && filenameMatch[1]) {
                        filename = filenameMatch[1];
                    }
                }

                const url = window.URL.createObjectURL(blob);
                const a = document.createElement("a");
                a.href = url;
                a.download = filename;
                document.body.appendChild(a);
                a.click();
                a.remove();
                window.URL.revokeObjectURL(url);
            } else if (response.status === 401) {
                const refreshed = await refreshToken();
                if (refreshed) {
                    exportData(url);
                } else {
                    window.location.href = "/login";
                }
            } else {
                console.error("Failed to export data:", response.statusText);
                alert("Erro ao exportar dados.");
            }
        } catch (error) {
            console.error("Error exporting data:", error);
            alert("Ocorreu um erro ao exportar os dados.");
        }
    }
});

