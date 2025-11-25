import { refreshToken } from "./main.js";

document.addEventListener("DOMContentLoaded", () => {
    const listContainer = document.getElementById('employeeListContainer');
    const modal = document.getElementById('employeeModal');
    const form = document.getElementById('employeeForm');
    const addBtn = document.getElementById('addNewEmployeeBtn');
    const closeBtn = document.querySelector('.close-button');
    const searchInput = document.getElementById('employeeSearch');
    let allEmployees = [];

    // Função de Fetch Genérica (igual às outras páginas)
    async function fetchWithAuth(url, options = {}) {
        options.headers = { ...options.headers, 'Authorization': `Bearer ${localStorage.getItem('access_token')}` };
        if(options.body && !(options.body instanceof FormData)) {
            options.headers['Content-Type'] = 'application/json';
        }
        let response = await fetch(url, options);
        if (response.status === 401) {
            if (await refreshToken()) {
                options.headers['Authorization'] = `Bearer ${localStorage.getItem('access_token')}`;
                return fetch(url, options);
            } else {
                window.location.href = "/login";
            }
        }
        return response;
    }

    async function loadEmployees() {
        const res = await fetchWithAuth('/api/employees/');
        if (res.ok) {
            allEmployees = await res.json();
            renderEmployees(allEmployees);
        }
    }

    function renderEmployees(list) {
        listContainer.innerHTML = '';
        list.forEach(emp => {
            const card = `
                <div class="tool-card" style="padding: 20px;">
                    <div class="tool-card-content">
                        <h3>${emp.name}</h3>
                        <p style="color: #a0a0b0;">Matrícula: <strong>${emp.registration_number}</strong></p>
                    </div>
                    <div class="tool-actions">
                         <button class="delete-tool-btn" data-id="${emp.id}"><i class="fas fa-trash"></i> Deletar</button>
                    </div>
                </div>
            `;
            listContainer.insertAdjacentHTML('beforeend', card);
        });
    }

    // Eventos
    addBtn.addEventListener('click', () => {
        form.reset();
        modal.classList.add('show');
    });

    closeBtn.addEventListener('click', () => modal.classList.remove('show'));
    modal.addEventListener('click', (e) => { if(e.target === modal) modal.classList.remove('show'); });

    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const data = {
            name: document.getElementById('employeeName').value,
            registration_number: document.getElementById('employeeRegistration').value
        };
        const res = await fetchWithAuth('/api/employees/', { method: 'POST', body: JSON.stringify(data) });
        if (res.ok) {
            modal.classList.remove('show');
            loadEmployees();
        } else {
            alert('Erro ao salvar');
        }
    });

    searchInput.addEventListener('input', (e) => {
        const term = e.target.value.toLowerCase();
        const filtered = allEmployees.filter(emp => 
            emp.name.toLowerCase().includes(term) || 
            emp.registration_number.toLowerCase().includes(term)
        );
        renderEmployees(filtered);
    });

    // Deletar
    listContainer.addEventListener('click', async (e) => {
        const btn = e.target.closest('.delete-tool-btn');
        if (btn && confirm('Deseja excluir este funcionário?')) {
            const res = await fetchWithAuth(`/api/employees/${btn.dataset.id}/`, { method: 'DELETE' });
            if (res.ok) loadEmployees();
        }
    });

    loadEmployees();
});