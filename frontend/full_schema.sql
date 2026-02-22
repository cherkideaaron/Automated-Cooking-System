-- ============================================
-- Automated Cooking System - Full Database Schema
-- ============================================
-- This schema is designed for Supabase PostgreSQL
-- Run this in your Supabase SQL Editor

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- 1. PROFILES TABLE
-- ============================================
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username TEXT UNIQUE,
  avatar_url TEXT,
  total_cooks INTEGER DEFAULT 0 CHECK (total_cooks >= 0),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Trigger to create profile automatically when user signs up
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, username, avatar_url, total_cooks)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'username', SPLIT_PART(NEW.email, '@', 1)),
    NEW.raw_user_meta_data->>'avatar_url',
    0
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============================================
-- 2. RECIPES TABLE
-- ============================================
CREATE TABLE recipes (
  recipe_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  owner_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  name TEXT NOT NULL CHECK (LENGTH(name) > 0),
  image_url TEXT,
  price DECIMAL(10, 2) CHECK (price >= 0),
  rating DECIMAL(3, 2) CHECK (rating >= 0 AND rating <= 5),
  avg_time INTEGER CHECK (avg_time > 0), -- in minutes
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_recipes_owner_id ON recipes(owner_id);
CREATE INDEX idx_recipes_rating ON recipes(rating DESC);

-- ============================================
-- 3. INGREDIENTS TABLE
-- ============================================
CREATE TABLE ingredients (
  ingredient_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT UNIQUE NOT NULL CHECK (LENGTH(name) > 0),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_ingredients_name ON ingredients(name);

-- ============================================
-- 4. RECIPE_INGREDIENTS TABLE
-- ============================================
CREATE TABLE recipe_ingredients (
  recipe_id UUID NOT NULL REFERENCES recipes(recipe_id) ON DELETE CASCADE,
  ingredient_id UUID NOT NULL REFERENCES ingredients(ingredient_id) ON DELETE CASCADE,
  amount DECIMAL(10, 2) NOT NULL CHECK (amount > 0),
  cup_index INTEGER CHECK (cup_index >= 1 AND cup_index <= 7),
  PRIMARY KEY (recipe_id, ingredient_id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_recipe_ingredients_recipe ON recipe_ingredients(recipe_id);
CREATE INDEX idx_recipe_ingredients_ingredient ON recipe_ingredients(ingredient_id);

-- ============================================
-- 5. COOKING_STEPS TABLE
-- ============================================
CREATE TABLE cooking_steps (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  recipe_id UUID NOT NULL REFERENCES recipes(recipe_id) ON DELETE CASCADE,
  action TEXT NOT NULL CHECK (action IN ('add_ingredient', 'stir', 'idle', 'heat', 'cool')),
  target_cup INTEGER CHECK (target_cup >= 1 AND target_cup <= 7),
  duration INTEGER NOT NULL CHECK (duration >= 0), -- in seconds
  step_order INTEGER NOT NULL CHECK (step_order > 0),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (recipe_id, step_order)
);

CREATE INDEX idx_cooking_steps_recipe ON cooking_steps(recipe_id, step_order);

-- ============================================
-- 6. PURCHASES TABLE
-- ============================================
CREATE TABLE purchases (
  buyer_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  recipe_id UUID NOT NULL REFERENCES recipes(recipe_id) ON DELETE CASCADE,
  amount_paid DECIMAL(10, 2) NOT NULL CHECK (amount_paid >= 0),
  phone_number TEXT,
  receipt_img_url TEXT,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'verified', 'rejected')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (buyer_id, recipe_id, created_at)
);

CREATE INDEX idx_purchases_buyer ON purchases(buyer_id);
CREATE INDEX idx_purchases_recipe ON purchases(recipe_id);

-- ============================================
-- 7. COOKING_HISTORY TABLE
-- ============================================
CREATE TABLE cooking_history (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  recipe_id UUID NOT NULL REFERENCES recipes(recipe_id) ON DELETE SET NULL,
  session_date TIMESTAMPTZ DEFAULT NOW(),
  duration INTEGER CHECK (duration >= 0),
  status TEXT DEFAULT 'in_progress' CHECK (status IN ('in_progress', 'completed', 'failed', 'cancelled')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_cooking_history_user ON cooking_history(user_id);
CREATE INDEX idx_cooking_history_date ON cooking_history(session_date DESC);

-- ============================================
-- 8. NOTIFICATIONS TABLE
-- ============================================
CREATE TABLE notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  message TEXT NOT NULL CHECK (LENGTH(message) > 0),
  type TEXT NOT NULL CHECK (type IN ('info', 'warning', 'error', 'success', 'cooking_status')),
  is_read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_notifications_user ON notifications(user_id);

-- ============================================
-- 9. IOT_STATUS TABLE
-- ============================================
CREATE TABLE iot_status (
  esp_id TEXT PRIMARY KEY,
  user_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  connection_status TEXT DEFAULT 'offline' CHECK (connection_status IN ('online', 'offline', 'error')),
  last_seen TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- 10. DEVICE_STATE TABLE
-- ============================================
CREATE TABLE device_state (
  id TEXT PRIMARY KEY,
  temperature DECIMAL DEFAULT 0,
  stir_speed INTEGER DEFAULT 0,
  status TEXT DEFAULT 'idle' CHECK (status IN ('idle', 'cooking', 'paused', 'error')),
  last_updated TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- 11. COOKING_SESSIONS TABLE
-- ============================================
CREATE TABLE cooking_sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  recipe_id UUID REFERENCES recipes(recipe_id) ON DELETE CASCADE,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'completed', 'stopped')),
  current_step INTEGER DEFAULT 0,
  steps JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE recipes ENABLE ROW LEVEL SECURITY;
ALTER TABLE ingredients ENABLE ROW LEVEL SECURITY;
ALTER TABLE recipe_ingredients ENABLE ROW LEVEL SECURITY;
ALTER TABLE cooking_steps ENABLE ROW LEVEL SECURITY;
ALTER TABLE purchases ENABLE ROW LEVEL SECURITY;
ALTER TABLE cooking_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE iot_status ENABLE ROW LEVEL SECURITY;
ALTER TABLE device_state ENABLE ROW LEVEL SECURITY;
ALTER TABLE cooking_sessions ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Public profiles viewable by everyone" ON profiles FOR SELECT USING (true);
CREATE POLICY "Users can update own profile" ON profiles FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Recipes viewable by everyone" ON recipes FOR SELECT USING (true);
CREATE POLICY "Users manage own recipes" ON recipes FOR ALL USING (auth.uid() = owner_id);

CREATE POLICY "Ingredients viewable by everyone" ON ingredients FOR SELECT USING (true);
CREATE POLICY "Authenticated users insert ingredients" ON ingredients FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Recipe ingredients viewable by everyone" ON recipe_ingredients FOR SELECT USING (true);
CREATE POLICY "Owners manage recipe ingredients" ON recipe_ingredients FOR ALL USING (EXISTS (SELECT 1 FROM recipes WHERE recipes.recipe_id = recipe_ingredients.recipe_id AND recipes.owner_id = auth.uid()));

CREATE POLICY "Cooking steps viewable by everyone" ON cooking_steps FOR SELECT USING (true);
CREATE POLICY "Owners manage cooking steps" ON cooking_steps FOR ALL USING (EXISTS (SELECT 1 FROM recipes WHERE recipes.recipe_id = cooking_steps.recipe_id AND recipes.owner_id = auth.uid()));

CREATE POLICY "Users manage own purchases" ON purchases FOR ALL USING (auth.uid() = buyer_id);
CREATE POLICY "Users manage own history" ON cooking_history FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users manage own notifications" ON notifications FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users manage own devices" ON iot_status FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Device state viewable by everyone" ON device_state FOR SELECT USING (true);
CREATE POLICY "Device state manageable by authenticated" ON device_state FOR ALL USING (auth.role() = 'authenticated');

CREATE POLICY "Sessions viewable by everyone" ON cooking_sessions FOR SELECT USING (true);
CREATE POLICY "Sessions manageable by authenticated" ON cooking_sessions FOR ALL USING (auth.role() = 'authenticated');

-- ============================================
-- AUTOMATIC TIMESTAMPS
-- ============================================
CREATE OR REPLACE FUNCTION update_updated_at_column() RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END; $$ LANGUAGE plpgsql;

CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON profiles FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_recipes_updated_at BEFORE UPDATE ON recipes FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_iot_status_updated_at BEFORE UPDATE ON iot_status FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE OR REPLACE FUNCTION update_last_updated_column() RETURNS TRIGGER AS $$
BEGIN NEW.last_updated = NOW(); RETURN NEW; END; $$ LANGUAGE plpgsql;

CREATE TRIGGER update_device_state_last_updated BEFORE UPDATE ON device_state FOR EACH ROW EXECUTE FUNCTION update_last_updated_column();

-- ============================================
-- INITIAL DATA
-- ============================================
INSERT INTO device_state (id, temperature, stir_speed, status)
VALUES ('1', 0, 0, 'idle')
ON CONFLICT (id) DO NOTHING;
