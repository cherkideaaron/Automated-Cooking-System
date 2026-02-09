import { supabase } from '../lib/supabase';
import { Database } from '../types/database.types';

type CookingHistory = Database['public']['Tables']['cooking_history']['Row'];
type CookingHistoryInsert = Database['public']['Tables']['cooking_history']['Insert'];

export interface CookingSession extends CookingHistory {
    recipe?: {
        name: string;
        cooking_steps: Array<{
            id: string;
            action: string;
            duration: number;
            step_order: number;
            target_cup: number | null;
        }>;
    };
}

class CookingService {
    /**
     * Start a new cooking session
     */
    async startCookingSession(userId: string, recipeId: string): Promise<CookingSession | null> {
        try {
            const { data, error } = await supabase
                .from('cooking_history')
                .insert({
                    user_id: userId,
                    recipe_id: recipeId,
                    status: 'in_progress',
                    session_date: new Date().toISOString(),
                })
                .select(`
          *,
          recipe:recipes(
            name,
            cooking_steps(*)
          )
        `)
                .single();

            if (error) {
                console.error('Error starting cooking session:', error);
                throw error;
            }

            return data as CookingSession;
        } catch (error) {
            console.error('Error in startCookingSession:', error);
            return null;
        }
    }

    /**
     * Update cooking session progress
     */
    async updateCookingProgress(
        sessionId: string,
        duration: number
    ): Promise<boolean> {
        try {
            const { error } = await supabase
                .from('cooking_history')
                .update({ duration })
                .eq('id', sessionId);

            if (error) {
                console.error('Error updating cooking progress:', error);
                throw error;
            }

            return true;
        } catch (error) {
            console.error('Error in updateCookingProgress:', error);
            return false;
        }
    }

    /**
     * Complete a cooking session
     */
    async completeCookingSession(sessionId: string, totalDuration: number): Promise<boolean> {
        try {
            const { error } = await supabase
                .from('cooking_history')
                .update({
                    status: 'completed',
                    duration: totalDuration,
                })
                .eq('id', sessionId);

            if (error) {
                console.error('Error completing cooking session:', error);
                throw error;
            }

            // Increment user's total_cooks count
            const { data: session } = await supabase
                .from('cooking_history')
                .select('user_id')
                .eq('id', sessionId)
                .single();

            if (session) {
                await this.incrementUserCookCount(session.user_id);
            }

            return true;
        } catch (error) {
            console.error('Error in completeCookingSession:', error);
            return false;
        }
    }

    /**
     * Cancel a cooking session
     */
    async cancelCookingSession(sessionId: string): Promise<boolean> {
        try {
            const { error } = await supabase
                .from('cooking_history')
                .update({ status: 'cancelled' })
                .eq('id', sessionId);

            if (error) {
                console.error('Error cancelling cooking session:', error);
                throw error;
            }

            return true;
        } catch (error) {
            console.error('Error in cancelCookingSession:', error);
            return false;
        }
    }

    /**
     * Mark a cooking session as failed
     */
    async failCookingSession(sessionId: string): Promise<boolean> {
        try {
            const { error } = await supabase
                .from('cooking_history')
                .update({ status: 'failed' })
                .eq('id', sessionId);

            if (error) {
                console.error('Error marking cooking session as failed:', error);
                throw error;
            }

            return true;
        } catch (error) {
            console.error('Error in failCookingSession:', error);
            return false;
        }
    }

    /**
     * Get user's cooking history
     */
    async getUserCookingHistory(userId: string): Promise<CookingSession[]> {
        try {
            const { data, error } = await supabase
                .from('cooking_history')
                .select(`
          *,
          recipe:recipes(name)
        `)
                .eq('user_id', userId)
                .order('session_date', { ascending: false });

            if (error) {
                console.error('Error fetching cooking history:', error);
                throw error;
            }

            return data as CookingSession[];
        } catch (error) {
            console.error('Error in getUserCookingHistory:', error);
            return [];
        }
    }

    /**
     * Get active cooking session for user
     */
    async getActiveCookingSession(userId: string): Promise<CookingSession | null> {
        try {
            const { data, error } = await supabase
                .from('cooking_history')
                .select(`
          *,
          recipe:recipes(
            name,
            cooking_steps(*)
          )
        `)
                .eq('user_id', userId)
                .eq('status', 'in_progress')
                .order('session_date', { ascending: false })
                .limit(1)
                .single();

            if (error) {
                // No active session is not an error
                if (error.code === 'PGRST116') {
                    return null;
                }
                console.error('Error fetching active cooking session:', error);
                throw error;
            }

            return data as CookingSession;
        } catch (error) {
            console.error('Error in getActiveCookingSession:', error);
            return null;
        }
    }

    /**
     * Increment user's total cook count
     */
    private async incrementUserCookCount(userId: string): Promise<boolean> {
        try {
            // Get current count
            const { data: profile } = await supabase
                .from('profiles')
                .select('total_cooks')
                .eq('id', userId)
                .single();

            if (profile) {
                const newCount = (profile.total_cooks || 0) + 1;
                await supabase
                    .from('profiles')
                    .update({ total_cooks: newCount })
                    .eq('id', userId);
            }

            return true;
        } catch (error) {
            console.error('Error incrementing cook count:', error);
            return false;
        }
    }
}

export const cookingService = new CookingService();
