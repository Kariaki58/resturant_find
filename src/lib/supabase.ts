export type Role = 'platform_admin' | 'restaurant_owner' | 'restaurant_staff' | 'customer';
export type SubscriptionStatus = 'active' | 'expired' | 'trial';
export type SubscriptionPlan = 'monthly' | 'yearly';
export type OrderStatus =
  | 'pending_payment'
  | 'awaiting_confirmation'
  | 'confirmed'
  | 'preparing'
  | 'ready'
  | 'completed'
  | 'cancelled';
export type DeliveryMethod = 'delivery' | 'pickup' | 'dine_in';

export interface Database {
  public: {
    Tables: {
      // ────────────────────────────────────────────────────────────────────
      // restaurants
      // ────────────────────────────────────────────────────────────────────
      restaurants: {
        Row: {
          id: string;
          name: string;
          slug: string;
          description: string | null;
          logo_url: string | null;
          banner_url: string | null;
          bank_name: string;
          account_number: string;
          account_name: string;
          delivery_enabled: boolean;
          subscription_status: SubscriptionStatus;
          subscription_expires_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          slug: string;
          description?: string | null;
          logo_url?: string | null;
          banner_url?: string | null;
          bank_name: string;
          account_number: string;
          account_name: string;
          delivery_enabled?: boolean;
          subscription_status?: SubscriptionStatus;
          subscription_expires_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          slug?: string;
          description?: string | null;
          logo_url?: string | null;
          banner_url?: string | null;
          bank_name?: string;
          account_number?: string;
          account_name?: string;
          delivery_enabled?: boolean;
          subscription_status?: SubscriptionStatus;
          subscription_expires_at?: string | null;
          updated_at?: string;
        };
      };

      // ────────────────────────────────────────────────────────────────────
      // users (public profile — lazy-created by the app, never by a trigger)
      // ────────────────────────────────────────────────────────────────────
      users: {
        Row: {
          id: string;
          restaurant_id: string | null;
          role: Role;
          full_name: string;
          email: string;
          phone: string;
          avatar_url: string | null;
          onboarding_complete: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          restaurant_id?: string | null;
          role?: Role;
          full_name: string;
          email: string;
          phone?: string;
          avatar_url?: string | null;
          onboarding_complete?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          restaurant_id?: string | null;
          role?: Role;
          full_name?: string;
          email?: string;
          phone?: string;
          avatar_url?: string | null;
          onboarding_complete?: boolean;
          updated_at?: string;
        };
      };

      // ────────────────────────────────────────────────────────────────────
      // subscriptions
      // ────────────────────────────────────────────────────────────────────
      subscriptions: {
        Row: {
          id: string;
          restaurant_id: string;
          user_id: string;
          plan: SubscriptionPlan;
          status: 'active' | 'expired' | 'cancelled' | 'trial';
          amount_paid: number | null;
          currency: string;
          flutterwave_tx_ref: string | null;
          flutterwave_tx_id: string | null;
          period_start: string;
          period_end: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          restaurant_id: string;
          user_id: string;
          plan?: SubscriptionPlan;
          status?: 'active' | 'expired' | 'cancelled' | 'trial';
          amount_paid?: number | null;
          currency?: string;
          flutterwave_tx_ref?: string | null;
          flutterwave_tx_id?: string | null;
          period_start?: string;
          period_end: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          restaurant_id?: string;
          user_id?: string;
          plan?: SubscriptionPlan;
          status?: 'active' | 'expired' | 'cancelled' | 'trial';
          amount_paid?: number | null;
          currency?: string;
          flutterwave_tx_ref?: string | null;
          flutterwave_tx_id?: string | null;
          period_start?: string;
          period_end?: string;
        };
      };

      // ────────────────────────────────────────────────────────────────────
      // tables
      // ────────────────────────────────────────────────────────────────────
      tables: {
        Row: {
          id: string;
          restaurant_id: string;
          table_number: number;
          qr_code_url: string;
          status: 'available' | 'occupied';
          created_at: string;
        };
        Insert: {
          id?: string;
          restaurant_id: string;
          table_number: number;
          qr_code_url?: string;
          status?: 'available' | 'occupied';
          created_at?: string;
        };
        Update: {
          id?: string;
          restaurant_id?: string;
          table_number?: number;
          qr_code_url?: string;
          status?: 'available' | 'occupied';
        };
      };

      // ────────────────────────────────────────────────────────────────────
      // menu_categories
      // ────────────────────────────────────────────────────────────────────
      menu_categories: {
        Row: {
          id: string;
          restaurant_id: string;
          name: string;
          sort_order: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          restaurant_id: string;
          name: string;
          sort_order?: number;
          created_at?: string;
        };
        Update: {
          id?: string;
          restaurant_id?: string;
          name?: string;
          sort_order?: number;
        };
      };

      // ────────────────────────────────────────────────────────────────────
      // menu_items
      // ────────────────────────────────────────────────────────────────────
      menu_items: {
        Row: {
          id: string;
          restaurant_id: string;
          category_id: string;
          name: string;
          description: string | null;
          price: number;
          image_url: string | null;
          available: boolean;
          quantity: number | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          restaurant_id: string;
          category_id: string;
          name: string;
          description?: string | null;
          price: number;
          image_url?: string | null;
          available?: boolean;
          quantity?: number | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          restaurant_id?: string;
          category_id?: string;
          name?: string;
          description?: string | null;
          price?: number;
          image_url?: string | null;
          available?: boolean;
          quantity?: number | null;
          updated_at?: string;
        };
      };

      // ────────────────────────────────────────────────────────────────────
      // orders
      // ────────────────────────────────────────────────────────────────────
      orders: {
        Row: {
          id: string;
          restaurant_id: string;
          customer_id: string | null;
          table_id: string | null;
          order_type: 'online' | 'preorder' | 'dine_in';
          status: OrderStatus;
          delivery_method: DeliveryMethod | null;
          total_amount: number;
          payment_reference: string | null;
          payment_proof_url: string | null;
          buyer_transfer_name: string | null;
          note: string | null;
          delivery_address: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          restaurant_id: string;
          customer_id?: string | null;
          table_id?: string | null;
          order_type: 'online' | 'preorder' | 'dine_in';
          status?: OrderStatus;
          delivery_method?: DeliveryMethod | null;
          total_amount: number;
          payment_reference?: string | null;
          payment_proof_url?: string | null;
          buyer_transfer_name?: string | null;
          note?: string | null;
          delivery_address?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          restaurant_id?: string;
          customer_id?: string | null;
          table_id?: string | null;
          order_type?: 'online' | 'preorder' | 'dine_in';
          status?: OrderStatus;
          delivery_method?: DeliveryMethod | null;
          total_amount?: number;
          payment_reference?: string | null;
          payment_proof_url?: string | null;
          buyer_transfer_name?: string | null;
          note?: string | null;
          delivery_address?: string | null;
          updated_at?: string;
        };
      };

      // ────────────────────────────────────────────────────────────────────
      // order_items
      // ────────────────────────────────────────────────────────────────────
      order_items: {
        Row: {
          id: string;
          order_id: string;
          menu_item_id: string;
          quantity: number;
          price: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          order_id: string;
          menu_item_id: string;
          quantity?: number;
          price: number;
          created_at?: string;
        };
        Update: {
          id?: string;
          order_id?: string;
          menu_item_id?: string;
          quantity?: number;
          price?: number;
        };
      };

      // ────────────────────────────────────────────────────────────────────
      // pending_restaurants (server-side fallback for checkout session data)
      // ────────────────────────────────────────────────────────────────────
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