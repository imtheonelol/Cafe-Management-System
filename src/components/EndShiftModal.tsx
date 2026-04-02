import { useState, useEffect } from 'react';
import { DollarSign, LogOut, X } from 'lucide-react';
import type { Shift } from '../lib/database.types';
import { ApiService } from '../services/api';

interface EndShiftProps { isOpen: boolean; onClose: () => void; shift: Shift; employeeId: string; onConfirm: () => void; }

export function EndShiftModal({ isOpen, onClose, shift, employeeId, onConfirm }: EndShiftProps) {
  const [step, setStep] = useState<'audit' | 'receipt'>('audit');
  const [actualCash, setActualCash] = useState('');
  const [expectedCash, setExpectedCash] = useState(0);
  const [cashSales, setCashSales] = useState(0);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen && shift) {
      ApiService.getCashSalesForShift(employeeId, shift.start_time).then(sales => {
        setCashSales(sales); setExpectedCash(shift.starting_cash + sales); setStep('audit');
      });
    }
  }, [isOpen, shift]);

  // AUTO-PRINT Logic
  useEffect(() => {
    if (step === 'receipt') {
      const timer = setTimeout(() => { window.print(); }, 500); // 500ms delay ensures the UI has loaded fully
      return () => clearTimeout(timer);
    }
  }, [step]);

  const handleEndShift = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    await ApiService.endShift(shift.id, parseFloat(actualCash), expectedCash);
    setStep('receipt');
    setLoading(false);
  };

  if (!isOpen) return null;
  const difference = parseFloat(actualCash || '0') - expectedCash;

  if (step === 'receipt') {
    return (
      <div className="fixed inset-0 bg-gray-900 bg-opacity-75 flex items-center justify-center z-50 p-4 print:bg-white print:p-0">
        <div className="bg-white rounded-xl max-w-md w-full p-6 print:shadow-none print:w-full print:max-w-none">
          <div className="text-center">
            <h2 className="text-2xl font-bold mb-2">Shift Audit Receipt</h2>
            <p className="text-gray-600 mb-6 border-b pb-4">Date: {new Date().toLocaleString()}</p>
            <div className="text-left space-y-3 mb-6 text-lg">
              <div className="flex justify-between text-gray-600"><span>Starting Cash:</span> <span>₱{shift.starting_cash.toFixed(2)}</span></div>
              <div className="flex justify-between text-gray-600"><span>Cash Sales:</span> <span>+ ₱{cashSales.toFixed(2)}</span></div>
              <div className="flex justify-between font-bold pt-2 border-t"><span>Expected:</span> <span>₱{expectedCash.toFixed(2)}</span></div>
              <div className="flex justify-between font-bold pt-2 border-t"><span>Actual:</span> <span>₱{parseFloat(actualCash).toFixed(2)}</span></div>
              <div className="flex justify-between font-bold pt-4 border-t-2 border-gray-800 mt-4">
                <span>Variance:</span> <span className={difference === 0 ? 'text-green-600' : difference > 0 ? 'text-blue-600' : 'text-red-600'}>{difference > 0 ? '+' : ''}₱{difference.toFixed(2)}</span>
              </div>
            </div>
            <p className="text-sm text-gray-500 mt-8 italic">Audit Complete. Drawer is secured.</p>
          </div>
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
          <div className="flex justify-between"><span>Starting Cash:</span> <span className="font-semibold">₱{shift.starting_cash.toFixed(2)}</span></div>
          <div className="flex justify-between"><span>Cash Sales:</span> <span className="font-semibold text-green-600">+ ₱{cashSales.toFixed(2)}</span></div>
          <div className="border-t pt-2 flex justify-between font-bold text-lg"><span>Expected in Drawer:</span> <span className="text-blue-600">₱{expectedCash.toFixed(2)}</span></div>
        </div>
        <form onSubmit={handleEndShift}>
          <label className="block text-sm font-semibold mb-2 text-center">Enter Actual Cash in Drawer</label>
          <div className="relative rounded-md shadow-sm mb-4">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center"><DollarSign className="h-5 text-gray-400" /></div>
            <input type="number" step="0.01" required value={actualCash} onChange={(e) => setActualCash(e.target.value)} className="focus:ring-red-500 w-full pl-10 text-2xl font-bold border rounded-md py-3 text-center" placeholder="0.00" />
          </div>
          {actualCash && (
             <div className={`text-center font-bold mb-6 ${difference === 0 ? 'text-green-600' : difference > 0 ? 'text-blue-600' : 'text-red-600'}`}>
               {difference === 0 ? "Drawer perfectly balanced!" : difference > 0 ? `Overage: +₱${difference.toFixed(2)}` : `Shortage: -₱${Math.abs(difference).toFixed(2)}`}
             </div>
          )}
          <button type="submit" disabled={loading || !actualCash} className="w-full py-3 bg-red-600 text-white rounded-md font-medium hover:bg-red-700 disabled:bg-gray-400">
            {loading ? 'Processing...' : 'Submit Audit & Finish'}
          </button>
        </form>
      </div>
    </div>
  );
}