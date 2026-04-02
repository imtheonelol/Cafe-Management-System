import type { Product, CartItem, Profile, Shift, Category, Order, Ingredient } from '../lib/database.types';

const SESSION_KEY = 'cafe_pos_session';
let authListeners: ((session: any) => void)[] = [];

async function sqlRequest(payload: any) {
  const res = await fetch('/api/sql', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Database Error");
  return data;
}

function generateId() { return Math.random().toString(36).substring(2, 15); }

export const ApiService = {
  async ensureInit() { await sqlRequest({ action: 'QUERY', query: 'SELECT 1' }); },
  async checkConnection() { try { await this.ensureInit(); return true; } catch { return false; } },
  
  async login(email: string, password: string) {
    const users = await sqlRequest({ action: 'QUERY', query: 'SELECT * FROM profiles WHERE email = ? AND password = ?', params: [email, password] });
    if (!users || users.length === 0) throw new Error("Invalid credentials.");
    const session = { user: { id: users[0].id, email: users[0].email } };
    localStorage.setItem(SESSION_KEY, JSON.stringify(session));
    authListeners.forEach(l => l(session));
    return session;
  },

  onAuthStateChange(callback: (session: any) => void) { authListeners.push(callback); return { unsubscribe: () => { authListeners = authListeners.filter(l => l !== callback); } }; },
  async getSession() { const s = localStorage.getItem(SESSION_KEY); return s ? JSON.parse(s) : null; },
  async getProfile(userId: string) { const r = await sqlRequest({ action: 'QUERY', query: 'SELECT * FROM profiles WHERE id = ?', params: [userId] }); return r[0] || null; },
  async logout() { localStorage.removeItem(SESSION_KEY); authListeners.forEach(l => l(null)); },
  async getProfiles() { return await sqlRequest({ action: 'QUERY', query: 'SELECT * FROM profiles ORDER BY created_at DESC' }); },

  async getSettings() { const rows = await sqlRequest({ action: 'QUERY', query: 'SELECT * FROM settings' }); return rows.reduce((acc: any, row: any) => ({ ...acc, [row.key]: row.value }), {}); },
  async updateSetting(key: string, value: string) { await sqlRequest({ action: 'QUERY', query: 'UPDATE settings SET value = ? WHERE key = ?', params: [value, key] }); },

  async addProfile(data: any) { await sqlRequest({ action: 'INSERT', table: 'profiles', data: { ...data, id: generateId(), created_at: new Date().toISOString() } }); },
  async deleteProfile(id: string) { await sqlRequest({ action: 'DELETE', table: 'profiles', id }); },
  async updateProfile(id: string, data: any) { await sqlRequest({ action: 'UPDATE', table: 'profiles', data, id }); },

  async getCategories() { return await sqlRequest({ action: 'QUERY', query: 'SELECT * FROM categories ORDER BY name' }); },
  async getProducts() { const r = await sqlRequest({ action: 'QUERY', query: 'SELECT * FROM products ORDER BY name' }); return r.map((p: any) => ({...p, price: parseFloat(p.price)})); },
  async addProduct(data: any) { await sqlRequest({ action: 'INSERT', table: 'products', data: { ...data, id: generateId(), created_at: new Date().toISOString() } }); },
  async updateProduct(id: string, data: any) { await sqlRequest({ action: 'UPDATE', table: 'products', data, id }); },
  async deleteProduct(id: string) { await sqlRequest({ action: 'DELETE', table: 'products', id }); },
  async uploadImage(file: File): Promise<string> { return new Promise((res, rej) => { const r = new FileReader(); r.onload = () => res(r.result as string); r.onerror = rej; r.readAsDataURL(file); }); },

  async getIngredients() { const r = await sqlRequest({ action: 'QUERY', query: 'SELECT * FROM ingredients ORDER BY name' }); return r.map((i: any) => ({...i, stock: parseFloat(i.stock)})); },
  async addIngredient(data: any) { await sqlRequest({ action: 'INSERT', table: 'ingredients', data: { ...data, id: generateId(), created_at: new Date().toISOString() }}); },
  async deleteIngredient(id: string) { await sqlRequest({ action: 'DELETE', table: 'ingredients', id }); },

  async createOrder(employeeId: string, cartItems: CartItem[], total: number, taxAmount: number, discountType: string, paymentMethod: string, receiptNumber: string) {
    const orderId = generateId();
    const orderData = { id: orderId, order_number: `ORD-${Date.now()}`, total, tax_amount: taxAmount, discount_type: discountType, payment_method: paymentMethod, payment_status: 'completed', fulfillment_status: 'pending', receipt_number: receiptNumber, employee_id: employeeId, created_at: new Date().toISOString() };
    await sqlRequest({ action: 'INSERT', table: 'orders', data: orderData });

    for (const item of cartItems) {
      await sqlRequest({ action: 'INSERT', table: 'order_items', data: { id: generateId(), order_id: orderId, product_id: item.id, quantity: item.cartQuantity, price: item.price, subtotal: item.price * item.cartQuantity, created_at: new Date().toISOString() }});
      await sqlRequest({ action: 'QUERY', query: 'UPDATE products SET stock = stock - ? WHERE id = ?', params: [item.cartQuantity, item.id] });
      const pIngs = await sqlRequest({ action: 'QUERY', query: 'SELECT * FROM product_ingredients WHERE product_id = ?', params: [item.id]});
      for (const pi of pIngs) {
        await sqlRequest({ action: 'QUERY', query: 'UPDATE ingredients SET stock = stock - ? WHERE id = ?', params: [parseFloat(pi.quantity) * item.cartQuantity, pi.ingredient_id] });
      }
    }
    window.dispatchEvent(new Event('db_changed'));
    return orderData;
  },

  async getActiveShift(employeeId: string) {
    const rows = await sqlRequest({ action: 'QUERY', query: 'SELECT * FROM shifts WHERE employee_id = ? AND end_time IS NULL', params: [employeeId] });
    const shift = rows[0] || null;
    if (shift) {
      const settings = await this.getSettings();
      const [hours, minutes] = (settings.business_day_start || '08:00').split(':').map(Number);
      const now = new Date();
      let bizStart = new Date(now); bizStart.setHours(hours, minutes, 0, 0);
      if (now < bizStart) bizStart.setDate(bizStart.getDate() - 1);
      
      if (new Date(shift.start_time) < bizStart) {
        const expectedSales = await this.getCashSalesForShift(employeeId, shift.start_time);
        await this.endShift(shift.id, parseFloat(shift.starting_cash) + expectedSales, parseFloat(shift.starting_cash) + expectedSales);
        return null;
      }
    }
    return shift;
  },
  
  async getLastShift() { const r = await sqlRequest({ action: 'QUERY', query: 'SELECT * FROM shifts WHERE end_time IS NOT NULL ORDER BY end_time DESC LIMIT 1' }); return r[0] ? {...r[0], ending_cash: parseFloat(r[0].ending_cash)} : null; },
  async startShift(employeeId: string, startingCash: number) { const data = { id: generateId(), employee_id: employeeId, starting_cash: startingCash, start_time: new Date().toISOString() }; await sqlRequest({ action: 'INSERT', table: 'shifts', data }); return data; },
  
  // 🐛 BUG FIXED: Replaced "cash" with 'cash' so PostgreSQL reads it properly
  async getCashSalesForShift(employeeId: string, startTime: string) { 
    const r = await sqlRequest({ action: 'QUERY', query: "SELECT total FROM orders WHERE employee_id = ? AND payment_method = 'cash' AND created_at >= ?", params: [employeeId, startTime] }); 
    return r.reduce((sum: number, o: any) => sum + parseFloat(o.total), 0); 
  },

  // ✨ NEW: Gets a breakdown of ALL sales for the Z-Reading Print
  async getShiftSalesBreakdown(employeeId: string, startTime: string) {
    const r = await sqlRequest({ action: 'QUERY', query: "SELECT payment_method, total FROM orders WHERE employee_id = ? AND created_at >= ?", params: [employeeId, startTime] });
    const breakdown = { total: 0, cash: 0, card: 0, online: 0 };
    r.forEach((o: any) => {
      const amount = parseFloat(o.total);
      breakdown.total += amount;
      if (o.payment_method === 'cash') breakdown.cash += amount;
      else if (o.payment_method === 'card') breakdown.card += amount;
      else if (o.payment_method === 'online') breakdown.online += amount;
    });
    return breakdown;
  },
  
  async endShift(shiftId: string, endingCash: number, expectedCash: number) { await sqlRequest({ action: 'UPDATE', table: 'shifts', id: shiftId, data: { ending_cash: endingCash, expected_cash: expectedCash, end_time: new Date().toISOString() }}); },

  async getAdminDashboardData() {
    const orders = await sqlRequest({ action: 'QUERY', query: 'SELECT o.*, p.email, p.full_name FROM orders o LEFT JOIN profiles p ON o.employee_id = p.id ORDER BY o.created_at DESC' });
    const shifts = await sqlRequest({ action: 'QUERY', query: 'SELECT s.*, p.email, p.full_name FROM shifts s LEFT JOIN profiles p ON s.employee_id = p.id ORDER BY s.start_time DESC' });
    return {
      orders: orders.map((o: any) => ({ ...o, total: parseFloat(o.total), profiles: { email: o.email, full_name: o.full_name } })),
      shifts: shifts.map((s: any) => ({ ...s, starting_cash: parseFloat(s.starting_cash), ending_cash: s.ending_cash ? parseFloat(s.ending_cash) : null, expected_cash: s.expected_cash ? parseFloat(s.expected_cash) : null, profiles: { email: s.email, full_name: s.full_name } })),
    };
  }
};