import { Trash2, Plus, Minus, ShoppingCart } from 'lucide-react';
import type { CartItem } from '../lib/database.types';

export function Cart({ items, onUpdateQuantity, onRemoveItem, onCheckout }: any) {
  const total = items.reduce((sum: number, item: any) => sum + item.price * item.cartQuantity, 0);

  if (items.length === 0) {
    return (
      <div className="w-96 bg-white border-l flex flex-col items-center justify-center text-gray-500">
        <ShoppingCart size={48} className="mb-4 text-gray-300" />
        <p className="text-lg font-medium">Cart is empty</p>
      </div>
    );
  }

  return (
    <div className="w-96 bg-white border-l flex flex-col">
      <div className="p-4 border-b bg-gray-50">
        <h2 className="text-lg font-bold flex items-center gap-2"><ShoppingCart size={20} /> Current Order</h2>
      </div>
      <div className="flex-1 overflow-auto p-4 space-y-4">
        {items.map((item: any) => (
          <div key={item.id} className="flex items-center gap-3 bg-white p-3 rounded-lg border shadow-sm">
            <img src={item.image_url} alt={item.name} className="w-16 h-16 object-cover rounded-md" />
            <div className="flex-1">
              <h3 className="font-semibold text-sm leading-tight text-gray-800">{item.name}</h3>
              <p className="text-blue-600 font-bold text-sm">₱{parseFloat(item.price).toFixed(2)}</p>
              <div className="flex items-center gap-3 mt-2">
                <div className="flex items-center border rounded-lg bg-gray-50">
                  <button onClick={() => onUpdateQuantity(item.id, -1)} className="p-1 hover:bg-gray-200 rounded-l-lg text-gray-600"><Minus size={16} /></button>
                  <span className="w-8 text-center font-semibold text-sm">{item.cartQuantity}</span>
                  <button onClick={() => onUpdateQuantity(item.id, 1)} className="p-1 hover:bg-gray-200 rounded-r-lg text-gray-600"><Plus size={16} /></button>
                </div>
                <button onClick={() => onRemoveItem(item.id)} className="p-1.5 text-red-500 hover:bg-red-50 rounded-md ml-auto"><Trash2 size={16} /></button>
              </div>
            </div>
          </div>
        ))}
      </div>
      <div className="p-6 border-t bg-gray-50">
        <div className="flex justify-between items-center mb-4"><span className="text-gray-600 font-medium">Subtotal</span><span className="text-2xl font-black text-gray-900">₱{total.toFixed(2)}</span></div>
        <button onClick={onCheckout} className="w-full py-4 bg-blue-600 text-white rounded-xl font-bold text-lg hover:bg-blue-700 shadow-md transition-all">Proceed to Checkout</button>
      </div>
    </div>
  );
}