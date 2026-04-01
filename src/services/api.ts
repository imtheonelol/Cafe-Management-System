import type { Product, CartItem, Profile, Shift, Category, Order } from '../lib/database.types';

const SESSION_KEY = 'cafe_pos_session';
let authListeners: ((session: any) => void)[] = [];

// --- Database Connection Helpers ---
async function getDB() {
  const res = await fetch('/api/db');
  if (!res.ok) throw new Error("Failed to fetch local database. Make sure vite.config.ts is updated.");
  const text = await res.text();
  return JSON.parse(text);
}

async function saveDB(newDbState: any) {
  await fetch('/api/db', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(newDbState)
  });
  window.dispatchEvent(new Event('db_changed')); // Tell UI to refresh
}

function generateId() {
  return Math.random().toString(36).substring(2, 15);
}

export const ApiService = {
  async ensureInit() {
    await getDB(); // Verifies connection
  },

  // --- Auth Services ---
  async login(email: string, password: string) {
    const db = await getDB();
    const user = db.profiles.find((p: any) => p.email === email && p.password === password);
    if (!user) throw new Error("Invalid login credentials.");
    
    const session = { user: { id: user.id, email: user.email } };
    localStorage.setItem(SESSION_KEY, JSON.stringify(session));
    authListeners.forEach(listener => listener(session));
    return session;
  },
  
  async getSession() {
    const sessionStr = localStorage.getItem(SESSION_KEY);
    return sessionStr ? JSON.parse(sessionStr) : null;
  },

  onAuthStateChange(callback: (session: any) => void) {
    authListeners.push(callback);
    return { unsubscribe: () => { authListeners = authListeners.filter(l => l !== callback); } };
  },

  async getProfile(userId: string) {
    const db = await getDB();
    return db.profiles.find((p: any) => p.id === userId) || null;
  },

  async logout() {
    localStorage.removeItem(SESSION_KEY);
    authListeners.forEach(listener => listener(null));
  },

  // --- Catalog Services ---
  async getCategories() { 
    const db = await getDB(); 
    return db.categories as Category[]; 
  },
  
  async getProducts() { 
    const db = await getDB(); 
    return db.products as Product[]; 
  },
  
  async addProduct(product: Omit<Product, 'id' | 'created_at'>) {
    const db = await getDB();
    const newProduct = { ...product, id: generateId(), created_at: new Date().toISOString() };
    db.products.push(newProduct);
    await saveDB(db);
  },

  async updateProduct(id: string, updates: Partial<Product>) {
    const db = await getDB();
    db.products = db.products.map((p: any) => p.id === id ? { ...p, ...updates } : p);
    await saveDB(db);
  },

  async deleteProduct(id: string) {
    const db = await getDB();
    db.products = db.products.filter((p: any) => p.id !== id);
    await saveDB(db);
  },

  async uploadImage(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(file); // Converts image to Base64 string for JSON
    });
  },

  // --- Order Services ---
  async createOrder(employeeId: string, cartItems: CartItem[], total: number, paymentMethod: string, receiptNumber: string) {
    const db = await getDB();
    const newOrder = {
      id: generateId(), order_number: `ORD-${Date.now()}`, total, payment_method: paymentMethod,
      payment_status: 'completed', receipt_number: receiptNumber, employee_id: employeeId, created_at: new Date().toISOString()
    };

    db.orders.push(newOrder);

    cartItems.forEach(item => {
      db.order_items.push({
        id: generateId(), order_id: newOrder.id, product_id: item.id, quantity: item.cartQuantity,
        price: item.price, subtotal: item.price * item.cartQuantity, created_at: new Date().toISOString()
      });
      const product = db.products.find((p: any) => p.id === item.id);
      if (product) product.stock -= item.cartQuantity;
    });

    await saveDB(db);
    return newOrder;
  },

  // --- Shift Services ---
  async getActiveShift(employeeId: string) {
    const db = await getDB();
    return db.shifts.find((s: any) => s.employee_id === employeeId && !s.end_time) || null;
  },
  
  async getLastShift() {
    const db = await getDB();
    const endedShifts = db.shifts.filter((s: any) => s.end_time !== null);
    if (endedShifts.length === 0) return null;
    return endedShifts.sort((a: any, b: any) => new Date(b.end_time).getTime() - new Date(a.end_time).getTime())[0];
  },

  async startShift(employeeId: string, startingCash: number) {
    const db = await getDB();
    const newShift = {
      id: generateId(), employee_id: employeeId, starting_cash: startingCash, start_time: new Date().toISOString(),
      ending_cash: null, expected_cash: null, end_time: null
    };
    db.shifts.push(newShift);
    await saveDB(db);
    return newShift;
  },

  async getCashSalesForShift(employeeId: string, startTime: string) {
    const db = await getDB();
    return db.orders
      .filter((o: any) => o.employee_id === employeeId && o.payment_method === 'cash' && new Date(o.created_at) >= new Date(startTime))
      .reduce((sum: number, order: any) => sum + order.total, 0);
  },

  async endShift(shiftId: string, endingCash: number, expectedCash: number) {
    const db = await getDB();
    const shift = db.shifts.find((s: any) => s.id === shiftId);
    if (shift) {
      shift.ending_cash = endingCash;
      shift.expected_cash = expectedCash;
      shift.end_time = new Date().toISOString();
      await saveDB(db);
    }
  },

  // --- Admin Services ---
  async getAdminDashboardData() {
    const db = await getDB();
    const mapProfile = (item: any) => ({ ...item, profiles: db.profiles.find((p: any) => p.id === item.employee_id) || {} });
    
    return {
      orders: db.orders.map(mapProfile).sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()),
      shifts: db.shifts.map(mapProfile).sort((a: any, b: any) => new Date(b.start_time).getTime() - new Date(a.start_time).getTime()),
      employees: db.profiles
    };
  }
};