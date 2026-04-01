import { supabase } from '../lib/supabase';
import type { Product, CartItem } from '../lib/database.types';

export const ApiService = {
  // --- Auth Services ---
  async getSession() {
    const { data } = await supabase.auth.getSession();
    return data.session;
  },
  onAuthStateChange(callback: (session: any) => void) {
    return supabase.auth.onAuthStateChange((_event, session) => {
      callback(session);
    });
  },
  async getProfile(userId: string) {
    const { data } = await supabase.from('profiles').select('*').eq('id', userId).single();
    return data;
  },
  async logout() {
    await supabase.auth.signOut();
  },

  // --- Catalog Services ---
  async getCategories() {
    const { data } = await supabase.from('categories').select('*').order('name');
    return data || [];
  },
  async getProducts() {
    const { data } = await supabase.from('products').select('*').order('name');
    return data || [];
  },
  async addProduct(product: Omit<Product, 'id' | 'created_at'>) {
    const { error } = await supabase.from('products').insert(product);
    if (error) throw error;
  },
  async updateProduct(id: string, updates: Partial<Product>) {
    const { error } = await supabase.from('products').update(updates).eq('id', id);
    if (error) throw error;
  },
  async deleteProduct(id: string) {
    const { error } = await supabase.from('products').delete().eq('id', id);
    if (error) throw error;
  },
  async uploadImage(file: File) {
    const fileExt = file.name.split('.').pop();
    const fileName = `${Math.random()}.${fileExt}`;
    const { error } = await supabase.storage.from('products').upload(fileName, file);
    if (error) throw error;
    const { data } = supabase.storage.from('products').getPublicUrl(fileName);
    return data.publicUrl;
  },

  // --- Order Services ---
  async createOrder(employeeId: string, cartItems: CartItem[], total: number, paymentMethod: string, receiptNumber: string) {
    const { data: order, error: orderError } = await supabase.from('orders').insert({
      order_number: `ORD-${Date.now()}`,
      total,
      payment_method: paymentMethod,
      payment_status: 'completed',
      receipt_number: receiptNumber,
      employee_id: employeeId
    }).select().single();

    if (orderError) throw orderError;

    const orderItemsData = cartItems.map(item => ({
      order_id: order.id,
      product_id: item.id,
      quantity: item.cartQuantity,
      price: item.price,
      subtotal: item.price * item.cartQuantity
    }));

    await supabase.from('order_items').insert(orderItemsData);

    for (const item of cartItems) {
      await supabase.from('products').update({ stock: item.stock - item.cartQuantity }).eq('id', item.id);
    }
    return order;
  },

  // --- Shift Services ---
  async getActiveShift(employeeId: string) {
    const { data } = await supabase.from('shifts')
      .select('*').eq('employee_id', employeeId).is('end_time', null).single();
    return data;
  },
  // NEW: Fetch the last ended shift to check expected drawer cash
  async getLastShift() {
    const { data } = await supabase
      .from('shifts')
      .select('*')
      .not('end_time', 'is', null)
      .order('end_time', { ascending: false })
      .limit(1)
      .maybeSingle();
    return data;
  },
  async startShift(employeeId: string, startingCash: number) {
    const { data, error } = await supabase.from('shifts').insert({
      employee_id: employeeId,
      starting_cash: startingCash
    }).select().single();
    if (error) throw error;
    return data;
  },
  async getCashSalesForShift(employeeId: string, startTime: string) {
    const { data } = await supabase.from('orders')
      .select('total').eq('employee_id', employeeId).eq('payment_method', 'cash').gte('created_at', startTime);
    return data?.reduce((sum, order) => sum + order.total, 0) || 0;
  },
  async endShift(shiftId: string, endingCash: number, expectedCash: number) {
    const { error } = await supabase.from('shifts').update({
      ending_cash: endingCash,
      expected_cash: expectedCash,
      end_time: new Date().toISOString()
    }).eq('id', shiftId);
    if (error) throw error;
  },

  // --- Admin Services ---
  async getAdminDashboardData() {
    const [ordersRes, shiftsRes, profilesRes] = await Promise.all([
      supabase.from('orders').select('*, profiles(email, full_name)').order('created_at', { ascending: false }),
      supabase.from('shifts').select('*, profiles(email, full_name)').order('start_time', { ascending: false }),
      supabase.from('profiles').select('id, email, full_name, role')
    ]);
    return {
      orders: ordersRes.data || [],
      shifts: shiftsRes.data || [],
      employees: profilesRes.data || []
    };
  }
};