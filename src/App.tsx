import { useState, useEffect } from 'react';
import { Settings, ShoppingBag, LogOut } from 'lucide-react';
import { supabase } from './lib/supabase';
import type { Product, Category, CartItem, Order, OrderItem, Profile } from './lib/database.types';
import { ProductGrid } from './components/ProductGrid';
import { Cart } from './components/Cart';
import { CheckoutModal } from './components/CheckoutModal';
import { Receipt } from './components/Receipt';
import { BackOffice } from './components/BackOffice';
import { Login } from './components/Login';
import { AdminDashboard } from './components/AdminDashboard';

function App() {
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

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session) fetchProfile(session.user.id);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (session) {
        fetchProfile(session.user.id);
      } else {
        setProfile(null);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (session) {
      loadCategories();
      loadProducts();
    }
  }, [session]);

  const fetchProfile = async (userId: string) => {
    const { data } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();
      
    if (data) setProfile(data);
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
  };

  const loadCategories = async () => {
    const { data, error } = await supabase.from('categories').select('*').order('name');
    if (!error && data) setCategories(data);
  };

  const loadProducts = async () => {
    const { data, error } = await supabase.from('products').select('*').order('name');
    if (!error && data) setProducts(data);
  };

  const addToCart = (product: Product) => {
    setCartItems(prev => {
      const existing = prev.find(item => item.id === product.id);
      if (existing) {
        return prev.map(item =>
          item.id === product.id
            ? { ...item, cartQuantity: item.cartQuantity + 1 }
            : item
        );
      }
      return [...prev, { ...product, cartQuantity: 1 }];
    });
  };

  const updateQuantity = (productId: string, change: number) => {
    setCartItems(prev => {
      return prev
        .map(item => {
          if (item.id === productId) {
            const newQuantity = item.cartQuantity + change;
            return newQuantity > 0 ? { ...item, cartQuantity: newQuantity } : null;
          }
          return item;
        })
        .filter((item): item is CartItem => item !== null);
    });
  };

  const removeFromCart = (productId: string) => {
    setCartItems(prev => prev.filter(item => item.id !== productId));
  };

  const calculateTotal = () => {
    const subtotal = cartItems.reduce((sum, item) => sum + item.price * item.cartQuantity, 0);
    return subtotal * 1.1; // 10% tax
  };

  const handleCheckout = () => {
    if (cartItems.length === 0) return;
    setShowCheckout(true);
  };

  const confirmPayment = async (paymentMethod: string, receiptNumber: string) => {
    if (!session) return;
    
    try {
      const total = calculateTotal();
      const orderNumber = `ORD-${Date.now()}`;

      const { data: order, error: orderError } = await supabase
        .from('orders')
        .insert({
          order_number: orderNumber,
          total,
          payment_method: paymentMethod,
          payment_status: 'completed',
          receipt_number: receiptNumber,
          employee_id: session.user.id, // Tracking the logged-in employee
        })
        .select()
        .single();

      if (orderError) throw orderError;

      const orderItemsData = cartItems.map(item => ({
        order_id: order.id,
        product_id: item.id,
        quantity: item.cartQuantity,
        price: item.price,
        subtotal: item.price * item.cartQuantity,
      }));

      const { data: orderItems, error: itemsError } = await supabase
        .from('order_items')
        .insert(orderItemsData)
        .select();

      if (itemsError) throw itemsError;

      for (const item of cartItems) {
        await supabase
          .from('products')
          .update({ stock: item.stock - item.cartQuantity })
          .eq('id', item.id);
      }

      const orderItemsWithProducts = orderItems.map(item => ({
        ...item,
        product: cartItems.find(p => p.id === item.product_id)!,
      }));

      setCurrentOrder(order);
      setCurrentOrderItems(orderItemsWithProducts);
      setShowCheckout(false);
      setShowReceipt(true);
      setCartItems([]);
      loadProducts();

      if (paymentMethod === 'cash') {
        simulateCashDrawer();
      }
    } catch (error) {
      console.error('Error processing payment:', error);
      alert('Error processing payment. Please try again.');
    }
  };

  const simulateCashDrawer = () => {
    console.log('CASH DRAWER OPENED');
    alert('Cash drawer opened! Please collect payment.');
  };

  const handleAddProduct = async (productData: Omit<Product, 'id' | 'created_at'>) => {
    try {
      const { error } = await supabase.from('products').insert(productData);
      if (error) throw error;
      await loadProducts();
      alert('Product added successfully!');
    } catch (error) {
      console.error('Error adding product:', error);
      alert('Error adding product. Please try again.');
    }
  };

  const handleUpdateProduct = async (id: string, updates: Partial<Product>) => {
    try {
      const { error } = await supabase.from('products').update(updates).eq('id', id);
      if (error) throw error;
      await loadProducts();
      alert('Product updated successfully!');
    } catch (error) {
      console.error('Error updating product:', error);
      alert('Error updating product. Please try again.');
    }
  };

  const handleDeleteProduct = async (id: string) => {
    if (!confirm('Are you sure you want to delete this product?')) return;
    try {
      const { error } = await supabase.from('products').delete().eq('id', id);
      if (error) throw error;
      await loadProducts();
      alert('Product deleted successfully!');
    } catch (error) {
      console.error('Error deleting product:', error);
      alert('Error deleting product. Please try again.');
    }
  };

  // ---------------- RENDER LOGIC ----------------

  if (!session) {
    return <Login />;
  }

  if (profile?.role === 'admin') {
    return <AdminDashboard onLogout={handleLogout} />;
  }

  return (
    <div className="h-screen flex flex-col bg-gray-50">
      <header className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <ShoppingBag className="w-8 h-8 text-blue-600" />
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Cafe Management System</h1>
            <p className="text-sm text-gray-600">Employee: {profile?.full_name || profile?.email}</p>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <button
            onClick={() => setShowBackOffice(true)}
            className="flex items-center gap-2 px-4 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition-colors"
          >
            <Settings className="w-5 h-5" />
            Back Office
          </button>
          <button
            onClick={handleLogout}
            className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
          >
            <LogOut className="w-5 h-5" />
            Sign Out
          </button>
        </div>
      </header>

      <div className="flex-1 flex overflow-hidden">
        <ProductGrid
          products={products}
          categories={categories}
          selectedCategory={selectedCategory}
          onCategoryChange={setSelectedCategory}
          onAddToCart={addToCart}
        />
        <Cart
          items={cartItems}
          onUpdateQuantity={updateQuantity}
          onRemoveItem={removeFromCart}
          onCheckout={handleCheckout}
        />
      </div>

      <CheckoutModal
        isOpen={showCheckout}
        onClose={() => setShowCheckout(false)}
        items={cartItems}
        total={calculateTotal()}
        onConfirmPayment={confirmPayment}
      />

      <Receipt
        isOpen={showReceipt}
        onClose={() => setShowReceipt(false)}
        order={currentOrder}
        orderItems={currentOrderItems}
      />

      <BackOffice
        isOpen={showBackOffice}
        onClose={() => setShowBackOffice(false)}
        products={products}
        categories={categories}
        onAddProduct={handleAddProduct}
        onUpdateProduct={handleUpdateProduct}
        onDeleteProduct={handleDeleteProduct}
      />
    </div>
  );
}

export default App;