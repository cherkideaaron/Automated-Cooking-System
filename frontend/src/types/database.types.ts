export type Json =
    | string
    | number
    | boolean
    | null
    | { [key: string]: Json | undefined }
    | Json[]

export interface Database {
    public: {
        Tables: {
            profiles: {
                Row: {
                    id: string
                    username: string | null
                    avatar_url: string | null
                    total_cooks: number
                    created_at: string
                    updated_at: string
                }
                Insert: {
                    id: string
                    username?: string | null
                    avatar_url?: string | null
                    total_cooks?: number
                    created_at?: string
                    updated_at?: string
                }
                Update: {
                    id?: string
                    username?: string | null
                    avatar_url?: string | null
                    total_cooks?: number
                    created_at?: string
                    updated_at?: string
                }
            }
            recipes: {
                Row: {
                    recipe_id: string
                    owner_id: string
                    name: string
                    image_url: string | null
                    price: number | null
                    rating: number | null
                    avg_time: number | null
                    created_at: string
                    updated_at: string
                }
                Insert: {
                    recipe_id?: string
                    owner_id: string
                    name: string
                    image_url?: string | null
                    price?: number | null
                    rating?: number | null
                    avg_time?: number | null
                    created_at?: string
                    updated_at?: string
                }
                Update: {
                    recipe_id?: string
                    owner_id?: string
                    name?: string
                    image_url?: string | null
                    price?: number | null
                    rating?: number | null
                    avg_time?: number | null
                    created_at?: string
                    updated_at?: string
                }
            }
            ingredients: {
                Row: {
                    ingredient_id: string
                    name: string
                    created_at: string
                }
                Insert: {
                    ingredient_id?: string
                    name: string
                    created_at?: string
                }
                Update: {
                    ingredient_id?: string
                    name?: string
                    created_at?: string
                }
            }
            recipe_ingredients: {
                Row: {
                    recipe_id: string
                    ingredient_id: string
                    amount: number
                    cup_index: number | null
                    created_at: string
                }
                Insert: {
                    recipe_id: string
                    ingredient_id: string
                    amount: number
                    cup_index?: number | null
                    created_at?: string
                }
                Update: {
                    recipe_id?: string
                    ingredient_id?: string
                    amount?: number
                    cup_index?: number | null
                    created_at?: string
                }
            }
            cooking_steps: {
                Row: {
                    id: string
                    recipe_id: string
                    action: string
                    target_cup: number | null
                    duration: number
                    step_order: number
                    created_at: string
                }
                Insert: {
                    id?: string
                    recipe_id: string
                    action: string
                    target_cup?: number | null
                    duration: number
                    step_order: number
                    created_at?: string
                }
                Update: {
                    id?: string
                    recipe_id?: string
                    action?: string
                    target_cup?: number | null
                    duration?: number
                    step_order?: number
                    created_at?: string
                }
            }
            purchases: {
                Row: {
                    buyer_id: string
                    recipe_id: string
                    amount_paid: number
                    phone_number: string | null
                    receipt_img_url: string | null
                    status: string
                    created_at: string
                    updated_at: string
                }
                Insert: {
                    buyer_id: string
                    recipe_id: string
                    amount_paid: number
                    phone_number?: string | null
                    receipt_img_url?: string | null
                    status?: string
                    created_at?: string
                    updated_at?: string
                }
                Update: {
                    buyer_id?: string
                    recipe_id?: string
                    amount_paid?: number
                    phone_number?: string | null
                    receipt_img_url?: string | null
                    status?: string
                    created_at?: string
                    updated_at?: string
                }
            }
            cooking_history: {
                Row: {
                    id: string
                    user_id: string
                    recipe_id: string | null
                    session_date: string
                    duration: number | null
                    status: string
                    created_at: string
                    updated_at: string
                }
                Insert: {
                    id?: string
                    user_id: string
                    recipe_id?: string | null
                    session_date?: string
                    duration?: number | null
                    status?: string
                    created_at?: string
                    updated_at?: string
                }
                Update: {
                    id?: string
                    user_id?: string
                    recipe_id?: string | null
                    session_date?: string
                    duration?: number | null
                    status?: string
                    created_at?: string
                    updated_at?: string
                }
            }
            notifications: {
                Row: {
                    id: string
                    user_id: string
                    message: string
                    type: string
                    is_read: boolean
                    created_at: string
                }
                Insert: {
                    id?: string
                    user_id: string
                    message: string
                    type: string
                    is_read?: boolean
                    created_at?: string
                }
                Update: {
                    id?: string
                    user_id?: string
                    message?: string
                    type?: string
                    is_read?: boolean
                    created_at?: string
                }
            }
            iot_status: {
                Row: {
                    esp_id: string
                    user_id: string | null
                    connection_status: string
                    last_seen: string
                    created_at: string
                    updated_at: string
                }
                Insert: {
                    esp_id: string
                    user_id?: string | null
                    connection_status?: string
                    last_seen?: string
                    created_at?: string
                    updated_at?: string
                }
                Update: {
                    esp_id?: string
                    user_id?: string | null
                    connection_status?: string
                    last_seen?: string
                    created_at?: string
                    updated_at?: string
                }
            }
            device_state: {
                Row: {
                    id: string
                    temperature: number
                    stir_speed: number
                    status: 'idle' | 'cooking' | 'paused' | 'error'
                    last_updated: string
                }
                Insert: {
                    id?: string
                    temperature: number
                    stir_speed: number
                    status: 'idle' | 'cooking' | 'paused' | 'error'
                    last_updated?: string
                }
                Update: {
                    id?: string
                    temperature?: number
                    stir_speed?: number
                    status?: 'idle' | 'cooking' | 'paused' | 'error'
                    last_updated?: string
                }
            }
            cooking_sessions: {
                Row: {
                    id: string
                    recipe_id: string
                    status: 'ready' | 'active' | 'completed' | 'stopped'
                    current_step: number
                    steps: Json
                    created_at: string
                }
                Insert: {
                    id?: string
                    recipe_id: string
                    status: 'ready' | 'active' | 'completed' | 'stopped'
                    current_step: number
                    steps: Json
                    created_at?: string
                }
                Update: {
                    id?: string
                    recipe_id?: string
                    status?: 'ready' | 'active' | 'completed' | 'stopped'
                    current_step?: number
                    steps?: Json
                    created_at?: string
                }
            }
        }
        Views: {
            [_ in never]: never
        }
        Functions: {
            [_ in never]: never
        }
        Enums: {
            [_ in never]: never
        }
    }
}
