export type OrderStatus = 
  | 'pending_payment' 
  | 'awaiting_confirmation' 
  | 'confirmed' 
  | 'preparing' 
  | 'ready' 
  | 'completed' 
  | 'cancelled';

export type OrderType = 'online' | 'preorder' | 'dine_in';

export interface Restaurant {
  id: string;
  name: string;
  slug: string;
  bank_name: string;
  account_number: string;
  account_name: string;
  subscription_status: 'active' | 'expired' | 'trial';
  subscription_expires_at: string;
}

export interface Order {
  id: string;
  restaurant_id: string;
  customer_id: string | null;
  table_id: string | null;
  order_type: OrderType;
  status: OrderStatus;
  total_amount: number;
  payment_proof_url: string | null;
  buyer_transfer_name: string | null;
  created_at: string;
}

export interface MenuItem {
  id: string;
  restaurant_id: string;
  category_id: string;
  name: string;
  description: string;
  price: number;
  image_url: string;
  available: boolean;
}