import { useEffect } from 'react';
import { X, Printer } from 'lucide-react';

export function Receipt({ isOpen, onClose, order, orderItems, shouldPrint }: any) {
  useEffect(() => { if (isOpen && shouldPrint) setTimeout(() => window.print(), 500); }, [isOpen, shouldPrint]);
  if (!isOpen || !order) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 print:p-0 print:bg-transparent">
      <div className="bg-white rounded-xl max-w-md w-full max-h-[90vh] overflow-auto print-section">
        <div className="p-6 border-b flex items-center justify-between print:hidden">
          <h2 className="text-2xl font-bold">Receipt</h2>
          <div className="flex gap-2">
            <button onClick={() => window.print()} className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg"><Printer size={20} /></button>
            <button onClick={onClose} className="text-gray-500"><X size={20} /></button>
          </div>
        </div>
        
        <div className="p-6 print:p-0">
          <div className="text-center mb-4">
            <h1 className="text-2xl print:text-xl font-bold mb-1">CAFE POS</h1>
            <p className="text-sm print:text-xs text-gray-600">Order #{order.order_number}</p>
            <p className="text-sm print:text-xs text-gray-600">{new Date(order.created_at).toLocaleString()}</p>
          </div>
          
          <div className="print-dashed my-2 border-b border-gray-200 print:border-none"></div>
          
          <div className="space-y-2 mb-4">
            {orderItems.map((item: any) => (
              <div key={item.id} className="flex justify-between text-sm print:text-xs">
                <span className="flex-1">{item.quantity}x {item.product.name}</span>
                <span className="font-semibold">₱{item.subtotal.toFixed(2)}</span>
              </div>
            ))}
          </div>
          
          <div className="print-dashed my-2 border-b border-gray-200 print:border-none"></div>
          
          <div className="pt-2 space-y-1">
            {order.discount_type !== 'none' && <div className="flex justify-between text-sm print:text-xs text-red-600"><span>Discount applied</span></div>}
            <div className="flex justify-between text-sm print:text-xs"><span>Tax (VAT)</span><span>₱{parseFloat(order.tax_amount).toFixed(2)}</span></div>
            <div className="flex justify-between text-lg print:text-sm font-bold pt-2"><span>TOTAL</span><span>₱{parseFloat(order.total).toFixed(2)}</span></div>
            <div className="flex justify-between text-sm print:text-xs pt-1"><span>Payment Method</span><span className="uppercase">{order.payment_method}</span></div>
          </div>
          
          <div className="print-dashed my-4 border-b border-gray-200 print:border-none"></div>
          <div className="text-center text-sm print:text-[10px] text-gray-500 italic mt-4">Thank you for your purchase!</div>
        </div>
      </div>
    </div>
  );
}