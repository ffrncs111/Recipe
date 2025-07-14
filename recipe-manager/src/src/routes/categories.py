from flask import Blueprint, request, jsonify
from src.models.recipe import db, Category

categories_bp = Blueprint('categories', __name__)

@categories_bp.route('/categories', methods=['GET'])
def get_categories():
    """Get all categories, optionally filtered by type"""
    category_type = request.args.get('type')  # 'recipe' or 'meal'
    
    query = Category.query
    if category_type:
        query = query.filter_by(type=category_type)
    
    categories = query.order_by(Category.name).all()
    return jsonify([category.to_dict() for category in categories])

@categories_bp.route('/categories', methods=['POST'])
def create_category():
    """Create a new category"""
    data = request.get_json()
    
    if not data or 'name' not in data or 'type' not in data:
        return jsonify({'error': 'Name and type are required'}), 400
    
    if data['type'] not in ['recipe', 'meal']:
        return jsonify({'error': 'Type must be either "recipe" or "meal"'}), 400
    
    # Check if category with same name and type already exists
    existing = Category.query.filter_by(name=data['name'], type=data['type']).first()
    if existing:
        return jsonify({'error': 'Category with this name already exists'}), 409
    
    category = Category(
        name=data['name'],
        type=data['type']
    )
    
    try:
        db.session.add(category)
        db.session.commit()
        return jsonify(category.to_dict()), 201
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': 'Failed to create category'}), 500

@categories_bp.route('/categories/<int:category_id>', methods=['PUT'])
def update_category(category_id):
    """Update an existing category"""
    category = Category.query.get_or_404(category_id)
    data = request.get_json()
    
    if not data:
        return jsonify({'error': 'No data provided'}), 400
    
    if 'name' in data:
        # Check if another category with same name and type exists
        existing = Category.query.filter_by(
            name=data['name'], 
            type=category.type
        ).filter(Category.id != category_id).first()
        
        if existing:
            return jsonify({'error': 'Category with this name already exists'}), 409
        
        category.name = data['name']
    
    if 'type' in data:
        if data['type'] not in ['recipe', 'meal']:
            return jsonify({'error': 'Type must be either "recipe" or "meal"'}), 400
        category.type = data['type']
    
    try:
        db.session.commit()
        return jsonify(category.to_dict())
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': 'Failed to update category'}), 500

@categories_bp.route('/categories/<int:category_id>', methods=['DELETE'])
def delete_category(category_id):
    """Delete a category"""
    category = Category.query.get_or_404(category_id)
    
    try:
        db.session.delete(category)
        db.session.commit()
        return jsonify({'message': 'Category deleted successfully'})
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': 'Failed to delete category'}), 500

