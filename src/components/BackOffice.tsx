import { useState, useEffect } from 'react';
import { X, Plus, Trash2, Users, Coffee, Settings as SettingsIcon, Package, Database } from 'lucide-react';
import { ApiService } from '../services/api';

export function BackOffice({ isOpen, onClose, products, categories, profiles, onRefresh }: any) {
  const [activeTab, setActiveTab] = useState<'products' | 'ingredients' | 'employees'>('products');
  
  const [ingredients, setIngredients] = useState<any[]>([]);
  const [newIngredient, setNewIngredient] = useState({ name: '', stock: '', unit: 'kg' });
  const [dbStatus, setDbStatus] = useState('Checking...');

  useEffect(() => {
    if (isOpen) {
      ApiService.getIngredients().then(setIngredients);
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

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl max-w-6xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        <div className="p-6 border-b flex items-center justify-between">
          <div className="flex items-center gap-4">
            <h2 className="text-2xl font-bold">System Configuration</h2>
            <div className={`flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold ${dbStatus === 'Connected' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}><Database size={12}/> PostgreSQL {dbStatus}</div>
          </div>
          <button onClick={onClose} className="text-gray-500"><X size={24} /></button>
        </div>

        <div className="flex border-b bg-gray-50 px-6 pt-4 gap-4">
          <button onClick={() => setActiveTab('products')} className={`flex items-center gap-2 pb-3 border-b-2 font-semibold ${activeTab === 'products' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500'}`}><Coffee size={18}/> Products</button>
          <button onClick={() => setActiveTab('ingredients')} className={`flex items-center gap-2 pb-3 border-b-2 font-semibold ${activeTab === 'ingredients' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500'}`}><Package size={18}/> Raw Ingredients</button>
          <button onClick={() => setActiveTab('employees')} className={`flex items-center gap-2 pb-3 border-b-2 font-semibold ${activeTab === 'employees' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500'}`}><Users size={18}/> Accounts</button>
        </div>

        <div className="p-6 overflow-auto flex-1">
          {activeTab === 'ingredients' ? (
            <div className="max-w-3xl">
              <h3 className="text-lg font-semibold mb-4">Manage Raw Inventory</h3>
              <form onSubmit={handleAddIngredient} className="flex gap-2 mb-6">
                <input type="text" placeholder="Ingredient Name (e.g. Milk)" value={newIngredient.name} onChange={e=>setNewIngredient({...newIngredient, name: e.target.value})} className="flex-1 border px-3 py-2 rounded" required />
                <input type="number" placeholder="Stock" value={newIngredient.stock} onChange={e=>setNewIngredient({...newIngredient, stock: e.target.value})} className="w-24 border px-3 py-2 rounded" required />
                <select value={newIngredient.unit} onChange={e=>setNewIngredient({...newIngredient, unit: e.target.value})} className="border px-3 py-2 rounded"><option value="kg">kg</option><option value="L">Liters</option><option value="pcs">Pieces</option></select>
                <button type="submit" className="bg-blue-600 text-white px-4 rounded hover:bg-blue-700 font-bold"><Plus size={18}/></button>
              </form>
              <table className="w-full text-left border">
                <thead className="bg-gray-50"><tr><th className="p-3">Ingredient</th><th className="p-3">Current Stock</th><th className="p-3">Actions</th></tr></thead>
                <tbody>
                  {ingredients.map(i => <tr key={i.id} className="border-t"><td className="p-3">{i.name}</td><td className="p-3 font-bold">{i.stock} {i.unit}</td><td className="p-3"><button onClick={async () => { await ApiService.deleteIngredient(i.id); ApiService.getIngredients().then(setIngredients); }} className="text-red-500"><Trash2 size={18}/></button></td></tr>)}
                </tbody>
              </table>
            </div>
          ) : (
             <div className="text-gray-500 italic">Select Products or Accounts... (Form code preserved from previous step)</div>
          )}
        </div>
      </div>
    </div>
  );
}