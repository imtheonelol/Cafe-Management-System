import { useState } from 'react';
import { X, Plus, CreditCard as Edit2, Trash2, UploadCloud, Link as LinkIcon } from 'lucide-react';
import { ApiService } from '../services/api';
import type { Product, Category } from '../lib/database.types';

interface BackOfficeProps { isOpen: boolean; onClose: () => void; products: Product[]; categories: Category[]; onRefresh: () => void; }

export function BackOffice({ isOpen, onClose, products, categories, onRefresh }: BackOfficeProps) {
  const [showForm, setShowForm] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [uploadMode, setUploadMode] = useState<'url' | 'local'>('url');
  const [uploadingImage, setUploadingImage] = useState(false);
  const [formData, setFormData] = useState({ name: '', description: '', price: '', category_id: '', image_url: '', stock: '100', is_available: true });

  if (!isOpen) return null;

  const resetForm = () => { setFormData({ name: '', description: '', price: '', category_id: '', image_url: '', stock: '100', is_available: true }); setEditingProduct(null); setShowForm(false); };
  const handleEdit = (product: Product) => { setEditingProduct(product); setFormData({ ...product, price: product.price.toString(), stock: product.stock.toString() }); setShowForm(true); };

  const handleLocalImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    setUploadingImage(true);
    try {
      const url = await ApiService.uploadImage(e.target.files[0]);
      setFormData({ ...formData, image_url: url });
    } catch {
      alert('Error uploading image');
    }
    setUploadingImage(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const productData = { ...formData, price: parseFloat(formData.price), stock: parseInt(formData.stock) };
    try {
      if (editingProduct) await ApiService.updateProduct(editingProduct.id, productData);
      else await ApiService.addProduct(productData);
      onRefresh();
      resetForm();
    } catch { alert('Error saving product'); }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure?')) return;
    await ApiService.deleteProduct(id);
    onRefresh();
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl max-w-6xl w-full max-h-[90vh] overflow-auto">
        <div className="p-6 border-b border-gray-200 flex items-center justify-between sticky top-0 bg-white">
          <h2 className="text-2xl font-bold text-gray-900">Back Office - Admin Only</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700"><X className="w-6 h-6" /></button>
        </div>

        <div className="p-6">
          {!showForm ? (
            <>
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-lg font-semibold text-gray-900">Products Inventory</h3>
                <button onClick={() => setShowForm(true)} className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"><Plus className="w-5 h-5" /> Add Product</button>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead><tr className="border-b border-gray-200"><th className="py-3 px-4 font-semibold text-gray-900">Image</th><th className="py-3 px-4 font-semibold text-gray-900">Name</th><th className="py-3 px-4 font-semibold text-gray-900">Price</th><th className="py-3 px-4 font-semibold text-gray-900">Stock</th><th className="py-3 px-4 font-semibold text-gray-900 text-right">Actions</th></tr></thead>
                  <tbody>
                    {products.map((product) => (
                        <tr key={product.id} className="border-b border-gray-100">
                          <td className="py-3 px-4"><img src={product.image_url} alt={product.name} className="w-12 h-12 object-cover rounded" /></td>
                          <td className="py-3 px-4 font-medium text-gray-900">{product.name}</td>
                          <td className="py-3 px-4 font-semibold text-gray-900">${product.price.toFixed(2)}</td>
                          <td className="py-3 px-4 text-gray-700">{product.stock}</td>
                          <td className="py-3 px-4 text-right">
                            <button onClick={() => handleEdit(product)} className="p-2 text-blue-600 hover:bg-blue-50 rounded"><Edit2 className="w-4 h-4" /></button>
                            <button onClick={() => handleDelete(product.id)} className="p-2 text-red-600 hover:bg-red-50 rounded"><Trash2 className="w-4 h-4" /></button>
                          </td>
                        </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          ) : (
            <form onSubmit={handleSubmit} className="max-w-2xl mx-auto space-y-4">
              <h3 className="text-lg font-semibold text-gray-900 mb-6">{editingProduct ? 'Edit Product' : 'Add New Product'}</h3>
              <input type="text" placeholder="Product Name" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} required className="w-full px-4 py-2 border rounded-lg" />
              <textarea placeholder="Description" value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} rows={2} className="w-full px-4 py-2 border rounded-lg" />
              <div className="grid grid-cols-2 gap-4">
                <select value={formData.category_id} onChange={(e) => setFormData({ ...formData, category_id: e.target.value })} required className="w-full px-4 py-2 border rounded-lg">
                  <option value="">Select category</option>
                  {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
                <input type="number" step="0.01" placeholder="Price" value={formData.price} onChange={(e) => setFormData({ ...formData, price: e.target.value })} required className="w-full px-4 py-2 border rounded-lg" />
              </div>
              <div className="border p-4 rounded-lg bg-gray-50">
                <label className="block text-sm font-semibold text-gray-900 mb-3">Product Image</label>
                <div className="flex gap-2 mb-3">
                  <button type="button" onClick={() => setUploadMode('url')} className={`px-4 py-2 rounded-md flex items-center gap-2 text-sm ${uploadMode === 'url' ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-700'}`}><LinkIcon size={16}/> Web URL</button>
                  <button type="button" onClick={() => setUploadMode('local')} className={`px-4 py-2 rounded-md flex items-center gap-2 text-sm ${uploadMode === 'local' ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-700'}`}><UploadCloud size={16}/> Local File</button>
                </div>
                {uploadMode === 'url' ? (
                  <input type="url" value={formData.image_url} onChange={(e) => setFormData({ ...formData, image_url: e.target.value })} placeholder="https://images..." className="w-full px-4 py-2 border rounded-lg" />
                ) : (
                  <input type="file" accept="image/*" onChange={handleLocalImageUpload} disabled={uploadingImage} className="w-full file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700" />
                )}
                {uploadingImage && <p className="text-sm text-blue-600 mt-2">Uploading...</p>}
              </div>
              <div className="grid grid-cols-2 gap-4">
                <input type="number" placeholder="Stock" value={formData.stock} onChange={(e) => setFormData({ ...formData, stock: e.target.value })} required className="w-full px-4 py-2 border rounded-lg" />
                <select value={formData.is_available.toString()} onChange={(e) => setFormData({ ...formData, is_available: e.target.value === 'true' })} className="w-full px-4 py-2 border rounded-lg">
                  <option value="true">Available</option>
                  <option value="false">Unavailable</option>
                </select>
              </div>
              <div className="flex gap-3 pt-4">
                <button type="submit" disabled={uploadingImage} className="flex-1 py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700">Save Product</button>
                <button type="button" onClick={resetForm} className="px-6 py-3 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300">Cancel</button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}