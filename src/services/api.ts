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
  async ensureInit() { await sqlRequest({ action: 'QUERY', query: 'SELECT 1' }); },

  async login(email: string, password: string) {
    const users = await sqlRequest({ action: 'QUERY', query: 'SELECT * FROM profiles WHERE email = ? AND password = ?', params: [email, password] });
    if (!users || users.length === 0) throw new Error("Invalid credentials.");
    const session = { user: { id: users[0].id, email: users[0].email } };
    localStorage.setItem(SESSION_KEY, JSON.stringify(session));
    authListeners.forEach(l => l(session));
    return session;
  },

  onAuthStateChange(callback: (session: any) => void) {
    authListeners.push(callback);
    return { unsubscribe: () => { authListeners = authListeners.filter(l => l !== callback); } };
  },
  async getSession() { const s = localStorage.getItem(SESSION_KEY); return s ? JSON.parse(s) : null; },
  async getProfile(userId: string) { const r = await sqlRequest({ action: 'QUERY', query: 'SELECT * FROM profiles WHERE id = ?', params: [userId] }); return r[0] || null; },
  async logout() { localStorage.removeItem(SESSION_KEY); authListeners.forEach(l => l(null)); },

  // --- Settings ---
  async getSettings() {
    const rows = await sqlRequest({ action: 'QUERY', query: 'SELECT * FROM settings' });
    return rows.reduce((acc: any, row: any) => ({ ...acc, [row.key]: row.value }), {});
  },
  async updateSetting(key: string, value: string) {
    await sqlRequest({ action: 'QUERY', query: 'UPDATE settings SET value = ? WHERE key = ?', params: [value, key] });
  },

  // --- Management ---
  async getProfiles() { return await sqlRequest({ action: 'SELECT_ALL', table: 'profiles' }); },
  async addProfile(data: any) { await sqlRequest({ action: 'INSERT', table: 'profiles', data: { ...data, id: generateId(), created_at: new Date().toISOString() } }); },
  async deleteProfile(id: string) { await sqlRequest({ action: 'DELETE', table: 'profiles', id }); },
  async updateProfile(id: string, data: any) { await sqlRequest({ action: 'UPDATE', table: 'profiles', data, id }); },

  async getProducts() { return await sqlRequest({ action: 'SELECT_ALL', table: 'products' }); },
  async getCategories() { return await sqlRequest({ action: 'SELECT_ALL', table: 'categories' }); },
  async addProduct(data: any) { await sqlRequest({ action: 'INSERT', table: 'products', data: { ...data, id: generateId(), created_at: new Date().toISOString() } }); },
  async updateProduct(id: string, data: any) { await sqlRequest({ action: 'UPDATE', table: 'products', data, id }); },
  async deleteProduct(id: string) { await sqlRequest({ action: 'DELETE', table: 'products', id }); },
  async uploadImage(file: File): Promise<string> {
    return new Promise((resolve, reject) => { const r = new FileReader(); r.onload = () => resolve(r.result as string); r.onerror = reject; r.readAsDataURL(file); });
  },

  // --- POS ---
  async createOrder(employeeId: string, cartItems: CartItem[], total: number, paymentMethod: string, receiptNumber: string) {
    const orderId = generateId();
    const orderData = { id: orderId, order_number: `ORD-${Date.now()}`, total, payment_method: paymentMethod, payment_status: 'completed', receipt_number: receiptNumber, employee_id: employeeId, created_at: new Date().toISOString() };
    await sqlRequest({ action: 'INSERT', table: 'orders', data: orderData });
    for (const item of cartItems) {
      await sqlRequest({ action: 'INSERT', table: 'order_items', data: { id: generateId(), order_id: orderId, product_id: item.id, quantity: item.cartQuantity, price: item.price, subtotal: item.price * item.cartQuantity, created_at: new Date().toISOString() }});
      await sqlRequest({ action: 'QUERY', query: 'UPDATE products SET stock = stock - ? WHERE id = ?', params: [item.cartQuantity, item.id] });
    }
    window.dispatchEvent(new Event('db_changed'));
    return orderData;
  },

  // --- 24 Hour Shift Logic ---
  async getActiveShift(employeeId: string) {
    const rows = await sqlRequest({ action: 'QUERY', query: 'SELECT * FROM shifts WHERE employee_id = ? AND end_time IS NULL', params: [employeeId] });
    const shift = rows[0] || null;

    if (shift) {
      const settings = await this.getSettings();
      const startStr = settings.business_day_start || '08:00';
      const [hours, minutes] = startStr.split(':').map(Number);

      const now = new Date();
      let currentBizDayStart = new Date(now);
      currentBizDayStart.setHours(hours, minutes, 0, 0);

      // If current time is earlier than start time, the business day actually started yesterday
      if (now < currentBizDayStart) {
        currentBizDayStart.setDate(currentBizDayStart.getDate() - 1);
      }

      const shiftStart = new Date(shift.start_time);
      
      // AUTO-CLOSE: If the shift started before the current business day, it's expired!
      if (shiftStart < currentBizDayStart) {
        console.log("Auto-closing expired shift...");
        const expectedSales = await this.getCashSalesForShift(employeeId, shift.start_time);
        const expectedTotal = shift.starting_cash + expectedSales;
        
        await this.endShift(shift.id, expectedTotal, expectedTotal);
        return null; // Force them to start a new shift for the new day
      }
    }
    return shift;
  },

  async getLastShift() {
    const rows = await sqlRequest({ action: 'QUERY', query: 'SELECT * FROM shifts WHERE end_time IS NOT NULL ORDER BY end_time DESC LIMIT 1' });
    return rows[0] || null;
  },
  async startShift(employeeId: string, startingCash: number) {
    const data = { id: generateId(), employee_id: employeeId, starting_cash: startingCash, start_time: new Date().toISOString() };
    await sqlRequest({ action: 'INSERT', table: 'shifts', data });
    return data;
  },
  async getCashSalesForShift(employeeId: string, startTime: string) {
    const rows = await sqlRequest({ action: 'QUERY', query: 'SELECT total FROM orders WHERE employee_id = ? AND payment_method = "cash" AND created_at >= ?', params: [employeeId, startTime] });
    return rows.reduce((sum: number, o: any) => sum + o.total, 0);
  },
  async endShift(shiftId: string, endingCash: number, expectedCash: number) {
    await sqlRequest({ action: 'UPDATE', table: 'shifts', id: shiftId, data: { ending_cash: endingCash, expected_cash: expectedCash, end_time: new Date().toISOString() }});
  },

  async getAdminDashboardData() {
    const orders = await sqlRequest({ action: 'QUERY', query: `SELECT o.*, p.email, p.full_name FROM orders o LEFT JOIN profiles p ON o.employee_id = p.id ORDER BY o.created_at DESC` });
    const shifts = await sqlRequest({ action: 'QUERY', query: `SELECT s.*, p.email, p.full_name FROM shifts s LEFT JOIN profiles p ON s.employee_id = p.id ORDER BY s.start_time DESC` });
    return {
      orders: orders.map((o:any) => ({...o, profiles: {email: o.email, full_name: o.full_name}})),
      shifts: shifts.map((s:any) => ({...s, profiles: {email: s.email, full_name: s.full_name}})),
      employees: await this.getProfiles()
    };
  }
};