-- ============================================
-- Sample Recipe Data for Automated Cooking System
-- ============================================
-- Run this AFTER running schema.sql
-- This inserts 2 sample recipes with ingredients and cooking steps

-- ============================================
-- 1. INSERT INGREDIENTS
-- ============================================

INSERT INTO ingredients (name) VALUES
  ('oil'),
  ('tomato'),
  ('water'),
  ('onion'),
  ('garlic')
ON CONFLICT (name) DO NOTHING;

-- ============================================
-- 2. INSERT RECIPES
-- ============================================
-- Note: Replace 'USER_ID_HERE' with the actual user ID from your profiles table

-- First, let's get the user ID for kevindeaaron53@gmail.com
-- You can find this by running: SELECT id FROM auth.users WHERE email = 'kevindeaaron53@gmail.com';

-- For now, we'll use a variable approach:
DO $$
DECLARE
  v_user_id UUID;
  v_recipe1_id UUID;
  v_recipe2_id UUID;
  v_oil_id UUID;
  v_tomato_id UUID;
  v_water_id UUID;
  v_onion_id UUID;
  v_garlic_id UUID;
BEGIN
  -- Get user ID
  SELECT id INTO v_user_id 
  FROM auth.users 
  WHERE email = 'kevindeaaron53@gmail.com' 
  LIMIT 1;

  -- If user doesn't exist, exit
  IF v_user_id IS NULL THEN
    RAISE NOTICE 'User kevindeaaron53@gmail.com not found. Please register first.';
    RETURN;
  END IF;

  -- Get ingredient IDs
  SELECT ingredient_id INTO v_oil_id FROM ingredients WHERE name = 'oil';
  SELECT ingredient_id INTO v_tomato_id FROM ingredients WHERE name = 'tomato';
  SELECT ingredient_id INTO v_water_id FROM ingredients WHERE name = 'water';
  SELECT ingredient_id INTO v_onion_id FROM ingredients WHERE name = 'onion';
  SELECT ingredient_id INTO v_garlic_id FROM ingredients WHERE name = 'garlic';

  -- Insert Recipe 1: Shiro Wot
  INSERT INTO recipes (owner_id, name, image_url, price, rating, avg_time)
  VALUES (
    v_user_id,
    'Shiro Wot',
    'https://images.unsplash.com/photo-1585937421612-70a008356fbe?w=400',
    0,
    5.0,
    30
  )
  RETURNING recipe_id INTO v_recipe1_id;

  -- Insert Recipe 2: Kulet
  INSERT INTO recipes (owner_id, name, image_url, price, rating, avg_time)
  VALUES (
    v_user_id,
    'Kulet',
    'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=400',
    0,
    5.0,
    20
  )
  RETURNING recipe_id INTO v_recipe2_id;

  -- ============================================
  -- 3. LINK INGREDIENTS TO RECIPES
  -- ============================================

  -- Recipe 1 (Shiro Wot) ingredients: oil, tomato, water
  INSERT INTO recipe_ingredients (recipe_id, ingredient_id, amount, cup_index) VALUES
    (v_recipe1_id, v_water_id, 20, 1),   -- 20ml water in cup 1
    (v_recipe1_id, v_oil_id, 20, 2),     -- 20ml oil in cup 2
    (v_recipe1_id, v_tomato_id, 40, 3);  -- 40g tomato in cup 3

  -- Recipe 2 (Kulet) ingredients: onion, garlic, oil
  INSERT INTO recipe_ingredients (recipe_id, ingredient_id, amount, cup_index) VALUES
    (v_recipe2_id, v_garlic_id, 20, 1),  -- 20ml garlic in cup 1
    (v_recipe2_id, v_oil_id, 20, 2),     -- 20ml oil in cup 2
    (v_recipe2_id, v_onion_id, 40, 3);   -- 40g onion in cup 3

  -- ============================================
  -- 4. CREATE COOKING STEPS
  -- ============================================

  -- Recipe 1 (Shiro Wot) cooking steps
  INSERT INTO cooking_steps (recipe_id, action, target_cup, duration, step_order) VALUES
    (v_recipe1_id, 'add_ingredient', 1, 5, 1),   -- Step 1: Add water (5 seconds)
    (v_recipe1_id, 'stir', NULL, 30, 2),         -- Step 2: Stir (30 seconds)
    (v_recipe1_id, 'add_ingredient', 2, 5, 3),   -- Step 3: Add oil (5 seconds)
    (v_recipe1_id, 'idle', NULL, 20, 4),         -- Step 4: Idle (20 seconds)
    (v_recipe1_id, 'add_ingredient', 3, 5, 5);   -- Step 5: Add tomato (5 seconds)

  -- Recipe 2 (Kulet) cooking steps
  INSERT INTO cooking_steps (recipe_id, action, target_cup, duration, step_order) VALUES
    (v_recipe2_id, 'add_ingredient', 1, 5, 1),   -- Step 1: Add garlic (5 seconds)
    (v_recipe2_id, 'stir', NULL, 30, 2),         -- Step 2: Stir (30 seconds)
    (v_recipe2_id, 'add_ingredient', 2, 5, 3),   -- Step 3: Add oil (5 seconds)
    (v_recipe2_id, 'idle', NULL, 20, 4),         -- Step 4: Idle (20 seconds)
    (v_recipe2_id, 'add_ingredient', 3, 5, 5);   -- Step 5: Add onion (5 seconds)

  RAISE NOTICE 'Successfully inserted 2 recipes with ingredients and cooking steps!';
END $$;

-- ============================================
-- VERIFICATION QUERIES
-- ============================================

-- Check recipes
SELECT r.name, r.price, r.rating, r.avg_time, u.email as owner_email
FROM recipes r
JOIN auth.users u ON r.owner_id = u.id
ORDER BY r.created_at DESC;

-- Check recipe ingredients
SELECT 
  r.name as recipe_name,
  i.name as ingredient_name,
  ri.amount,
  ri.cup_index
FROM recipe_ingredients ri
JOIN recipes r ON ri.recipe_id = r.recipe_id
JOIN ingredients i ON ri.ingredient_id = i.ingredient_id
ORDER BY r.name, ri.cup_index;

-- Check cooking steps
SELECT 
  r.name as recipe_name,
  cs.step_order,
  cs.action,
  cs.target_cup,
  cs.duration,
  CASE 
    WHEN cs.action = 'add_ingredient' THEN 
      'Add ' || i.name || ' (' || ri.amount || 'ml/g)'
    WHEN cs.action = 'stir' THEN 
      'Stir for ' || cs.duration || ' seconds'
    WHEN cs.action = 'idle' THEN 
      'Wait for ' || cs.duration || ' seconds'
    ELSE cs.action
  END as step_description
FROM cooking_steps cs
JOIN recipes r ON cs.recipe_id = r.recipe_id
LEFT JOIN recipe_ingredients ri ON cs.recipe_id = ri.recipe_id AND cs.target_cup = ri.cup_index
LEFT JOIN ingredients i ON ri.ingredient_id = i.ingredient_id
ORDER BY r.name, cs.step_order;
