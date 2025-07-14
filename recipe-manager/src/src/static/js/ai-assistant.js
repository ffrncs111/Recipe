// AI Assistant functionality
class AIAssistantManager {
    constructor() {
        this.chatHistory = [];
        this.isTyping = false;
        this.init();
    }

    init() {
        this.setupEventListeners();
        this.loadWelcomeMessage();
    }

    setupEventListeners() {
        // Chat form submission
        const chatForm = document.getElementById('ai-chat-form');
        chatForm?.addEventListener('submit', (e) => {
            e.preventDefault();
            this.sendMessage();
        });

        // Chat input
        const chatInput = document.getElementById('ai-chat-input');
        chatInput?.addEventListener('keypress', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                this.sendMessage();
            }
        });

        // Quick action buttons
        document.querySelectorAll('.quick-action-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const action = btn.dataset.action;
                this.handleQuickAction(action);
            });
        });

        // Clear chat button
        const clearChatBtn = document.getElementById('clear-chat-btn');
        clearChatBtn?.addEventListener('click', () => {
            this.clearChat();
        });
    }

    loadWelcomeMessage() {
        const welcomeMessage = {
            type: 'assistant',
            content: `Hello! I'm your AI recipe assistant. I can help you with:

• Recipe suggestions based on your ingredients
• Ingredient substitutions and alternatives
• Cooking tips and techniques
• Meal planning advice
• Nutritional information
• Cooking time and temperature guidance

What would you like to know?`,
            timestamp: new Date()
        };

        this.addMessageToChat(welcomeMessage);
    }

    async sendMessage() {
        const input = document.getElementById('ai-chat-input');
        const message = input.value.trim();
        
        if (!message) return;

        // Add user message to chat
        const userMessage = {
            type: 'user',
            content: message,
            timestamp: new Date()
        };

        this.addMessageToChat(userMessage);
        this.chatHistory.push(userMessage);

        // Clear input
        input.value = '';

        // Show typing indicator
        this.showTypingIndicator();

        try {
            // Send message to AI assistant API
            const response = await window.recipeManager.fetchAPI('/api/ai-assistant/chat', {
                method: 'POST',
                body: JSON.stringify({
                    message: message,
                    chat_history: this.chatHistory.slice(-10) // Send last 10 messages for context
                })
            });

            // Hide typing indicator
            this.hideTypingIndicator();

            // Add assistant response to chat
            const assistantMessage = {
                type: 'assistant',
                content: response.response,
                timestamp: new Date()
            };

            this.addMessageToChat(assistantMessage);
            this.chatHistory.push(assistantMessage);

            // Handle any suggested actions
            if (response.suggested_actions) {
                this.handleSuggestedActions(response.suggested_actions);
            }

        } catch (error) {
            console.error('Error sending message to AI assistant:', error);
            this.hideTypingIndicator();
            
            const errorMessage = {
                type: 'assistant',
                content: 'I apologize, but I\'m having trouble responding right now. Please try again in a moment.',
                timestamp: new Date()
            };

            this.addMessageToChat(errorMessage);
        }
    }

    addMessageToChat(message) {
        const chatMessages = document.getElementById('ai-chat-messages');
        if (!chatMessages) return;

        const messageDiv = document.createElement('div');
        messageDiv.className = `chat-message ${message.type}-message`;
        
        const timeString = message.timestamp.toLocaleTimeString('en-US', { 
            hour: '2-digit', 
            minute: '2-digit' 
        });

        messageDiv.innerHTML = `
            <div class="message-avatar">
                <i class="fas fa-${message.type === 'user' ? 'user' : 'robot'}"></i>
            </div>
            <div class="message-content">
                <div class="message-text">${this.formatMessageContent(message.content)}</div>
                <div class="message-time">${timeString}</div>
            </div>
        `;

        chatMessages.appendChild(messageDiv);
        
        // Scroll to bottom
        chatMessages.scrollTop = chatMessages.scrollHeight;
    }

    formatMessageContent(content) {
        // Convert line breaks to <br> tags
        content = content.replace(/\n/g, '<br>');
        
        // Convert bullet points to proper list items
        content = content.replace(/^• (.+)$/gm, '<li>$1</li>');
        
        // Wrap consecutive list items in <ul> tags
        content = content.replace(/(<li>.*<\/li>)/gs, '<ul>$1</ul>');
        
        // Remove duplicate <ul> tags
        content = content.replace(/<\/ul>\s*<ul>/g, '');
        
        return content;
    }

    showTypingIndicator() {
        if (this.isTyping) return;
        
        this.isTyping = true;
        const chatMessages = document.getElementById('ai-chat-messages');
        if (!chatMessages) return;

        const typingDiv = document.createElement('div');
        typingDiv.className = 'chat-message assistant-message typing-indicator';
        typingDiv.id = 'typing-indicator';
        
        typingDiv.innerHTML = `
            <div class="message-avatar">
                <i class="fas fa-robot"></i>
            </div>
            <div class="message-content">
                <div class="typing-animation">
                    <span></span>
                    <span></span>
                    <span></span>
                </div>
            </div>
        `;

        chatMessages.appendChild(typingDiv);
        chatMessages.scrollTop = chatMessages.scrollHeight;
    }

    hideTypingIndicator() {
        this.isTyping = false;
        const typingIndicator = document.getElementById('typing-indicator');
        if (typingIndicator) {
            typingIndicator.remove();
        }
    }

    handleQuickAction(action) {
        const quickMessages = {
            'recipe-suggestions': 'Can you suggest some recipes based on common ingredients?',
            'substitutions': 'What are some common ingredient substitutions I should know?',
            'cooking-tips': 'Can you give me some essential cooking tips?',
            'meal-planning': 'How can I plan my meals more effectively?'
        };

        const message = quickMessages[action];
        if (message) {
            document.getElementById('ai-chat-input').value = message;
            this.sendMessage();
        }
    }

    handleSuggestedActions(actions) {
        // Handle any suggested actions from the AI response
        // For example, if the AI suggests adding a recipe to the meal plan
        actions.forEach(action => {
            switch (action.type) {
                case 'add_to_meal_plan':
                    this.suggestAddToMealPlan(action.recipe_id);
                    break;
                case 'view_recipe':
                    this.suggestViewRecipe(action.recipe_id);
                    break;
                case 'create_shopping_list':
                    this.suggestCreateShoppingList(action.ingredients);
                    break;
            }
        });
    }

    suggestAddToMealPlan(recipeId) {
        const suggestion = document.createElement('div');
        suggestion.className = 'ai-suggestion';
        suggestion.innerHTML = `
            <div class="suggestion-content">
                <i class="fas fa-calendar-plus"></i>
                <span>Would you like to add this recipe to your meal plan?</span>
                <button class="btn primary-btn btn-sm" onclick="window.recipeManager.navigateToPage('meal-planning')">
                    Go to Meal Planning
                </button>
            </div>
        `;

        const chatMessages = document.getElementById('ai-chat-messages');
        chatMessages?.appendChild(suggestion);
        chatMessages.scrollTop = chatMessages.scrollHeight;
    }

    suggestViewRecipe(recipeId) {
        const suggestion = document.createElement('div');
        suggestion.className = 'ai-suggestion';
        suggestion.innerHTML = `
            <div class="suggestion-content">
                <i class="fas fa-eye"></i>
                <span>Would you like to view this recipe?</span>
                <button class="btn primary-btn btn-sm" onclick="window.recipes?.viewRecipe(${recipeId})">
                    View Recipe
                </button>
            </div>
        `;

        const chatMessages = document.getElementById('ai-chat-messages');
        chatMessages?.appendChild(suggestion);
        chatMessages.scrollTop = chatMessages.scrollHeight;
    }

    suggestCreateShoppingList(ingredients) {
        const suggestion = document.createElement('div');
        suggestion.className = 'ai-suggestion';
        suggestion.innerHTML = `
            <div class="suggestion-content">
                <i class="fas fa-shopping-cart"></i>
                <span>Would you like to create a shopping list with these ingredients?</span>
                <button class="btn primary-btn btn-sm" onclick="window.recipeManager.navigateToPage('shopping-lists')">
                    Create Shopping List
                </button>
            </div>
        `;

        const chatMessages = document.getElementById('ai-chat-messages');
        chatMessages?.appendChild(suggestion);
        chatMessages.scrollTop = chatMessages.scrollHeight;
    }

    clearChat() {
        if (!confirm('Are you sure you want to clear the chat history?')) {
            return;
        }

        this.chatHistory = [];
        const chatMessages = document.getElementById('ai-chat-messages');
        if (chatMessages) {
            chatMessages.innerHTML = '';
        }

        // Reload welcome message
        this.loadWelcomeMessage();
        
        window.recipeManager.showToast('Chat history cleared', 'success');
    }

    // Method to ask AI about specific recipes
    async askAboutRecipe(recipeId) {
        try {
            const recipe = await window.recipeManager.fetchAPI(`/api/recipes/${recipeId}`);
            const message = `Can you tell me more about this recipe: ${recipe.name}? Any tips for making it better?`;
            
            document.getElementById('ai-chat-input').value = message;
            this.sendMessage();
            
            // Navigate to AI assistant page
            window.recipeManager.navigateToPage('ai-assistant');
            
        } catch (error) {
            console.error('Error asking about recipe:', error);
        }
    }

    // Method to get ingredient substitutions
    async getSubstitutions(ingredient) {
        const message = `What can I substitute for ${ingredient} in cooking?`;
        document.getElementById('ai-chat-input').value = message;
        this.sendMessage();
    }

    // Method to get cooking tips for a specific technique
    async getCookingTips(technique) {
        const message = `Can you give me tips for ${technique}?`;
        document.getElementById('ai-chat-input').value = message;
        this.sendMessage();
    }
}

// Initialize AI assistant manager
document.addEventListener('DOMContentLoaded', () => {
    window.aiAssistant = new AIAssistantManager();
});

// Add CSS for AI assistant
const aiAssistantCSS = `
.ai-chat-container {
    display: flex;
    flex-direction: column;
    height: 600px;
    background: var(--surface-color);
    border-radius: var(--radius-lg);
    box-shadow: var(--shadow-light);
    overflow: hidden;
}

.ai-chat-header {
    background: var(--primary-color);
    color: var(--text-light);
    padding: var(--spacing-lg);
    display: flex;
    justify-content: space-between;
    align-items: center;
}

.ai-chat-header h3 {
    margin: 0;
    display: flex;
    align-items: center;
    gap: var(--spacing-sm);
}

.ai-chat-messages {
    flex: 1;
    padding: var(--spacing-lg);
    overflow-y: auto;
    display: flex;
    flex-direction: column;
    gap: var(--spacing-md);
    background: var(--background-color);
}

.chat-message {
    display: flex;
    gap: var(--spacing-md);
    max-width: 80%;
}

.user-message {
    align-self: flex-end;
    flex-direction: row-reverse;
}

.assistant-message {
    align-self: flex-start;
}

.message-avatar {
    width: 40px;
    height: 40px;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    color: var(--text-light);
    font-size: 1.125rem;
    flex-shrink: 0;
}

.user-message .message-avatar {
    background: var(--accent-color);
}

.assistant-message .message-avatar {
    background: var(--primary-color);
}

.message-content {
    flex: 1;
    min-width: 0;
}

.message-text {
    background: var(--surface-color);
    padding: var(--spacing-md);
    border-radius: var(--radius-md);
    line-height: 1.6;
    word-wrap: break-word;
}

.user-message .message-text {
    background: var(--accent-color);
    color: var(--text-light);
}

.message-text ul {
    margin: var(--spacing-sm) 0;
    padding-left: var(--spacing-lg);
}

.message-text li {
    margin-bottom: var(--spacing-xs);
}

.message-time {
    font-size: 0.75rem;
    color: var(--text-secondary);
    margin-top: var(--spacing-xs);
    text-align: right;
}

.user-message .message-time {
    text-align: left;
}

.typing-indicator .message-text {
    padding: var(--spacing-md);
}

.typing-animation {
    display: flex;
    gap: var(--spacing-xs);
    align-items: center;
}

.typing-animation span {
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background: var(--text-secondary);
    animation: typing 1.4s infinite ease-in-out;
}

.typing-animation span:nth-child(1) {
    animation-delay: -0.32s;
}

.typing-animation span:nth-child(2) {
    animation-delay: -0.16s;
}

@keyframes typing {
    0%, 80%, 100% {
        transform: scale(0.8);
        opacity: 0.5;
    }
    40% {
        transform: scale(1);
        opacity: 1;
    }
}

.ai-chat-input-container {
    padding: var(--spacing-lg);
    background: var(--surface-color);
    border-top: 1px solid var(--border-color);
}

.ai-chat-form {
    display: flex;
    gap: var(--spacing-md);
    align-items: flex-end;
}

.ai-chat-input {
    flex: 1;
    min-height: 44px;
    max-height: 120px;
    resize: none;
    border: 2px solid var(--border-color);
    border-radius: var(--radius-md);
    padding: var(--spacing-md);
    font-family: inherit;
    font-size: 1rem;
    line-height: 1.4;
    transition: border-color var(--transition-fast);
}

.ai-chat-input:focus {
    outline: none;
    border-color: var(--primary-color);
}

.ai-chat-send-btn {
    width: 44px;
    height: 44px;
    border: none;
    border-radius: var(--radius-md);
    background: var(--primary-color);
    color: var(--text-light);
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: all var(--transition-fast);
    flex-shrink: 0;
}

.ai-chat-send-btn:hover {
    background: #1B5E20;
    transform: scale(1.05);
}

.ai-chat-send-btn:disabled {
    background: var(--text-secondary);
    cursor: not-allowed;
    transform: none;
}

.quick-actions {
    display: flex;
    gap: var(--spacing-sm);
    margin-bottom: var(--spacing-lg);
    flex-wrap: wrap;
}

.quick-action-btn {
    padding: var(--spacing-sm) var(--spacing-md);
    border: 2px solid var(--primary-color);
    background: transparent;
    color: var(--primary-color);
    border-radius: var(--radius-md);
    cursor: pointer;
    font-size: 0.875rem;
    transition: all var(--transition-fast);
}

.quick-action-btn:hover {
    background: var(--primary-color);
    color: var(--text-light);
}

.ai-suggestion {
    background: rgba(46, 125, 50, 0.1);
    border: 1px solid var(--primary-color);
    border-radius: var(--radius-md);
    padding: var(--spacing-md);
    margin: var(--spacing-md) 0;
}

.suggestion-content {
    display: flex;
    align-items: center;
    gap: var(--spacing-md);
    flex-wrap: wrap;
}

.suggestion-content i {
    color: var(--primary-color);
    font-size: 1.125rem;
}

.suggestion-content span {
    flex: 1;
    min-width: 200px;
}

.btn-sm {
    padding: var(--spacing-sm) var(--spacing-md);
    font-size: 0.875rem;
}

.clear-chat-btn {
    background: transparent;
    border: 1px solid rgba(255, 255, 255, 0.3);
    color: var(--text-light);
    padding: var(--spacing-sm) var(--spacing-md);
    border-radius: var(--radius-sm);
    cursor: pointer;
    font-size: 0.875rem;
    transition: all var(--transition-fast);
}

.clear-chat-btn:hover {
    background: rgba(255, 255, 255, 0.1);
}

/* Responsive Design */
@media (max-width: 768px) {
    .ai-chat-container {
        height: 500px;
    }
    
    .chat-message {
        max-width: 90%;
    }
    
    .ai-chat-form {
        flex-direction: column;
        gap: var(--spacing-sm);
    }
    
    .ai-chat-send-btn {
        align-self: flex-end;
    }
    
    .quick-actions {
        flex-direction: column;
    }
    
    .quick-action-btn {
        text-align: center;
    }
    
    .suggestion-content {
        flex-direction: column;
        text-align: center;
        gap: var(--spacing-sm);
    }
    
    .suggestion-content span {
        min-width: auto;
    }
}

/* Scrollbar styling for chat messages */
.ai-chat-messages::-webkit-scrollbar {
    width: 6px;
}

.ai-chat-messages::-webkit-scrollbar-track {
    background: var(--background-color);
}

.ai-chat-messages::-webkit-scrollbar-thumb {
    background: var(--border-color);
    border-radius: 3px;
}

.ai-chat-messages::-webkit-scrollbar-thumb:hover {
    background: var(--text-secondary);
}
`;

// Inject AI assistant CSS
const aiAssistantStyle = document.createElement('style');
aiAssistantStyle.textContent = aiAssistantCSS;
document.head.appendChild(aiAssistantStyle);

