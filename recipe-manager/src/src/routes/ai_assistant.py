from flask import Blueprint, request, jsonify
from src.models.recipe import db, Recipe, Ingredient, Category
import random

ai_assistant_bp = Blueprint('ai_assistant', __name__)

# Sample recipe suggestions and cooking tips
RECIPE_SUGGESTIONS = {
    'chicken': [
        "Grilled Chicken with Herbs",
        "Chicken Stir Fry",
        "Creamy Chicken Pasta",
        "Chicken Curry",
        "Lemon Garlic Chicken"
    ],
    'beef': [
        "Beef Stir Fry",
        "Beef Tacos",
        "Beef Stew",
        "Grilled Steak",
        "Beef and Broccoli"
    ],
    'rice': [
        "Fried Rice",
        "Rice Pilaf",
        "Risotto",
        "Rice Bowl",
        "Spanish Rice"
    ],
    'pasta': [
        "Spaghetti Carbonara",
        "Penne Arrabbiata",
        "Fettuccine Alfredo",
        "Lasagna",
        "Pasta Salad"
    ],
    'vegetables': [
        "Roasted Vegetables",
        "Vegetable Stir Fry",
        "Vegetable Soup",
        "Grilled Vegetables",
        "Vegetable Curry"
    ]
}

COOKING_TIPS = [
    "Always preheat your oven before baking for even cooking.",
    "Let meat rest for 5-10 minutes after cooking to retain juices.",
    "Taste your food as you cook and adjust seasoning accordingly.",
    "Use a meat thermometer to ensure proper cooking temperatures.",
    "Mise en place - prepare all ingredients before you start cooking.",
    "Don't overcrowd the pan when searing meat or vegetables.",
    "Season pasta water generously with salt for better flavor.",
    "Let your pan get hot before adding oil to prevent sticking.",
    "Fresh herbs should be added at the end of cooking to preserve flavor.",
    "When in doubt, cook low and slow for tender, flavorful results."
]

SUBSTITUTIONS = {
    'butter': ['margarine', 'coconut oil', 'vegetable oil'],
    'milk': ['almond milk', 'soy milk', 'coconut milk'],
    'eggs': ['flax eggs', 'applesauce', 'banana'],
    'flour': ['almond flour', 'coconut flour', 'oat flour'],
    'sugar': ['honey', 'maple syrup', 'stevia'],
    'onion': ['shallots', 'leeks', 'onion powder'],
    'garlic': ['garlic powder', 'shallots', 'ginger'],
    'lemon juice': ['lime juice', 'vinegar', 'white wine'],
    'heavy cream': ['coconut cream', 'cashew cream', 'milk + butter'],
    'breadcrumbs': ['crushed crackers', 'oats', 'panko']
}

@ai_assistant_bp.route('/ai/recipe-suggestions', methods=['POST'])
def get_recipe_suggestions():
    """Get recipe suggestions based on available ingredients"""
    data = request.get_json()
    
    if not data or 'ingredients' not in data:
        return jsonify({'error': 'Ingredients list is required'}), 400
    
    ingredients = [ingredient.lower().strip() for ingredient in data['ingredients']]
    suggestions = []
    
    # Find matching recipes from database
    db_recipes = []
    for ingredient in ingredients:
        recipes = Recipe.query.join(Ingredient).filter(
            Ingredient.name.ilike(f'%{ingredient}%')
        ).distinct().limit(3).all()
        db_recipes.extend(recipes)
    
    # Remove duplicates and add to suggestions
    seen_recipes = set()
    for recipe in db_recipes:
        if recipe.id not in seen_recipes:
            suggestions.append({
                'type': 'existing_recipe',
                'id': recipe.id,
                'name': recipe.name,
                'description': recipe.description,
                'prep_time': recipe.prep_time,
                'cook_time': recipe.cook_time,
                'servings': recipe.servings
            })
            seen_recipes.add(recipe.id)
    
    # Add general suggestions based on ingredients
    for ingredient in ingredients:
        if ingredient in RECIPE_SUGGESTIONS:
            for suggestion in RECIPE_SUGGESTIONS[ingredient][:2]:  # Limit to 2 per ingredient
                suggestions.append({
                    'type': 'suggestion',
                    'name': suggestion,
                    'description': f"A delicious recipe featuring {ingredient}",
                    'main_ingredient': ingredient
                })
    
    # If no specific matches, provide general suggestions
    if not suggestions:
        general_suggestions = [
            "Mixed Vegetable Stir Fry",
            "One-Pot Pasta",
            "Simple Soup",
            "Quick Salad",
            "Scrambled Eggs"
        ]
        for suggestion in general_suggestions[:3]:
            suggestions.append({
                'type': 'general',
                'name': suggestion,
                'description': "A versatile recipe that can work with many ingredients"
            })
    
    return jsonify({
        'ingredients': ingredients,
        'suggestions': suggestions[:8],  # Limit to 8 suggestions
        'message': f"Found {len(suggestions)} recipe suggestions based on your ingredients!"
    })

@ai_assistant_bp.route('/ai/ingredient-substitutions', methods=['POST'])
def get_ingredient_substitutions():
    """Get ingredient substitution suggestions"""
    data = request.get_json()
    
    if not data or 'ingredient' not in data:
        return jsonify({'error': 'Ingredient is required'}), 400
    
    ingredient = data['ingredient'].lower().strip()
    substitutions = []
    
    # Check for exact matches
    if ingredient in SUBSTITUTIONS:
        substitutions = SUBSTITUTIONS[ingredient]
    else:
        # Check for partial matches
        for key, subs in SUBSTITUTIONS.items():
            if key in ingredient or ingredient in key:
                substitutions = subs
                break
    
    if not substitutions:
        substitutions = ["No specific substitutions found. Try searching online for alternatives."]
    
    return jsonify({
        'ingredient': data['ingredient'],
        'substitutions': substitutions,
        'message': f"Here are some substitutions for {data['ingredient']}:"
    })

@ai_assistant_bp.route('/ai/cooking-tips', methods=['POST'])
def get_cooking_tips():
    """Get cooking tips and techniques"""
    data = request.get_json()
    
    # Get random cooking tips
    num_tips = data.get('count', 3) if data else 3
    num_tips = min(max(num_tips, 1), 5)  # Limit between 1 and 5
    
    selected_tips = random.sample(COOKING_TIPS, min(num_tips, len(COOKING_TIPS)))
    
    return jsonify({
        'tips': selected_tips,
        'message': f"Here are {len(selected_tips)} cooking tips for you!"
    })

@ai_assistant_bp.route('/ai/generate-recipe', methods=['POST'])
def generate_recipe():
    """Generate a new recipe based on parameters"""
    data = request.get_json()
    
    if not data or 'name' not in data:
        return jsonify({'error': 'Recipe name is required'}), 400
    
    recipe_name = data['name']
    cuisine = data.get('cuisine', 'international')
    difficulty = data.get('difficulty', 'medium')
    prep_time = data.get('prep_time', 30)
    cook_time = data.get('cook_time', 30)
    servings = data.get('servings', 4)
    
    # Generate a basic recipe structure
    generated_recipe = {
        'name': recipe_name,
        'description': f"A delicious {cuisine} recipe that's perfect for any occasion.",
        'prep_time': prep_time,
        'cook_time': cook_time,
        'servings': servings,
        'difficulty': difficulty,
        'instructions': [
            "Prepare all ingredients according to the ingredient list.",
            "Heat oil in a large pan over medium heat.",
            "Add main ingredients and cook according to recipe requirements.",
            "Season with salt, pepper, and desired spices.",
            "Cook until ingredients are tender and flavors are well combined.",
            "Taste and adjust seasoning as needed.",
            "Serve hot and enjoy!"
        ],
        'ingredients': [
            {'name': 'Main ingredient', 'quantity': 500, 'unit': 'grams', 'notes': 'Choose your preferred protein or main component'},
            {'name': 'Onion', 'quantity': 1, 'unit': 'piece', 'notes': 'Medium sized, diced'},
            {'name': 'Garlic', 'quantity': 2, 'unit': 'cloves', 'notes': 'Minced'},
            {'name': 'Olive oil', 'quantity': 2, 'unit': 'tablespoons', 'notes': 'For cooking'},
            {'name': 'Salt', 'quantity': 1, 'unit': 'teaspoon', 'notes': 'To taste'},
            {'name': 'Black pepper', 'quantity': 0.5, 'unit': 'teaspoon', 'notes': 'To taste'}
        ],
        'tips': [
            "This is a template recipe. Customize the ingredients and instructions based on your preferences.",
            "Feel free to add vegetables, herbs, or spices to enhance the flavor.",
            "Cooking times may vary depending on your specific ingredients and cooking method."
        ]
    }
    
    return jsonify({
        'recipe': generated_recipe,
        'message': f"Generated a basic recipe template for '{recipe_name}'. Customize it to your liking!",
        'note': "This is an AI-generated template. Please review and modify the ingredients and instructions as needed."
    })

@ai_assistant_bp.route('/ai/chat', methods=['POST'])
def chat_with_assistant():
    """General chat interface for recipe assistance"""
    data = request.get_json()
    
    if not data or 'message' not in data:
        return jsonify({'error': 'Message is required'}), 400
    
    user_message = data['message'].lower().strip()
    
    # Simple keyword-based responses
    if any(word in user_message for word in ['recipe', 'cook', 'make']):
        if any(word in user_message for word in ['chicken', 'beef', 'pork', 'fish']):
            response = "I'd be happy to help you with meat recipes! Try using the recipe suggestions feature with your available ingredients."
        elif any(word in user_message for word in ['vegetarian', 'vegan', 'vegetables']):
            response = "Vegetarian cooking is wonderful! I can suggest some great plant-based recipes. What vegetables do you have available?"
        else:
            response = "I love helping with recipes! What ingredients do you have, or what type of cuisine are you interested in?"
    
    elif any(word in user_message for word in ['substitute', 'replace', 'alternative']):
        response = "I can help you find ingredient substitutions! Use the substitution feature or tell me which ingredient you need to replace."
    
    elif any(word in user_message for word in ['tip', 'advice', 'help']):
        response = "I have lots of cooking tips to share! Would you like general cooking advice or help with a specific technique?"
    
    elif any(word in user_message for word in ['shopping', 'grocery', 'buy']):
        response = "I can help you create shopping lists from your meal plans! Plan your meals first, then generate a shopping list with all the ingredients you need."
    
    elif any(word in user_message for word in ['meal', 'plan', 'week']):
        response = "Meal planning is a great way to stay organized! You can plan your meals for the week and I'll help you calculate portions and create shopping lists."
    
    else:
        response = "Hello! I'm your recipe assistant. I can help you with recipe suggestions, ingredient substitutions, cooking tips, meal planning, and shopping lists. What would you like to know?"
    
    return jsonify({
        'response': response,
        'suggestions': [
            "Get recipe suggestions",
            "Find ingredient substitutions", 
            "Get cooking tips",
            "Generate shopping list",
            "Plan meals for the week"
        ]
    })

