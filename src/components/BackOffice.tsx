import { useState, useEffect } from 'react';
import { X, Plus, CreditCard as Edit2, Trash2, UploadCloud, Link as LinkIcon, Users, Coffee, Settings as SettingsIcon } from 'lucide-react';
import { ApiService } from '../services/api';
import type { Product, Category, Profile } from '../lib/database.types';

export function BackOffice({ isOpen, onClose, products, categories, profiles, onRefresh }: any) {
  const [activeTab, setActiveTab] = useState<'products' | 'employees' | 'settings'>('products');
  const [showForm, setShowForm] = useState(false);
  
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [uploadMode, setUploadMode] = useState<'url' | 'local'>('url');
  const [uploadingImage, setUploadingImage] = useState(false);
  const [productData, setProductData] = useState({ name: '', description: '', price: '', category_id: '', image_url: '', stock: '100', is_available: true });

  const [editingEmp, setEditingEmp] = useState<Profile | null>(null);
  const [empData, setEmpData] = useState({ full_name: '', email: '', password: '', role: 'employee' as 'admin' | 'employee' });

  const [bizStartTime, setBizStartTime] = useState('08:00');

  useEffect(() => {
    if (isOpen) {
      ApiService.getSettings().then(s => setBizStartTime(s.business_day_start || '08:00'));
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const resetForm = () => {
    setProductData({ name: '', description: '', price: '', category_id: '', image_url: '', stock: '100', is_available: true });
    setEmpData({ full_name: '', email: '', password: '', role: 'employee' });
    setEditingProduct(null); setEditingEmp(null); setShowForm(false);
  };

  const handleProductSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const data = { ...productData, price: parseFloat(productData.price), stock: parseInt(productData.stock) };
    if (editingProduct) await ApiService.updateProduct(editingProduct.id, data); else await ApiService.addProduct(data);
    onRefresh(); resetForm();
  };

  const handleEmpSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (editingEmp) await ApiService.updateProfile(editingEmp.id, empData); else await ApiService.addProfile(empData);
    onRefresh(); resetForm();
  };

  const handleSaveSettings = async () => {
    await ApiService.updateSetting('business_day_start', bizStartTime);
    alert("Settings Saved! Shifts will now auto-close when passing this time.");
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl max-w-6xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        <div className="p-6 border-b flex items-center justify-between bg-white">
          <h2 className="text-2xl font-bold">System Configuration</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700"><X className="w-6 h-6" /></button>
        </div>

        {!showForm && (
          <div className="flex border-b bg-gray-50 px-6 pt-4 gap-4">
            <button onClick={() => setActiveTab('products')} className={`flex items-center gap-2 pb-3 border-b-2 font-semibold ${activeTab === 'products' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500'}`}><Coffee size={18}/> Products</button>
            <button onClick={() => setActiveTab('employees')} className={`flex items-center gap-2 pb-3 border-b-2 font-semibold ${activeTab === 'employees' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500'}`}><Users size={18}/> User Accounts</button>
            <button onClick={() => setActiveTab('settings')} className={`flex items-center gap-2 pb-3 border-b-2 font-semibold ${activeTab === 'settings' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500'}`}><SettingsIcon size={18}/> Settings</button>
          </div>
        )}

        <div className="p-6 overflow-auto flex-1">
          {!showForm ? (
            activeTab === 'products' ? (
              <>
                <div className="flex justify-between items-center mb-6"><h3 className="text-lg font-semibold">Inventory</h3><button onClick={() => setShowForm(true)} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">Add Product</button></div>
                <table className="w-full text-left">
                  <thead><tr className="border-b bg-gray-50"><th className="p-3">Name</th><th className="p-3">Price</th><th className="p-3">Stock</th><th className="p-3 text-right">Actions</th></tr></thead>
                  <tbody>{products.map(p => <tr key={p.id} className="border-b"><td className="p-3">{p.name}</td><td className="p-3">₱{p.price.toFixed(2)}</td><td className="p-3">{p.stock}</td><td className="p-3 text-right"><button onClick={() => {setEditingProduct(p); setProductData({...p, price: p.price.toString(), stock: p.stock.toString()}); setShowForm(true);}} className="p-2 text-blue-600 hover:bg-blue-50 rounded"><Edit2 size={16}/></button></td></tr>)}</tbody>
                </table>
              </>
            ) : activeTab === 'employees' ? (
              <>
                <div className="flex justify-between items-center mb-6"><h3 className="text-lg font-semibold">Staff</h3><button onClick={() => setShowForm(true)} className="px-4 py-2 bg-blue-600 text-white rounded-lg">Add User</button></div>
                <table className="w-full text-left">
                  <thead><tr className="border-b bg-gray-50"><th className="p-3">Name</th><th className="p-3">Email</th><th className="p-3">Role</th><th className="p-3 text-right">Actions</th></tr></thead>
                  <tbody>{profiles.map(e => <tr key={e.id} className="border-b"><td className="p-3">{e.full_name}</td><td className="p-3">{e.email}</td><td className="p-3 uppercase text-sm">{e.role}</td><td className="p-3 text-right"><button onClick={() => {setEditingEmp(e); setEmpData({full_name: e.full_name||'', email: e.email, password: e.password||'', role: e.role}); setShowForm(true);}} className="p-2 text-blue-600 hover:bg-blue-50 rounded"><Edit2 size={16}/></button></td></tr>)}</tbody>
                </table>
              </>
            ) : (
              <div className="max-w-lg">
                <h3 className="text-lg font-semibold mb-4">Shift & Business Rules</h3>
                <div className="bg-gray-50 p-6 border rounded-xl">
                  <label className="block font-semibold mb-2">Start of Business Day</label>
                  <p className="text-sm text-gray-600 mb-4">Any shift left open past this time will be automatically closed, and sales will roll over into the new business day.</p>
                  <input type="time" value={bizStartTime} onChange={(e) => setBizStartTime(e.target.value)} className="w-full px-4 py-2 border rounded-lg focus:ring-blue-600 focus:ring-2 mb-4" />
                  <button onClick={handleSaveSettings} className="w-full py-3 bg-blue-600 text-white font-bold rounded-lg hover:bg-blue-700">Save Configuration</button>
                </div>
              </div>
            )
          ) : (
             activeTab === 'products' ? (
              <form onSubmit={handleProductSubmit} className="max-w-2xl mx-auto space-y-4">
                <h3 className="text-lg font-semibold mb-6">{editingProduct ? 'Edit Product' : 'Add Product'}</h3>
                <input type="text" placeholder="Name" value={productData.name} onChange={(e) => setProductData({ ...productData, name: e.target.value })} required className="w-full px-4 py-2 border rounded-lg" />
                <textarea placeholder="Description" value={productData.description} onChange={(e) => setProductData({ ...productData, description: e.target.value })} rows={2} className="w-full px-4 py-2 border rounded-lg" />
                <div className="grid grid-cols-2 gap-4">
                  <select value={productData.category_id} onChange={(e) => setProductData({ ...productData, category_id: e.target.value })} required className="w-full px-4 py-2 border rounded-lg">
                    <option value="">Select category...</option>
                    {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                  <input type="number" step="0.01" placeholder="Price" value={productData.price} onChange={(e) => setProductData({ ...productData, price: e.target.value })} required className="w-full px-4 py-2 border rounded-lg" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <input type="number" placeholder="Stock" value={productData.stock} onChange={(e) => setProductData({ ...productData, stock: e.target.value })} required className="w-full px-4 py-2 border rounded-lg" />
                  <select value={productData.is_available.toString()} onChange={(e) => setProductData({ ...productData, is_available: e.target.value === 'true' })} className="w-full px-4 py-2 border rounded-lg"><option value="true">Available</option><option value="false">Unavailable</option></select>
                </div>
                <div className="flex gap-3 pt-4">
                  <button type="submit" disabled={uploadingImage} className="flex-1 py-3 bg-blue-600 text-white rounded-lg font-semibold">Save</button>
                  <button type="button" onClick={resetForm} className="px-6 py-3 bg-gray-200 rounded-lg">Cancel</button>
                </div>
              </form>
            ) : (
              <form onSubmit={handleEmpSubmit} className="max-w-2xl mx-auto space-y-4">
                <h3 className="text-lg font-semibold mb-6">{editingEmp ? 'Edit User' : 'Add User'}</h3>
                <input type="text" placeholder="Full Name" value={empData.full_name} onChange={(e) => setEmpData({ ...empData, full_name: e.target.value })} required className="w-full px-4 py-2 border rounded-lg" />
                <input type="email" placeholder="Email Address" value={empData.email} onChange={(e) => setEmpData({ ...empData, email: e.target.value })} required className="w-full px-4 py-2 border rounded-lg" />
                <input type="text" placeholder="Password" value={empData.password} onChange={(e) => setEmpData({ ...empData, password: e.target.value })} required className="w-full px-4 py-2 border rounded-lg" />
                <select value={empData.role} onChange={(e) => setEmpData({ ...empData, role: e.target.value as any })} className="w-full px-4 py-2 border rounded-lg"><option value="employee">Cashier</option><option value="admin">Administrator</option></select>
                <div className="flex gap-3 pt-4">
                  <button type="submit" className="flex-1 py-3 bg-blue-600 text-white rounded-lg font-semibold">Save</button>
                  <button type="button" onClick={resetForm} className="px-6 py-3 bg-gray-200 rounded-lg">Cancel</button>
                </div>
              </form>
            )
          )}
        </div>
      </div>
    </div>
  );
}