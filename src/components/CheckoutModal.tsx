import { useState } from 'react';
import { X, CreditCard, Wallet, Smartphone, DollarSign } from 'lucide-react';
import type { CartItem } from '../lib/database.types';

interface CheckoutModalProps {
  isOpen: boolean;
  onClose: () => void;
  items: CartItem[];
  total: number;
  onConfirmPayment: (paymentMethod: string, receiptNumber: string) => Promise<void>;
}

export function CheckoutModal({ isOpen, onClose, items, total, onConfirmPayment }: CheckoutModalProps) {
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'card' | 'online'>('cash');
  const [receiptNumber, setReceiptNumber] = useState('');
  const [amountGiven, setAmountGiven] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  if (!isOpen) return null;

  const handlePayment = async () => {
    if (paymentMethod === 'online' && !receiptNumber) {
      alert('Please enter receipt/transaction number');
      return;
    }

    setIsProcessing(true);
    try {
      const finalReceiptNumber = paymentMethod === 'online'
        ? receiptNumber
        : `${paymentMethod.toUpperCase()}-${Date.now()}`;

      await onConfirmPayment(paymentMethod, finalReceiptNumber);
      
      // Reset state for next order
      setAmountGiven('');
      setReceiptNumber('');
    } finally {
      setIsProcessing(false);
    }
  };

  // Disable pay button if cash is selected but the amount given is less than the total
  const isPayDisabled = isProcessing || (paymentMethod === 'cash' && (parseFloat(amountGiven || '0') < total));

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl max-w-lg w-full max-h-[90vh] overflow-auto">
        <div className="p-6 border-b border-gray-200 flex items-center justify-between sticky top-0 bg-white z-10">
          <h2 className="text-2xl font-bold text-gray-900">Payment</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="p-6">
          <div className="mb-6">
            <h3 className="font-semibold text-gray-900 mb-3">Order Summary</h3>
            <div className="bg-gray-50 rounded-lg p-4 space-y-2 border border-gray-200">
              {items.map(item => (
                <div key={item.id} className="flex justify-between text-sm">
                  <span className="text-gray-700">
                    {item.name} × {item.cartQuantity}
                  </span>
                  <span className="font-semibold">
                    ${(item.price * item.cartQuantity).toFixed(2)}
                  </span>
                </div>
              ))}
              <div className="border-t border-gray-200 pt-2 mt-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Subtotal</span>
                  <span className="font-semibold">${(total / 1.1).toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Tax (10%)</span>
                  <span className="font-semibold">${(total / 1.1 * 0.1).toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-lg font-bold mt-2 pt-2 border-t border-gray-200">
                  <span>Total Due</span>
                  <span className="text-blue-600">${total.toFixed(2)}</span>
                </div>
              </div>
            </div>
          </div>

          <div className="mb-6">
            <h3 className="font-semibold text-gray-900 mb-3">Payment Method</h3>
            <div className="space-y-2">
              <button onClick={() => setPaymentMethod('cash')} className={`w-full p-4 rounded-lg border-2 flex items-center gap-3 transition-colors ${paymentMethod === 'cash' ? 'border-blue-600 bg-blue-50' : 'border-gray-200 hover:border-gray-300'}`}>
                <Wallet className="w-6 h-6 text-blue-600" />
                <div className="text-left"><div className="font-semibold">Cash</div><div className="text-sm text-gray-600">Pay with cash and open cash drawer</div></div>
              </button>

              <button onClick={() => setPaymentMethod('card')} className={`w-full p-4 rounded-lg border-2 flex items-center gap-3 transition-colors ${paymentMethod === 'card' ? 'border-blue-600 bg-blue-50' : 'border-gray-200 hover:border-gray-300'}`}>
                <CreditCard className="w-6 h-6 text-blue-600" />
                <div className="text-left"><div className="font-semibold">Card</div><div className="text-sm text-gray-600">Pay with debit or credit card</div></div>
              </button>

              <button onClick={() => setPaymentMethod('online')} className={`w-full p-4 rounded-lg border-2 flex items-center gap-3 transition-colors ${paymentMethod === 'online' ? 'border-blue-600 bg-blue-50' : 'border-gray-200 hover:border-gray-300'}`}>
                <Smartphone className="w-6 h-6 text-blue-600" />
                <div className="text-left"><div className="font-semibold">Online Payment</div><div className="text-sm text-gray-600">Digital wallet or online transfer</div></div>
              </button>
            </div>
          </div>

          {/* Cash Change Calculator */}
          {paymentMethod === 'cash' && (
            <div className="mb-6 p-4 bg-gray-50 border border-gray-200 rounded-lg">
              <label className="block text-sm font-semibold text-gray-900 mb-2">Amount Given (Cash)</label>
              <div className="relative rounded-md shadow-sm mb-2">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <DollarSign className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  type="number" step="0.01" value={amountGiven} onChange={(e) => setAmountGiven(e.target.value)}
                  placeholder="0.00"
                  className="w-full px-4 py-2 pl-10 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600 font-semibold text-lg"
                />
              </div>
              {parseFloat(amountGiven || '0') >= total && (
                <div className="text-green-600 font-bold text-lg flex justify-between pt-2">
                  <span>Change to Return:</span>
                  <span>${(parseFloat(amountGiven) - total).toFixed(2)}</span>
                </div>
              )}
            </div>
          )}

          {paymentMethod === 'online' && (
            <div className="mb-6">
              <label className="block text-sm font-semibold text-gray-900 mb-2">Receipt/Transaction Number</label>
              <input type="text" value={receiptNumber} onChange={(e) => setReceiptNumber(e.target.value)} placeholder="Enter receipt or transaction number" className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600" />
            </div>
          )}

          <button
            onClick={handlePayment}
            disabled={isPayDisabled}
            className="w-full py-3 bg-green-600 text-white rounded-lg font-semibold hover:bg-green-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
          >
            {isProcessing ? 'Processing...' : `Complete Payment - $${total.toFixed(2)}`}
          </button>
        </div>
      </div>
    </div>
  );
}