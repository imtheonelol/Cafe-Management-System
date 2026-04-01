import { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import { Settings, ShoppingBag, LogOut } from 'lucide-react';
import { supabase } from './lib/supabase';
import type { Product, Category, CartItem, Order, OrderItem, Profile } from './lib/database.types';

import { ProductGrid } from './components/ProductGrid';
import { Cart } from './components/Cart';
import { CheckoutModal } from './components/CheckoutModal';
import { Receipt } from './components/Receipt';
import { BackOffice } from './components/BackOffice';
import { AdminDashboard } from './components/AdminDashboard';
import { EmployeeLogin, AdminLogin } from './components/LoginPages';
import { StartShift } from './components/StartShift';

function AppContent() {
  const navigate = useNavigate();
  const [session, setSession] = useState<any>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [showCheckout, setShowCheckout] = useState(false);
  const [showReceipt, setShowReceipt] = useState(false);
  const [showBackOffice, setShowBackOffice] = useState(false);
  const [currentOrder, setCurrentOrder] = useState<Order | null>(null);
  const [currentOrderItems, setCurrentOrderItems] = useState<(OrderItem & { product: Product })[]>([]);
  
  const [shiftActive, setShiftActive] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session) fetchProfile(session.user.id);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (session) fetchProfile(session.user.id);
      else {
        setProfile(null);
        setShiftActive(false);
      }
    });
    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (session) {
      loadCategories();
      loadProducts();
      checkActiveShift();
    }
  }, [session]);

  const fetchProfile = async (userId: string) => {
    const { data } = await supabase.from('profiles').select('*').eq('id', userId).single();
    if (data) setProfile(data);
  };

  const checkActiveShift = async () => {
    if (!session) return;
    const { data } = await supabase
      .from('shifts')
      .select('*')
      .eq('employee_id', session.user.id)
      .is('end_time', null)
      .single();
    
    if (data) setShiftActive(true);
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate('/login');
  };

  const loadCategories = async () => { const { data } = await supabase.from('categories').select('*').order('name'); if (data) setCategories(data); };
  const loadProducts = async () => { const { data } = await supabase.from('products').select('*').order('name'); if (data) setProducts(data); };

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
    if (!session) return;
    try {
      const total = calculateTotal();
      const { data: order, error: orderError } = await supabase.from('orders').insert({
        order_number: `ORD-${Date.now()}`, total, payment_method: paymentMethod, payment_status: 'completed', receipt_number: receiptNumber, employee_id: session.user.id,
      }).select().single();

      if (orderError) throw orderError;

      const orderItemsData = cartItems.map(item => ({ order_id: order.id, product_id: item.id, quantity: item.cartQuantity, price: item.price, subtotal: item.price * item.cartQuantity }));
      await supabase.from('order_items').insert(orderItemsData);

      for (const item of cartItems) {
        await supabase.from('products').update({ stock: item.stock - item.cartQuantity }).eq('id', item.id);
      }

      setCurrentOrder(order);
      setCurrentOrderItems(cartItems.map(item => ({ ...item, product: item, order_id: order.id, subtotal: item.price * item.cartQuantity }) as any));
      setShowCheckout(false);
      setShowReceipt(true);
      setCartItems([]);
      loadProducts();
    } catch (error) {
      alert('Error processing payment.');
    }
  };

  const handleAddProduct = async (productData: any) => { await supabase.from('products').insert(productData); await loadProducts(); };
  const handleUpdateProduct = async (id: string, updates: any) => { await supabase.from('products').update(updates).eq('id', id); await loadProducts(); };
  const handleDeleteProduct = async (id: string) => { await supabase.from('products').delete().eq('id', id); await loadProducts(); };

  return (
    <Routes>
      <Route path="/" element={<Navigate to="/login" />} />
      <Route path="/login" element={!session ? <EmployeeLogin /> : <Navigate to="/pos" />} />
      <Route path="/admin" element={!session ? <AdminLogin /> : <Navigate to="/admin/dashboard" />} />
      
      <Route path="/admin/dashboard" element={
        session && profile?.role === 'admin' ? (
          <>
            <AdminDashboard onLogout={handleLogout} />
            <button onClick={() => setShowBackOffice(true)} className="fixed bottom-8 right-8 flex items-center gap-2 px-6 py-3 bg-gray-900 text-white rounded-full shadow-lg hover:bg-gray-800 transition-colors z-40">
              <Settings className="w-5 h-5" /> Manage Products
            </button>
            <BackOffice isOpen={showBackOffice} onClose={() => setShowBackOffice(false)} products={products} categories={categories} onAddProduct={handleAddProduct} onUpdateProduct={handleUpdateProduct} onDeleteProduct={handleDeleteProduct} />
          </>
        ) : <Navigate to="/admin" />
      } />

      <Route path="/pos" element={
        session ? (
          <>
            {!shiftActive && profile?.role === 'employee' && (
              <StartShift employeeId={session.user.id} onShiftStarted={() => setShiftActive(true)} />
            )}
            <div className="h-screen flex flex-col bg-gray-50">
              <header className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <ShoppingBag className="w-8 h-8 text-blue-600" />
                  <div>
                    <h1 className="text-2xl font-bold text-gray-900">Cafe POS</h1>
                    <p className="text-sm text-gray-600">Employee: {profile?.full_name || profile?.email}</p>
                  </div>
                </div>
                <button onClick={handleLogout} className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700">
                  <LogOut className="w-5 h-5" /> Logout
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
        ) : <Navigate to="/login" />
      } />
    </Routes>
  );
}

export default function App() {
  return (
    <Router>
      <AppContent />
    </Router>
  );
}