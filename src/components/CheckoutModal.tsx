import { useState } from 'react';
import { X, CreditCard, Wallet, DollarSign, Printer } from 'lucide-react';
import { ApiService } from '../services/api';

export function CheckoutModal({ isOpen, onClose, items, onConfirmPayment }: any) {
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'card' | 'online'>('cash');
  const [discountType, setDiscountType] = useState('none');
  const [amountGiven, setAmountGiven] = useState('');
  const [printReceipt, setPrintReceipt] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  if (!isOpen) return null;

  const rawTotal = items.reduce((sum: number, item: any) => sum + item.price * item.cartQuantity, 0);
  let subtotal = rawTotal;
  let tax = subtotal * 0.12; 
  
  if (discountType === 'senior') {
    subtotal = rawTotal; tax = 0; subtotal = subtotal * 0.80; 
  }
  const finalTotal = subtotal + tax;

  const handlePayment = async () => {
    setIsProcessing(true);
    try {
      const receiptNumber = `${paymentMethod.toUpperCase()}-${Date.now()}`;
      await onConfirmPayment(paymentMethod, receiptNumber, finalTotal, tax, discountType, printReceipt);
      
      // Reset state for next order
      setAmountGiven(''); 
      setDiscountType('none'); 
      setPrintReceipt(false);
    } catch (err) {
      alert("Error processing payment.");
    } finally { 
      setIsProcessing(false); 
    }
  };

  // Button disables if processing, OR if cash is selected but amount given is less than total
  const isPayDisabled = isProcessing || (paymentMethod === 'cash' && parseFloat(amountGiven || '0') < (finalTotal - 0.01));

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl max-w-lg w-full max-h-[90vh] overflow-auto shadow-2xl">
        <div className="p-6 border-b flex items-center justify-between sticky top-0 bg-white z-10">
          <h2 className="text-2xl font-bold">Checkout</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-red-500 transition-colors"><X size={24}/></button>
        </div>
        
        <div className="p-6">
          <div className="mb-6 bg-gray-50 rounded-lg p-4 border border-gray-200 space-y-2 shadow-sm">
            <div className="flex justify-between text-sm"><span className="text-gray-600">Subtotal</span><span className="font-semibold">₱{rawTotal.toFixed(2)}</span></div>
            <div className="pt-2 border-t border-gray-200 flex items-center justify-between">
              <span className="text-sm font-semibold">Apply Discount:</span>
              <select value={discountType} onChange={(e) => setDiscountType(e.target.value)} className="border border-gray-300 rounded-md p-1 text-sm focus:ring-2 focus:ring-blue-600 outline-none">
                <option value="none">None</option>
                <option value="senior">Senior / PWD (20% + VAT Exempt)</option>
              </select>
            </div>
            {discountType !== 'none' && <div className="flex justify-between text-sm text-red-600"><span className="font-semibold">Discount Applied</span><span>-₱{(rawTotal * 0.20).toFixed(2)}</span></div>}
            <div className="flex justify-between text-sm"><span className="text-gray-600">VAT (12%)</span><span className="font-semibold">₱{tax.toFixed(2)}</span></div>
            <div className="flex justify-between text-xl font-bold pt-3 border-t border-gray-300 mt-2"><span>Total Due</span><span className="text-blue-700">₱{finalTotal.toFixed(2)}</span></div>
          </div>
          
          <div className="mb-6 space-y-3">
            <h3 className="font-semibold text-gray-800">Payment Method</h3>
            <div className="flex gap-3">
              <button onClick={() => setPaymentMethod('cash')} className={`flex-1 py-4 rounded-xl border-2 flex flex-col items-center gap-2 transition-all ${paymentMethod === 'cash' ? 'border-blue-600 bg-blue-50 text-blue-700 shadow-md' : 'border-gray-200 text-gray-500 hover:bg-gray-50'}`}>
                <Wallet size={28} />
                <div className="font-bold">Cash</div>
              </button>
              <button onClick={() => setPaymentMethod('card')} className={`flex-1 py-4 rounded-xl border-2 flex flex-col items-center gap-2 transition-all ${paymentMethod === 'card' ? 'border-blue-600 bg-blue-50 text-blue-700 shadow-md' : 'border-gray-200 text-gray-500 hover:bg-gray-50'}`}>
                <CreditCard size={28} />
                <div className="font-bold">Card</div>
              </button>
            </div>
          </div>
          
          {paymentMethod === 'cash' && (
            <div className="mb-6 p-5 bg-white border-2 border-gray-200 rounded-xl shadow-sm">
              <div className="flex justify-between items-center mb-3">
                <label className="block text-sm font-bold text-gray-700">Amount Given by Customer</label>
                <button onClick={() => setAmountGiven(finalTotal.toFixed(2))} className="text-xs bg-blue-100 text-blue-700 px-3 py-1.5 rounded-md font-bold hover:bg-blue-200 transition-colors shadow-sm uppercase tracking-wide">
                  Exact Cash
                </button>
              </div>
              <div className="relative mb-2">
                <DollarSign className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                <input type="number" step="0.01" value={amountGiven} onChange={(e) => setAmountGiven(e.target.value)} className="w-full pl-12 pr-4 py-3 border-2 border-gray-200 rounded-lg text-2xl font-black outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100 transition-all text-gray-800" placeholder="0.00" />
              </div>
              {parseFloat(amountGiven || '0') >= (finalTotal - 0.01) && (
                <div className="text-green-700 bg-green-50 p-3 rounded-lg font-bold flex justify-between items-center mt-3 border border-green-200">
                  <span>Change Due:</span>
                  <span className="text-2xl">₱{Math.max(0, parseFloat(amountGiven) - finalTotal).toFixed(2)}</span>
                </div>
              )}
            </div>
          )}
          
          <div className="mb-6 p-4 bg-blue-50 hover:bg-blue-100 transition-colors rounded-xl border border-blue-200 flex items-center gap-3 cursor-pointer" onClick={() => setPrintReceipt(!printReceipt)}>
            <input type="checkbox" checked={printReceipt} readOnly className="w-6 h-6 accent-blue-600 rounded cursor-pointer" />
            <div className="flex items-center gap-2 font-bold text-blue-900 select-none"><Printer size={20}/> Print Customer Receipt</div>
          </div>
          
          <button onClick={handlePayment} disabled={isPayDisabled} className="w-full py-4 bg-green-600 text-white rounded-xl font-black text-lg hover:bg-green-700 disabled:bg-gray-300 disabled:text-gray-500 transition-all shadow-lg disabled:shadow-none">
            {isProcessing ? 'Processing...' : `Complete Payment — ₱${finalTotal.toFixed(2)}`}
          </button>
        </div>
      </div>
    </div>
  );
}