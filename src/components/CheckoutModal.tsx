import { useState } from 'react';
import { X, CreditCard, Wallet, Smartphone, DollarSign, Printer } from 'lucide-react';
import { ApiService } from '../services/api';

export function CheckoutModal({ isOpen, onClose, items, onConfirmPayment }: any) {
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'card' | 'online'>('cash');
  const [discountType, setDiscountType] = useState('none');
  const [adminPin, setAdminPin] = useState('');
  const [amountGiven, setAmountGiven] = useState('');
  const [printReceipt, setPrintReceipt] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  if (!isOpen) return null;

  // Financial Calculations
  const rawTotal = items.reduce((sum: number, item: any) => sum + item.price * item.cartQuantity, 0);
  let subtotal = rawTotal;
  let tax = subtotal * 0.12; // 12% standard VAT
  
  if (discountType === 'senior') {
    // Senior/PWD: VAT Exempt + 20% Discount
    subtotal = rawTotal;
    tax = 0;
    subtotal = subtotal * 0.80; // Apply 20% discount
  }
  const finalTotal = subtotal + tax;

  const handlePayment = async () => {
    if (discountType !== 'none') {
      try {
        const p = await ApiService.getProfiles();
        const validAdmin = p.find((u: any) => u.role === 'admin' && u.password === adminPin);
        if (!validAdmin) return alert("Invalid Admin PIN for Discount Override.");
      } catch { return alert("Error verifying PIN."); }
    }
    
    setIsProcessing(true);
    try {
      const receiptNumber = `${paymentMethod.toUpperCase()}-${Date.now()}`;
      await onConfirmPayment(paymentMethod, receiptNumber, finalTotal, tax, discountType, printReceipt);
      setAmountGiven(''); setAdminPin(''); setDiscountType('none'); setPrintReceipt(false);
    } finally { setIsProcessing(false); }
  };

  const isPayDisabled = isProcessing || (paymentMethod === 'cash' && parseFloat(amountGiven || '0') < finalTotal);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl max-w-lg w-full max-h-[90vh] overflow-auto">
        <div className="p-6 border-b flex items-center justify-between sticky top-0 bg-white z-10">
          <h2 className="text-2xl font-bold">Checkout</h2>
          <button onClick={onClose} className="text-gray-500"><X className="w-6 h-6" /></button>
        </div>
        <div className="p-6">
          <div className="mb-6 bg-gray-50 rounded-lg p-4 border space-y-2">
            <div className="flex justify-between text-sm"><span className="text-gray-600">Subtotal</span><span className="font-semibold">₱{rawTotal.toFixed(2)}</span></div>
            
            <div className="pt-2 border-t flex items-center justify-between">
              <span className="text-sm font-semibold">Discount Type:</span>
              <select value={discountType} onChange={(e) => setDiscountType(e.target.value)} className="border rounded p-1 text-sm">
                <option value="none">None</option>
                <option value="senior">Senior Citizen / PWD (20% + VAT Exempt)</option>
              </select>
            </div>

            {discountType !== 'none' && (
              <div className="flex justify-between text-sm text-red-600"><span className="font-semibold">Discount Applied</span><span>-₱{(rawTotal * 0.20).toFixed(2)}</span></div>
            )}

            <div className="flex justify-between text-sm"><span className="text-gray-600">VAT (12%)</span><span className="font-semibold">₱{tax.toFixed(2)}</span></div>
            <div className="flex justify-between text-lg font-bold pt-2 border-t"><span>Total Due</span><span className="text-blue-600">₱{finalTotal.toFixed(2)}</span></div>
          </div>

          {discountType !== 'none' && (
             <div className="mb-6"><label className="block text-sm font-semibold text-red-600 mb-2">Admin Override PIN Required</label><input type="password" value={adminPin} onChange={(e) => setAdminPin(e.target.value)} className="w-full px-4 py-2 border border-red-300 rounded-lg focus:ring-red-600 focus:ring-2" placeholder="****" /></div>
          )}

          <div className="mb-6 space-y-2">
            <h3 className="font-semibold mb-3">Payment Method</h3>
            <button onClick={() => setPaymentMethod('cash')} className={`w-full p-4 rounded-lg border-2 flex items-center gap-3 ${paymentMethod === 'cash' ? 'border-blue-600 bg-blue-50' : 'border-gray-200'}`}><Wallet className="w-6 h-6 text-blue-600" /><div className="text-left font-semibold">Cash</div></button>
            <button onClick={() => setPaymentMethod('card')} className={`w-full p-4 rounded-lg border-2 flex items-center gap-3 ${paymentMethod === 'card' ? 'border-blue-600 bg-blue-50' : 'border-gray-200'}`}><CreditCard className="w-6 h-6 text-blue-600" /><div className="text-left font-semibold">Card</div></button>
          </div>

          {paymentMethod === 'cash' && (
            <div className="mb-6 p-4 bg-gray-50 border rounded-lg">
              <label className="block text-sm font-semibold mb-2">Amount Given (₱)</label>
              <div className="relative mb-2">
                <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input type="number" step="0.01" value={amountGiven} onChange={(e) => setAmountGiven(e.target.value)} className="w-full pl-10 py-2 border rounded-lg text-lg font-bold focus:ring-2 focus:ring-blue-600" />
              </div>
              {parseFloat(amountGiven || '0') >= finalTotal && <div className="text-green-600 font-bold flex justify-between pt-2"><span>Change:</span><span>₱{(parseFloat(amountGiven) - finalTotal).toFixed(2)}</span></div>}
            </div>
          )}

          <div className="mb-6 p-4 bg-blue-50 rounded-lg border border-blue-200 flex items-center gap-3 cursor-pointer" onClick={() => setPrintReceipt(!printReceipt)}>
            <input type="checkbox" checked={printReceipt} readOnly className="w-5 h-5 cursor-pointer accent-blue-600" />
            <div className="flex items-center gap-2 font-semibold text-blue-900"><Printer size={18}/> Print Customer Receipt</div>
          </div>

          <button onClick={handlePayment} disabled={isPayDisabled} className="w-full py-3 bg-green-600 text-white rounded-lg font-semibold hover:bg-green-700 disabled:bg-gray-400">
            {isProcessing ? 'Processing...' : `Complete Payment - ₱${finalTotal.toFixed(2)}`}
          </button>
        </div>
      </div>
    </div>
  );
}