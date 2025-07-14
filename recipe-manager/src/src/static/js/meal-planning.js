// Meal planning functionality
class MealPlanningManager {
    constructor() {
        this.mealPlans = [];
        this.mealCategories = [];
        this.recipes = [];
        this.currentWeek = new Date();
        this.selectedRecipeId = null;
        this.init();
    }

    init() {
        this.setupEventListeners();
    }

    setupEventListeners() {
        // Generate shopping list button
        const generateShoppingListBtn = document.getElementById('generate-shopping-list-btn');
        generateShoppingListBtn?.addEventListener('click', () => {
            this.generateShoppingListFromWeek();
        });
    }

    async loadWeekMeals() {
        try {
            window.recipeManager.showLoading(true);

            // Load meal categories and recipes if not already loaded
            if (this.mealCategories.length === 0) {
                this.mealCategories = await window.recipeManager.fetchAPI('/api/categories?type=meal');
            }
            if (this.recipes.length === 0) {
                this.recipes = await window.recipeManager.fetchAPI('/api/recipes');
            }

            // Get week start and end dates
            const weekStart = window.recipeManager.getWeekStart(this.currentWeek);
            const weekEnd = new Date(weekStart);
            weekEnd.setDate(weekEnd.getDate() + 6);

            // Load meal plans for the week
            this.mealPlans = await window.recipeManager.fetchAPI(
                `/api/meal-plans?start_date=${window.recipeManager.formatDate(weekStart)}&end_date=${window.recipeManager.formatDate(weekEnd)}`
            );

            this.displayMealCalendar();

        } catch (error) {
            console.error('Error loading week meals:', error);
            window.recipeManager.showToast('Error loading meal plans', 'error');
        } finally {
            window.recipeManager.showLoading(false);
        }
    }

    displayMealCalendar() {
        const calendar = document.getElementById('meal-calendar');
        if (!calendar) return;

        const weekStart = window.recipeManager.getWeekStart(this.currentWeek);
        const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

        // Group meal plans by date
        const mealsByDate = {};
        this.mealPlans.forEach(meal => {
            if (!mealsByDate[meal.date]) {
                mealsByDate[meal.date] = {};
            }
            mealsByDate[meal.date][meal.meal_category_id] = meal;
        });

        let calendarHTML = `
            <div class="calendar-header">
                ${days.map(day => `<div class="calendar-day-header">${day}</div>`).join('')}
            </div>
            <div class="calendar-body">
        `;

        // Generate calendar days
        for (let i = 0; i < 7; i++) {
            const date = new Date(weekStart);
            date.setDate(date.getDate() + i);
            const dateStr = window.recipeManager.formatDate(date);
            const dayMeals = mealsByDate[dateStr] || {};

            calendarHTML += `
                <div class="calendar-day" data-date="${dateStr}">
                    <div class="day-number">${date.getDate()}</div>
                    <div class="meal-slots">
                        ${this.mealCategories.map(category => {
                            const meal = dayMeals[category.id];
                            return `
                                <div class="meal-slot ${meal ? 'filled' : ''}" 
                                     data-date="${dateStr}" 
                                     data-category="${category.id}"
                                     onclick="window.mealPlanning.${meal ? 'editMeal' : 'addMeal'}('${dateStr}', ${category.id}${meal ? ', ' + meal.id : ''})">
                                    <div class="meal-category-name">${category.name}</div>
                                    ${meal ? `
                                        <div class="meal-recipe-name">${meal.recipe_name}</div>
                                        <div class="meal-people-count">${meal.people_count} people</div>
                                    ` : `
                                        <div class="add-meal-text">+ Add Meal</div>
                                    `}
                                </div>
                            `;
                        }).join('')}
                    </div>
                </div>
            `;
        }

        calendarHTML += '</div>';
        calendar.innerHTML = calendarHTML;
    }

    async addMeal(date, categoryId) {
        try {
            // Show recipe selection modal
            this.showRecipeSelectionModal(date, categoryId);
        } catch (error) {
            console.error('Error adding meal:', error);
            window.recipeManager.showToast('Error adding meal', 'error');
        }
    }

    async editMeal(date, categoryId, mealId) {
        try {
            const meal = this.mealPlans.find(m => m.id === mealId);
            if (!meal) {
                window.recipeManager.showToast('Meal not found', 'error');
                return;
            }

            // Show edit meal modal
            this.showEditMealModal(meal);
        } catch (error) {
            console.error('Error editing meal:', error);
            window.recipeManager.showToast('Error editing meal', 'error');
        }
    }

    showRecipeSelectionModal(date, categoryId) {
        const category = this.mealCategories.find(c => c.id === categoryId);
        if (!category) return;

        const modal = document.createElement('div');
        modal.className = 'modal active';
        modal.id = 'recipe-selection-modal';

        modal.innerHTML = `
            <div class="modal-content">
                <div class="modal-header">
                    <h2>Select Recipe for ${category.name}</h2>
                    <button class="modal-close" onclick="this.closest('.modal').remove()">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
                <div class="modal-body">
                    <div class="meal-date-info">
                        <strong>Date:</strong> ${new Date(date).toLocaleDateString('en-US', { 
                            weekday: 'long', 
                            year: 'numeric', 
                            month: 'long', 
                            day: 'numeric' 
                        })}
                    </div>
                    
                    <div class="people-count-section">
                        <label>Number of People:</label>
                        <div class="people-counter">
                            <button type="button" class="counter-btn" onclick="this.nextElementSibling.stepDown()">-</button>
                            <input type="number" id="meal-people-count" value="${window.recipeManager.peopleCount}" min="1" max="20">
                            <button type="button" class="counter-btn" onclick="this.previousElementSibling.stepUp()">+</button>
                        </div>
                    </div>

                    <div class="recipe-search-section">
                        <input type="text" class="search-input" placeholder="Search recipes..." id="meal-recipe-search">
                    </div>

                    <div class="recipe-selection-grid" id="recipe-selection-grid">
                        ${this.recipes.map(recipe => `
                            <div class="recipe-selection-card" data-recipe-id="${recipe.id}" onclick="window.mealPlanning.selectRecipe(${recipe.id}, '${date}', ${categoryId})">
                                <div class="recipe-image-small">
                                    ${recipe.image_path ? 
                                        `<img src="${recipe.image_path}" alt="${recipe.name}">` : 
                                        '<i class="fas fa-utensils"></i>'
                                    }
                                </div>
                                <div class="recipe-info">
                                    <h4>${recipe.name}</h4>
                                    <div class="recipe-meta-small">
                                        ${recipe.prep_time ? `<span>${recipe.prep_time}min</span>` : ''}
                                        ${recipe.servings ? `<span>${recipe.servings} servings</span>` : ''}
                                    </div>
                                </div>
                            </div>
                        `).join('')}
                    </div>
                </div>
            </div>
        `;

        document.body.appendChild(modal);

        // Add search functionality
        const searchInput = modal.querySelector('#meal-recipe-search');
        searchInput?.addEventListener('input', (e) => {
            this.filterRecipeSelection(e.target.value);
        });

        // Close modal when clicking outside
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                modal.remove();
            }
        });
    }

    filterRecipeSelection(searchTerm) {
        const cards = document.querySelectorAll('.recipe-selection-card');
        const term = searchTerm.toLowerCase();

        cards.forEach(card => {
            const recipeName = card.querySelector('h4').textContent.toLowerCase();
            const shouldShow = recipeName.includes(term);
            card.style.display = shouldShow ? 'flex' : 'none';
        });
    }

    async selectRecipe(recipeId, date, categoryId) {
        try {
            window.recipeManager.showLoading(true);

            const peopleCount = document.getElementById('meal-people-count')?.value || window.recipeManager.peopleCount;
            const recipe = this.recipes.find(r => r.id === recipeId);
            
            if (!recipe) {
                window.recipeManager.showToast('Recipe not found', 'error');
                return;
            }

            const mealData = {
                name: `${recipe.name} - ${this.mealCategories.find(c => c.id === categoryId)?.name}`,
                date: date,
                meal_category_id: categoryId,
                recipe_id: recipeId,
                people_count: parseInt(peopleCount)
            };

            await window.recipeManager.fetchAPI('/api/meal-plans', {
                method: 'POST',
                body: JSON.stringify(mealData)
            });

            window.recipeManager.showToast('Meal added successfully!', 'success');
            
            // Close modal and reload meals
            document.getElementById('recipe-selection-modal')?.remove();
            this.loadWeekMeals();

        } catch (error) {
            console.error('Error selecting recipe:', error);
            if (error.message.includes('409')) {
                window.recipeManager.showToast('A meal is already planned for this time slot', 'error');
            } else {
                window.recipeManager.showToast('Error adding meal', 'error');
            }
        } finally {
            window.recipeManager.showLoading(false);
        }
    }

    showEditMealModal(meal) {
        const modal = document.createElement('div');
        modal.className = 'modal active';
        modal.id = 'edit-meal-modal';

        const category = this.mealCategories.find(c => c.id === meal.meal_category_id);
        const recipe = this.recipes.find(r => r.id === meal.recipe_id);

        modal.innerHTML = `
            <div class="modal-content">
                <div class="modal-header">
                    <h2>Edit Meal</h2>
                    <button class="modal-close" onclick="this.closest('.modal').remove()">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
                <div class="modal-body">
                    <div class="meal-info">
                        <h3>${recipe?.name}</h3>
                        <p><strong>Category:</strong> ${category?.name}</p>
                        <p><strong>Date:</strong> ${new Date(meal.date).toLocaleDateString()}</p>
                    </div>

                    <div class="people-count-section">
                        <label>Number of People:</label>
                        <div class="people-counter">
                            <button type="button" class="counter-btn" onclick="this.nextElementSibling.stepDown()">-</button>
                            <input type="number" id="edit-meal-people-count" value="${meal.people_count}" min="1" max="20">
                            <button type="button" class="counter-btn" onclick="this.previousElementSibling.stepUp()">+</button>
                        </div>
                    </div>

                    <div class="portion-preview" id="portion-preview">
                        <!-- Portion preview will be loaded here -->
                    </div>

                    <div class="modal-actions">
                        <button class="btn danger-btn" onclick="window.mealPlanning.deleteMeal(${meal.id})">
                            <i class="fas fa-trash"></i> Delete Meal
                        </button>
                        <button class="btn secondary-btn" onclick="this.closest('.modal').remove()">
                            Cancel
                        </button>
                        <button class="btn primary-btn" onclick="window.mealPlanning.updateMeal(${meal.id})">
                            <i class="fas fa-save"></i> Save Changes
                        </button>
                    </div>
                </div>
            </div>
        `;

        document.body.appendChild(modal);

        // Load portion preview
        this.loadPortionPreview(meal.recipe_id, meal.people_count);

        // Add people count change listener
        const peopleInput = modal.querySelector('#edit-meal-people-count');
        peopleInput?.addEventListener('change', () => {
            this.loadPortionPreview(meal.recipe_id, peopleInput.value);
        });

        // Close modal when clicking outside
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                modal.remove();
            }
        });
    }

    async loadPortionPreview(recipeId, peopleCount) {
        try {
            const response = await window.recipeManager.fetchAPI('/api/recipes/adjust-portions', {
                method: 'POST',
                body: JSON.stringify({
                    recipe_id: recipeId,
                    people_count: parseInt(peopleCount)
                })
            });

            const previewContainer = document.getElementById('portion-preview');
            if (!previewContainer) return;

            previewContainer.innerHTML = `
                <h4>Adjusted Ingredients (${peopleCount} people)</h4>
                <div class="ingredients-preview">
                    ${response.adjusted_ingredients.map(ingredient => `
                        <div class="ingredient-preview-item">
                            <span class="ingredient-quantity">${ingredient.adjusted_quantity} ${ingredient.unit}</span>
                            <span class="ingredient-name">${ingredient.name}</span>
                        </div>
                    `).join('')}
                </div>
            `;

        } catch (error) {
            console.error('Error loading portion preview:', error);
        }
    }

    async updateMeal(mealId) {
        try {
            window.recipeManager.showLoading(true);

            const peopleCount = document.getElementById('edit-meal-people-count')?.value;
            
            await window.recipeManager.fetchAPI(`/api/meal-plans/${mealId}`, {
                method: 'PUT',
                body: JSON.stringify({
                    people_count: parseInt(peopleCount)
                })
            });

            window.recipeManager.showToast('Meal updated successfully!', 'success');
            
            // Close modal and reload meals
            document.getElementById('edit-meal-modal')?.remove();
            this.loadWeekMeals();

        } catch (error) {
            console.error('Error updating meal:', error);
            window.recipeManager.showToast('Error updating meal', 'error');
        } finally {
            window.recipeManager.showLoading(false);
        }
    }

    async deleteMeal(mealId) {
        if (!confirm('Are you sure you want to delete this meal plan?')) {
            return;
        }

        try {
            window.recipeManager.showLoading(true);

            await window.recipeManager.fetchAPI(`/api/meal-plans/${mealId}`, {
                method: 'DELETE'
            });

            window.recipeManager.showToast('Meal deleted successfully!', 'success');
            
            // Close modal and reload meals
            document.getElementById('edit-meal-modal')?.remove();
            this.loadWeekMeals();

        } catch (error) {
            console.error('Error deleting meal:', error);
            window.recipeManager.showToast('Error deleting meal', 'error');
        } finally {
            window.recipeManager.showLoading(false);
        }
    }

    async generateShoppingListFromWeek() {
        try {
            window.recipeManager.showLoading(true);

            // Get all meal plans for the current week
            const weekStart = window.recipeManager.getWeekStart(this.currentWeek);
            const weekEnd = new Date(weekStart);
            weekEnd.setDate(weekEnd.getDate() + 6);

            const weekMeals = this.mealPlans.filter(meal => {
                const mealDate = new Date(meal.date);
                return mealDate >= weekStart && mealDate <= weekEnd;
            });

            if (weekMeals.length === 0) {
                window.recipeManager.showToast('No meals planned for this week', 'warning');
                return;
            }

            const mealPlanIds = weekMeals.map(meal => meal.id);
            const weekStartStr = weekStart.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
            const weekEndStr = weekEnd.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

            const shoppingListData = {
                name: `Shopping List - ${weekStartStr} to ${weekEndStr}`,
                meal_plan_ids: mealPlanIds
            };

            const shoppingList = await window.recipeManager.fetchAPI('/api/shopping-lists/generate', {
                method: 'POST',
                body: JSON.stringify(shoppingListData)
            });

            window.recipeManager.showToast('Shopping list generated successfully!', 'success');
            
            // Navigate to shopping lists page
            window.recipeManager.navigateToPage('shopping-lists');

        } catch (error) {
            console.error('Error generating shopping list:', error);
            window.recipeManager.showToast('Error generating shopping list', 'error');
        } finally {
            window.recipeManager.showLoading(false);
        }
    }

    updatePortions() {
        // This method is called when the global people count changes
        // We could update all meals for the current week, but that might be too aggressive
        // For now, we'll just update the display
        this.displayMealCalendar();
    }

    selectRecipeForMeal(recipeId) {
        // This method is called from the recipes page when "Add to Meal Plan" is clicked
        this.selectedRecipeId = recipeId;
        window.recipeManager.showToast('Recipe selected! Click on a meal slot to add it.', 'success');
    }
}

// Initialize meal planning manager
document.addEventListener('DOMContentLoaded', () => {
    window.mealPlanning = new MealPlanningManager();
});

// Add CSS for meal planning
const mealPlanningCSS = `
.meal-calendar {
    background: var(--surface-color);
    border-radius: var(--radius-lg);
    box-shadow: var(--shadow-light);
    overflow: hidden;
}

.calendar-header {
    display: grid;
    grid-template-columns: repeat(7, 1fr);
    background: var(--primary-color);
    color: var(--text-light);
}

.calendar-day-header {
    padding: var(--spacing-lg);
    text-align: center;
    font-weight: 600;
    font-size: 0.875rem;
}

.calendar-body {
    display: grid;
    grid-template-columns: repeat(7, 1fr);
    min-height: 500px;
}

.calendar-day {
    border: 1px solid var(--border-color);
    padding: var(--spacing-md);
    display: flex;
    flex-direction: column;
    gap: var(--spacing-sm);
    min-height: 150px;
}

.day-number {
    font-weight: 600;
    color: var(--text-secondary);
    font-size: 0.875rem;
    margin-bottom: var(--spacing-sm);
}

.meal-slots {
    display: flex;
    flex-direction: column;
    gap: var(--spacing-xs);
    flex: 1;
}

.meal-slot {
    background: var(--background-color);
    border: 2px dashed var(--border-color);
    border-radius: var(--radius-sm);
    padding: var(--spacing-sm);
    cursor: pointer;
    transition: all var(--transition-fast);
    font-size: 0.75rem;
    min-height: 60px;
    display: flex;
    flex-direction: column;
    justify-content: center;
}

.meal-slot:hover {
    border-color: var(--primary-color);
    background-color: rgba(46, 125, 50, 0.1);
}

.meal-slot.filled {
    background: var(--primary-color);
    color: var(--text-light);
    border-style: solid;
    border-color: var(--primary-color);
}

.meal-slot.filled:hover {
    background: #1B5E20;
}

.meal-category-name {
    font-weight: 600;
    font-size: 0.7rem;
    margin-bottom: var(--spacing-xs);
}

.meal-recipe-name {
    font-size: 0.75rem;
    margin-bottom: var(--spacing-xs);
}

.meal-people-count {
    font-size: 0.65rem;
    opacity: 0.8;
}

.add-meal-text {
    text-align: center;
    color: var(--text-secondary);
    font-style: italic;
}

.meal-slot.filled .add-meal-text {
    color: var(--text-light);
}

/* Recipe Selection Modal */
.recipe-selection-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
    gap: var(--spacing-md);
    max-height: 400px;
    overflow-y: auto;
    margin-top: var(--spacing-md);
}

.recipe-selection-card {
    display: flex;
    align-items: center;
    gap: var(--spacing-md);
    padding: var(--spacing-md);
    border: 2px solid var(--border-color);
    border-radius: var(--radius-md);
    cursor: pointer;
    transition: all var(--transition-fast);
    background: var(--surface-color);
}

.recipe-selection-card:hover {
    border-color: var(--primary-color);
    background-color: rgba(46, 125, 50, 0.1);
}

.recipe-image-small {
    width: 50px;
    height: 50px;
    border-radius: var(--radius-sm);
    background: linear-gradient(135deg, var(--primary-color), var(--secondary-color));
    display: flex;
    align-items: center;
    justify-content: center;
    color: var(--text-light);
    font-size: 1.25rem;
    flex-shrink: 0;
}

.recipe-image-small img {
    width: 100%;
    height: 100%;
    object-fit: cover;
    border-radius: var(--radius-sm);
}

.recipe-info h4 {
    margin-bottom: var(--spacing-xs);
    font-size: 1rem;
}

.recipe-meta-small {
    display: flex;
    gap: var(--spacing-sm);
    font-size: 0.75rem;
    color: var(--text-secondary);
}

.meal-date-info {
    background: var(--background-color);
    padding: var(--spacing-md);
    border-radius: var(--radius-md);
    margin-bottom: var(--spacing-lg);
    text-align: center;
}

.people-count-section {
    margin-bottom: var(--spacing-lg);
}

.people-count-section label {
    display: block;
    margin-bottom: var(--spacing-sm);
    font-weight: 500;
}

.recipe-search-section {
    margin-bottom: var(--spacing-md);
}

/* Edit Meal Modal */
.meal-info {
    background: var(--background-color);
    padding: var(--spacing-lg);
    border-radius: var(--radius-md);
    margin-bottom: var(--spacing-lg);
}

.meal-info h3 {
    color: var(--primary-color);
    margin-bottom: var(--spacing-sm);
}

.meal-info p {
    margin-bottom: var(--spacing-sm);
    color: var(--text-secondary);
}

.portion-preview {
    background: var(--background-color);
    padding: var(--spacing-lg);
    border-radius: var(--radius-md);
    margin-bottom: var(--spacing-lg);
}

.portion-preview h4 {
    color: var(--primary-color);
    margin-bottom: var(--spacing-md);
}

.ingredients-preview {
    display: grid;
    gap: var(--spacing-sm);
}

.ingredient-preview-item {
    display: flex;
    align-items: center;
    gap: var(--spacing-md);
    padding: var(--spacing-sm);
    background: var(--surface-color);
    border-radius: var(--radius-sm);
}

.ingredient-quantity {
    font-weight: 600;
    color: var(--primary-color);
    min-width: 80px;
}

.ingredient-name {
    flex: 1;
}

.modal-actions {
    display: flex;
    gap: var(--spacing-md);
    justify-content: flex-end;
    margin-top: var(--spacing-xl);
    padding-top: var(--spacing-lg);
    border-top: 1px solid var(--border-color);
}

/* Responsive Design */
@media (max-width: 768px) {
    .calendar-body {
        grid-template-columns: 1fr;
    }
    
    .calendar-day {
        min-height: auto;
        border-bottom: 1px solid var(--border-color);
    }
    
    .calendar-day:last-child {
        border-bottom: none;
    }
    
    .day-number {
        font-size: 1rem;
        font-weight: 700;
    }
    
    .meal-slots {
        flex-direction: row;
        flex-wrap: wrap;
    }
    
    .meal-slot {
        flex: 1;
        min-width: 120px;
        min-height: 80px;
    }
    
    .recipe-selection-grid {
        grid-template-columns: 1fr;
    }
    
    .modal-actions {
        flex-direction: column;
    }
}
`;

// Inject meal planning CSS
const mealPlanningStyle = document.createElement('style');
mealPlanningStyle.textContent = mealPlanningCSS;
document.head.appendChild(mealPlanningStyle);

