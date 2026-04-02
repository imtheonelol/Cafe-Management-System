import type { Product, CartItem, Profile, Shift, Category, Order } from '../lib/database.types';

const SESSION_KEY = 'cafe_pos_session';
let authListeners: ((session: any) => void)[] = [];

async function sqlRequest(payload: any) {
  const res = await fetch('/api/sql', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
  return await res.json();
}

function generateId() { return Math.random().toString(36).substring(2, 15); }

export const ApiService = {
  async ensureInit() {
    await sqlRequest({ action: 'QUERY', query: 'SELECT 1' });
  },

  async login(email: string, password: string) {
    const users = await sqlRequest({ 
      action: 'QUERY', 
      query: 'SELECT * FROM profiles WHERE email = ? AND password = ?', 
      params: [email, password] 
    });
    if (!users || users.length === 0) throw new Error("Invalid credentials.");
    const user = users[0];
    const session = { user: { id: user.id, email: user.email } };
    localStorage.setItem(SESSION_KEY, JSON.stringify(session));
    authListeners.forEach(l => l(session));
    return session;
  },

  onAuthStateChange(callback: (session: any) => void) {
    authListeners.push(callback);
    return { unsubscribe: () => { authListeners = authListeners.filter(l => l !== callback); } };
  },

  async getSession() {
    const sessionStr = localStorage.getItem(SESSION_KEY);
    return sessionStr ? JSON.parse(sessionStr) : null;
  },

  async getProfile(userId: string) {
    const rows = await sqlRequest({ action: 'QUERY', query: 'SELECT * FROM profiles WHERE id = ?', params: [userId] });
    return rows[0] || null;
  },

  async logout() {
    localStorage.removeItem(SESSION_KEY);
    authListeners.forEach(l => l(null));
  },

  async getProfiles() { return await sqlRequest({ action: 'SELECT_ALL', table: 'profiles' }); },
  async addProfile(data: any) { await sqlRequest({ action: 'INSERT', table: 'profiles', data: { ...data, id: generateId(), created_at: new Date().toISOString() } }); },
  async deleteProfile(id: string) { await sqlRequest({ action: 'DELETE', table: 'profiles', id }); },
  async updateProfile(id: string, data: any) { await sqlRequest({ action: 'UPDATE', table: 'profiles', data, id }); },

  async getProducts() { 
    const products = await sqlRequest({ action: 'SELECT_ALL', table: 'products' });
    return products.map((p: any) => ({ ...p, price: parseFloat(p.price) })); // PG returns NUMERIC as string
  },
  async getCategories() { return await sqlRequest({ action: 'SELECT_ALL', table: 'categories' }); },
  
  async addProduct(data: any) { await sqlRequest({ action: 'INSERT', table: 'products', data: { ...data, id: generateId(), created_at: new Date().toISOString() } }); },
  async updateProduct(id: string, data: any) { await sqlRequest({ action: 'UPDATE', table: 'products', data, id }); },
  async deleteProduct(id: string) { await sqlRequest({ action: 'DELETE', table: 'products', id }); },

  async uploadImage(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  },

  async createOrder(employeeId: string, cartItems: CartItem[], total: number, paymentMethod: string, receiptNumber: string) {
    const orderId = generateId();
    const orderData = {
      id: orderId, order_number: `ORD-${Date.now()}`, total, payment_method: paymentMethod,
      payment_status: 'completed', receipt_number: receiptNumber, employee_id: employeeId, created_at: new Date().toISOString()
    };
    await sqlRequest({ action: 'INSERT', table: 'orders', data: orderData });
    for (const item of cartItems) {
      await sqlRequest({ action: 'INSERT', table: 'order_items', data: {
        id: generateId(), order_id: orderId, product_id: item.id, quantity: item.cartQuantity,
        price: item.price, subtotal: item.price * item.cartQuantity, created_at: new Date().toISOString()
      }});
      await sqlRequest({ action: 'QUERY', query: 'UPDATE products SET stock = stock - ? WHERE id = ?', params: [item.cartQuantity, item.id] });
    }
    window.dispatchEvent(new Event('db_changed'));
    return orderData;
  },

  async getActiveShift(employeeId: string) {
    const rows = await sqlRequest({ action: 'QUERY', query: 'SELECT * FROM shifts WHERE employee_id = ? AND end_time IS NULL', params: [employeeId] });
    return rows[0] || null;
  },

  async getLastShift() {
    const rows = await sqlRequest({ action: 'QUERY', query: 'SELECT * FROM shifts WHERE end_time IS NOT NULL ORDER BY end_time DESC LIMIT 1' });
    if(rows.length === 0) return null;
    return { ...rows[0], ending_cash: parseFloat(rows[0].ending_cash) };
  },

  async startShift(employeeId: string, startingCash: number) {
    const id = generateId();
    const data = { id, employee_id: employeeId, starting_cash: startingCash, start_time: new Date().toISOString() };
    await sqlRequest({ action: 'INSERT', table: 'shifts', data });
    return data;
  },

  async getCashSalesForShift(employeeId: string, startTime: string) {
    const rows = await sqlRequest({ action: 'QUERY', query: 'SELECT total FROM orders WHERE employee_id = ? AND payment_method = "cash" AND created_at >= ?', params: [employeeId, startTime] });
    return rows.reduce((sum: number, o: any) => sum + parseFloat(o.total), 0);
  },

  async endShift(shiftId: string, endingCash: number, expectedCash: number) {
    await sqlRequest({ action: 'UPDATE', table: 'shifts', id: shiftId, data: {
      ending_cash: endingCash, expected_cash: expectedCash, end_time: new Date().toISOString()
    }});
  },

  async getAdminDashboardData() {
    const orders = await sqlRequest({ action: 'QUERY', query: 'SELECT o.*, p.email, p.full_name FROM orders o LEFT JOIN profiles p ON o.employee_id = p.id ORDER BY o.created_at DESC' });
    const shifts = await sqlRequest({ action: 'QUERY', query: 'SELECT s.*, p.email, p.full_name FROM shifts s LEFT JOIN profiles p ON s.employee_id = p.id ORDER BY s.start_time DESC' });
    return {
      orders: orders.map((o: any) => ({ ...o, total: parseFloat(o.total), profiles: { email: o.email, full_name: o.full_name } })),
      shifts: shifts.map((s: any) => ({ ...s, starting_cash: parseFloat(s.starting_cash), ending_cash: s.ending_cash ? parseFloat(s.ending_cash) : null, expected_cash: s.expected_cash ? parseFloat(s.expected_cash) : null, profiles: { email: s.email, full_name: s.full_name } })),
      employees: await this.getProfiles()
    };
  }
};