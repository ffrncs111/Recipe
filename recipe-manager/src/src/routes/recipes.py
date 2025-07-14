from flask import Blueprint, request, jsonify
from src.models.recipe import db, Recipe, Ingredient, Category
import os
from werkzeug.utils import secure_filename

recipes_bp = Blueprint('recipes', __name__)

ALLOWED_EXTENSIONS = {'png', 'jpg', 'jpeg', 'gif', 'webp'}

def allowed_file(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

@recipes_bp.route('/recipes', methods=['GET'])
def get_recipes():
    """Get all recipes with optional filtering"""
    category_id = request.args.get('category_id', type=int)
    search = request.args.get('search', '')
    
    query = Recipe.query
    
    if category_id:
        query = query.filter_by(category_id=category_id)
    
    if search:
        query = query.filter(Recipe.name.contains(search))
    
    recipes = query.order_by(Recipe.created_at.desc()).all()
    return jsonify([recipe.to_dict() for recipe in recipes])

@recipes_bp.route('/recipes/<int:recipe_id>', methods=['GET'])
def get_recipe(recipe_id):
    """Get a specific recipe by ID"""
    recipe = Recipe.query.get_or_404(recipe_id)
    return jsonify(recipe.to_dict())

@recipes_bp.route('/recipes', methods=['POST'])
def create_recipe():
    """Create a new recipe"""
    data = request.get_json()
    
    if not data or 'name' not in data:
        return jsonify({'error': 'Recipe name is required'}), 400
    
    # Validate category if provided
    if 'category_id' in data and data['category_id']:
        category = Category.query.filter_by(id=data['category_id'], type='recipe').first()
        if not category:
            return jsonify({'error': 'Invalid recipe category'}), 400
    
    recipe = Recipe(
        name=data['name'],
        description=data.get('description', ''),
        instructions=data.get('instructions', ''),
        prep_time=data.get('prep_time'),
        cook_time=data.get('cook_time'),
        servings=data.get('servings', 4),
        category_id=data.get('category_id')
    )
    
    try:
        db.session.add(recipe)
        db.session.flush()  # Get the recipe ID
        
        # Add ingredients if provided
        if 'ingredients' in data and data['ingredients']:
            for ingredient_data in data['ingredients']:
                if 'name' in ingredient_data and 'quantity' in ingredient_data and 'unit' in ingredient_data:
                    ingredient = Ingredient(
                        recipe_id=recipe.id,
                        name=ingredient_data['name'],
                        quantity=float(ingredient_data['quantity']),
                        unit=ingredient_data['unit'],
                        notes=ingredient_data.get('notes', '')
                    )
                    db.session.add(ingredient)
        
        db.session.commit()
        return jsonify(recipe.to_dict()), 201
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': 'Failed to create recipe'}), 500

@recipes_bp.route('/recipes/<int:recipe_id>', methods=['PUT'])
def update_recipe(recipe_id):
    """Update an existing recipe"""
    recipe = Recipe.query.get_or_404(recipe_id)
    data = request.get_json()
    
    if not data:
        return jsonify({'error': 'No data provided'}), 400
    
    # Update recipe fields
    if 'name' in data:
        recipe.name = data['name']
    if 'description' in data:
        recipe.description = data['description']
    if 'instructions' in data:
        recipe.instructions = data['instructions']
    if 'prep_time' in data:
        recipe.prep_time = data['prep_time']
    if 'cook_time' in data:
        recipe.cook_time = data['cook_time']
    if 'servings' in data:
        recipe.servings = data['servings']
    if 'category_id' in data:
        if data['category_id']:
            category = Category.query.filter_by(id=data['category_id'], type='recipe').first()
            if not category:
                return jsonify({'error': 'Invalid recipe category'}), 400
        recipe.category_id = data['category_id']
    
    # Update ingredients if provided
    if 'ingredients' in data:
        # Remove existing ingredients
        Ingredient.query.filter_by(recipe_id=recipe_id).delete()
        
        # Add new ingredients
        for ingredient_data in data['ingredients']:
            if 'name' in ingredient_data and 'quantity' in ingredient_data and 'unit' in ingredient_data:
                ingredient = Ingredient(
                    recipe_id=recipe_id,
                    name=ingredient_data['name'],
                    quantity=float(ingredient_data['quantity']),
                    unit=ingredient_data['unit'],
                    notes=ingredient_data.get('notes', '')
                )
                db.session.add(ingredient)
    
    try:
        db.session.commit()
        return jsonify(recipe.to_dict())
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': 'Failed to update recipe'}), 500

@recipes_bp.route('/recipes/<int:recipe_id>', methods=['DELETE'])
def delete_recipe(recipe_id):
    """Delete a recipe"""
    recipe = Recipe.query.get_or_404(recipe_id)
    
    try:
        # Delete associated image file if exists
        if recipe.image_path and os.path.exists(recipe.image_path):
            os.remove(recipe.image_path)
        
        db.session.delete(recipe)
        db.session.commit()
        return jsonify({'message': 'Recipe deleted successfully'})
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': 'Failed to delete recipe'}), 500

@recipes_bp.route('/recipes/<int:recipe_id>/image', methods=['POST'])
def upload_recipe_image(recipe_id):
    """Upload an image for a recipe"""
    recipe = Recipe.query.get_or_404(recipe_id)
    
    if 'image' not in request.files:
        return jsonify({'error': 'No image file provided'}), 400
    
    file = request.files['image']
    if file.filename == '':
        return jsonify({'error': 'No file selected'}), 400
    
    if file and allowed_file(file.filename):
        filename = secure_filename(f"recipe_{recipe_id}_{file.filename}")
        
        # Create images directory if it doesn't exist
        images_dir = os.path.join(os.path.dirname(__file__), '..', 'static', 'images')
        os.makedirs(images_dir, exist_ok=True)
        
        file_path = os.path.join(images_dir, filename)
        
        try:
            # Remove old image if exists
            if recipe.image_path and os.path.exists(recipe.image_path):
                os.remove(recipe.image_path)
            
            file.save(file_path)
            recipe.image_path = f'/static/images/{filename}'
            db.session.commit()
            
            return jsonify({
                'message': 'Image uploaded successfully',
                'image_path': recipe.image_path
            })
        except Exception as e:
            db.session.rollback()
            return jsonify({'error': 'Failed to upload image'}), 500
    
    return jsonify({'error': 'Invalid file type'}), 400

@recipes_bp.route('/recipes/adjust-portions', methods=['POST'])
def adjust_portions():
    """Calculate adjusted ingredient portions for a recipe"""
    data = request.get_json()
    
    if not data or 'recipe_id' not in data or 'people_count' not in data:
        return jsonify({'error': 'Recipe ID and people count are required'}), 400
    
    recipe = Recipe.query.get_or_404(data['recipe_id'])
    people_count = int(data['people_count'])
    
    if people_count <= 0:
        return jsonify({'error': 'People count must be positive'}), 400
    
    # Calculate scaling factor
    scaling_factor = people_count / recipe.servings
    
    # Adjust ingredient quantities
    adjusted_ingredients = []
    for ingredient in recipe.ingredients:
        adjusted_quantity = ingredient.quantity * scaling_factor
        adjusted_ingredients.append({
            'id': ingredient.id,
            'name': ingredient.name,
            'original_quantity': ingredient.quantity,
            'adjusted_quantity': round(adjusted_quantity, 2),
            'unit': ingredient.unit,
            'notes': ingredient.notes
        })
    
    return jsonify({
        'recipe_id': recipe.id,
        'recipe_name': recipe.name,
        'original_servings': recipe.servings,
        'adjusted_servings': people_count,
        'scaling_factor': round(scaling_factor, 2),
        'adjusted_ingredients': adjusted_ingredients
    })

