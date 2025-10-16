// static/js/settings.js

import { refreshToken } from "./main.js";

document.addEventListener("DOMContentLoaded", () => {

    // --- Seleção de Elementos ---
    const exportToolsBtn = document.getElementById('exportToolsBtn');
    const exportActiveLoansBtn = document.getElementById('exportActiveOverdueLoansBtn');
    const exportHistoryBtn = document.getElementById('exportLoanHistoryBtn');
    const themeToggle = document.getElementById('themeToggle');

    // --- Lógica de Exportação ---

    // Função genérica para requisições autenticadas
    async function fetchWithAuth(url, options = {}) {
        options.headers = { ...options.headers, 'Authorization': `Bearer ${localStorage.getItem('access_token')}` };
        let response = await fetch(url, options);
        if (response.status === 401) {
            const refreshed = await refreshToken();
            if (refreshed) {
                options.headers['Authorization'] = `Bearer ${localStorage.getItem('access_token')}`;
                response = await fetch(url, options);
            } else {
                window.location.href = "/login";
                return null;
            }
        }
        return response;
    }

    // Função para iniciar o download do arquivo CSV
    async function exportCSV(endpoint, filename) {
        const response = await fetchWithAuth(endpoint);
        if (response && response.ok) {
            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.style.display = 'none';
            a.href = url;
            a.download = filename;
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
            a.remove();
        } else {
            alert('Erro ao gerar o relatório. Verifique o console para mais detalhes.');
            console.error(`Falha ao exportar ${filename}:`, response);
        }
    }

    // Adiciona os listeners aos botões de exportação com as URLs corretas
    exportToolsBtn.addEventListener('click', () => {
        exportCSV('/api/export/tools/', 'ferramentas.csv');
    });

    exportActiveLoansBtn.addEventListener('click', () => {
        exportCSV('/api/export/active-loans/', 'emprestimos_ativos.csv');
    });

    exportHistoryBtn.addEventListener('click', () => {
        exportCSV('/api/export/loan-history/', 'historico_emprestimos.csv');
    });


    // --- Lógica do Interruptor de Tema ---

    // Função para aplicar o tema e salvar a preferência
    function applyTheme(theme) {
        if (theme === 'dark') {
            document.body.classList.add('dark-theme');
            localStorage.setItem('theme', 'dark');
        } else {
            document.body.classList.remove('dark-theme');
            localStorage.setItem('theme', 'light');
        }
    }

    // Listener para quando o interruptor é clicado
    themeToggle.addEventListener('change', () => {
        applyTheme(themeToggle.checked ? 'dark' : 'light');
    });

    // Verifica a preferência salva ao carregar a página e define o estado do interruptor
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme === 'dark') {
        themeToggle.checked = true;
        // A aplicação do tema já deve ser feita por um script principal (main.js ou no base.html),
        // aqui apenas garantimos que o interruptor reflita o estado correto.
        if (!document.body.classList.contains('dark-theme')) {
            document.body.classList.add('dark-theme');
        }
    } else {
        themeToggle.checked = false;
        document.body.classList.remove('dark-theme');
    }
});