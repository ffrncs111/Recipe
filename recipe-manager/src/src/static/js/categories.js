// Categories management functionality
class CategoriesManager {
    constructor() {
        this.categories = [];
        this.currentType = 'recipe';
        this.currentCategory = null;
        this.init();
    }

    init() {
        this.setupEventListeners();
    }

    setupEventListeners() {
        // Add category button
        const addCategoryBtn = document.getElementById('add-category-btn');
        addCategoryBtn?.addEventListener('click', () => {
            this.openCategoryModal();
        });

        // Category form submission
        const categoryForm = document.getElementById('category-form');
        categoryForm?.addEventListener('submit', (e) => {
            e.preventDefault();
            this.saveCategory();
        });

        // Category form cancel
        const categoryCancelBtn = document.getElementById('category-cancel-btn');
        categoryCancelBtn?.addEventListener('click', () => {
            window.recipeManager.closeModal('category-modal');
        });

        // Category type tabs
        const typeTabs = document.querySelectorAll('.tab-btn');
        typeTabs.forEach(tab => {
            tab.addEventListener('click', () => {
                // Update active tab
                typeTabs.forEach(t => t.classList.remove('active'));
                tab.classList.add('active');

                // Update current type
                this.currentType = tab.dataset.type;
                this.displayCategories();
            });
        });
    }

    async loadCategories() {
        try {
            window.recipeManager.showLoading(true);
            
            // Load both recipe and meal categories
            const [recipeCategories, mealCategories] = await Promise.all([
                window.recipeManager.fetchAPI('/api/categories?type=recipe'),
                window.recipeManager.fetchAPI('/api/categories?type=meal')
            ]);

            this.categories = {
                recipe: recipeCategories,
                meal: mealCategories
            };

            this.displayCategories();

        } catch (error) {
            console.error('Error loading categories:', error);
            window.recipeManager.showToast('Error loading categories', 'error');
        } finally {
            window.recipeManager.showLoading(false);
        }
    }

    displayCategories() {
        const grid = document.getElementById('categories-grid');
        if (!grid) return;

        const currentCategories = this.categories[this.currentType] || [];

        if (currentCategories.length === 0) {
            grid.innerHTML = `
                <div class="no-categories">
                    <i class="fas fa-tags fa-3x"></i>
                    <h3>No ${this.currentType} categories</h3>
                    <p>Create your first ${this.currentType} category to organize your ${this.currentType === 'recipe' ? 'recipes' : 'meals'}!</p>
                    <button class="primary-btn" onclick="window.categories.openCategoryModal()">
                        <i class="fas fa-plus"></i>
                        Add Category
                    </button>
                </div>
            `;
            return;
        }

        grid.innerHTML = currentCategories.map(category => `
            <div class="category-card" data-category-id="${category.id}">
                <div class="category-actions">
                    <button class="category-action-btn edit-category-btn" onclick="window.categories.editCategory(${category.id})" title="Edit Category">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="category-action-btn delete-category-btn" onclick="window.categories.deleteCategory(${category.id})" title="Delete Category">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
                <div class="category-icon">
                    <i class="fas fa-${this.getCategoryIcon(category.name)}"></i>
                </div>
                <h3 class="category-name">${category.name}</h3>
                <p class="category-count" id="category-count-${category.id}">Loading...</p>
            </div>
        `).join('');

        // Load counts for each category
        this.loadCategoryCounts(currentCategories);
    }

    async loadCategoryCounts(categories) {
        for (const category of categories) {
            try {
                let count = 0;
                if (category.type === 'recipe') {
                    const recipes = await window.recipeManager.fetchAPI(`/api/recipes?category_id=${category.id}`);
                    count = recipes.length;
                } else if (category.type === 'meal') {
                    const mealPlans = await window.recipeManager.fetchAPI('/api/meal-plans');
                    count = mealPlans.filter(meal => meal.meal_category_id === category.id).length;
                }

                const countElement = document.getElementById(`category-count-${category.id}`);
                if (countElement) {
                    const itemType = category.type === 'recipe' ? 'recipe' : 'meal';
                    countElement.textContent = `${count} ${itemType}${count !== 1 ? 's' : ''}`;
                }
            } catch (error) {
                console.error(`Error loading count for category ${category.id}:`, error);
                const countElement = document.getElementById(`category-count-${category.id}`);
                if (countElement) {
                    countElement.textContent = '0 items';
                }
            }
        }
    }

    getCategoryIcon(categoryName) {
        const iconMap = {
            'breakfast': 'coffee',
            'lunch': 'hamburger',
            'dinner': 'utensils',
            'desserts': 'ice-cream',
            'snacks': 'cookie-bite',
            'beverages': 'glass-whiskey',
            'appetizers': 'cheese',
            'soups': 'bowl-hot',
            'salads': 'leaf',
            'main courses': 'drumstick-bite',
            'side dishes': 'bread-slice',
            'vegetarian': 'seedling',
            'vegan': 'carrot',
            'quick & easy': 'clock',
            'brunch': 'egg'
        };

        const key = categoryName.toLowerCase();
        return iconMap[key] || 'tag';
    }

    openCategoryModal(category = null) {
        this.currentCategory = category;
        const modal = document.getElementById('category-modal');
        const title = document.getElementById('category-modal-title');
        const form = document.getElementById('category-form');

        if (category) {
            title.textContent = 'Edit Category';
            this.populateCategoryForm(category);
        } else {
            title.textContent = 'Add Category';
            form.reset();
            // Set default type based on current tab
            document.getElementById('category-type').value = this.currentType;
        }

        window.recipeManager.openModal('category-modal');
    }

    populateCategoryForm(category) {
        const form = document.getElementById('category-form');
        form.querySelector('#category-name').value = category.name || '';
        form.querySelector('#category-type').value = category.type || '';
    }

    async saveCategory() {
        try {
            window.recipeManager.showLoading(true);

            const form = document.getElementById('category-form');
            const formData = new FormData(form);

            const categoryData = {
                name: formData.get('name'),
                type: formData.get('type')
            };

            // Validate required fields
            if (!categoryData.name || !categoryData.type) {
                window.recipeManager.showToast('Please fill in all required fields', 'error');
                return;
            }

            let response;
            if (this.currentCategory) {
                // Update existing category
                response = await window.recipeManager.fetchAPI(`/api/categories/${this.currentCategory.id}`, {
                    method: 'PUT',
                    body: JSON.stringify(categoryData)
                });
            } else {
                // Create new category
                response = await window.recipeManager.fetchAPI('/api/categories', {
                    method: 'POST',
                    body: JSON.stringify(categoryData)
                });
            }

            window.recipeManager.showToast(
                this.currentCategory ? 'Category updated successfully!' : 'Category created successfully!',
                'success'
            );

            window.recipeManager.closeModal('category-modal');
            this.loadCategories(); // Reload categories

            // Update recipe categories if we're on the recipes page
            if (window.recipes) {
                window.recipes.loadCategories();
            }

        } catch (error) {
            console.error('Error saving category:', error);
            if (error.message.includes('409')) {
                window.recipeManager.showToast('A category with this name already exists', 'error');
            } else {
                window.recipeManager.showToast('Error saving category', 'error');
            }
        } finally {
            window.recipeManager.showLoading(false);
        }
    }

    async editCategory(categoryId) {
        try {
            // Find the category in our current data
            const allCategories = [...(this.categories.recipe || []), ...(this.categories.meal || [])];
            const category = allCategories.find(cat => cat.id === categoryId);
            
            if (category) {
                this.openCategoryModal(category);
            } else {
                window.recipeManager.showToast('Category not found', 'error');
            }
        } catch (error) {
            console.error('Error loading category for editing:', error);
            window.recipeManager.showToast('Error loading category', 'error');
        }
    }

    async deleteCategory(categoryId) {
        try {
            // Find the category to get its details
            const allCategories = [...(this.categories.recipe || []), ...(this.categories.meal || [])];
            const category = allCategories.find(cat => cat.id === categoryId);
            
            if (!category) {
                window.recipeManager.showToast('Category not found', 'error');
                return;
            }

            // Check if category has items
            let hasItems = false;
            let itemCount = 0;
            
            if (category.type === 'recipe') {
                const recipes = await window.recipeManager.fetchAPI(`/api/recipes?category_id=${categoryId}`);
                hasItems = recipes.length > 0;
                itemCount = recipes.length;
            } else if (category.type === 'meal') {
                const mealPlans = await window.recipeManager.fetchAPI('/api/meal-plans');
                const categoryMeals = mealPlans.filter(meal => meal.meal_category_id === categoryId);
                hasItems = categoryMeals.length > 0;
                itemCount = categoryMeals.length;
            }

            let confirmMessage = `Are you sure you want to delete the category "${category.name}"?`;
            if (hasItems) {
                const itemType = category.type === 'recipe' ? 'recipe' : 'meal plan';
                confirmMessage += `\n\nThis category contains ${itemCount} ${itemType}${itemCount !== 1 ? 's' : ''}. They will be moved to "Uncategorized".`;
            }
            confirmMessage += '\n\nThis action cannot be undone.';

            if (!confirm(confirmMessage)) {
                return;
            }

            window.recipeManager.showLoading(true);
            await window.recipeManager.fetchAPI(`/api/categories/${categoryId}`, {
                method: 'DELETE'
            });

            window.recipeManager.showToast('Category deleted successfully!', 'success');
            this.loadCategories(); // Reload categories

            // Update recipe categories if we're on the recipes page
            if (window.recipes) {
                window.recipes.loadCategories();
                window.recipes.loadRecipes(); // Reload recipes to update category display
            }

        } catch (error) {
            console.error('Error deleting category:', error);
            window.recipeManager.showToast('Error deleting category', 'error');
        } finally {
            window.recipeManager.showLoading(false);
        }
    }

    // Get categories for a specific type (used by other modules)
    getCategoriesByType(type) {
        return this.categories[type] || [];
    }

    // Get category name by ID (used by other modules)
    getCategoryName(categoryId, type) {
        const categories = this.getCategoriesByType(type);
        const category = categories.find(cat => cat.id === categoryId);
        return category ? category.name : 'Uncategorized';
    }
}

// Initialize categories manager
document.addEventListener('DOMContentLoaded', () => {
    window.categories = new CategoriesManager();
});

// Add CSS for categories
const categoriesCSS = `
.no-categories {
    text-align: center;
    padding: var(--spacing-xxl);
    color: var(--text-secondary);
    grid-column: 1 / -1;
}

.no-categories i {
    color: var(--primary-color);
    margin-bottom: var(--spacing-lg);
}

.no-categories h3 {
    margin-bottom: var(--spacing-md);
    color: var(--text-primary);
}

.category-card {
    position: relative;
    transition: all var(--transition-fast);
}

.category-card:hover .category-actions {
    opacity: 1;
}

.category-actions {
    position: absolute;
    top: var(--spacing-sm);
    right: var(--spacing-sm);
    display: flex;
    gap: var(--spacing-xs);
    opacity: 0;
    transition: opacity var(--transition-fast);
    z-index: 10;
}

.category-action-btn {
    width: 32px;
    height: 32px;
    border: none;
    border-radius: var(--radius-sm);
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 0.875rem;
    transition: all var(--transition-fast);
    box-shadow: var(--shadow-light);
}

.edit-category-btn {
    background: var(--accent-color);
    color: var(--text-light);
}

.edit-category-btn:hover {
    background: #1565C0;
    transform: scale(1.1);
}

.delete-category-btn {
    background: var(--error-color);
    color: var(--text-light);
}

.delete-category-btn:hover {
    background: #D32F2F;
    transform: scale(1.1);
}

.category-icon {
    width: 60px;
    height: 60px;
    border-radius: 50%;
    background: linear-gradient(135deg, var(--primary-color), var(--secondary-color));
    display: flex;
    align-items: center;
    justify-content: center;
    margin: 0 auto var(--spacing-md);
    color: var(--text-light);
    font-size: 1.5rem;
    transition: transform var(--transition-fast);
}

.category-card:hover .category-icon {
    transform: scale(1.1);
}

.category-name {
    font-weight: 600;
    margin-bottom: var(--spacing-sm);
    text-align: center;
    color: var(--text-primary);
}

.category-count {
    color: var(--text-secondary);
    font-size: 0.875rem;
    text-align: center;
    margin-bottom: 0;
}

.category-type-tabs {
    display: flex;
    margin-bottom: var(--spacing-lg);
    background: var(--surface-color);
    border-radius: var(--radius-md);
    padding: var(--spacing-xs);
    box-shadow: var(--shadow-light);
}

.tab-btn {
    flex: 1;
    padding: var(--spacing-md);
    border: none;
    background: none;
    cursor: pointer;
    border-radius: var(--radius-sm);
    transition: all var(--transition-fast);
    font-weight: 500;
    color: var(--text-secondary);
}

.tab-btn:hover {
    color: var(--primary-color);
}

.tab-btn.active {
    background: var(--primary-color);
    color: var(--text-light);
}

@media (max-width: 768px) {
    .categories-grid {
        grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
    }
    
    .category-actions {
        opacity: 1;
    }
    
    .category-icon {
        width: 50px;
        height: 50px;
        font-size: 1.25rem;
    }
}
`;

// Inject categories CSS
const categoriesStyle = document.createElement('style');
categoriesStyle.textContent = categoriesCSS;
document.head.appendChild(categoriesStyle);

