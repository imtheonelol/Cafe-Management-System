import { useState, useEffect } from 'react';
import { DollarSign, LogOut, X } from 'lucide-react';
import { ApiService } from '../services/api';

export function EndShiftModal({ isOpen, onClose, shift, employeeId, onConfirm }: any) {
  const [step, setStep] = useState<'audit' | 'receipt'>('audit');
  const [actualCash, setActualCash] = useState('');
  const [expectedCash, setExpectedCash] = useState(0);
  const [defaultFloat, setDefaultFloat] = useState(800);
  const [salesBreakdown, setSalesBreakdown] = useState({ total: 0, cash: 0, card: 0, online: 0 });
  const [loading, setLoading] = useState(false);

  const startingFloat = parseFloat(shift?.starting_cash || '0');

  useEffect(() => {
    if (isOpen && shift) {
      ApiService.getSettings().then(s => setDefaultFloat(parseFloat(s.default_floating_cash || '800')));
      ApiService.getShiftSalesBreakdown(employeeId, shift.start_time).then(breakdown => { 
        setSalesBreakdown(breakdown); 
        setExpectedCash(startingFloat + breakdown.cash); 
        setStep('audit'); 
      });
    }
  }, [isOpen, shift, employeeId]);

  useEffect(() => {
    if (step === 'receipt') { const timer = setTimeout(() => { window.print(); }, 500); return () => clearTimeout(timer); }
  }, [step]);

  const handleEndShift = async (e: React.FormEvent) => {
    e.preventDefault(); setLoading(true);
    await ApiService.endShift(shift.id, parseFloat(actualCash), expectedCash);
    setStep('receipt'); setLoading(false);
  };

  if (!isOpen) return null;
  
  const actual = parseFloat(actualCash || '0');
  const difference = actual - expectedCash;
  
  // They must leave the fixed float (e.g. 800) in the drawer. The rest is turned over.
  const amountToTurnOver = actual - defaultFloat > 0 ? actual - defaultFloat : 0; 

  if (step === 'receipt') {
    return (
      <div className="fixed inset-0 bg-gray-900 bg-opacity-75 flex items-center justify-center z-50 p-4 print:p-0 print:bg-transparent">
        <div className="bg-white rounded-xl max-w-md w-full p-6 print:shadow-none print:w-full print:max-w-none text-center print-section">
          <h2 className="text-2xl print:text-xl font-bold mb-2">Z-READING</h2>
          <p className="text-gray-600 print:text-xs mb-4">Date: {new Date().toLocaleString()}</p>
          <div className="print-dashed my-2 border-b border-gray-200 print:border-none"></div>

          <div className="text-left space-y-1 mb-4 text-sm print:text-xs">
            <h3 className="font-bold print:text-sm mb-1">Sales Summary</h3>
            <div className="flex justify-between"><span>Cash Sales:</span> <span>₱{salesBreakdown.cash.toFixed(2)}</span></div>
            <div className="flex justify-between"><span>Card/Online:</span> <span>₱{(salesBreakdown.card + salesBreakdown.online).toFixed(2)}</span></div>
            <div className="flex justify-between font-bold pt-2 mt-2 border-t"><span>Total Shift Sales:</span> <span>₱{salesBreakdown.total.toFixed(2)}</span></div>
          </div>
          
          <div className="print-dashed my-2 border-b border-gray-200 print:border-none"></div>

          <div className="text-left space-y-1 mb-4 text-sm print:text-xs">
            <h3 className="font-bold print:text-sm mb-1">Drawer Audit</h3>
            <div className="flex justify-between text-gray-500"><span>Started With:</span> <span>₱{startingFloat.toFixed(2)}</span></div>
            <div className="flex justify-between text-gray-500"><span>Cash Sales:</span> <span>+ ₱{salesBreakdown.cash.toFixed(2)}</span></div>
            <div className="flex justify-between font-bold pt-2 mt-1 border-t"><span>Expected Total:</span> <span>₱{expectedCash.toFixed(2)}</span></div>
            <div className="flex justify-between font-bold pt-1"><span>Actual Counted:</span> <span>₱{actual.toFixed(2)}</span></div>
            <div className="flex justify-between font-bold pt-2 mt-2"><span>Variance:</span> <span className={difference < 0 ? 'text-red-600' : 'text-green-600'}>{difference > 0 ? '+' : ''}₱{difference.toFixed(2)}</span></div>
          </div>

          <div className="print-dashed my-2 border-b border-gray-200 print:border-none"></div>

          <div className="bg-gray-100 p-3 mt-4 rounded border font-bold text-lg flex justify-between print:bg-transparent print:border-t print:border-b print:rounded-none">
             <span>Remit to Safe:</span> <span>₱{amountToTurnOver.toFixed(2)}</span>
          </div>
          <p className="text-sm print:text-[10px] text-gray-500 mt-4 italic">Left ₱{defaultFloat.toFixed(2)} in drawer.</p>

          <div className="print:hidden mt-8 border-t border-gray-200 pt-4">
            <button onClick={onConfirm} className="w-full py-3 bg-red-600 text-white rounded-lg font-bold hover:bg-red-700">Close Screen & Logout</button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-gray-900 bg-opacity-75 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl max-w-md w-full p-6 relative">
        <button onClick={onClose} className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"><X /></button>
        <div className="text-center mb-6">
          <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-100 mb-4"><LogOut className="h-6 text-red-600" /></div>
          <h2 className="text-2xl font-bold">End Shift Audit</h2>
          <p className="text-gray-600 text-sm mt-1">Count all cash in the drawer.</p>
        </div>
        <div className="bg-gray-50 p-4 rounded-lg mb-6 space-y-2 text-sm border border-gray-200">
          <div className="flex justify-between text-gray-500"><span>Started With:</span> <span>₱{startingFloat.toFixed(2)}</span></div>
          <div className="flex justify-between text-gray-500"><span>Cash Sales:</span> <span className="text-green-600">+ ₱{salesBreakdown.cash.toFixed(2)}</span></div>
          <div className="border-t pt-2 flex justify-between font-bold text-lg text-gray-900"><span>Expected Drawer:</span> <span>₱{expectedCash.toFixed(2)}</span></div>
        </div>
        <form onSubmit={handleEndShift}>
          <label className="block text-sm font-bold text-center mb-2">Total Actual Cash in Drawer</label>
          <div className="relative rounded-md shadow-sm mb-4">
            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none"><span className="text-gray-500 font-bold text-lg">₱</span></div>
            <input type="number" step="0.01" required value={actualCash} onChange={(e) => setActualCash(e.target.value)} className="focus:ring-red-500 w-full pl-10 text-3xl font-bold border rounded-md py-4 text-center outline-none" placeholder="0.00" />
          </div>
          {actualCash && (
            <div className="bg-blue-50 border border-blue-200 p-4 rounded-lg mb-6 text-center">
              <p className="text-sm font-semibold text-blue-800 mb-1">Cash to Turn Over / Drop in Safe</p>
              <p className="text-2xl font-bold text-blue-900">₱{amountToTurnOver.toFixed(2)}</p>
              <p className="text-xs text-blue-700 mt-1">Leave exactly ₱{defaultFloat.toFixed(2)} in drawer.</p>
            </div>
          )}
          <button type="submit" disabled={loading || !actualCash} className="w-full py-3 bg-red-600 text-white rounded-md font-bold text-lg hover:bg-red-700 disabled:bg-gray-400">{loading ? 'Processing...' : 'Submit Audit & Finish'}</button>
        </form>
      </div>
    </div>
  );
}