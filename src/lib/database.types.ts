export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: { id: string; email: string; password?: string; full_name: string | null; role: 'admin' | 'employee'; created_at: string; };
        Insert: { id?: string; email: string; password?: string; full_name?: string | null; role?: 'admin' | 'employee'; created_at?: string; };
        Update: { id?: string; email?: string; password?: string; full_name?: string | null; role?: 'admin' | 'employee'; created_at?: string; };
      };
      shifts: {
        Row: { id: string; employee_id: string; starting_cash: number; start_time: string; ending_cash: number | null; expected_cash: number | null; end_time: string | null; };
        Insert: { id?: string; employee_id: string; starting_cash: number; start_time?: string; ending_cash?: number | null; expected_cash?: number | null; end_time?: string | null; };
        Update: { id?: string; employee_id?: string; starting_cash?: number; start_time?: string; ending_cash?: number | null; expected_cash?: number | null; end_time?: string | null; };
      };
      categories: {
        Row: { id: string; name: string; created_at: string; };
        Insert: { id?: string; name: string; created_at?: string; };
        Update: { id?: string; name?: string; created_at?: string; };
      };
      products: {
        Row: { id: string; category_id: string; name: string; description: string; price: number; image_url: string; stock: number; is_available: boolean; created_at: string; };
        Insert: { id?: string; category_id: string; name: string; description?: string; price: number; image_url?: string; stock?: number; is_available?: boolean; created_at?: string; };
        Update: { id?: string; category_id?: string; name?: string; description?: string; price?: number; image_url?: string; stock?: number; is_available?: boolean; created_at?: string; };
      };
      orders: {
        Row: { id: string; order_number: string; total: number; payment_method: string; payment_status: string; receipt_number: string | null; employee_id: string | null; created_at: string; };
        Insert: { id?: string; order_number: string; total: number; payment_method: string; payment_status?: string; receipt_number?: string | null; employee_id?: string | null; created_at?: string; };
        Update: { id?: string; order_number?: string; total?: number; payment_method?: string; payment_status?: string; receipt_number?: string | null; employee_id?: string | null; created_at?: string; };
      };
      order_items: {
        Row: { id: string; order_id: string; product_id: string; quantity: number; price: number; subtotal: number; created_at: string; };
        Insert: { id?: string; order_id: string; product_id: string; quantity: number; price: number; subtotal: number; created_at?: string; };
        Update: { id?: string; order_id?: string; product_id?: string; quantity?: number; price?: number; subtotal?: number; created_at?: string; };
      };
    };
  };
}

export type Profile = Database['public']['Tables']['profiles']['Row'];
export type Shift = Database['public']['Tables']['shifts']['Row'];
export type Category = Database['public']['Tables']['categories']['Row'];
export type Product = Database['public']['Tables']['products']['Row'];
export type Order = Database['public']['Tables']['orders']['Row'];
export type OrderItem = Database['public']['Tables']['order_items']['Row'];
export interface CartItem extends Product { cartQuantity: number; }