import { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import { Settings, ShoppingBag, LogOut, ShieldAlert } from 'lucide-react';
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

// ---------------- LAYER 1: POS CONTROLLER ----------------
function POSView({ session, profile }: { session: any, profile: Profile }) {
  const navigate = useNavigate();
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [selectedCategory, setSelectedCategory] = useState('all');
  
  const [showCheckout, setShowCheckout] = useState(false);
  const [showReceipt, setShowReceipt] = useState(false);
  const [showEndShift, setShowEndShift] = useState(false);
  
  const [currentOrder, setCurrentOrder] = useState<Order | null>(null);
  const [currentOrderItems, setCurrentOrderItems] = useState<(OrderItem & { product: Product })[]>([]);
  const [activeShift, setActiveShift] = useState<Shift | null>(null);

  useEffect(() => {
    ApiService.getCategories().then(setCategories);
    ApiService.getProducts().then(setProducts);
    ApiService.getActiveShift(session.user.id).then(setActiveShift);
  }, [session]);

  const handleLogoutClick = () => {
    if (activeShift) setShowEndShift(true);
    else executeLogout();
  };

  const executeLogout = async () => {
    setShowEndShift(false);
    await ApiService.logout();
    navigate('/login');
  };

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

  const calculateTotal = () => cartItems.reduce((sum, item) => sum + item.price * item.cartQuantity, 0) * 1.1;

  const confirmPayment = async (paymentMethod: string, receiptNumber: string) => {
    try {
      const order = await ApiService.createOrder(session.user.id, cartItems, calculateTotal(), paymentMethod, receiptNumber);
      setCurrentOrder(order);
      setCurrentOrderItems(cartItems.map(item => ({ ...item, product: item, order_id: order.id, subtotal: item.price * item.cartQuantity }) as any));
      setShowCheckout(false); setShowReceipt(true); setCartItems([]);
      ApiService.getProducts().then(setProducts); // Refresh stock
    } catch { alert('Error processing payment.'); }
  };

  return (
    <>
      {!activeShift && <StartShift employeeId={session.user.id} onShiftStarted={setActiveShift} />}
      {activeShift && <EndShiftModal isOpen={showEndShift} onClose={() => setShowEndShift(false)} shift={activeShift} employeeId={session.user.id} onConfirm={executeLogout} />}
      
      <div className="h-screen flex flex-col bg-gray-50">
        <header className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <ShoppingBag className="w-8 h-8 text-blue-600" />
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Cafe POS</h1>
              <p className="text-sm text-gray-600">Cashier: {profile.full_name || profile.email}</p>
            </div>
          </div>
          <button onClick={handleLogoutClick} className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700">
            <LogOut className="w-5 h-5" /> {activeShift ? 'End Shift & Logout' : 'Logout'}
          </button>
        </header>
        <div className="flex-1 flex overflow-hidden">
          <ProductGrid products={products} categories={categories} selectedCategory={selectedCategory} onCategoryChange={setSelectedCategory} onAddToCart={addToCart} />
          <Cart items={cartItems} onUpdateQuantity={updateQuantity} onRemoveItem={(id) => setCartItems(prev => prev.filter(i => i.id !== id))} onCheckout={() => setShowCheckout(true)} />
        </div>
        <CheckoutModal isOpen={showCheckout} onClose={() => setShowCheckout(false)} items={cartItems} total={calculateTotal()} onConfirmPayment={confirmPayment} />
        <Receipt isOpen={showReceipt} onClose={() => setShowReceipt(false)} order={currentOrder} orderItems={currentOrderItems} />
      </div>
    </>
  );
}

// ---------------- LAYER 2: ADMIN CONTROLLER ----------------
function AdminView() {
  const navigate = useNavigate();
  const [showBackOffice, setShowBackOffice] = useState(false);
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);

  const loadData = () => {
    ApiService.getCategories().then(setCategories);
    ApiService.getProducts().then(setProducts);
  };

  useEffect(() => { loadData(); }, []);

  const executeLogout = async () => {
    await ApiService.logout();
    navigate('/admin');
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 px-8 py-4 flex items-center justify-between shadow-sm max-w-7xl mx-auto rounded-b-xl mb-8">
        <div className="flex items-center gap-3">
          <ShieldAlert className="w-8 h-8 text-red-600" />
          <h1 className="text-2xl font-bold text-gray-900">Admin Control Panel</h1>
        </div>
        <button onClick={executeLogout} className="flex items-center gap-2 px-4 py-2 text-gray-600 hover:text-red-600 font-semibold transition-colors">
          <LogOut className="w-5 h-5" /> Logout
        </button>
      </header>

      <AdminDashboard />
      
      <button onClick={() => setShowBackOffice(true)} className="fixed bottom-8 right-8 flex items-center gap-2 px-6 py-3 bg-gray-900 text-white rounded-full shadow-lg hover:bg-gray-800 transition-colors z-40">
        <Settings className="w-5 h-5" /> Manage Products
      </button>
      
      <BackOffice isOpen={showBackOffice} onClose={() => setShowBackOffice(false)} products={products} categories={categories} onRefresh={loadData} />
    </div>
  );
}

// ---------------- LAYER 3: MAIN APP ROUTER ----------------
function AppContent() {
  const [session, setSession] = useState<any>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true); // <--- Fixes the white screen!

  useEffect(() => {
    ApiService.getSession().then((session) => {
      setSession(session);
      if (!session) setLoading(false);
    });

    const { data: { subscription } } = ApiService.onAuthStateChange((session) => {
      setSession(session);
      if (!session) {
        setProfile(null);
        setLoading(false);
      }
    });
    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (session) {
      ApiService.getProfile(session.user.id).then((p) => {
        setProfile(p);
        setLoading(false); // Stop loading ONLY after profile is safely fetched
      });
    }
  }, [session]);

  const handleLogout = async () => {
    await ApiService.logout();
  };

  // Show a loading screen while we fetch the user's role from the database
  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center bg-gray-50">
        <div className="text-xl font-bold text-gray-400 animate-pulse">Loading System...</div>
      </div>
    );
  }

  return (
    <Routes>
      <Route path="/" element={<Navigate to="/login" />} />
      <Route path="/login" element={!session ? <EmployeeLogin /> : (profile?.role === 'admin' ? <Navigate to="/admin/dashboard" /> : <Navigate to="/pos" />)} />
      <Route path="/admin" element={!session ? <AdminLogin /> : (profile?.role === 'admin' ? <Navigate to="/admin/dashboard" /> : <Navigate to="/pos" />)} />
      
      <Route path="/pos" element={
        !session ? <Navigate to="/login" /> :
        profile?.role === 'admin' ? <Navigate to="/admin/dashboard" /> :
        profile?.role === 'employee' ? <POSView session={session} profile={profile} /> :
        <div className="h-screen flex flex-col items-center justify-center">
          <p>Error: Profile not found.</p>
          <button onClick={handleLogout} className="mt-4 px-4 py-2 bg-blue-600 text-white rounded">Logout</button>
        </div>
      } />

      <Route path="/admin/dashboard" element={
        !session ? <Navigate to="/admin" /> :
        profile?.role === 'employee' ? <Navigate to="/pos" /> :
        profile?.role === 'admin' ? <AdminView /> :
        <div className="h-screen flex flex-col items-center justify-center">
          <p>Error: Profile not found.</p>
          <button onClick={handleLogout} className="mt-4 px-4 py-2 bg-blue-600 text-white rounded">Logout</button>
        </div>
      } />
    </Routes>
  );
}

export default function App() {
  return <Router><AppContent /></Router>;
}