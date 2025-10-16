// Apply theme on page load
if (localStorage.getItem("theme") === "dark") {
    document.body.classList.add("dark-theme");
}

document.addEventListener("DOMContentLoaded", () => {
    const logoutButton = document.getElementById("logout-button");
    if (logoutButton) {
        logoutButton.addEventListener("click", () => {
            localStorage.removeItem("access_token");
            localStorage.removeItem("refresh_token");
            window.location.href = "/login";
        });
    }
});

export async function refreshToken() {
    const refreshToken = localStorage.getItem("refresh_token");
    if (!refreshToken) {
        return false;
    }

    try {
        const response = await fetch("/api/token/refresh/", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({ refresh: refreshToken }),
        });

        if (response.ok) {
            const data = await response.json();
            localStorage.setItem("access_token", data.access);
            return true;
        } else {
            console.error("Failed to refresh token:", response.statusText);
            localStorage.removeItem("access_token");
            localStorage.removeItem("refresh_token");
            return false;
        }
    } catch (error) {
        console.error("Error refreshing token:", error);
        localStorage.removeItem("access_token");
        localStorage.removeItem("refresh_token");
        return false;
    }
}

