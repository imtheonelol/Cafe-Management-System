import { useState, useEffect } from 'react';
import { DollarSign, LogOut, X } from 'lucide-react';
import { ApiService } from '../services/api';

export function EndShiftModal({ isOpen, onClose, shift, employeeId, onConfirm }: any) {
  const [step, setStep] = useState<'audit' | 'receipt'>('audit');
  const [actualCash, setActualCash] = useState('');
  const [expectedCash, setExpectedCash] = useState(0);
  const [cashSales, setCashSales] = useState(0);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen && shift) {
      ApiService.getCashSalesForShift(employeeId, shift.start_time).then(sales => { setCashSales(sales); setExpectedCash(parseFloat(shift.starting_cash) + sales); setStep('audit'); });
    }
  }, [isOpen, shift]);

  useEffect(() => {
    if (step === 'receipt') { const timer = setTimeout(() => { window.print(); }, 500); return () => clearTimeout(timer); }
  }, [step]);

  const handleEndShift = async (e: any) => {
    e.preventDefault(); setLoading(true);
    await ApiService.endShift(shift.id, parseFloat(actualCash), expectedCash);
    setStep('receipt'); setLoading(false);
  };

  if (!isOpen) return null;
  const difference = parseFloat(actualCash || '0') - expectedCash;

  if (step === 'receipt') {
    return (
      <div className="fixed inset-0 bg-gray-900 bg-opacity-75 flex items-center justify-center z-50 p-4 print:bg-white print:p-0">
        <div className="bg-white rounded-xl max-w-md w-full p-6 print:shadow-none print:w-full print:max-w-none text-center">
          <h2 className="text-2xl font-bold mb-2">Shift Audit Receipt</h2>
          <p className="text-gray-600 mb-6 border-b pb-4">Date: {new Date().toLocaleString()}</p>
          <div className="text-left space-y-3 mb-6 text-lg">
            <div className="flex justify-between text-gray-600"><span>Starting Cash:</span> <span>₱{parseFloat(shift.starting_cash).toFixed(2)}</span></div>
            <div className="flex justify-between text-gray-600"><span>Cash Sales:</span> <span>+ ₱{cashSales.toFixed(2)}</span></div>
            <div className="flex justify-between font-bold pt-2 border-t"><span>Expected:</span> <span>₱{expectedCash.toFixed(2)}</span></div>
            <div className="flex justify-between font-bold pt-2 border-t"><span>Actual:</span> <span>₱{parseFloat(actualCash).toFixed(2)}</span></div>
            <div className="flex justify-between font-bold pt-4 border-t-2 border-gray-800 mt-4"><span>Variance:</span> <span className={difference === 0 ? 'text-green-600' : difference > 0 ? 'text-blue-600' : 'text-red-600'}>{difference > 0 ? '+' : ''}₱{difference.toFixed(2)}</span></div>
          </div>
          <p className="text-sm text-gray-500 mt-8 italic">Audit Complete.</p>
          <div className="print:hidden mt-8 pt-6 border-t border-gray-200">
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
          <p className="text-gray-600 text-sm mt-1">Count the drawer to finish your shift.</p>
        </div>
        <div className="bg-gray-50 p-4 rounded-lg mb-6 space-y-2 text-sm border">
          <div className="flex justify-between"><span>Starting Cash:</span> <span className="font-semibold">₱{parseFloat(shift.starting_cash).toFixed(2)}</span></div>
          <div className="flex justify-between"><span>Cash Sales:</span> <span className="font-semibold text-green-600">+ ₱{cashSales.toFixed(2)}</span></div>
          <div className="border-t pt-2 flex justify-between font-bold text-lg"><span>Expected in Drawer:</span> <span className="text-blue-600">₱{expectedCash.toFixed(2)}</span></div>
        </div>
        <form onSubmit={handleEndShift}>
          <div className="relative rounded-md shadow-sm mb-4">
            <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input type="number" step="0.01" required value={actualCash} onChange={(e) => setActualCash(e.target.value)} className="focus:ring-red-500 w-full pl-10 text-2xl font-bold border rounded-md py-3 text-center" placeholder="0.00" />
          </div>
          {actualCash && <div className={`text-center font-bold mb-6 ${difference === 0 ? 'text-green-600' : difference > 0 ? 'text-blue-600' : 'text-red-600'}`}>{difference === 0 ? "Drawer perfectly balanced!" : difference > 0 ? `Overage: +₱${difference.toFixed(2)}` : `Shortage: -₱${Math.abs(difference).toFixed(2)}`}</div>}
          <button type="submit" disabled={loading || !actualCash} className="w-full py-3 bg-red-600 text-white rounded-md font-medium hover:bg-red-700 disabled:bg-gray-400">{loading ? 'Processing...' : 'Submit Audit & Finish'}</button>
        </form>
      </div>
    </div>
  );
}