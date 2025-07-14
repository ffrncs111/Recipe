// Recipes management functionality
class RecipesManager {
    constructor() {
        this.recipes = [];
        this.categories = [];
        this.currentRecipe = null;
        this.currentFilter = '';
        this.currentSearch = '';
        this.init();
    }

    init() {
        this.setupEventListeners();
    }

    setupEventListeners() {
        // Add recipe button
        const addRecipeBtn = document.getElementById('add-recipe-btn');
        addRecipeBtn?.addEventListener('click', () => {
            this.openRecipeModal();
        });

        // Recipe form submission
        const recipeForm = document.getElementById('recipe-form');
        recipeForm?.addEventListener('submit', (e) => {
            e.preventDefault();
            this.saveRecipe();
        });

        // Recipe form cancel
        const recipeCancelBtn = document.getElementById('recipe-cancel-btn');
        recipeCancelBtn?.addEventListener('click', () => {
            window.recipeManager.closeModal('recipe-modal');
        });

        // Add ingredient button
        const addIngredientBtn = document.getElementById('add-ingredient-btn');
        addIngredientBtn?.addEventListener('click', () => {
            this.addIngredientField();
        });

        // Recipe search
        const recipeSearch = document.getElementById('recipe-search');
        recipeSearch?.addEventListener('input', (e) => {
            this.currentSearch = e.target.value;
            this.filterRecipes();
        });

        // Category filters
        this.setupCategoryFilters();
    }

    setupCategoryFilters() {
        const filtersContainer = document.getElementById('recipe-category-filters');
        if (!filtersContainer) return;

        filtersContainer.addEventListener('click', (e) => {
            if (e.target.classList.contains('filter-btn')) {
                // Update active filter
                filtersContainer.querySelectorAll('.filter-btn').forEach(btn => {
                    btn.classList.remove('active');
                });
                e.target.classList.add('active');

                // Update current filter
                this.currentFilter = e.target.dataset.category || '';
                this.filterRecipes();
            }
        });
    }

    async loadRecipes() {
        try {
            window.recipeManager.showLoading(true);
            this.recipes = await window.recipeManager.fetchAPI('/api/recipes');
            this.displayRecipes(this.recipes);
        } catch (error) {
            console.error('Error loading recipes:', error);
            window.recipeManager.showToast('Error loading recipes', 'error');
        } finally {
            window.recipeManager.showLoading(false);
        }
    }

    async loadCategories() {
        try {
            this.categories = await window.recipeManager.fetchAPI('/api/categories?type=recipe');
            this.displayCategoryFilters();
            this.populateRecipeCategorySelect();
        } catch (error) {
            console.error('Error loading categories:', error);
        }
    }

    displayCategoryFilters() {
        const filtersContainer = document.getElementById('recipe-category-filters');
        if (!filtersContainer) return;

        // Keep the "All" button and add category buttons
        const allButton = filtersContainer.querySelector('[data-category=""]');
        filtersContainer.innerHTML = '';
        
        if (allButton) {
            filtersContainer.appendChild(allButton);
        } else {
            filtersContainer.innerHTML = '<button class="filter-btn active" data-category="">All</button>';
        }

        this.categories.forEach(category => {
            const button = document.createElement('button');
            button.className = 'filter-btn';
            button.dataset.category = category.id;
            button.textContent = category.name;
            filtersContainer.appendChild(button);
        });
    }

    populateRecipeCategorySelect() {
        const select = document.getElementById('recipe-category');
        if (!select) return;

        // Clear existing options except the first one
        select.innerHTML = '<option value="">Select Category</option>';

        this.categories.forEach(category => {
            const option = document.createElement('option');
            option.value = category.id;
            option.textContent = category.name;
            select.appendChild(option);
        });
    }

    displayRecipes(recipes) {
        const grid = document.getElementById('recipes-grid');
        if (!grid) return;

        if (recipes.length === 0) {
            grid.innerHTML = `
                <div class="no-recipes">
                    <i class="fas fa-book fa-3x"></i>
                    <h3>No recipes found</h3>
                    <p>Start by adding your first recipe!</p>
                    <button class="primary-btn" onclick="window.recipes.openRecipeModal()">
                        <i class="fas fa-plus"></i>
                        Add Recipe
                    </button>
                </div>
            `;
            return;
        }

        grid.innerHTML = recipes.map(recipe => `
            <div class="recipe-card" data-recipe-id="${recipe.id}">
                <div class="recipe-image">
                    ${recipe.image_path ? 
                        `<img src="${recipe.image_path}" alt="${recipe.name}">` : 
                        '<i class="fas fa-utensils"></i>'
                    }
                </div>
                <div class="recipe-content">
                    <h3 class="recipe-title">${recipe.name}</h3>
                    <div class="recipe-meta">
                        ${recipe.prep_time ? `<span><i class="fas fa-clock"></i> ${recipe.prep_time}min</span>` : ''}
                        ${recipe.cook_time ? `<span><i class="fas fa-fire"></i> ${recipe.cook_time}min</span>` : ''}
                        ${recipe.servings ? `<span><i class="fas fa-users"></i> ${recipe.servings}</span>` : ''}
                    </div>
                    ${recipe.category_name ? `<div class="recipe-category"><i class="fas fa-tag"></i> ${recipe.category_name}</div>` : ''}
                    <p class="recipe-description">${recipe.description || 'No description available'}</p>
                    <div class="recipe-actions">
                        <button class="btn secondary-btn" onclick="window.recipes.viewRecipe(${recipe.id})">
                            <i class="fas fa-eye"></i> View
                        </button>
                        <button class="btn secondary-btn" onclick="window.recipes.editRecipe(${recipe.id})">
                            <i class="fas fa-edit"></i> Edit
                        </button>
                        <button class="btn danger-btn" onclick="window.recipes.deleteRecipe(${recipe.id})">
                            <i class="fas fa-trash"></i> Delete
                        </button>
                    </div>
                </div>
            </div>
        `).join('');
    }

    filterRecipes() {
        let filteredRecipes = [...this.recipes];

        // Filter by category
        if (this.currentFilter) {
            filteredRecipes = filteredRecipes.filter(recipe => 
                recipe.category_id == this.currentFilter
            );
        }

        // Filter by search
        if (this.currentSearch) {
            const searchLower = this.currentSearch.toLowerCase();
            filteredRecipes = filteredRecipes.filter(recipe =>
                recipe.name.toLowerCase().includes(searchLower) ||
                (recipe.description && recipe.description.toLowerCase().includes(searchLower)) ||
                recipe.ingredients.some(ingredient => 
                    ingredient.name.toLowerCase().includes(searchLower)
                )
            );
        }

        this.displayRecipes(filteredRecipes);
    }

    openRecipeModal(recipe = null) {
        this.currentRecipe = recipe;
        const modal = document.getElementById('recipe-modal');
        const title = document.getElementById('recipe-modal-title');
        const form = document.getElementById('recipe-form');

        if (recipe) {
            title.textContent = 'Edit Recipe';
            this.populateRecipeForm(recipe);
        } else {
            title.textContent = 'Add Recipe';
            form.reset();
            this.clearIngredients();
            this.addIngredientField(); // Add one empty ingredient field
        }

        window.recipeManager.openModal('recipe-modal');
    }

    populateRecipeForm(recipe) {
        const form = document.getElementById('recipe-form');
        
        // Populate basic fields
        form.querySelector('#recipe-name').value = recipe.name || '';
        form.querySelector('#recipe-description').value = recipe.description || '';
        form.querySelector('#recipe-instructions').value = recipe.instructions || '';
        form.querySelector('#recipe-prep-time').value = recipe.prep_time || '';
        form.querySelector('#recipe-cook-time').value = recipe.cook_time || '';
        form.querySelector('#recipe-servings').value = recipe.servings || 4;
        form.querySelector('#recipe-category').value = recipe.category_id || '';

        // Populate ingredients
        this.clearIngredients();
        if (recipe.ingredients && recipe.ingredients.length > 0) {
            recipe.ingredients.forEach(ingredient => {
                this.addIngredientField(ingredient);
            });
        } else {
            this.addIngredientField();
        }
    }

    clearIngredients() {
        const ingredientsList = document.getElementById('ingredients-list');
        if (ingredientsList) {
            ingredientsList.innerHTML = '';
        }
    }

    addIngredientField(ingredient = null) {
        const ingredientsList = document.getElementById('ingredients-list');
        if (!ingredientsList) return;

        const ingredientDiv = document.createElement('div');
        ingredientDiv.className = 'ingredient-item';
        ingredientDiv.innerHTML = `
            <input type="text" placeholder="Ingredient name" name="ingredient_name" value="${ingredient?.name || ''}" required>
            <input type="number" placeholder="Quantity" name="ingredient_quantity" value="${ingredient?.quantity || ''}" step="0.01" min="0" required>
            <input type="text" placeholder="Unit (g, ml, pieces)" name="ingredient_unit" value="${ingredient?.unit || ''}" required>
            <button type="button" class="remove-ingredient-btn" onclick="this.parentElement.remove()">
                <i class="fas fa-times"></i>
            </button>
        `;

        ingredientsList.appendChild(ingredientDiv);
    }

    async saveRecipe() {
        try {
            window.recipeManager.showLoading(true);

            const form = document.getElementById('recipe-form');
            const formData = new FormData(form);

            // Collect basic recipe data
            const recipeData = {
                name: formData.get('name'),
                description: formData.get('description'),
                instructions: formData.get('instructions'),
                prep_time: formData.get('prep_time') ? parseInt(formData.get('prep_time')) : null,
                cook_time: formData.get('cook_time') ? parseInt(formData.get('cook_time')) : null,
                servings: formData.get('servings') ? parseInt(formData.get('servings')) : 4,
                category_id: formData.get('category_id') || null
            };

            // Collect ingredients
            const ingredientNames = formData.getAll('ingredient_name');
            const ingredientQuantities = formData.getAll('ingredient_quantity');
            const ingredientUnits = formData.getAll('ingredient_unit');

            recipeData.ingredients = [];
            for (let i = 0; i < ingredientNames.length; i++) {
                if (ingredientNames[i] && ingredientQuantities[i] && ingredientUnits[i]) {
                    recipeData.ingredients.push({
                        name: ingredientNames[i],
                        quantity: parseFloat(ingredientQuantities[i]),
                        unit: ingredientUnits[i]
                    });
                }
            }

            let response;
            if (this.currentRecipe) {
                // Update existing recipe
                response = await window.recipeManager.fetchAPI(`/api/recipes/${this.currentRecipe.id}`, {
                    method: 'PUT',
                    body: JSON.stringify(recipeData)
                });
            } else {
                // Create new recipe
                response = await window.recipeManager.fetchAPI('/api/recipes', {
                    method: 'POST',
                    body: JSON.stringify(recipeData)
                });
            }

            window.recipeManager.showToast(
                this.currentRecipe ? 'Recipe updated successfully!' : 'Recipe created successfully!',
                'success'
            );

            window.recipeManager.closeModal('recipe-modal');
            this.loadRecipes(); // Reload recipes

        } catch (error) {
            console.error('Error saving recipe:', error);
            window.recipeManager.showToast('Error saving recipe', 'error');
        } finally {
            window.recipeManager.showLoading(false);
        }
    }

    async viewRecipe(recipeId) {
        try {
            const recipe = await window.recipeManager.fetchAPI(`/api/recipes/${recipeId}`);
            this.showRecipeDetails(recipe);
        } catch (error) {
            console.error('Error loading recipe:', error);
            window.recipeManager.showToast('Error loading recipe details', 'error');
        }
    }

    showRecipeDetails(recipe) {
        // Create a modal for recipe details
        const modal = document.createElement('div');
        modal.className = 'modal active';
        modal.id = 'recipe-details-modal';
        
        modal.innerHTML = `
            <div class="modal-content">
                <div class="modal-header">
                    <h2>${recipe.name}</h2>
                    <button class="modal-close" onclick="this.closest('.modal').remove()">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
                <div class="modal-body">
                    <div class="recipe-details">
                        ${recipe.image_path ? `<img src="${recipe.image_path}" alt="${recipe.name}" class="recipe-detail-image">` : ''}
                        
                        <div class="recipe-meta-details">
                            ${recipe.prep_time ? `<span><i class="fas fa-clock"></i> Prep: ${recipe.prep_time} min</span>` : ''}
                            ${recipe.cook_time ? `<span><i class="fas fa-fire"></i> Cook: ${recipe.cook_time} min</span>` : ''}
                            ${recipe.servings ? `<span><i class="fas fa-users"></i> Serves: ${recipe.servings}</span>` : ''}
                            ${recipe.category_name ? `<span><i class="fas fa-tag"></i> ${recipe.category_name}</span>` : ''}
                        </div>

                        ${recipe.description ? `
                            <div class="recipe-section">
                                <h3>Description</h3>
                                <p>${recipe.description}</p>
                            </div>
                        ` : ''}

                        <div class="recipe-section">
                            <h3>Ingredients</h3>
                            <ul class="ingredients-detail-list">
                                ${recipe.ingredients.map(ingredient => `
                                    <li>
                                        <span class="ingredient-quantity">${ingredient.quantity} ${ingredient.unit}</span>
                                        <span class="ingredient-name">${ingredient.name}</span>
                                        ${ingredient.notes ? `<span class="ingredient-notes">(${ingredient.notes})</span>` : ''}
                                    </li>
                                `).join('')}
                            </ul>
                        </div>

                        ${recipe.instructions ? `
                            <div class="recipe-section">
                                <h3>Instructions</h3>
                                <div class="recipe-instructions">${recipe.instructions.replace(/\n/g, '<br>')}</div>
                            </div>
                        ` : ''}

                        <div class="recipe-detail-actions">
                            <button class="btn secondary-btn" onclick="window.recipes.editRecipe(${recipe.id}); this.closest('.modal').remove();">
                                <i class="fas fa-edit"></i> Edit Recipe
                            </button>
                            <button class="btn primary-btn" onclick="window.recipes.addToMealPlan(${recipe.id}); this.closest('.modal').remove();">
                                <i class="fas fa-calendar-plus"></i> Add to Meal Plan
                            </button>
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

    async editRecipe(recipeId) {
        try {
            const recipe = await window.recipeManager.fetchAPI(`/api/recipes/${recipeId}`);
            this.openRecipeModal(recipe);
        } catch (error) {
            console.error('Error loading recipe for editing:', error);
            window.recipeManager.showToast('Error loading recipe', 'error');
        }
    }

    async deleteRecipe(recipeId) {
        if (!confirm('Are you sure you want to delete this recipe? This action cannot be undone.')) {
            return;
        }

        try {
            window.recipeManager.showLoading(true);
            await window.recipeManager.fetchAPI(`/api/recipes/${recipeId}`, {
                method: 'DELETE'
            });

            window.recipeManager.showToast('Recipe deleted successfully!', 'success');
            this.loadRecipes(); // Reload recipes

        } catch (error) {
            console.error('Error deleting recipe:', error);
            window.recipeManager.showToast('Error deleting recipe', 'error');
        } finally {
            window.recipeManager.showLoading(false);
        }
    }

    addToMealPlan(recipeId) {
        // Navigate to meal planning page and trigger add meal functionality
        window.recipeManager.navigateToPage('meal-planning');
        // This will be implemented in the meal planning module
        if (window.mealPlanning) {
            window.mealPlanning.selectRecipeForMeal(recipeId);
        }
    }

    async adjustPortions(recipeId, peopleCount) {
        try {
            const response = await window.recipeManager.fetchAPI('/api/recipes/adjust-portions', {
                method: 'POST',
                body: JSON.stringify({
                    recipe_id: recipeId,
                    people_count: peopleCount
                })
            });

            return response;
        } catch (error) {
            console.error('Error adjusting portions:', error);
            throw error;
        }
    }
}

// Initialize recipes manager
document.addEventListener('DOMContentLoaded', () => {
    window.recipes = new RecipesManager();
});

// Add CSS for recipe details
const recipeDetailsCSS = `
.recipe-details {
    max-width: 100%;
}

.recipe-detail-image {
    width: 100%;
    max-height: 300px;
    object-fit: cover;
    border-radius: var(--radius-md);
    margin-bottom: var(--spacing-lg);
}

.recipe-meta-details {
    display: flex;
    gap: var(--spacing-lg);
    margin-bottom: var(--spacing-lg);
    flex-wrap: wrap;
}

.recipe-meta-details span {
    display: flex;
    align-items: center;
    gap: var(--spacing-xs);
    color: var(--text-secondary);
    font-size: 0.875rem;
}

.recipe-section {
    margin-bottom: var(--spacing-xl);
}

.recipe-section h3 {
    color: var(--primary-color);
    margin-bottom: var(--spacing-md);
    font-size: 1.25rem;
}

.ingredients-detail-list {
    list-style: none;
    padding: 0;
}

.ingredients-detail-list li {
    display: flex;
    align-items: center;
    gap: var(--spacing-sm);
    padding: var(--spacing-sm) 0;
    border-bottom: 1px solid var(--border-color);
}

.ingredients-detail-list li:last-child {
    border-bottom: none;
}

.ingredient-quantity {
    font-weight: 600;
    color: var(--primary-color);
    min-width: 80px;
}

.ingredient-name {
    flex: 1;
}

.ingredient-notes {
    color: var(--text-secondary);
    font-style: italic;
    font-size: 0.875rem;
}

.recipe-instructions {
    line-height: 1.8;
    color: var(--text-primary);
}

.recipe-detail-actions {
    display: flex;
    gap: var(--spacing-md);
    justify-content: center;
    margin-top: var(--spacing-xl);
    padding-top: var(--spacing-lg);
    border-top: 1px solid var(--border-color);
}

.no-recipes {
    text-align: center;
    padding: var(--spacing-xxl);
    color: var(--text-secondary);
    grid-column: 1 / -1;
}

.no-recipes i {
    color: var(--primary-color);
    margin-bottom: var(--spacing-lg);
}

.no-recipes h3 {
    margin-bottom: var(--spacing-md);
    color: var(--text-primary);
}

.recipe-category {
    display: flex;
    align-items: center;
    gap: var(--spacing-xs);
    color: var(--primary-color);
    font-size: 0.875rem;
    margin-bottom: var(--spacing-sm);
    font-weight: 500;
}

@media (max-width: 768px) {
    .recipe-detail-actions {
        flex-direction: column;
    }
    
    .recipe-meta-details {
        flex-direction: column;
        gap: var(--spacing-sm);
    }
}
`;

// Inject recipe details CSS
const recipeStyle = document.createElement('style');
recipeStyle.textContent = recipeDetailsCSS;
document.head.appendChild(recipeStyle);

