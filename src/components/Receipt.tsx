import { X, Printer } from 'lucide-react';
import type { Order, OrderItem, Product } from '../lib/database.types';

interface ReceiptProps {
  isOpen: boolean;
  onClose: () => void;
  order: Order | null;
  orderItems: (OrderItem & { product: Product })[];
}

export function Receipt({ isOpen, onClose, order, orderItems }: ReceiptProps) {
  if (!isOpen || !order) return null;

  const handlePrint = () => {
    window.print();
  };

  const subtotal = order.total / 1.1;
  const tax = subtotal * 0.1;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl max-w-md w-full max-h-[90vh] overflow-auto">
        <div className="p-6 border-b border-gray-200 flex items-center justify-between print:hidden">
          <h2 className="text-2xl font-bold text-gray-900">Receipt</h2>
          <div className="flex gap-2">
            <button
              onClick={handlePrint}
              className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg"
            >
              <Printer className="w-5 h-5" />
            </button>
            <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>

        <div className="p-6 print:p-8">
          <div className="text-center mb-6">
            <h1 className="text-2xl font-bold text-gray-900 mb-1">Cafe Management</h1>
            <p className="text-sm text-gray-600">Thank you for your purchase!</p>
          </div>

          <div className="border-t border-b border-gray-200 py-4 mb-4 text-sm">
            <div className="flex justify-between mb-1">
              <span className="text-gray-600">Order Number:</span>
              <span className="font-semibold">{order.order_number}</span>
            </div>
            <div className="flex justify-between mb-1">
              <span className="text-gray-600">Receipt Number:</span>
              <span className="font-semibold">{order.receipt_number}</span>
            </div>
            <div className="flex justify-between mb-1">
              <span className="text-gray-600">Date:</span>
              <span className="font-semibold">
                {new Date(order.created_at).toLocaleString()}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Payment Method:</span>
              <span className="font-semibold uppercase">{order.payment_method}</span>
            </div>
          </div>

          <div className="mb-4">
            <h3 className="font-semibold text-gray-900 mb-3">Items</h3>
            <div className="space-y-2">
              {orderItems.map((item) => (
                <div key={item.id} className="flex justify-between text-sm">
                  <div className="flex-1">
                    <div className="font-medium text-gray-900">{item.product.name}</div>
                    <div className="text-gray-600">
                      ${item.price.toFixed(2)} × {item.quantity}
                    </div>
                  </div>
                  <div className="font-semibold text-gray-900">
                    ${item.subtotal.toFixed(2)}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="border-t border-gray-200 pt-4 space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Subtotal</span>
              <span className="font-semibold">${subtotal.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Tax (10%)</span>
              <span className="font-semibold">${tax.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-lg font-bold pt-2 border-t border-gray-200">
              <span>Total</span>
              <span className="text-blue-600">${order.total.toFixed(2)}</span>
            </div>
          </div>

          <div className="mt-6 pt-6 border-t border-gray-200 text-center text-sm text-gray-600">
            <p>Visit us again soon!</p>
            <p className="mt-1">www.cafemanagement.com</p>
          </div>
        </div>
      </div>
    </div>
  );
}
