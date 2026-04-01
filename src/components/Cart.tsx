import { Trash2, Plus, Minus, ShoppingCart } from 'lucide-react';
import type { CartItem } from '../lib/database.types';

export function Cart({ items, onUpdateQuantity, onRemoveItem, onCheckout }: any) {
  const total = items.reduce((sum: number, item: any) => sum + item.price * item.cartQuantity, 0);
  const itemCount = items.reduce((sum: number, item: any) => sum + item.cartQuantity, 0);

  return (
    <div className="w-96 bg-white border-l border-gray-200 flex flex-col">
      <div className="p-6 border-b border-gray-200">
        <div className="flex items-center gap-2 mb-2"><ShoppingCart className="w-6 h-6 text-blue-600" /><h2 className="text-xl font-bold text-gray-900">Current Order</h2></div>
        <p className="text-sm text-gray-600">{itemCount} item(s)</p>
      </div>
      <div className="flex-1 overflow-auto p-6">
        {items.length === 0 ? (
          <div className="text-center text-gray-500 mt-8"><ShoppingCart className="w-16 h-16 mx-auto mb-4 text-gray-300" /><p>Cart is empty</p></div>
        ) : (
          <div className="space-y-4">
            {items.map((item: any) => (
              <div key={item.id} className="bg-gray-50 rounded-lg p-4">
                <div className="flex justify-between items-start mb-2">
                  <div className="flex-1"><h3 className="font-semibold text-gray-900">{item.name}</h3><p className="text-sm text-gray-600">₱{item.price.toFixed(2)} each</p></div>
                  <button onClick={() => onRemoveItem(item.id)} className="text-red-500 hover:text-red-700 p-1"><Trash2 className="w-4 h-4" /></button>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <button onClick={() => onUpdateQuantity(item.id, -1)} className="p-1 bg-white border rounded"><Minus className="w-4 h-4" /></button>
                    <span className="w-8 text-center font-semibold">{item.cartQuantity}</span>
                    <button onClick={() => onUpdateQuantity(item.id, 1)} className="p-1 bg-white border rounded"><Plus className="w-4 h-4" /></button>
                  </div>
                  <span className="font-bold text-blue-600">₱{(item.price * item.cartQuantity).toFixed(2)}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
      <div className="p-6 border-t border-gray-200">
        <div className="mb-4">
          <div className="flex justify-between text-sm mb-2"><span className="text-gray-600">Subtotal</span><span className="font-semibold">₱{total.toFixed(2)}</span></div>
          <div className="flex justify-between text-sm mb-2"><span className="text-gray-600">Tax (12%)</span><span className="font-semibold">₱{(total * 0.12).toFixed(2)}</span></div>
          <div className="flex justify-between text-lg font-bold pt-2 border-t border-gray-200"><span>Total</span><span className="text-blue-600">₱{(total * 1.12).toFixed(2)}</span></div>
        </div>
        <button onClick={onCheckout} disabled={items.length === 0} className="w-full py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 disabled:bg-gray-300">Proceed to Payment</button>
      </div>
    </div>
  );
}