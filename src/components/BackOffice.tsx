import { useState, useEffect } from 'react';
import { X, Plus, Trash2, Users, Coffee, Settings as SettingsIcon, Package, Database, CreditCard as Edit2 } from 'lucide-react';
import { ApiService } from '../services/api';

export function BackOffice({ isOpen, onClose, products, categories, profiles, profile, onRefresh }: any) {
  const [activeTab, setActiveTab] = useState<'products' | 'ingredients' | 'employees' | 'settings'>('products');
  const [showForm, setShowForm] = useState(false);
  
  const [ingredients, setIngredients] = useState<any[]>([]);
  const [newIngredient, setNewIngredient] = useState({ name: '', stock: '', unit: 'kg' });
  const [dbStatus, setDbStatus] = useState('Checking...');
  const [bizStartTime, setBizStartTime] = useState('08:00');
  const [defaultFloat, setDefaultFloat] = useState('1500');

  const [editingProduct, setEditingProduct] = useState<any>(null);
  const [productData, setProductData] = useState({ name: '', description: '', price: '', category_id: '', image_url: '', stock: '100', is_available: true });
  const [editingEmp, setEditingEmp] = useState<any>(null);
  const [empData, setEmpData] = useState({ full_name: '', email: '', password: '', role: 'employee' as 'admin' | 'employee' });

  const isAdmin = profile?.role === 'admin';

  useEffect(() => {
    if (isOpen) {
      ApiService.getIngredients().then(setIngredients);
      ApiService.getSettings().then(s => {
         setBizStartTime(s.business_day_start || '08:00');
         setDefaultFloat(s.default_floating_cash || '1500');
      });
      ApiService.checkConnection().then(ok => setDbStatus(ok ? 'Connected' : 'Disconnected'));
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleAddIngredient = async (e: any) => {
    e.preventDefault();
    await ApiService.addIngredient({ ...newIngredient, stock: parseFloat(newIngredient.stock) });
    setNewIngredient({ name: '', stock: '', unit: 'kg' });
    ApiService.getIngredients().then(setIngredients);
  };

  const handleProductSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const data = { ...productData, price: parseFloat(productData.price), stock: parseInt(productData.stock) };
    if (editingProduct) await ApiService.updateProduct(editingProduct.id, data); else await ApiService.addProduct(data);
    onRefresh(); setShowForm(false);
  };

  const handleEmpSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (editingEmp) await ApiService.updateProfile(editingEmp.id, empData); else await ApiService.addProfile(empData);
    onRefresh(); setShowForm(false);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl max-w-6xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        <div className="p-6 border-b flex items-center justify-between">
          <div className="flex items-center gap-4">
            <h2 className="text-2xl font-bold">Inventory & Config</h2>
            <div className={`flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold ${dbStatus === 'Connected' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}><Database size={12}/> PostgreSQL {dbStatus}</div>
          </div>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-900"><X size={24} /></button>
        </div>

        {!showForm && (
          <div className="flex border-b bg-gray-50 px-6 pt-4 gap-4">
            <button onClick={() => setActiveTab('products')} className={`flex items-center gap-2 pb-3 border-b-2 font-semibold ${activeTab === 'products' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500'}`}><Coffee size={18}/> Products</button>
            <button onClick={() => setActiveTab('ingredients')} className={`flex items-center gap-2 pb-3 border-b-2 font-semibold ${activeTab === 'ingredients' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500'}`}><Package size={18}/> Raw Ingredients</button>
            {isAdmin && (
              <>
                <button onClick={() => setActiveTab('employees')} className={`flex items-center gap-2 pb-3 border-b-2 font-semibold ${activeTab === 'employees' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500'}`}><Users size={18}/> Accounts</button>
                <button onClick={() => setActiveTab('settings')} className={`flex items-center gap-2 pb-3 border-b-2 font-semibold ${activeTab === 'settings' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500'}`}><SettingsIcon size={18}/> Settings</button>
              </>
            )}
          </div>
        )}

        <div className="p-6 overflow-auto flex-1">
          {!showForm ? (
            activeTab === 'ingredients' ? (
              <div className="max-w-3xl">
                <h3 className="text-lg font-semibold mb-4">Manage Raw Inventory</h3>
                <form onSubmit={handleAddIngredient} className="flex gap-2 mb-6">
                  <input type="text" placeholder="Ingredient Name (e.g. Milk)" value={newIngredient.name} onChange={e=>setNewIngredient({...newIngredient, name: e.target.value})} className="flex-1 border px-3 py-2 rounded" required />
                  <input type="number" placeholder="Stock" value={newIngredient.stock} onChange={e=>setNewIngredient({...newIngredient, stock: e.target.value})} className="w-24 border px-3 py-2 rounded" required />
                  <select value={newIngredient.unit} onChange={e=>setNewIngredient({...newIngredient, unit: e.target.value})} className="border px-3 py-2 rounded"><option value="kg">kg</option><option value="L">Liters</option><option value="pcs">Pieces</option><option value="g">Grams</option><option value="ml">ml</option></select>
                  <button type="submit" className="bg-blue-600 text-white px-4 rounded hover:bg-blue-700 font-bold"><Plus size={18}/></button>
                </form>
                <table className="w-full text-left border">
                  <thead className="bg-gray-50"><tr><th className="p-3">Ingredient</th><th className="p-3">Current Stock</th><th className="p-3">Actions</th></tr></thead>
                  <tbody>
                    {ingredients.map(i => <tr key={i.id} className="border-t"><td className="p-3">{i.name}</td><td className="p-3 font-bold">{i.stock} {i.unit}</td><td className="p-3"><button onClick={async () => { await ApiService.deleteIngredient(i.id); ApiService.getIngredients().then(setIngredients); }} className="text-red-500"><Trash2 size={18}/></button></td></tr>)}
                  </tbody>
                </table>
              </div>
            ) : activeTab === 'settings' ? (
              <div className="max-w-lg">
                <h3 className="text-lg font-semibold mb-4">Shift & Business Rules</h3>
                <div className="bg-gray-50 p-6 border rounded-xl">
                  
                  <label className="block font-semibold mb-2 mt-4">Default Register Float (Change Fund)</label>
                  <p className="text-sm text-gray-600 mb-2">The fixed amount of money left in the drawer for the next shift.</p>
                  <div className="flex items-center border rounded-lg focus-within:ring-2 focus-within:ring-blue-600 mb-6 px-3 bg-white">
                    <span className="font-bold text-gray-500">₱</span>
                    <input type="number" value={defaultFloat} onChange={(e) => setDefaultFloat(e.target.value)} className="w-full px-2 py-2 outline-none" />
                  </div>

                  <label className="block font-semibold mb-2">Start of Business Day</label>
                  <p className="text-sm text-gray-600 mb-4">Any shift left open past this time will automatically close when a user opens the POS, rolling sales to the proper day.</p>
                  <input type="time" value={bizStartTime} onChange={(e) => setBizStartTime(e.target.value)} className="w-full px-4 py-2 border rounded-lg focus:ring-blue-600 focus:ring-2 mb-4 outline-none" />
                  
                  <button onClick={async () => { await ApiService.updateSetting('business_day_start', bizStartTime); await ApiService.updateSetting('default_floating_cash', defaultFloat); alert("Settings Saved!"); }} className="w-full py-3 bg-blue-600 text-white font-bold rounded-lg hover:bg-blue-700">Save Configuration</button>
                </div>
              </div>
            ) : activeTab === 'products' ? (
              <>
                <div className="flex justify-between items-center mb-6"><h3 className="text-lg font-semibold">Products</h3><button onClick={() => { setEditingProduct(null); setProductData({ name: '', description: '', price: '', category_id: '', image_url: '', stock: '100', is_available: true }); setShowForm(true); }} className="px-4 py-2 bg-blue-600 text-white rounded-lg flex items-center gap-2"><Plus size={16}/> Add Product</button></div>
                <table className="w-full text-left border">
                  <thead className="bg-gray-50"><tr><th className="p-3">Name</th><th className="p-3">Price</th><th className="p-3">Stock</th><th className="p-3 text-right">Actions</th></tr></thead>
                  <tbody>{products.map((p: any) => <tr key={p.id} className="border-t"><td className="p-3">{p.name}</td><td className="p-3">₱{parseFloat(p.price).toFixed(2)}</td><td className="p-3">{p.stock}</td><td className="p-3 text-right"><button onClick={() => {setEditingProduct(p); setProductData({...p, price: p.price.toString(), stock: p.stock.toString()}); setShowForm(true);}} className="text-blue-600 mr-4"><Edit2 size={18}/></button><button onClick={async () => { if(confirm('Delete?')) { await ApiService.deleteProduct(p.id); onRefresh(); } }} className="text-red-500"><Trash2 size={18}/></button></td></tr>)}</tbody>
                </table>
              </>
            ) : (
              <>
                <div className="flex justify-between items-center mb-6"><h3 className="text-lg font-semibold">Staff Accounts</h3><button onClick={() => { setEditingEmp(null); setEmpData({ full_name: '', email: '', password: '', role: 'employee' }); setShowForm(true); }} className="px-4 py-2 bg-blue-600 text-white rounded-lg flex items-center gap-2"><Plus size={16}/> Add User</button></div>
                <table className="w-full text-left border">
                  <thead className="bg-gray-50"><tr><th className="p-3">Name</th><th className="p-3">Email</th><th className="p-3">Role</th><th className="p-3 text-right">Actions</th></tr></thead>
                  <tbody>{profiles.map((e: any) => <tr key={e.id} className="border-t"><td className="p-3">{e.full_name}</td><td className="p-3">{e.email}</td><td className="p-3 uppercase text-sm font-bold text-gray-500">{e.role}</td><td className="p-3 text-right"><button onClick={() => {setEditingEmp(e); setEmpData({full_name: e.full_name||'', email: e.email, password: e.password||'', role: e.role}); setShowForm(true);}} className="text-blue-600 mr-4"><Edit2 size={18}/></button><button onClick={async () => { if(confirm('Delete?')) { await ApiService.deleteProfile(e.id); onRefresh(); } }} className="text-red-500"><Trash2 size={18}/></button></td></tr>)}</tbody>
                </table>
              </>
            )
          ) : (
            activeTab === 'products' ? (
              <form onSubmit={handleProductSubmit} className="max-w-2xl mx-auto space-y-4">
                <h3 className="text-lg font-semibold mb-6">{editingProduct ? 'Edit Product' : 'Add Product'}</h3>
                <input type="text" placeholder="Name" value={productData.name} onChange={(e) => setProductData({ ...productData, name: e.target.value })} required className="w-full px-4 py-2 border rounded-lg" />
                <div className="grid grid-cols-2 gap-4">
                  <select value={productData.category_id} onChange={(e) => setProductData({ ...productData, category_id: e.target.value })} required className="w-full px-4 py-2 border rounded-lg"><option value="">Select category...</option>{categories.map((c:any) => <option key={c.id} value={c.id}>{c.name}</option>)}</select>
                  <div className="flex items-center border rounded-lg focus-within:ring-2 focus-within:ring-blue-600 px-3 bg-white"><span className="font-bold text-gray-500">₱</span><input type="number" step="0.01" placeholder="Price" value={productData.price} onChange={(e) => setProductData({ ...productData, price: e.target.value })} required className="w-full px-2 py-2 outline-none" /></div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <input type="number" placeholder="Stock" value={productData.stock} onChange={(e) => setProductData({ ...productData, stock: e.target.value })} required className="w-full px-4 py-2 border rounded-lg" />
                  <select value={productData.is_available.toString()} onChange={(e) => setProductData({ ...productData, is_available: e.target.value === 'true' })} className="w-full px-4 py-2 border rounded-lg"><option value="true">Available</option><option value="false">Unavailable</option></select>
                </div>
                <div className="flex gap-3 pt-4"><button type="submit" className="flex-1 py-3 bg-blue-600 text-white rounded-lg font-bold">Save</button><button type="button" onClick={() => setShowForm(false)} className="px-6 py-3 bg-gray-200 rounded-lg">Cancel</button></div>
              </form>
            ) : (
              <form onSubmit={handleEmpSubmit} className="max-w-2xl mx-auto space-y-4">
                <h3 className="text-lg font-semibold mb-6">{editingEmp ? 'Edit User' : 'Add User'}</h3>
                <input type="text" placeholder="Full Name" value={empData.full_name} onChange={(e) => setEmpData({ ...empData, full_name: e.target.value })} required className="w-full px-4 py-2 border rounded-lg" />
                <input type="email" placeholder="Email" value={empData.email} onChange={(e) => setEmpData({ ...empData, email: e.target.value })} required className="w-full px-4 py-2 border rounded-lg" />
                <input type="text" placeholder="Password" value={empData.password} onChange={(e) => setEmpData({ ...empData, password: e.target.value })} required className="w-full px-4 py-2 border rounded-lg" />
                <select value={empData.role} onChange={(e) => setEmpData({ ...empData, role: e.target.value as any })} className="w-full px-4 py-2 border rounded-lg"><option value="employee">Cashier</option><option value="admin">Administrator</option></select>
                <div className="flex gap-3 pt-4"><button type="submit" className="flex-1 py-3 bg-blue-600 text-white rounded-lg font-bold">Save User</button><button type="button" onClick={() => setShowForm(false)} className="px-6 py-3 bg-gray-200 rounded-lg">Cancel</button></div>
              </form>
            )
          )}
        </div>
      </div>
    </div>
  );
}