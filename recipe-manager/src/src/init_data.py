#!/usr/bin/env python3
"""
Initialize the database with default categories and sample data
"""
import os
import sys
sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))

from src.models.user import db
from src.models.recipe import Category, Recipe, Ingredient
from src.main import app

def init_categories():
    """Create default categories for recipes and meals"""
    
    # Recipe categories
    recipe_categories = [
        'Breakfast',
        'Lunch', 
        'Dinner',
        'Appetizers',
        'Desserts',
        'Snacks',
        'Beverages',
        'Soups',
        'Salads',
        'Main Courses',
        'Side Dishes',
        'Vegetarian',
        'Vegan',
        'Quick & Easy'
    ]
    
    # Meal planning categories
    meal_categories = [
        'Breakfast',
        'Lunch',
        'Dinner',
        'Snack',
        'Brunch'
    ]
    
    with app.app_context():
        # Create recipe categories
        for cat_name in recipe_categories:
            existing = Category.query.filter_by(name=cat_name, type='recipe').first()
            if not existing:
                category = Category(name=cat_name, type='recipe')
                db.session.add(category)
                print(f"Created recipe category: {cat_name}")
        
        # Create meal categories
        for cat_name in meal_categories:
            existing = Category.query.filter_by(name=cat_name, type='meal').first()
            if not existing:
                category = Category(name=cat_name, type='meal')
                db.session.add(category)
                print(f"Created meal category: {cat_name}")
        
        db.session.commit()
        print("Database initialized with default categories!")

def create_sample_recipes():
    """Create a few sample recipes"""
    
    with app.app_context():
        # Get categories
        breakfast_cat = Category.query.filter_by(name='Breakfast', type='recipe').first()
        dinner_cat = Category.query.filter_by(name='Dinner', type='recipe').first()
        
        # Sample Recipe 1: Scrambled Eggs
        if not Recipe.query.filter_by(name='Classic Scrambled Eggs').first():
            recipe1 = Recipe(
                name='Classic Scrambled Eggs',
                description='Fluffy and creamy scrambled eggs perfect for breakfast',
                instructions='''1. Crack eggs into a bowl and whisk with salt and pepper
2. Heat butter in a non-stick pan over medium-low heat
3. Pour in eggs and let sit for 20 seconds
4. Gently stir with a spatula, pushing eggs from edges to center
5. Continue stirring gently until eggs are just set but still creamy
6. Remove from heat and serve immediately''',
                prep_time=5,
                cook_time=5,
                servings=2,
                category_id=breakfast_cat.id if breakfast_cat else None
            )
            db.session.add(recipe1)
            db.session.flush()
            
            # Add ingredients
            ingredients1 = [
                Ingredient(recipe_id=recipe1.id, name='Eggs', quantity=4, unit='pieces'),
                Ingredient(recipe_id=recipe1.id, name='Butter', quantity=15, unit='grams'),
                Ingredient(recipe_id=recipe1.id, name='Salt', quantity=1, unit='pinch'),
                Ingredient(recipe_id=recipe1.id, name='Black pepper', quantity=1, unit='pinch')
            ]
            for ingredient in ingredients1:
                db.session.add(ingredient)
        
        # Sample Recipe 2: Simple Pasta
        if not Recipe.query.filter_by(name='Simple Garlic Pasta').first():
            recipe2 = Recipe(
                name='Simple Garlic Pasta',
                description='Quick and delicious pasta with garlic and olive oil',
                instructions='''1. Bring a large pot of salted water to boil
2. Cook pasta according to package directions until al dente
3. While pasta cooks, heat olive oil in a large pan
4. Add minced garlic and cook for 1 minute until fragrant
5. Drain pasta, reserving 1 cup pasta water
6. Add pasta to the pan with garlic oil
7. Toss with parmesan cheese and pasta water as needed
8. Season with salt, pepper, and red pepper flakes
9. Serve immediately with extra parmesan''',
                prep_time=10,
                cook_time=15,
                servings=4,
                category_id=dinner_cat.id if dinner_cat else None
            )
            db.session.add(recipe2)
            db.session.flush()
            
            # Add ingredients
            ingredients2 = [
                Ingredient(recipe_id=recipe2.id, name='Pasta', quantity=400, unit='grams'),
                Ingredient(recipe_id=recipe2.id, name='Olive oil', quantity=60, unit='ml'),
                Ingredient(recipe_id=recipe2.id, name='Garlic', quantity=4, unit='cloves'),
                Ingredient(recipe_id=recipe2.id, name='Parmesan cheese', quantity=100, unit='grams'),
                Ingredient(recipe_id=recipe2.id, name='Salt', quantity=1, unit='teaspoon'),
                Ingredient(recipe_id=recipe2.id, name='Black pepper', quantity=0.5, unit='teaspoon'),
                Ingredient(recipe_id=recipe2.id, name='Red pepper flakes', quantity=0.25, unit='teaspoon')
            ]
            for ingredient in ingredients2:
                db.session.add(ingredient)
        
        db.session.commit()
        print("Sample recipes created!")

if __name__ == '__main__':
    print("Initializing database...")
    init_categories()
    create_sample_recipes()
    print("Database initialization complete!")

