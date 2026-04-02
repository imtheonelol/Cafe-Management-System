import { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import { ShoppingBag, LogOut, ShieldAlert, Database, Package, BarChart, Settings } from 'lucide-react';
import type { Product, Category, CartItem, Order, OrderItem, Profile, Shift } from './lib/database.types';
import { ApiService } from './services/api';

import { ProductGrid } from './components/ProductGrid';
import { Cart } from './components/Cart';
import { CheckoutModal } from './components/CheckoutModal';
import { Receipt } from './components/Receipt';
import { BackOffice } from './components/BackOffice';
import { AdminDashboard } from './components/AdminDashboard';
import { EmployeeLogin, AdminLogin } from './components/LoginPages';
import { StartShift } from './components/StartShift';
import { EndShiftModal } from './components/EndShiftModal';

function POSView({ session, profile }: { session: any, profile: Profile }) {
  const navigate = useNavigate();
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [selectedCategory, setSelectedCategory] = useState('all');
  
  const [showCheckout, setShowCheckout] = useState(false);
  const [showReceipt, setShowReceipt] = useState(false);
  const [showEndShift, setShowEndShift] = useState(false);
  const [showBackOffice, setShowBackOffice] = useState(false);
  const [printCustomerReceipt, setPrintCustomerReceipt] = useState(false);
  
  const [currentOrder, setCurrentOrder] = useState<Order | null>(null);
  const [currentOrderItems, setCurrentOrderItems] = useState<(OrderItem & { product: Product })[]>([]);
  const [activeShift, setActiveShift] = useState<Shift | null>(null);
  
  const [salesBreakdown, setSalesBreakdown] = useState({ total: 0, cash: 0, card: 0, online: 0 });

  const loadData = () => {
    ApiService.getCategories().then(setCategories);
    ApiService.getProducts().then(setProducts);
    ApiService.getProfiles().then(setProfiles);
    ApiService.getActiveShift(session.user.id).then(setActiveShift);
  };

  useEffect(() => { loadData(); }, [session]);

  useEffect(() => {
    const fetchSales = async () => {
      if (activeShift) {
        const breakdown = await ApiService.getShiftSalesBreakdown(session.user.id, activeShift.start_time);
        setSalesBreakdown(breakdown);
      }
    };
    fetchSales();
    window.addEventListener('db_changed', fetchSales);
    return () => window.removeEventListener('db_changed', fetchSales);
  }, [activeShift, session.user.id]);

  const handleLogoutClick = () => { if (activeShift) setShowEndShift(true); else executeLogout(); };
  const executeLogout = async () => { setShowEndShift(false); await ApiService.logout(); navigate('/login'); };

  const addToCart = (product: Product) => {
    setCartItems(prev => {
      const existing = prev.find(item => item.id === product.id);
      if (existing) return prev.map(item => item.id === product.id ? { ...item, cartQuantity: item.cartQuantity + 1 } : item);
      return [...prev, { ...product, cartQuantity: 1 }];
    });
  };

  const updateQuantity = (productId: string, change: number) => {
    setCartItems(prev => prev.map(item => item.id === productId ? { ...item, cartQuantity: item.cartQuantity + change > 0 ? item.cartQuantity + change : 0 } : item).filter(i => i.cartQuantity > 0));
  };

  const confirmPayment = async (paymentMethod: string, receiptNumber: string, finalTotal: number, taxAmount: number, discountType: string, shouldPrint: boolean) => {
    try {
      const order = await ApiService.createOrder(session.user.id, cartItems, finalTotal, taxAmount, discountType, paymentMethod, receiptNumber);
      setCurrentOrder(order as any);
      setCurrentOrderItems(cartItems.map(item => ({ ...item, product: item, order_id: order.id, subtotal: item.price * item.cartQuantity }) as any));
      setPrintCustomerReceipt(shouldPrint);
      setShowCheckout(false); setShowReceipt(true); setCartItems([]);
      ApiService.getProducts().then(setProducts); 
    } catch { alert('Error processing payment.'); }
  };

  return (
    <>
      {!activeShift && <StartShift employeeId={session.user.id} onShiftStarted={setActiveShift} />}
      {activeShift && <EndShiftModal isOpen={showEndShift} onClose={() => setShowEndShift(false)} shift={activeShift} employeeId={session.user.id} onConfirm={executeLogout} />}
      
      <div className="h-screen flex flex-col bg-gray-50">
        <header className="bg-white border-b px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <ShoppingBag className="w-8 h-8 text-blue-600" />
            <div><h1 className="text-2xl font-bold text-gray-900">Cafe POS</h1><p className="text-sm text-gray-600">Cashier: {profile.full_name || profile.email}</p></div>
          </div>
          
          <div className="flex items-center gap-4">
            <div className="bg-green-50 text-green-900 px-4 py-2 rounded-lg text-right border border-green-200">
               <div className="text-xs font-semibold">Start: ₱{activeShift ? parseFloat(activeShift.starting_cash as any).toFixed(2) : '0.00'} | Cash Sales: ₱{salesBreakdown.cash.toFixed(2)}</div>
               <div className="text-sm font-bold">Expected Drawer: ₱{((activeShift ? parseFloat(activeShift.starting_cash as any) : 0) + salesBreakdown.cash).toFixed(2)}</div>
            </div>

            <button onClick={() => setShowBackOffice(true)} className="flex items-center gap-2 px-4 py-2 bg-gray-800 text-white rounded-lg hover:bg-gray-700 font-bold"><Package size={18}/> Inventory</button>
            <button onClick={() => navigate('/dashboard')} className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 font-bold"><BarChart size={18}/> My Sales</button>
            <button onClick={handleLogoutClick} className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 font-bold"><LogOut size={18} /> End Shift</button>
          </div>
        </header>
        <div className="flex-1 flex overflow-hidden">
          <ProductGrid products={products} categories={categories} selectedCategory={selectedCategory} onCategoryChange={setSelectedCategory} onAddToCart={addToCart} />
          <Cart items={cartItems} onUpdateQuantity={updateQuantity} onRemoveItem={(id: string) => setCartItems(prev => prev.filter(i => i.id !== id))} onCheckout={() => setShowCheckout(true)} />
        </div>
        <CheckoutModal isOpen={showCheckout} onClose={() => setShowCheckout(false)} items={cartItems} onConfirmPayment={confirmPayment} />
        <Receipt isOpen={showReceipt} onClose={() => setShowReceipt(false)} order={currentOrder} orderItems={currentOrderItems} shouldPrint={printCustomerReceipt} />
        <BackOffice isOpen={showBackOffice} onClose={() => setShowBackOffice(false)} products={products} categories={categories} profiles={profiles} profile={profile} onRefresh={loadData} />
      </div>
    </>
  );
}

function DashboardView({ session, profile }: { session: any, profile: Profile }) {
  const navigate = useNavigate();
  const [showBackOffice, setShowBackOffice] = useState(false);
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [profiles, setProfiles] = useState<Profile[]>([]);

  const loadData = () => {
    ApiService.getCategories().then(setCategories);
    ApiService.getProducts().then(setProducts);
    ApiService.getProfiles().then(setProfiles);
  };

  useEffect(() => { loadData(); }, []);

  const executeLogout = async () => { await ApiService.logout(); navigate('/login'); };

  return (
    <div className="min-h-screen bg-gray-50 relative">
      <header className="bg-white border-b px-8 py-4 flex items-center justify-between shadow-sm max-w-7xl mx-auto rounded-b-xl mb-8">
        <div className="flex items-center gap-3">
          <ShieldAlert className={`w-8 h-8 ${profile.role === 'admin' ? 'text-red-600' : 'text-blue-600'}`} />
          <h1 className="text-2xl font-bold">{profile.role === 'admin' ? 'Admin Control Panel' : 'My Sales Report'}</h1>
        </div>
        <div className="flex gap-4">
          {/* ✨ Admins can no longer see the Back to POS button! */}
          {profile.role === 'employee' && (
             <button onClick={() => navigate('/pos')} className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-bold">Back to POS</button>
          )}
          <button onClick={executeLogout} className="flex items-center gap-2 px-4 py-2 text-gray-600 hover:text-red-600 font-semibold"><LogOut size={20} /> Logout</button>
        </div>
      </header>
      
      <AdminDashboard profile={profile} />

      {profile.role === 'admin' && (
        <button onClick={() => setShowBackOffice(true)} className="fixed bottom-8 right-8 flex items-center gap-2 px-6 py-3 bg-gray-900 text-white rounded-full shadow-lg hover:bg-gray-800 font-bold z-40">
          <Settings size={20} /> System Config
        </button>
      )}

      <BackOffice isOpen={showBackOffice} onClose={() => setShowBackOffice(false)} products={products} categories={categories} profiles={profiles} profile={profile} onRefresh={loadData} />
    </div>
  );
}

function AppContent() {
  const [dbReady, setDbReady] = useState(false);
  const [session, setSession] = useState<any>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [criticalError, setCriticalError] = useState<string | null>(null);

  useEffect(() => {
    let unsub: any = null;
    ApiService.ensureInit()
      .then(() => {
        setDbReady(true);
        ApiService.getSession().then((sess) => { setSession(sess); if (!sess) setLoading(false); });
        const authListener = ApiService.onAuthStateChange((sess) => { setSession(sess); if (!sess) { setProfile(null); setLoading(false); } });
        unsub = authListener.unsubscribe;
      })
      .catch((err) => { setCriticalError(err.message); });
    return () => { if (unsub) unsub(); };
  }, []);

  useEffect(() => {
    if (session && dbReady) { ApiService.getProfile(session.user.id).then((p) => { setProfile(p); setLoading(false); }); }
  }, [session, dbReady]);

  if (criticalError) {
    return (
      <div className="h-screen flex flex-col items-center justify-center bg-gray-50 p-6">
        <Database className="w-20 h-20 text-red-500 mb-6" />
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Database Connection Failed</h1>
        <div className="bg-red-50 text-red-700 p-6 rounded-xl border border-red-200 max-w-lg w-full text-center shadow-sm"><p className="font-mono text-sm break-words">{criticalError}</p></div>
      </div>
    );
  }

  if (!dbReady || loading || (session && !profile)) {
    return (
      <div className="h-screen flex flex-col items-center justify-center bg-gray-50">
        <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mb-4"></div>
        <div className="text-xl font-bold text-gray-700">Connecting to Database...</div>
      </div>
    );
  }

  return (
    <Routes>
      <Route path="/" element={<Navigate to="/login" />} />
      <Route path="/login" element={!session ? <EmployeeLogin /> : (profile?.role === 'admin' ? <Navigate to="/dashboard" /> : <Navigate to="/pos" />)} />
      <Route path="/admin" element={!session ? <AdminLogin /> : (profile?.role === 'admin' ? <Navigate to="/dashboard" /> : <Navigate to="/pos" />)} />
      <Route path="/dashboard" element={!session ? <Navigate to="/login" /> : <DashboardView session={session} profile={profile} />} />
      
      {/* ✨ Admins are permanently blocked from POS. If they try, they go straight back to Dashboard! */}
      <Route path="/pos" element={!session ? <Navigate to="/login" /> : profile?.role === 'admin' ? <Navigate to="/dashboard" /> : <POSView session={session} profile={profile} />} />
    </Routes>
  );
}

export default function App() { return <Router><AppContent /></Router>; }