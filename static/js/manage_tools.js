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
    const toolConditionSelect = document.getElementById('toolCondition');
    const toolTotalQuantityInput = document.getElementById('toolTotalQuantity');
    const quantityHelpText = document.getElementById('quantityHelpText');
    const imagePreviewContainer = document.getElementById('imagePreviewContainer');
    const currentToolImage = document.getElementById('currentToolImage');
    let allTools = []; // Array para guardar todas as ferramentas
    let editingToolId = null; // Guarda o ID da ferramenta sendo editada

    // --- Funções Auxiliares ---
    async function fetchWithAuth(url, options = {}) {
        options.headers = { ...options.headers };
        if (!(options.body instanceof FormData)) {
            options.headers['Content-Type'] = 'application/json';
        }
        options.headers['Authorization'] = `Bearer ${localStorage.getItem('access_token')}`;

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

    // --- Funções do Modal ---
    function openModalForNew() {
        editingToolId = null;
        modalTitle.textContent = "Adicionar Nova Ferramenta";
        submitBtn.textContent = "Salvar Ferramenta";
        toolForm.reset();
        fileNameSpan.textContent = 'Nenhum arquivo escolhido';
        
        // Garante que o campo de quantidade esteja editável
        toolTotalQuantityInput.readOnly = false;
        quantityHelpText.style.display = 'none';

        // NOVO: Garante que o preview da imagem esteja escondido
        imagePreviewContainer.style.display = 'none';
        currentToolImage.src = '';

        toolModal.classList.add('show');
    }
    
    function openModalForEdit(tool) {
        editingToolId = tool.id;
        modalTitle.textContent = "Editar Ferramenta";
        submitBtn.textContent = "Atualizar Ferramenta";
        
        // Limpa o form antes de preencher
        toolForm.reset(); 

        // Preenche os campos
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
        fileNameSpan.textContent = 'Nenhum arquivo escolhido';

        // NOVO: Lógica para exibir a imagem atual
        if (tool.image) {
            currentToolImage.src = tool.image;
            imagePreviewContainer.style.display = 'block';
        } else {
            imagePreviewContainer.style.display = 'none';
            currentToolImage.src = '';
        }
        
        // Aplica a lógica de manutenção
        if (tool.condition === 'maintenance') {
            toolTotalQuantityInput.readOnly = true;
            quantityHelpText.style.display = 'block';
        } else {
            toolTotalQuantityInput.readOnly = false;
            quantityHelpText.style.display = 'none';
        }

        toolModal.classList.add('show');
    }
    
    function closeModal() {
        toolModal.classList.remove('show');
        
        // NOVO: Limpa o preview ao fechar o modal
        imagePreviewContainer.style.display = 'none';
        currentToolImage.src = '';
        toolForm.reset(); // Também é uma boa prática resetar o form aqui
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
                        <span class="status-badge status-${tool.condition}">${tool.condition_display}</span>
                    </div>
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
        
        // NÃO FAÇA: const formData = new FormData(toolForm);
        // ISSO CAUSA O BUG de apagar a imagem.

        // FAÇA ASSIM: Crie o FormData manualmente
        const formData = new FormData();

        // Adicione os campos de texto/número/select
        formData.append('name', toolForm.name.value);
        formData.append('supplier', toolForm.supplier.value || '');
        formData.append('description', toolForm.description.value || '');
        formData.append('condition', toolForm.condition.value);
        formData.append('total_quantity', toolForm.total_quantity.value);
        formData.append('unit_value', toolForm.unit_value.value);
        formData.append('maintenance_cost', toolForm.maintenance_cost.value || '0.00');
        
        // Adicione as datas APENAS se elas tiverem valor
        if (toolForm.acquisition_date.value) {
            formData.append('acquisition_date', toolForm.acquisition_date.value);
        }
        if (toolForm.last_maintenance_date.value) {
            formData.append('last_maintenance_date', toolForm.last_maintenance_date.value);
        }
        if (toolForm.next_maintenance_date.value) {
            formData.append('next_maintenance_date', toolForm.next_maintenance_date.value);
        }

        // LÓGICA CRÍTICA DA IMAGEM:
        // Adicione a imagem APENAS se um novo arquivo foi selecionado
        if (toolImageInput.files.length > 0) {
            formData.append('image', toolImageInput.files[0]);
        }
        // Se nenhum arquivo novo foi selecionado, o campo 'image' não é enviado.
        // Ao usar 'PATCH', o backend simplesmente não alterará a imagem existente.

        // Se a quantidade foi desabilitada, reabilita antes de enviar
        toolTotalQuantityInput.readOnly = false;

        const url = editingToolId ? `/api/tools/${editingToolId}/` : '/api/tools/';
        const method = editingToolId ? 'PATCH' : 'POST';

        const response = await fetchWithAuth(url, { method: method, body: formData });

        if (response && response.ok) {
            closeModal();
            fetchTools();
        } else {
            const errorData = await response.json();
            const errorMessage = Object.entries(errorData).map(([key, value]) => `${key}: ${value.join(', ')}`).join('\n');
            alert(`Erro ao salvar:\n${errorMessage}`);
        }
    }
    
    // --- Adicionando Event Listeners ---
    addNewToolBtn.addEventListener('click', openModalForNew);
    closeButton.addEventListener('click', closeModal);
    toolModal.addEventListener('click', (event) => {
        if (event.target === toolModal) closeModal();
    });
    toolForm.addEventListener('submit', handleFormSubmit);

    // Lógica interativa para o campo de Condição
    toolConditionSelect.addEventListener('change', () => {
        if (toolConditionSelect.value === 'maintenance') {
            toolTotalQuantityInput.value = 0;
            toolTotalQuantityInput.readOnly = true;
            quantityHelpText.style.display = 'block';
        } else {
            toolTotalQuantityInput.readOnly = false;
            quantityHelpText.style.display = 'none';
        }
    });

    // Lógica do input de arquivo customizado
    toolImageInput.addEventListener('change', () => {
        if (toolImageInput.files.length > 0) {
            fileNameSpan.textContent = toolImageInput.files[0].name;
            // NOVO: Esconde o preview da imagem antiga, pois uma nova foi selecionada
            imagePreviewContainer.style.display = 'none';
        } else {
            fileNameSpan.textContent = 'Nenhum arquivo escolhido';
        }
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
                if (response && response.status === 204) {
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