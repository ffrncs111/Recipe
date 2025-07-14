// Main JavaScript file for Recipe Manager
class RecipeManager {
    constructor() {
        this.currentPage = 'dashboard';
        this.currentWeek = new Date();
        this.peopleCount = 4;
        this.init();
    }

    init() {
        this.setupEventListeners();
        this.loadDashboard();
        this.showLoading(false);
    }

    setupEventListeners() {
        // Navigation
        document.querySelectorAll('.nav-link').forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                const page = link.dataset.page;
                this.navigateToPage(page);
            });
        });

        // Mobile menu toggle
        const menuToggle = document.getElementById('menu-toggle');
        const navMenu = document.getElementById('nav-menu');
        menuToggle?.addEventListener('click', () => {
            navMenu.classList.toggle('active');
        });

        // Search functionality
        const searchBtn = document.getElementById('search-btn');
        const searchOverlay = document.getElementById('search-overlay');
        const searchClose = document.getElementById('search-close');
        const globalSearch = document.getElementById('global-search');

        searchBtn?.addEventListener('click', () => {
            searchOverlay.classList.add('active');
            globalSearch.focus();
        });

        searchClose?.addEventListener('click', () => {
            searchOverlay.classList.remove('active');
        });

        searchOverlay?.addEventListener('click', (e) => {
            if (e.target === searchOverlay) {
                searchOverlay.classList.remove('active');
            }
        });

        globalSearch?.addEventListener('input', (e) => {
            this.performGlobalSearch(e.target.value);
        });

        // Modal close functionality
        document.querySelectorAll('.modal').forEach(modal => {
            const closeBtn = modal.querySelector('.modal-close');
            closeBtn?.addEventListener('click', () => {
                this.closeModal(modal.id);
            });

            modal.addEventListener('click', (e) => {
                if (e.target === modal) {
                    this.closeModal(modal.id);
                }
            });
        });

        // People counter
        const peopleDecrease = document.getElementById('people-decrease');
        const peopleIncrease = document.getElementById('people-increase');
        
        peopleDecrease?.addEventListener('click', () => {
            if (this.peopleCount > 1) {
                this.peopleCount--;
                this.updatePeopleCount();
            }
        });

        peopleIncrease?.addEventListener('click', () => {
            this.peopleCount++;
            this.updatePeopleCount();
        });

        // Week navigation
        const prevWeek = document.getElementById('prev-week');
        const nextWeek = document.getElementById('next-week');

        prevWeek?.addEventListener('click', () => {
            this.currentWeek.setDate(this.currentWeek.getDate() - 7);
            this.updateWeekDisplay();
            if (this.currentPage === 'meal-planning') {
                window.mealPlanning?.loadWeekMeals();
            }
        });

        nextWeek?.addEventListener('click', () => {
            this.currentWeek.setDate(this.currentWeek.getDate() + 7);
            this.updateWeekDisplay();
            if (this.currentPage === 'meal-planning') {
                window.mealPlanning?.loadWeekMeals();
            }
        });
    }

    navigateToPage(page) {
        // Update navigation
        document.querySelectorAll('.nav-link').forEach(link => {
            link.classList.remove('active');
        });
        document.querySelector(`[data-page="${page}"]`)?.classList.add('active');

        // Update pages
        document.querySelectorAll('.page').forEach(p => {
            p.classList.remove('active');
        });
        document.getElementById(`${page}-page`)?.classList.add('active');

        this.currentPage = page;

        // Load page-specific content
        switch (page) {
            case 'dashboard':
                this.loadDashboard();
                break;
            case 'recipes':
                window.recipes?.loadRecipes();
                window.recipes?.loadCategories();
                break;
            case 'meal-planning':
                window.mealPlanning?.loadWeekMeals();
                this.updateWeekDisplay();
                break;
            case 'shopping-lists':
                window.shoppingLists?.loadShoppingLists();
                break;
            case 'categories':
                window.categories?.loadCategories();
                break;
            case 'ai-assistant':
                // AI assistant is already loaded
                break;
        }

        // Close mobile menu
        document.getElementById('nav-menu')?.classList.remove('active');
    }

    async loadDashboard() {
        try {
            this.showLoading(true);

            // Load stats
            const [recipes, mealPlans, shoppingLists, categories] = await Promise.all([
                this.fetchAPI('/api/recipes'),
                this.fetchAPI('/api/meal-plans'),
                this.fetchAPI('/api/shopping-lists'),
                this.fetchAPI('/api/categories')
            ]);

            // Update stats
            document.getElementById('total-recipes').textContent = recipes.length;
            document.getElementById('planned-meals').textContent = mealPlans.length;
            document.getElementById('shopping-lists-count').textContent = shoppingLists.length;
            document.getElementById('categories-count').textContent = categories.length;

            // Load recent recipes
            this.loadRecentRecipes(recipes.slice(0, 6));

            // Load week preview
            this.loadWeekPreview();

        } catch (error) {
            console.error('Error loading dashboard:', error);
            this.showToast('Error loading dashboard', 'error');
        } finally {
            this.showLoading(false);
        }
    }

    loadRecentRecipes(recipes) {
        const grid = document.getElementById('recent-recipes-grid');
        if (!grid) return;

        if (recipes.length === 0) {
            grid.innerHTML = '<p class="text-center">No recipes yet. <a href="#recipes" data-page="recipes">Add your first recipe!</a></p>';
            return;
        }

        grid.innerHTML = recipes.map(recipe => `
            <div class="recipe-card">
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
                        ${recipe.servings ? `<span><i class="fas fa-users"></i> ${recipe.servings}</span>` : ''}
                    </div>
                    <p class="recipe-description">${recipe.description || 'No description available'}</p>
                    <div class="recipe-actions">
                        <button class="btn secondary-btn" onclick="window.recipes?.viewRecipe(${recipe.id})">
                            <i class="fas fa-eye"></i> View
                        </button>
                    </div>
                </div>
            </div>
        `).join('');

        // Add click handlers for navigation links
        grid.querySelectorAll('[data-page]').forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                this.navigateToPage(link.dataset.page);
            });
        });
    }

    async loadWeekPreview() {
        try {
            const startDate = this.getWeekStart(new Date());
            const endDate = new Date(startDate);
            endDate.setDate(endDate.getDate() + 6);

            const mealPlans = await this.fetchAPI(`/api/meal-plans?start_date=${this.formatDate(startDate)}&end_date=${this.formatDate(endDate)}`);
            
            const preview = document.getElementById('meal-week-preview');
            if (!preview) return;

            if (mealPlans.length === 0) {
                preview.innerHTML = '<p class="text-center">No meals planned for this week. <a href="#meal-planning" data-page="meal-planning">Start planning!</a></p>';
                return;
            }

            // Group meals by date
            const mealsByDate = {};
            mealPlans.forEach(meal => {
                if (!mealsByDate[meal.date]) {
                    mealsByDate[meal.date] = [];
                }
                mealsByDate[meal.date].push(meal);
            });

            const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
            let previewHTML = '<div class="week-preview-grid">';

            for (let i = 0; i < 7; i++) {
                const date = new Date(startDate);
                date.setDate(date.getDate() + i);
                const dateStr = this.formatDate(date);
                const dayMeals = mealsByDate[dateStr] || [];

                previewHTML += `
                    <div class="day-preview">
                        <h4>${days[date.getDay()]}</h4>
                        <div class="day-meals">
                            ${dayMeals.length > 0 ? 
                                dayMeals.map(meal => `
                                    <div class="meal-preview">
                                        <span class="meal-category">${meal.meal_category_name}</span>
                                        <span class="meal-recipe">${meal.recipe_name}</span>
                                    </div>
                                `).join('') :
                                '<span class="no-meals">No meals planned</span>'
                            }
                        </div>
                    </div>
                `;
            }

            previewHTML += '</div>';
            preview.innerHTML = previewHTML;

            // Add click handlers for navigation links
            preview.querySelectorAll('[data-page]').forEach(link => {
                link.addEventListener('click', (e) => {
                    e.preventDefault();
                    this.navigateToPage(link.dataset.page);
                });
            });

        } catch (error) {
            console.error('Error loading week preview:', error);
        }
    }

    updatePeopleCount() {
        document.getElementById('people-count').textContent = this.peopleCount;
        // Trigger portion adjustment if on meal planning page
        if (this.currentPage === 'meal-planning') {
            window.mealPlanning?.updatePortions();
        }
    }

    updateWeekDisplay() {
        const weekStart = this.getWeekStart(this.currentWeek);
        const weekEnd = new Date(weekStart);
        weekEnd.setDate(weekEnd.getDate() + 6);

        const currentWeekElement = document.getElementById('current-week');
        if (currentWeekElement) {
            const startStr = weekStart.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
            const endStr = weekEnd.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
            currentWeekElement.textContent = `${startStr} - ${endStr}`;
        }
    }

    async performGlobalSearch(query) {
        if (!query.trim()) {
            document.getElementById('search-results').innerHTML = '';
            return;
        }

        try {
            const [recipes, mealPlans, shoppingLists] = await Promise.all([
                this.fetchAPI(`/api/recipes?search=${encodeURIComponent(query)}`),
                this.fetchAPI('/api/meal-plans'),
                this.fetchAPI('/api/shopping-lists')
            ]);

            const results = [];

            // Add recipe results
            recipes.forEach(recipe => {
                results.push({
                    type: 'recipe',
                    title: recipe.name,
                    description: recipe.description || 'No description',
                    action: () => {
                        this.navigateToPage('recipes');
                        window.recipes?.viewRecipe(recipe.id);
                    }
                });
            });

            // Add meal plan results
            mealPlans.filter(meal => 
                meal.recipe_name.toLowerCase().includes(query.toLowerCase()) ||
                meal.meal_category_name.toLowerCase().includes(query.toLowerCase())
            ).forEach(meal => {
                results.push({
                    type: 'meal',
                    title: `${meal.meal_category_name}: ${meal.recipe_name}`,
                    description: `Planned for ${meal.date}`,
                    action: () => {
                        this.navigateToPage('meal-planning');
                    }
                });
            });

            // Add shopping list results
            shoppingLists.filter(list => 
                list.name.toLowerCase().includes(query.toLowerCase())
            ).forEach(list => {
                results.push({
                    type: 'shopping',
                    title: list.name,
                    description: `${list.items.length} items`,
                    action: () => {
                        this.navigateToPage('shopping-lists');
                    }
                });
            });

            this.displaySearchResults(results);

        } catch (error) {
            console.error('Error performing search:', error);
        }
    }

    displaySearchResults(results) {
        const resultsContainer = document.getElementById('search-results');
        if (!resultsContainer) return;

        if (results.length === 0) {
            resultsContainer.innerHTML = '<div class="search-no-results">No results found</div>';
            return;
        }

        resultsContainer.innerHTML = results.map(result => `
            <div class="search-result-item" data-type="${result.type}">
                <div class="search-result-icon">
                    <i class="fas fa-${this.getSearchIcon(result.type)}"></i>
                </div>
                <div class="search-result-content">
                    <h4>${result.title}</h4>
                    <p>${result.description}</p>
                </div>
            </div>
        `).join('');

        // Add click handlers
        resultsContainer.querySelectorAll('.search-result-item').forEach((item, index) => {
            item.addEventListener('click', () => {
                results[index].action();
                document.getElementById('search-overlay').classList.remove('active');
            });
        });
    }

    getSearchIcon(type) {
        switch (type) {
            case 'recipe': return 'book';
            case 'meal': return 'calendar-alt';
            case 'shopping': return 'shopping-cart';
            default: return 'search';
        }
    }

    // Utility methods
    async fetchAPI(url, options = {}) {
        const response = await fetch(url, {
            headers: {
                'Content-Type': 'application/json',
                ...options.headers
            },
            ...options
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        return await response.json();
    }

    showLoading(show = true) {
        const spinner = document.getElementById('loading-spinner');
        if (spinner) {
            spinner.classList.toggle('active', show);
        }
    }

    showToast(message, type = 'success', duration = 3000) {
        const container = document.getElementById('toast-container');
        if (!container) return;

        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        
        const icon = type === 'success' ? 'check-circle' : 
                    type === 'error' ? 'exclamation-circle' : 
                    'exclamation-triangle';

        toast.innerHTML = `
            <i class="fas fa-${icon} toast-icon"></i>
            <span class="toast-message">${message}</span>
            <button class="toast-close">
                <i class="fas fa-times"></i>
            </button>
        `;

        container.appendChild(toast);

        // Add close functionality
        toast.querySelector('.toast-close').addEventListener('click', () => {
            toast.remove();
        });

        // Auto remove
        setTimeout(() => {
            if (toast.parentNode) {
                toast.remove();
            }
        }, duration);
    }

    openModal(modalId) {
        const modal = document.getElementById(modalId);
        if (modal) {
            modal.classList.add('active');
            document.body.style.overflow = 'hidden';
        }
    }

    closeModal(modalId) {
        const modal = document.getElementById(modalId);
        if (modal) {
            modal.classList.remove('active');
            document.body.style.overflow = '';
        }
    }

    formatDate(date) {
        return date.toISOString().split('T')[0];
    }

    getWeekStart(date) {
        const d = new Date(date);
        const day = d.getDay();
        const diff = d.getDate() - day;
        return new Date(d.setDate(diff));
    }

    formatTime(minutes) {
        if (!minutes) return '';
        const hours = Math.floor(minutes / 60);
        const mins = minutes % 60;
        if (hours > 0) {
            return `${hours}h ${mins}m`;
        }
        return `${mins}m`;
    }

    capitalizeFirst(str) {
        return str.charAt(0).toUpperCase() + str.slice(1);
    }
}

// Initialize the application
document.addEventListener('DOMContentLoaded', () => {
    window.recipeManager = new RecipeManager();
});

// Add some CSS for search results and week preview
const additionalCSS = `
.search-result-item {
    display: flex;
    align-items: center;
    gap: var(--spacing-md);
    padding: var(--spacing-md);
    border-bottom: 1px solid var(--border-color);
    cursor: pointer;
    transition: background-color var(--transition-fast);
}

.search-result-item:hover {
    background-color: var(--background-color);
}

.search-result-item:last-child {
    border-bottom: none;
}

.search-result-icon {
    width: 40px;
    height: 40px;
    border-radius: 50%;
    background: var(--primary-color);
    color: var(--text-light);
    display: flex;
    align-items: center;
    justify-content: center;
}

.search-result-content h4 {
    margin-bottom: var(--spacing-xs);
    font-size: 1rem;
}

.search-result-content p {
    margin-bottom: 0;
    color: var(--text-secondary);
    font-size: 0.875rem;
}

.search-no-results {
    padding: var(--spacing-xl);
    text-align: center;
    color: var(--text-secondary);
}

.week-preview-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
    gap: var(--spacing-md);
}

.day-preview {
    background: var(--surface-color);
    border-radius: var(--radius-md);
    padding: var(--spacing-md);
    box-shadow: var(--shadow-light);
}

.day-preview h4 {
    margin-bottom: var(--spacing-sm);
    color: var(--primary-color);
    font-size: 0.875rem;
    text-align: center;
}

.day-meals {
    display: flex;
    flex-direction: column;
    gap: var(--spacing-xs);
}

.meal-preview {
    display: flex;
    flex-direction: column;
    gap: var(--spacing-xs);
    padding: var(--spacing-xs);
    background: var(--background-color);
    border-radius: var(--radius-sm);
    font-size: 0.75rem;
}

.meal-category {
    font-weight: 600;
    color: var(--primary-color);
}

.meal-recipe {
    color: var(--text-secondary);
}

.no-meals {
    color: var(--text-secondary);
    font-style: italic;
    font-size: 0.75rem;
    text-align: center;
    padding: var(--spacing-sm);
}

.text-center {
    text-align: center;
    color: var(--text-secondary);
    padding: var(--spacing-xl);
}

.text-center a {
    color: var(--primary-color);
    text-decoration: none;
    font-weight: 500;
}

.text-center a:hover {
    text-decoration: underline;
}
`;

// Inject additional CSS
const style = document.createElement('style');
style.textContent = additionalCSS;
document.head.appendChild(style);

