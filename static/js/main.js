// static/js/main.js

// A função de refresh de token é exportada para ser usada por outras páginas
export async function refreshToken() {
    const refreshToken = localStorage.getItem("refresh_token");
    if (!refreshToken) {
        return false;
    }
    try {
        const response = await fetch("/api/token/refresh/", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
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

// Aplica o tema salvo antes mesmo da página carregar completamente
const savedTheme = localStorage.getItem('theme');
if (savedTheme === 'dark') {
    document.body.classList.add('dark-theme');
} else {
    document.body.classList.remove('dark-theme');
}

document.addEventListener("DOMContentLoaded", () => {
    
    // --- LÓGICA DE LOGOUT ---
    const logoutButton = document.getElementById("logout-button");
    if (logoutButton) {
        logoutButton.addEventListener("click", () => {
            localStorage.removeItem("access_token");
            localStorage.removeItem("refresh_token");
            window.location.href = "/login";
        });
    }

    // --- LÓGICA DE MENU DINÂMICO ---
    const menuItems = [
        { href: '/dashboard/', icon: 'fa-tachometer-alt', text: 'Dashboard', permission: 'inventory.view_dashboard' },
        { href: '/manage-tools/', icon: 'fa-tools', text: 'Gerenciar Ferramentas', permission: 'inventory.view_manage_tools' },
        { href: '/virtual-warehouse/', icon: 'fa-warehouse', text: 'Armazém Virtual', permission: 'inventory.view_virtual_warehouse' },
        { href: '/register-loan/', icon: 'fa-handshake', text: 'Registrar Empréstimo', permission: 'inventory.view_register_loan' },
        { href: '/active-overdue-loans/', icon: 'fa-calendar-alt', text: 'Empréstimos Ativos', permission: 'inventory.view_active_loans' },
        { href: '/history/', icon: 'fa-history', text: 'Histórico', permission: 'inventory.view_history' },
        { href: '/analytics/', icon: 'fa-chart-pie', text: 'Análise', permission: 'inventory.view_analytics' }
    ];

    // ✅ CORREÇÃO 1: A função agora espera o objeto 'user' completo
    function buildSidebarMenu(user) {
        const menuContainer = document.getElementById('sidebar-menu');
        if (!menuContainer) return;
        
        const permissionsSet = new Set(user.permissions);

        menuItems.forEach(item => {
            // ✅ CORREÇÃO 2: A verificação 'user.is_superuser' agora funciona
            if (user.is_superuser || permissionsSet.has(item.permission)) {
                const li = document.createElement('li');
                const a = document.createElement('a');
                a.href = item.href;
                
                if (window.location.pathname === item.href) {
                    a.classList.add('active');
                }

                a.innerHTML = `<i class="fas ${item.icon} fa-fw"></i> <span>${item.text}</span>`;
                li.appendChild(a);
                menuContainer.appendChild(li);
            }
        });
    }

    async function fetchCurrentUser() {
        const accessToken = localStorage.getItem('access_token');
        if (!accessToken) {
            if (window.location.pathname !== '/login/' && window.location.pathname !== '/register/') {
                window.location.href = '/login/';
            }
            return;
        }

        try {
            const response = await fetch('/api/users/me/', {
                headers: { 'Authorization': `Bearer ${accessToken}` }
            });

            if (response.ok) {
                const user = await response.json();
                // ✅ CORREÇÃO 3: Passamos o objeto 'user' completo para a função
                buildSidebarMenu(user);
            } else if (response.status === 401) {
                const refreshed = await refreshToken();
                if (refreshed) {
                    fetchCurrentUser();
                } else {
                    window.location.href = '/login/';
                }
            } else {
                console.error("Falha ao buscar dados do usuário:", response.statusText);
            }
        } catch (error) {
            console.error("Erro ao buscar dados do usuário:", error);
        }
    }

    if (window.location.pathname !== '/login/' && window.location.pathname !== '/register/') {
        fetchCurrentUser();
    }
});