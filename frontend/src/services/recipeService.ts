import { supabase } from '../lib/supabase';
import { Database } from '../types/database.types';

// Type aliases for cleaner code
type Recipe = Database['public']['Tables']['recipes']['Row'];
type RecipeInsert = Database['public']['Tables']['recipes']['Insert'];
type RecipeUpdate = Database['public']['Tables']['recipes']['Update'];
type Ingredient = Database['public']['Tables']['ingredients']['Row'];
type RecipeIngredient = Database['public']['Tables']['recipe_ingredients']['Row'];
type CookingStep = Database['public']['Tables']['cooking_steps']['Row'];

// Extended recipe type with relationships
export interface RecipeWithDetails extends Recipe {
    ingredients?: Array<RecipeIngredient & { ingredient: Ingredient }>;
    cooking_steps?: CookingStep[];
    profiles?: Database['public']['Tables']['profiles']['Row'];
}

class RecipeService {
    /**
     * Fetch all recipes with their ingredients and cooking steps
     */
    async getAllRecipes(): Promise<RecipeWithDetails[]> {
        try {
            const { data, error } = await supabase
                .from('recipes')
                .select(`
          *,
          ingredients:recipe_ingredients(
            *,
            ingredient:ingredients(*)
          ),
          cooking_steps(*),
          profiles:owner_id(*)
        `)
                .order('created_at', { ascending: false });

            if (error) {
                console.error('Error fetching recipes:', error);
                throw error;
            }

            return data as RecipeWithDetails[];
        } catch (error) {
            console.error('Error in getAllRecipes:', error);
            return [];
        }
    }

    /**
     * Fetch a single recipe by ID with full details
     */
    async getRecipeById(recipeId: string): Promise<RecipeWithDetails | null> {
        try {
            const { data, error } = await supabase
                .from('recipes')
                .select(`
          *,
          ingredients:recipe_ingredients(
            *,
            ingredient:ingredients(*)
          ),
          cooking_steps(*),
          profiles:owner_id(*)
        `)
                .eq('recipe_id', recipeId)
                .single();

            if (error) {
                console.error('Error fetching recipe:', error);
                throw error;
            }

            return data as RecipeWithDetails;
        } catch (error) {
            console.error('Error in getRecipeById:', error);
            return null;
        }
    }

    /**
     * Create a new recipe
     */
    async createRecipe(recipe: RecipeInsert): Promise<Recipe | null> {
        try {
            const { data, error } = await supabase
                .from('recipes')
                .insert(recipe)
                .select()
                .single();

            if (error) {
                console.error('Error creating recipe:', error);
                throw error;
            }

            return data;
        } catch (error) {
            console.error('Error in createRecipe:', error);
            return null;
        }
    }

    /**
     * Update an existing recipe
     */
    async updateRecipe(recipeId: string, updates: RecipeUpdate): Promise<Recipe | null> {
        try {
            const { data, error } = await supabase
                .from('recipes')
                .update(updates)
                .eq('recipe_id', recipeId)
                .select()
                .single();

            if (error) {
                console.error('Error updating recipe:', error);
                throw error;
            }

            return data;
        } catch (error) {
            console.error('Error in updateRecipe:', error);
            return null;
        }
    }

    /**
     * Delete a recipe (cascade deletes ingredients and steps)
     */
    async deleteRecipe(recipeId: string): Promise<boolean> {
        try {
            const { error } = await supabase
                .from('recipes')
                .delete()
                .eq('recipe_id', recipeId);

            if (error) {
                console.error('Error deleting recipe:', error);
                throw error;
            }

            return true;
        } catch (error) {
            console.error('Error in deleteRecipe:', error);
            return false;
        }
    }

    /**
     * Add ingredient to recipe
     */
    async addIngredientToRecipe(
        recipeId: string,
        ingredientId: string,
        amount: number,
        cupIndex?: number
    ): Promise<boolean> {
        try {
            const { error } = await supabase
                .from('recipe_ingredients')
                .insert({
                    recipe_id: recipeId,
                    ingredient_id: ingredientId,
                    amount,
                    cup_index: cupIndex,
                });

            if (error) {
                console.error('Error adding ingredient to recipe:', error);
                throw error;
            }

            return true;
        } catch (error) {
            console.error('Error in addIngredientToRecipe:', error);
            return false;
        }
    }

    /**
     * Remove ingredient from recipe
     */
    async removeIngredientFromRecipe(recipeId: string, ingredientId: string): Promise<boolean> {
        try {
            const { error } = await supabase
                .from('recipe_ingredients')
                .delete()
                .eq('recipe_id', recipeId)
                .eq('ingredient_id', ingredientId);

            if (error) {
                console.error('Error removing ingredient from recipe:', error);
                throw error;
            }

            return true;
        } catch (error) {
            console.error('Error in removeIngredientFromRecipe:', error);
            return false;
        }
    }

    /**
     * Update ingredient amount in recipe
     */
    async updateRecipeIngredient(
        recipeId: string,
        ingredientId: string,
        amount: number,
        cupIndex?: number
    ): Promise<boolean> {
        try {
            const { error } = await supabase
                .from('recipe_ingredients')
                .update({ amount, cup_index: cupIndex })
                .eq('recipe_id', recipeId)
                .eq('ingredient_id', ingredientId);

            if (error) {
                console.error('Error updating recipe ingredient:', error);
                throw error;
            }

            return true;
        } catch (error) {
            console.error('Error in updateRecipeIngredient:', error);
            return false;
        }
    }

    /**
     * Add cooking step to recipe
     */
    async addCookingStep(
        recipeId: string,
        action: string,
        duration: number,
        stepOrder: number,
        targetCup?: number
    ): Promise<boolean> {
        try {
            const { error } = await supabase
                .from('cooking_steps')
                .insert({
                    recipe_id: recipeId,
                    action,
                    duration,
                    step_order: stepOrder,
                    target_cup: targetCup,
                });

            if (error) {
                console.error('Error adding cooking step:', error);
                throw error;
            }

            return true;
        } catch (error) {
            console.error('Error in addCookingStep:', error);
            return false;
        }
    }

    /**
     * Update cooking step
     */
    async updateCookingStep(
        stepId: string,
        updates: {
            action?: string;
            duration?: number;
            step_order?: number;
            target_cup?: number;
        }
    ): Promise<boolean> {
        try {
            const { error } = await supabase
                .from('cooking_steps')
                .update(updates)
                .eq('id', stepId);

            if (error) {
                console.error('Error updating cooking step:', error);
                throw error;
            }

            return true;
        } catch (error) {
            console.error('Error in updateCookingStep:', error);
            return false;
        }
    }

    /**
     * Delete cooking step
     */
    async deleteCookingStep(stepId: string): Promise<boolean> {
        try {
            const { error } = await supabase
                .from('cooking_steps')
                .delete()
                .eq('id', stepId);

            if (error) {
                console.error('Error deleting cooking step:', error);
                throw error;
            }

            return true;
        } catch (error) {
            console.error('Error in deleteCookingStep:', error);
            return false;
        }
    }

    /**
     * Get all available ingredients
     */
    async getAllIngredients(): Promise<Ingredient[]> {
        try {
            const { data, error } = await supabase
                .from('ingredients')
                .select('*')
                .order('name');

            if (error) {
                console.error('Error fetching ingredients:', error);
                throw error;
            }

            return data;
        } catch (error) {
            console.error('Error in getAllIngredients:', error);
            return [];
        }
    }

    /**
     * Create a new ingredient
     */
    async createIngredient(name: string): Promise<Ingredient | null> {
        try {
            const { data, error } = await supabase
                .from('ingredients')
                .insert({ name })
                .select()
                .single();

            if (error) {
                console.error('Error creating ingredient:', error);
                throw error;
            }

            return data;
        } catch (error) {
            console.error('Error in createIngredient:', error);
            return null;
        }
    }

    /**
     * Create a purchase request
     */
    async createPurchaseRequest(
        recipeId: string,
        amountPaid: number,
        phoneNumber: string,
        receiptImgUrl: string
    ): Promise<boolean> {
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) throw new Error('No user logged in');

            const { error } = await supabase
                .from('purchases')
                .insert({
                    buyer_id: user.id,
                    recipe_id: recipeId,
                    amount_paid: amountPaid,
                    phone_number: phoneNumber,
                    receipt_img_url: receiptImgUrl,
                    status: 'pending'
                });

            if (error) {
                console.error('Error creating purchase request:', error);
                throw error;
            }

            return true;
        } catch (error) {
            console.error('Error in createPurchaseRequest:', error);
            return false;
        }
    }

    /**
     * Get incoming purchase requests for recipes owned by the current user
     */
    async getIncomingPurchaseRequests(): Promise<any[]> {
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) throw new Error('No user logged in');

            // First get all recipes owned by user
            const { data: recipes, error: recipeError } = await supabase
                .from('recipes')
                .select('recipe_id')
                .eq('owner_id', user.id);

            if (recipeError) throw recipeError;

            const recipeIds = recipes.map(r => r.recipe_id);

            if (recipeIds.length === 0) return [];

            // Fetch purchases for these recipes
            const { data: purchases, error: purchaseError } = await supabase
                .from('purchases')
                .select(`
                    *,
                    recipes:recipe_id (name, price),
                    buyer:buyer_id (username)
                `)
                .in('recipe_id', recipeIds)
                .order('created_at', { ascending: false });

            if (purchaseError) throw purchaseError;

            return purchases;
        } catch (error) {
            console.error('Error in getIncomingPurchaseRequests:', error);
            return [];
        }
    }

    /**
     * Approve a purchase request
     */
    async approvePurchaseRequest(buyerId: string, recipeId: string): Promise<boolean> {
        try {
            const { error } = await supabase
                .from('purchases')
                .update({ status: 'approved' })
                .eq('buyer_id', buyerId)
                .eq('recipe_id', recipeId);

            if (error) throw error;
            return true;
        } catch (error) {
            console.error('Error in approvePurchaseRequest:', error);
            return false;
        }
    }

    /**
     * Get IDs of recipes the user has purchased and are approved
     */
    async getPurchasedRecipeIds(): Promise<string[]> {
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return [];

            const { data, error } = await supabase
                .from('purchases')
                .select('recipe_id')
                .eq('buyer_id', user.id)
                .eq('status', 'approved');

            if (error) throw error;

            return data.map(p => p.recipe_id);
        } catch (error) {
            console.error('Error in getPurchasedRecipeIds:', error);
            return [];
        }
    }

    /**
     * Directly add a free recipe to the user's collection
     */
    async addFreeRecipe(recipeId: string): Promise<boolean> {
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) throw new Error('No user logged in');

            const { error } = await supabase
                .from('purchases')
                .insert({
                    buyer_id: user.id,
                    recipe_id: recipeId,
                    amount_paid: 0,
                    status: 'approved',
                    phone_number: 'N/A',
                    receipt_img_url: 'N/A'
                });

            if (error) {
                console.error('Error adding free recipe:', error);
                throw error;
            }

            return true;
        } catch (error) {
            console.error('Error in addFreeRecipe:', error);
            return false;
        }
    }

    /**
     * Update user profile (username)
     */
    async updateProfile(username: string): Promise<boolean> {
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) throw new Error('No user logged in');

            const { error } = await supabase
                .from('profiles')
                .update({
                    username,
                    updated_at: new Date().toISOString()
                })
                .eq('id', user.id);

            if (error) throw error;
            return true;
        } catch (error) {
            console.error('Error in updateProfile:', error);
            return false;
        }
    }

    /**
     * Get current user profile
     */
    async getUserProfile(): Promise<any> {
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return null;

            const { data, error } = await supabase
                .from('profiles')
                .select('*')
                .eq('id', user.id)
                .single();

            if (error) throw error;
            return {
                ...data,
                email: user.email // Profiles table might not have email, fetch from auth
            };
        } catch (error) {
            console.error('Error in getUserProfile:', error);
            return null;
        }
    }
}

export const recipeService = new RecipeService();
