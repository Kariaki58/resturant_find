import { createClient } from '@supabase/supabase-js';

export type Role = 'platform_admin' | 'restaurant_owner' | 'restaurant_staff' | 'customer';

export interface Database {
  public: {
    Tables: {
      restaurants: {
        Row: {
          id: string;
          name: string;
          slug: string;
          bank_name: string;
          account_number: string;
          account_name: string;
          subscription_status: 'active' | 'expired' | 'trial';
          subscription_expires_at: string;
          created_at: string;
        };
      };
      users: {
        Row: {
          id: string;
          restaurant_id: string | null;
          role: Role;
          full_name: string;
          email: string;
          phone: string;
        };
      };
      tables: {
        Row: {
          id: string;
          restaurant_id: string;
          table_number: number;
          qr_code_url: string;
          status: 'available' | 'occupied';
        };
      };
      menu_categories: {
        Row: {
          id: string;
          restaurant_id: string;
          name: string;
        };
      };
      menu_items: {
        Row: {
          id: string;
          restaurant_id: string;
          category_id: string;
          name: string;
          description: string;
          price: number;
          image_url: string;
          available: boolean;
        };
      };
      orders: {
        Row: {
          id: string;
          restaurant_id: string;
          customer_id: string | null;
          table_id: string | null;
          order_type: 'online' | 'preorder' | 'dine_in';
          status: 'pending_payment' | 'awaiting_confirmation' | 'confirmed' | 'preparing' | 'ready' | 'completed' | 'cancelled';
          total_amount: number;
          payment_reference: string | null;
          payment_proof_url: string | null;
          buyer_transfer_name: string | null;
          created_at: string;
        };
      };
      order_items: {
        Row: {
          id: string;
          order_id: string;
          menu_item_id: string;
          quantity: number;
          price: number;
        };
      };
    };
  };
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey);