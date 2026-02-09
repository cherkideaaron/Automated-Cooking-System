import { AuthError, Session, User } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';

export interface AuthResponse {
    user: User | null;
    session: Session | null;
    error: AuthError | null;
}

export interface SignUpData {
    email: string;
    password: string;
    username?: string;
    avatar_url?: string;
}

export interface SignInData {
    email: string;
    password: string;
}

class AuthService {
    /**
     * Sign up a new user with email and password
     */
    async signUp(data: SignUpData): Promise<AuthResponse> {
        try {
            const { data: authData, error } = await supabase.auth.signUp({
                email: data.email,
                password: data.password,
                options: {
                    data: {
                        username: data.username,
                        avatar_url: data.avatar_url,
                    },
                },
            });

            return {
                user: authData.user,
                session: authData.session,
                error,
            };
        } catch (error) {
            return {
                user: null,
                session: null,
                error: error as AuthError,
            };
        }
    }

    /**
     * Sign in an existing user with email and password
     */
    async signIn(data: SignInData): Promise<AuthResponse> {
        try {
            const { data: authData, error } = await supabase.auth.signInWithPassword({
                email: data.email,
                password: data.password,
            });

            return {
                user: authData.user,
                session: authData.session,
                error,
            };
        } catch (error) {
            return {
                user: null,
                session: null,
                error: error as AuthError,
            };
        }
    }

    /**
     * Sign out the current user
     */
    async signOut(): Promise<{ error: AuthError | null }> {
        try {
            const { error } = await supabase.auth.signOut();
            return { error };
        } catch (error) {
            return { error: error as AuthError };
        }
    }

    /**
     * Get the current session
     */
    async getSession(): Promise<Session | null> {
        try {
            const { data, error } = await supabase.auth.getSession();
            if (error) {
                console.error('Error getting session:', error);
                return null;
            }
            return data.session;
        } catch (error) {
            console.error('Error getting session:', error);
            return null;
        }
    }

    /**
     * Get the current user
     */
    async getCurrentUser(): Promise<User | null> {
        try {
            const { data, error } = await supabase.auth.getUser();
            if (error) {
                console.error('Error getting user:', error);
                return null;
            }
            return data.user;
        } catch (error) {
            console.error('Error getting user:', error);
            return null;
        }
    }

    /**
     * Send password reset email
     */
    async resetPassword(email: string): Promise<{ error: AuthError | null }> {
        try {
            const { error } = await supabase.auth.resetPasswordForEmail(email);
            return { error };
        } catch (error) {
            return { error: error as AuthError };
        }
    }

    /**
     * Update user password
     */
    async updatePassword(newPassword: string): Promise<{ error: AuthError | null }> {
        try {
            const { error } = await supabase.auth.updateUser({
                password: newPassword,
            });
            return { error };
        } catch (error) {
            return { error: error as AuthError };
        }
    }

    /**
     * Update user profile (username, avatar)
     */
    async updateProfile(updates: { username?: string; avatar_url?: string }): Promise<{ error: AuthError | null }> {
        try {
            const { error } = await supabase.auth.updateUser({
                data: updates,
            });
            return { error };
        } catch (error) {
            return { error: error as AuthError };
        }
    }

    /**
     * Listen to auth state changes
     */
    onAuthStateChange(callback: (event: string, session: Session | null) => void) {
        return supabase.auth.onAuthStateChange((event, session) => {
            callback(event, session);
        });
    }
}

export const authService = new AuthService();
