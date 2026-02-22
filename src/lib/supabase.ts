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
          delivery_enabled: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          slug: string;
          bank_name: string;
          account_number: string;
          account_name: string;
          subscription_status?: 'active' | 'expired' | 'trial';
          subscription_expires_at: string;
          delivery_enabled?: boolean;
          created_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          slug?: string;
          bank_name?: string;
          account_number?: string;
          account_name?: string;
          subscription_status?: 'active' | 'expired' | 'trial';
          subscription_expires_at?: string;
          delivery_enabled?: boolean;
          created_at?: string;
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
        Insert: {
          id: string;
          restaurant_id?: string | null;
          role?: Role;
          full_name: string;
          email: string;
          phone: string;
        };
        Update: {
          id?: string;
          restaurant_id?: string | null;
          role?: Role;
          full_name?: string;
          email?: string;
          phone?: string;
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
          quantity: number | null;
        };
        Insert: {
          id?: string;
          restaurant_id: string;
          category_id: string;
          name: string;
          description: string;
          price: number;
          image_url: string;
          available?: boolean;
          quantity?: number | null;
        };
        Update: {
          id?: string;
          restaurant_id?: string;
          category_id?: string;
          name?: string;
          description?: string;
          price?: number;
          image_url?: string;
          available?: boolean;
          quantity?: number | null;
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
          note: string | null;
          delivery_method: 'delivery' | 'pickup' | 'dine_in';
          created_at: string;
        };
        Insert: {
          id?: string;
          restaurant_id: string;
          customer_id?: string | null;
          table_id?: string | null;
          order_type: 'online' | 'preorder' | 'dine_in';
          status?: 'pending_payment' | 'awaiting_confirmation' | 'confirmed' | 'preparing' | 'ready' | 'completed' | 'cancelled';
          total_amount: number;
          payment_reference?: string | null;
          payment_proof_url?: string | null;
          buyer_transfer_name?: string | null;
          note?: string | null;
          delivery_method?: 'delivery' | 'pickup' | 'dine_in';
          created_at?: string;
        };
        Update: {
          id?: string;
          restaurant_id?: string;
          customer_id?: string | null;
          table_id?: string | null;
          order_type?: 'online' | 'preorder' | 'dine_in';
          status?: 'pending_payment' | 'awaiting_confirmation' | 'confirmed' | 'preparing' | 'ready' | 'completed' | 'cancelled';
          total_amount?: number;
          payment_reference?: string | null;
          payment_proof_url?: string | null;
          buyer_transfer_name?: string | null;
          note?: string | null;
          delivery_method?: 'delivery' | 'pickup' | 'dine_in';
          created_at?: string;
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
      pending_restaurants: {
        Row: {
          tx_ref: string;
          user_id: string;
          restaurant_name: string;
          slug: string;
          bank_name: string;
          account_number: string;
          account_name: string;
          created_at: string;
          expires_at: string;
        };
        Insert: {
          tx_ref: string;
          user_id: string;
          restaurant_name: string;
          slug: string;
          bank_name: string;
          account_number: string;
          account_name: string;
          created_at?: string;
          expires_at?: string;
        };
        Update: {
          tx_ref?: string;
          user_id?: string;
          restaurant_name?: string;
          slug?: string;
          bank_name?: string;
          account_number?: string;
          account_name?: string;
          created_at?: string;
          expires_at?: string;
        };
      };
    };
  };
}