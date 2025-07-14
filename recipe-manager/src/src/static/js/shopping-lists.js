// Shopping lists management functionality
class ShoppingListsManager {
    constructor() {
        this.shoppingLists = [];
        this.currentList = null;
        this.init();
    }

    init() {
        this.setupEventListeners();
    }

    setupEventListeners() {
        // Create shopping list button
        const createListBtn = document.getElementById('create-shopping-list-btn');
        createListBtn?.addEventListener('click', () => {
            this.openShoppingListModal();
        });

        // Shopping list form submission
        const shoppingListForm = document.getElementById('shopping-list-form');
        shoppingListForm?.addEventListener('submit', (e) => {
            e.preventDefault();
            this.saveShoppingList();
        });

        // Shopping list form cancel
        const listCancelBtn = document.getElementById('shopping-list-cancel-btn');
        listCancelBtn?.addEventListener('click', () => {
            window.recipeManager.closeModal('shopping-list-modal');
        });

        // Add item button
        const addItemBtn = document.getElementById('add-item-btn');
        addItemBtn?.addEventListener('click', () => {
            this.addItemField();
        });
    }

    async loadShoppingLists() {
        try {
            window.recipeManager.showLoading(true);
            this.shoppingLists = await window.recipeManager.fetchAPI('/api/shopping-lists');
            this.displayShoppingLists();
        } catch (error) {
            console.error('Error loading shopping lists:', error);
            window.recipeManager.showToast('Error loading shopping lists', 'error');
        } finally {
            window.recipeManager.showLoading(false);
        }
    }

    displayShoppingLists() {
        const container = document.getElementById('shopping-lists-container');
        if (!container) return;

        if (this.shoppingLists.length === 0) {
            container.innerHTML = `
                <div class="no-shopping-lists">
                    <i class="fas fa-shopping-cart fa-3x"></i>
                    <h3>No shopping lists yet</h3>
                    <p>Create your first shopping list to get started!</p>
                    <button class="primary-btn" onclick="window.shoppingLists.openShoppingListModal()">
                        <i class="fas fa-plus"></i>
                        Create Shopping List
                    </button>
                </div>
            `;
            return;
        }

        container.innerHTML = this.shoppingLists.map(list => `
            <div class="shopping-list-card" data-list-id="${list.id}">
                <div class="shopping-list-header">
                    <h3 class="shopping-list-name">${list.name}</h3>
                    <div class="shopping-list-actions">
                        <button class="action-btn view-btn" onclick="window.shoppingLists.viewShoppingList(${list.id})" title="View List">
                            <i class="fas fa-eye"></i>
                        </button>
                        <button class="action-btn edit-btn" onclick="window.shoppingLists.editShoppingList(${list.id})" title="Edit List">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button class="action-btn download-btn" onclick="window.shoppingLists.showDownloadOptions(${list.id})" title="Download">
                            <i class="fas fa-download"></i>
                        </button>
                        <button class="action-btn delete-btn" onclick="window.shoppingLists.deleteShoppingList(${list.id})" title="Delete List">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </div>
                <div class="shopping-list-meta">
                    <span class="item-count">${list.items.length} items</span>
                    <span class="created-date">Created: ${new Date(list.created_at).toLocaleDateString()}</span>
                </div>
                <div class="shopping-list-preview">
                    ${list.items.slice(0, 3).map(item => `
                        <div class="preview-item">
                            <span class="item-quantity">${item.quantity} ${item.unit}</span>
                            <span class="item-name">${item.name}</span>
                        </div>
                    `).join('')}
                    ${list.items.length > 3 ? `<div class="more-items">+${list.items.length - 3} more items</div>` : ''}
                </div>
            </div>
        `).join('');
    }

    openShoppingListModal(list = null) {
        this.currentList = list;
        const modal = document.getElementById('shopping-list-modal');
        const title = document.getElementById('shopping-list-modal-title');
        const form = document.getElementById('shopping-list-form');

        if (list) {
            title.textContent = 'Edit Shopping List';
            this.populateShoppingListForm(list);
        } else {
            title.textContent = 'Create Shopping List';
            form.reset();
            this.clearItems();
            this.addItemField(); // Add one empty item field
        }

        window.recipeManager.openModal('shopping-list-modal');
    }

    populateShoppingListForm(list) {
        const form = document.getElementById('shopping-list-form');
        
        // Populate basic fields
        form.querySelector('#shopping-list-name').value = list.name || '';

        // Populate items
        this.clearItems();
        if (list.items && list.items.length > 0) {
            list.items.forEach(item => {
                this.addItemField(item);
            });
        } else {
            this.addItemField();
        }
    }

    clearItems() {
        const itemsList = document.getElementById('shopping-items-list');
        if (itemsList) {
            itemsList.innerHTML = '';
        }
    }

    addItemField(item = null) {
        const itemsList = document.getElementById('shopping-items-list');
        if (!itemsList) return;

        const itemDiv = document.createElement('div');
        itemDiv.className = 'shopping-item';
        itemDiv.innerHTML = `
            <input type="text" placeholder="Item name" name="item_name" value="${item?.name || ''}" required>
            <input type="number" placeholder="Quantity" name="item_quantity" value="${item?.quantity || ''}" step="0.01" min="0" required>
            <input type="text" placeholder="Unit (g, ml, pieces)" name="item_unit" value="${item?.unit || ''}" required>
            <button type="button" class="remove-item-btn" onclick="this.parentElement.remove()">
                <i class="fas fa-times"></i>
            </button>
        `;

        itemsList.appendChild(itemDiv);
    }

    async saveShoppingList() {
        try {
            window.recipeManager.showLoading(true);

            const form = document.getElementById('shopping-list-form');
            const formData = new FormData(form);

            // Collect basic shopping list data
            const listData = {
                name: formData.get('name')
            };

            // Collect items
            const itemNames = formData.getAll('item_name');
            const itemQuantities = formData.getAll('item_quantity');
            const itemUnits = formData.getAll('item_unit');

            listData.items = [];
            for (let i = 0; i < itemNames.length; i++) {
                if (itemNames[i] && itemQuantities[i] && itemUnits[i]) {
                    listData.items.push({
                        name: itemNames[i],
                        quantity: parseFloat(itemQuantities[i]),
                        unit: itemUnits[i]
                    });
                }
            }

            let response;
            if (this.currentList) {
                // Update existing shopping list
                response = await window.recipeManager.fetchAPI(`/api/shopping-lists/${this.currentList.id}`, {
                    method: 'PUT',
                    body: JSON.stringify(listData)
                });
            } else {
                // Create new shopping list
                response = await window.recipeManager.fetchAPI('/api/shopping-lists', {
                    method: 'POST',
                    body: JSON.stringify(listData)
                });
            }

            window.recipeManager.showToast(
                this.currentList ? 'Shopping list updated successfully!' : 'Shopping list created successfully!',
                'success'
            );

            window.recipeManager.closeModal('shopping-list-modal');
            this.loadShoppingLists(); // Reload shopping lists

        } catch (error) {
            console.error('Error saving shopping list:', error);
            window.recipeManager.showToast('Error saving shopping list', 'error');
        } finally {
            window.recipeManager.showLoading(false);
        }
    }

    async viewShoppingList(listId) {
        try {
            const list = await window.recipeManager.fetchAPI(`/api/shopping-lists/${listId}`);
            this.showShoppingListDetails(list);
        } catch (error) {
            console.error('Error loading shopping list:', error);
            window.recipeManager.showToast('Error loading shopping list details', 'error');
        }
    }

    showShoppingListDetails(list) {
        const modal = document.createElement('div');
        modal.className = 'modal active';
        modal.id = 'shopping-list-details-modal';
        
        modal.innerHTML = `
            <div class="modal-content">
                <div class="modal-header">
                    <h2>${list.name}</h2>
                    <button class="modal-close" onclick="this.closest('.modal').remove()">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
                <div class="modal-body">
                    <div class="shopping-list-details">
                        <div class="list-meta">
                            <p><strong>Created:</strong> ${new Date(list.created_at).toLocaleDateString()}</p>
                            <p><strong>Total Items:</strong> ${list.items.length}</p>
                        </div>

                        <div class="shopping-items-section">
                            <h3>Shopping Items</h3>
                            <div class="shopping-items-checklist">
                                ${list.items.map((item, index) => `
                                    <div class="checklist-item">
                                        <input type="checkbox" id="item-${index}" class="item-checkbox">
                                        <label for="item-${index}" class="item-label">
                                            <span class="item-quantity">${item.quantity} ${item.unit}</span>
                                            <span class="item-name">${item.name}</span>
                                        </label>
                                    </div>
                                `).join('')}
                            </div>
                        </div>

                        <div class="shopping-list-detail-actions">
                            <button class="btn secondary-btn" onclick="window.shoppingLists.editShoppingList(${list.id}); this.closest('.modal').remove();">
                                <i class="fas fa-edit"></i> Edit List
                            </button>
                            <button class="btn primary-btn" onclick="window.shoppingLists.showDownloadOptions(${list.id}); this.closest('.modal').remove();">
                                <i class="fas fa-download"></i> Download
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        `;

        document.body.appendChild(modal);

        // Add checkbox functionality
        modal.querySelectorAll('.item-checkbox').forEach(checkbox => {
            checkbox.addEventListener('change', (e) => {
                const label = e.target.nextElementSibling;
                if (e.target.checked) {
                    label.style.textDecoration = 'line-through';
                    label.style.opacity = '0.6';
                } else {
                    label.style.textDecoration = 'none';
                    label.style.opacity = '1';
                }
            });
        });

        // Close modal when clicking outside
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                modal.remove();
            }
        });
    }

    async editShoppingList(listId) {
        try {
            const list = await window.recipeManager.fetchAPI(`/api/shopping-lists/${listId}`);
            this.openShoppingListModal(list);
        } catch (error) {
            console.error('Error loading shopping list for editing:', error);
            window.recipeManager.showToast('Error loading shopping list', 'error');
        }
    }

    showDownloadOptions(listId) {
        const modal = document.createElement('div');
        modal.className = 'modal active';
        modal.id = 'download-options-modal';
        
        modal.innerHTML = `
            <div class="modal-content">
                <div class="modal-header">
                    <h2>Download Shopping List</h2>
                    <button class="modal-close" onclick="this.closest('.modal').remove()">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
                <div class="modal-body">
                    <div class="download-options">
                        <p>Choose your preferred format:</p>
                        
                        <div class="download-option" onclick="window.shoppingLists.downloadShoppingList(${listId}, 'pdf')">
                            <div class="download-icon">
                                <i class="fas fa-file-pdf"></i>
                            </div>
                            <div class="download-info">
                                <h3>PDF Document</h3>
                                <p>Perfect for printing and taking to the store</p>
                            </div>
                        </div>

                        <div class="download-option" onclick="window.shoppingLists.downloadShoppingList(${listId}, 'excel')">
                            <div class="download-icon">
                                <i class="fas fa-file-excel"></i>
                            </div>
                            <div class="download-info">
                                <h3>Excel Spreadsheet</h3>
                                <p>Editable format for further customization</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;

        document.body.appendChild(modal);

        // Close modal when clicking outside
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                modal.remove();
            }
        });
    }

    async downloadShoppingList(listId, format) {
        try {
            window.recipeManager.showLoading(true);

            const response = await fetch(`/api/shopping-lists/${listId}/export?format=${format}`, {
                method: 'GET'
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            // Get the filename from the response headers
            const contentDisposition = response.headers.get('Content-Disposition');
            let filename = `shopping-list.${format === 'excel' ? 'xlsx' : 'pdf'}`;
            
            if (contentDisposition) {
                const filenameMatch = contentDisposition.match(/filename="(.+)"/);
                if (filenameMatch) {
                    filename = filenameMatch[1];
                }
            }

            // Create blob and download
            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = filename;
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
            document.body.removeChild(a);

            window.recipeManager.showToast(`Shopping list downloaded as ${format.toUpperCase()}!`, 'success');
            
            // Close download modal
            document.getElementById('download-options-modal')?.remove();

        } catch (error) {
            console.error('Error downloading shopping list:', error);
            window.recipeManager.showToast('Error downloading shopping list', 'error');
        } finally {
            window.recipeManager.showLoading(false);
        }
    }

    async deleteShoppingList(listId) {
        if (!confirm('Are you sure you want to delete this shopping list? This action cannot be undone.')) {
            return;
        }

        try {
            window.recipeManager.showLoading(true);
            await window.recipeManager.fetchAPI(`/api/shopping-lists/${listId}`, {
                method: 'DELETE'
            });

            window.recipeManager.showToast('Shopping list deleted successfully!', 'success');
            this.loadShoppingLists(); // Reload shopping lists

        } catch (error) {
            console.error('Error deleting shopping list:', error);
            window.recipeManager.showToast('Error deleting shopping list', 'error');
        } finally {
            window.recipeManager.showLoading(false);
        }
    }
}

// Initialize shopping lists manager
document.addEventListener('DOMContentLoaded', () => {
    window.shoppingLists = new ShoppingListsManager();
});

// Add CSS for shopping lists
const shoppingListsCSS = `
.no-shopping-lists {
    text-align: center;
    padding: var(--spacing-xxl);
    color: var(--text-secondary);
}

.no-shopping-lists i {
    color: var(--primary-color);
    margin-bottom: var(--spacing-lg);
}

.no-shopping-lists h3 {
    margin-bottom: var(--spacing-md);
    color: var(--text-primary);
}

.shopping-list-card {
    background: var(--surface-color);
    border-radius: var(--radius-lg);
    padding: var(--spacing-lg);
    box-shadow: var(--shadow-light);
    transition: all var(--transition-fast);
    margin-bottom: var(--spacing-lg);
}

.shopping-list-card:hover {
    box-shadow: var(--shadow-medium);
    transform: translateY(-2px);
}

.shopping-list-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: var(--spacing-md);
}

.shopping-list-name {
    color: var(--text-primary);
    margin: 0;
    font-size: 1.25rem;
}

.shopping-list-actions {
    display: flex;
    gap: var(--spacing-sm);
}

.action-btn {
    width: 36px;
    height: 36px;
    border: none;
    border-radius: var(--radius-sm);
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: all var(--transition-fast);
    font-size: 0.875rem;
}

.view-btn {
    background: var(--accent-color);
    color: var(--text-light);
}

.view-btn:hover {
    background: #1565C0;
}

.edit-btn {
    background: var(--warning-color);
    color: var(--text-light);
}

.edit-btn:hover {
    background: #F57C00;
}

.download-btn {
    background: var(--success-color);
    color: var(--text-light);
}

.download-btn:hover {
    background: #388E3C;
}

.delete-btn {
    background: var(--error-color);
    color: var(--text-light);
}

.delete-btn:hover {
    background: #D32F2F;
}

.shopping-list-meta {
    display: flex;
    gap: var(--spacing-lg);
    margin-bottom: var(--spacing-md);
    font-size: 0.875rem;
    color: var(--text-secondary);
}

.shopping-list-preview {
    display: flex;
    flex-direction: column;
    gap: var(--spacing-xs);
}

.preview-item {
    display: flex;
    align-items: center;
    gap: var(--spacing-sm);
    font-size: 0.875rem;
}

.item-quantity {
    font-weight: 600;
    color: var(--primary-color);
    min-width: 80px;
}

.item-name {
    flex: 1;
}

.more-items {
    font-style: italic;
    color: var(--text-secondary);
    font-size: 0.875rem;
    margin-top: var(--spacing-xs);
}

/* Shopping List Details Modal */
.shopping-list-details {
    max-width: 100%;
}

.list-meta {
    background: var(--background-color);
    padding: var(--spacing-lg);
    border-radius: var(--radius-md);
    margin-bottom: var(--spacing-lg);
}

.list-meta p {
    margin-bottom: var(--spacing-sm);
    color: var(--text-secondary);
}

.shopping-items-section h3 {
    color: var(--primary-color);
    margin-bottom: var(--spacing-md);
    font-size: 1.25rem;
}

.shopping-items-checklist {
    display: grid;
    gap: var(--spacing-sm);
    margin-bottom: var(--spacing-xl);
}

.checklist-item {
    display: flex;
    align-items: center;
    gap: var(--spacing-md);
    padding: var(--spacing-md);
    background: var(--background-color);
    border-radius: var(--radius-sm);
    border: 1px solid var(--border-color);
}

.item-checkbox {
    width: 18px;
    height: 18px;
    cursor: pointer;
}

.item-label {
    display: flex;
    align-items: center;
    gap: var(--spacing-sm);
    cursor: pointer;
    flex: 1;
    transition: all var(--transition-fast);
}

.shopping-list-detail-actions {
    display: flex;
    gap: var(--spacing-md);
    justify-content: center;
    margin-top: var(--spacing-xl);
    padding-top: var(--spacing-lg);
    border-top: 1px solid var(--border-color);
}

/* Download Options Modal */
.download-options {
    display: grid;
    gap: var(--spacing-lg);
}

.download-options p {
    text-align: center;
    color: var(--text-secondary);
    margin-bottom: var(--spacing-lg);
}

.download-option {
    display: flex;
    align-items: center;
    gap: var(--spacing-lg);
    padding: var(--spacing-lg);
    border: 2px solid var(--border-color);
    border-radius: var(--radius-lg);
    cursor: pointer;
    transition: all var(--transition-fast);
    background: var(--surface-color);
}

.download-option:hover {
    border-color: var(--primary-color);
    background-color: rgba(46, 125, 50, 0.1);
}

.download-icon {
    width: 60px;
    height: 60px;
    border-radius: 50%;
    background: linear-gradient(135deg, var(--primary-color), var(--secondary-color));
    display: flex;
    align-items: center;
    justify-content: center;
    color: var(--text-light);
    font-size: 1.5rem;
    flex-shrink: 0;
}

.download-info h3 {
    margin-bottom: var(--spacing-xs);
    color: var(--text-primary);
}

.download-info p {
    margin: 0;
    color: var(--text-secondary);
    font-size: 0.875rem;
}

/* Shopping Items Form */
.shopping-item {
    display: grid;
    grid-template-columns: 2fr 1fr 1fr auto;
    gap: var(--spacing-md);
    align-items: center;
    margin-bottom: var(--spacing-md);
    padding: var(--spacing-md);
    background: var(--background-color);
    border-radius: var(--radius-sm);
}

.remove-item-btn {
    width: 32px;
    height: 32px;
    border: none;
    border-radius: var(--radius-sm);
    background: var(--error-color);
    color: var(--text-light);
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: all var(--transition-fast);
}

.remove-item-btn:hover {
    background: #D32F2F;
    transform: scale(1.1);
}

/* Responsive Design */
@media (max-width: 768px) {
    .shopping-list-header {
        flex-direction: column;
        align-items: flex-start;
        gap: var(--spacing-md);
    }
    
    .shopping-list-actions {
        align-self: flex-end;
    }
    
    .shopping-list-meta {
        flex-direction: column;
        gap: var(--spacing-sm);
    }
    
    .shopping-item {
        grid-template-columns: 1fr;
        gap: var(--spacing-sm);
    }
    
    .shopping-list-detail-actions {
        flex-direction: column;
    }
    
    .download-option {
        flex-direction: column;
        text-align: center;
        gap: var(--spacing-md);
    }
}
`;

// Inject shopping lists CSS
const shoppingListsStyle = document.createElement('style');
shoppingListsStyle.textContent = shoppingListsCSS;
document.head.appendChild(shoppingListsStyle);

