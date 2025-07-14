from flask import Blueprint, request, jsonify
from src.models.recipe import db, MealPlan, Recipe, Category
from datetime import datetime, timedelta
from sqlalchemy import and_

meal_plans_bp = Blueprint('meal_plans', __name__)

@meal_plans_bp.route('/meal-plans', methods=['GET'])
def get_meal_plans():
    """Get meal plans with optional date filtering"""
    start_date = request.args.get('start_date')
    end_date = request.args.get('end_date')
    
    query = MealPlan.query
    
    if start_date:
        try:
            start_date = datetime.strptime(start_date, '%Y-%m-%d').date()
            query = query.filter(MealPlan.date >= start_date)
        except ValueError:
            return jsonify({'error': 'Invalid start_date format. Use YYYY-MM-DD'}), 400
    
    if end_date:
        try:
            end_date = datetime.strptime(end_date, '%Y-%m-%d').date()
            query = query.filter(MealPlan.date <= end_date)
        except ValueError:
            return jsonify({'error': 'Invalid end_date format. Use YYYY-MM-DD'}), 400
    
    meal_plans = query.order_by(MealPlan.date, MealPlan.meal_category_id).all()
    return jsonify([meal_plan.to_dict() for meal_plan in meal_plans])

@meal_plans_bp.route('/meal-plans/week/<date>', methods=['GET'])
def get_week_meal_plans(date):
    """Get meal plans for a specific week"""
    try:
        target_date = datetime.strptime(date, '%Y-%m-%d').date()
        # Get Monday of the week
        monday = target_date - timedelta(days=target_date.weekday())
        sunday = monday + timedelta(days=6)
        
        meal_plans = MealPlan.query.filter(
            and_(MealPlan.date >= monday, MealPlan.date <= sunday)
        ).order_by(MealPlan.date, MealPlan.meal_category_id).all()
        
        # Group by date and meal category
        week_data = {}
        for meal_plan in meal_plans:
            date_str = meal_plan.date.isoformat()
            if date_str not in week_data:
                week_data[date_str] = {}
            
            category_name = meal_plan.meal_category.name if meal_plan.meal_category else 'Uncategorized'
            week_data[date_str][category_name] = meal_plan.to_dict()
        
        return jsonify({
            'week_start': monday.isoformat(),
            'week_end': sunday.isoformat(),
            'meal_plans': week_data
        })
    except ValueError:
        return jsonify({'error': 'Invalid date format. Use YYYY-MM-DD'}), 400

@meal_plans_bp.route('/meal-plans', methods=['POST'])
def create_meal_plan():
    """Create a new meal plan entry"""
    data = request.get_json()
    
    if not data or 'date' not in data or 'meal_category_id' not in data or 'recipe_id' not in data:
        return jsonify({'error': 'Date, meal category ID, and recipe ID are required'}), 400
    
    try:
        meal_date = datetime.strptime(data['date'], '%Y-%m-%d').date()
    except ValueError:
        return jsonify({'error': 'Invalid date format. Use YYYY-MM-DD'}), 400
    
    # Validate meal category
    meal_category = Category.query.filter_by(id=data['meal_category_id'], type='meal').first()
    if not meal_category:
        return jsonify({'error': 'Invalid meal category'}), 400
    
    # Validate recipe
    recipe = Recipe.query.get(data['recipe_id'])
    if not recipe:
        return jsonify({'error': 'Invalid recipe'}), 400
    
    # Check if meal plan already exists for this date and category
    existing = MealPlan.query.filter_by(
        date=meal_date,
        meal_category_id=data['meal_category_id']
    ).first()
    
    if existing:
        return jsonify({'error': 'Meal plan already exists for this date and category'}), 409
    
    meal_plan = MealPlan(
        name=data.get('name', f"{recipe.name} - {meal_category.name}"),
        date=meal_date,
        meal_category_id=data['meal_category_id'],
        recipe_id=data['recipe_id'],
        people_count=data.get('people_count', 4)
    )
    
    try:
        db.session.add(meal_plan)
        db.session.commit()
        return jsonify(meal_plan.to_dict()), 201
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': 'Failed to create meal plan'}), 500

@meal_plans_bp.route('/meal-plans/<int:meal_plan_id>', methods=['PUT'])
def update_meal_plan(meal_plan_id):
    """Update an existing meal plan"""
    meal_plan = MealPlan.query.get_or_404(meal_plan_id)
    data = request.get_json()
    
    if not data:
        return jsonify({'error': 'No data provided'}), 400
    
    if 'name' in data:
        meal_plan.name = data['name']
    
    if 'date' in data:
        try:
            meal_plan.date = datetime.strptime(data['date'], '%Y-%m-%d').date()
        except ValueError:
            return jsonify({'error': 'Invalid date format. Use YYYY-MM-DD'}), 400
    
    if 'meal_category_id' in data:
        meal_category = Category.query.filter_by(id=data['meal_category_id'], type='meal').first()
        if not meal_category:
            return jsonify({'error': 'Invalid meal category'}), 400
        meal_plan.meal_category_id = data['meal_category_id']
    
    if 'recipe_id' in data:
        recipe = Recipe.query.get(data['recipe_id'])
        if not recipe:
            return jsonify({'error': 'Invalid recipe'}), 400
        meal_plan.recipe_id = data['recipe_id']
    
    if 'people_count' in data:
        if data['people_count'] <= 0:
            return jsonify({'error': 'People count must be positive'}), 400
        meal_plan.people_count = data['people_count']
    
    try:
        db.session.commit()
        return jsonify(meal_plan.to_dict())
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': 'Failed to update meal plan'}), 500

@meal_plans_bp.route('/meal-plans/<int:meal_plan_id>', methods=['DELETE'])
def delete_meal_plan(meal_plan_id):
    """Delete a meal plan"""
    meal_plan = MealPlan.query.get_or_404(meal_plan_id)
    
    try:
        db.session.delete(meal_plan)
        db.session.commit()
        return jsonify({'message': 'Meal plan deleted successfully'})
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': 'Failed to delete meal plan'}), 500

@meal_plans_bp.route('/meal-plans/adjust-portions', methods=['POST'])
def adjust_meal_portions():
    """Calculate adjusted portions for a meal plan"""
    data = request.get_json()
    
    if not data or 'meal_plan_id' not in data or 'people_count' not in data:
        return jsonify({'error': 'Meal plan ID and people count are required'}), 400
    
    meal_plan = MealPlan.query.get_or_404(data['meal_plan_id'])
    people_count = int(data['people_count'])
    
    if people_count <= 0:
        return jsonify({'error': 'People count must be positive'}), 400
    
    # Update the meal plan's people count
    meal_plan.people_count = people_count
    
    # Calculate scaling factor based on recipe servings
    recipe = meal_plan.recipe
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
    
    try:
        db.session.commit()
        return jsonify({
            'meal_plan_id': meal_plan.id,
            'recipe_name': recipe.name,
            'original_servings': recipe.servings,
            'adjusted_servings': people_count,
            'scaling_factor': round(scaling_factor, 2),
            'adjusted_ingredients': adjusted_ingredients
        })
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': 'Failed to update meal plan'}), 500

