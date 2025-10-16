// static/js/manage_tools.js

import { refreshToken } from "./main.js";

document.addEventListener("DOMContentLoaded", () => {

    // --- Seleção de Elementos do DOM ---
    const addNewToolBtn = document.getElementById('addNewToolBtn');
    const toolModal = document.getElementById('toolModal');
    const modalTitle = document.getElementById('modalTitle');
    const toolForm = document.getElementById('toolForm');
    const submitBtn = document.getElementById('submitBtn');
    const closeButton = document.querySelector('.modal .close-button');
    const toolCardsContainer = document.getElementById('toolCardsContainer');
    const toolSearch = document.getElementById('toolSearch');
    const toolImageInput = document.getElementById('toolImage');
    const fileNameSpan = document.getElementById('fileName');
    
    let allTools = []; // Array para guardar todas as ferramentas
    let editingToolId = null; // Guarda o ID da ferramenta sendo editada

    // --- Funções Auxiliares ---

    // Função genérica para fazer requisições à API com autenticação e refresh de token
    async function fetchWithAuth(url, options = {}) {
        options.headers = { ...options.headers };
        // Não envie 'Content-Type' quando usar FormData, o navegador faz isso
        if (!(options.body instanceof FormData)) {
            options.headers['Content-Type'] = 'application/json';
        }
        options.headers['Authorization'] = `Bearer ${localStorage.getItem('access_token')}`;

        let response = await fetch(url, options);

        if (response.status === 401) {
            const refreshed = await refreshToken();
            if (refreshed) {
                options.headers['Authorization'] = `Bearer ${localStorage.getItem('access_token')}`;
                response = await fetch(url, options); // Tenta a requisição novamente
            } else {
                window.location.href = "/login"; // Redireciona se o refresh falhar
                return null;
            }
        }
        return response;
    }

    // --- Funções do Modal ---
    
    function openModalForNew() {
        editingToolId = null;
        modalTitle.textContent = "Adicionar Nova Ferramenta";
        submitBtn.textContent = "Salvar Ferramenta";
        toolForm.reset(); // Limpa o formulário
        fileNameSpan.textContent = 'Nenhum arquivo escolhido'; // Limpa o nome do arquivo
        toolModal.classList.add('show');
    }
    
    function openModalForEdit(tool) {
        editingToolId = tool.id;
        modalTitle.textContent = "Editar Ferramenta";
        submitBtn.textContent = "Atualizar Ferramenta";
        
        // Preenche o formulário com os dados da ferramenta
        toolForm.name.value = tool.name;
        toolForm.description.value = tool.description || '';
        toolForm.condition.value = tool.condition;
        toolForm.total_quantity.value = tool.total_quantity;
        toolForm.unit_value.value = tool.unit_value;
        toolForm.acquisition_date.value = tool.acquisition_date || '';
        toolForm.maintenance_cost.value = tool.maintenance_cost || '0.00';
        toolForm.last_maintenance_date.value = tool.last_maintenance_date || '';
        toolForm.next_maintenance_date.value = tool.next_maintenance_date || '';
        toolForm.supplier.value = tool.supplier || '';
        fileNameSpan.textContent = 'Nenhum arquivo escolhido'; // Reseta o campo de imagem

        toolModal.classList.add('show');
    }
    
    function closeModal() {
        toolModal.classList.remove('show');
    }

    // --- Funções de Renderização e API ---

    function renderTools(toolsToRender) {
        toolCardsContainer.innerHTML = '';
        if (toolsToRender.length === 0) {
            toolCardsContainer.innerHTML = '<p class="no-results" style="color: #a0a0b0;">Nenhuma ferramenta encontrada.</p>';
            return;
        }

        toolsToRender.forEach(tool => {
            const card = `
                <div class="tool-card">
                    <div class="tool-card-header">
                        <img src="${tool.image || 'https://via.placeholder.com/300x180'}" alt="Imagem da Ferramenta" class="tool-image">
                        <span class="status-badge status-${tool.condition}">${tool.condition_display}</span>                    </div>
                    <div class="tool-card-content">
                        <h3>${tool.name}</h3>
                        <div class="tool-stats">
                            <span><i class="fas fa-check-circle"></i> <strong>Disponível:</strong> ${tool.available_quantity}</span>
                            <span><i class="fas fa-boxes"></i> <strong>Total:</strong> ${tool.total_quantity}</span>
                        </div>
                    </div>
                    <div class="tool-actions">
                        <button class="edit-tool-btn" data-id="${tool.id}"><i class="fas fa-pencil-alt"></i> Editar</button>
                        <button class="delete-tool-btn" data-id="${tool.id}"><i class="fas fa-trash-alt"></i> Deletar</button>
                    </div>
                </div>
            `;
            toolCardsContainer.insertAdjacentHTML('beforeend', card);
        });
    }

    async function fetchTools() {
        const response = await fetchWithAuth('/api/tools/');
        if (response && response.ok) {
            allTools = await response.json();
            renderTools(allTools);
        } else {
            console.error("Falha ao buscar ferramentas.");
        }
    }

    async function handleFormSubmit(event) {
        event.preventDefault();
        
        const formData = new FormData(toolForm);
        // Se o campo de imagem não foi alterado, removemos para não enviar um valor vazio
        if (formData.get('image') && formData.get('image').size === 0) {
            formData.delete('image');
        }

        const url = editingToolId ? `/api/tools/${editingToolId}/` : '/api/tools/';
        const method = editingToolId ? 'PATCH' : 'POST'; // Usar PATCH é melhor para atualizações parciais

        const response = await fetchWithAuth(url, { method: method, body: formData });

        if (response && response.ok) {
            closeModal();
            fetchTools();
        } else {
            const errorData = await response.json();
            alert(`Erro ao salvar: ${JSON.stringify(errorData)}`);
        }
    }
    
    // --- Adicionando Event Listeners ---

    addNewToolBtn.addEventListener('click', openModalForNew);
    closeButton.addEventListener('click', closeModal);
    toolModal.addEventListener('click', (event) => {
        if (event.target === toolModal) closeModal();
    });
    toolForm.addEventListener('submit', handleFormSubmit);

    // Lógica do input de arquivo customizado
    toolImageInput.addEventListener('change', () => {
        fileNameSpan.textContent = toolImageInput.files.length > 0
            ? toolImageInput.files[0].name
            : 'Nenhum arquivo escolhido';
    });

    // Barra de busca
    toolSearch.addEventListener('input', (event) => {
        const searchTerm = event.target.value.toLowerCase();
        const filteredTools = allTools.filter(tool => 
            tool.name.toLowerCase().includes(searchTerm)
        );
        renderTools(filteredTools);
    });

    // Delegação de eventos para os botões de editar e deletar
    toolCardsContainer.addEventListener('click', async (event) => {
        const target = event.target.closest('button');
        if (!target) return;

        const toolId = target.dataset.id;
        
        if (target.classList.contains('edit-tool-btn')) {
            const toolToEdit = allTools.find(t => t.id == toolId);
            if (toolToEdit) openModalForEdit(toolToEdit);
        }
        
        if (target.classList.contains('delete-tool-btn')) {
            if (confirm('Tem certeza que deseja deletar esta ferramenta?')) {
                const response = await fetchWithAuth(`/api/tools/${toolId}/`, { method: 'DELETE' });
                if (response && response.status === 204) { // 204 No Content é a resposta de sucesso para DELETE
                    fetchTools();
                } else {
                    alert('Erro ao deletar a ferramenta.');
                }
            }
        }
    });
    
    // --- Carga Inicial ---
    fetchTools();
});