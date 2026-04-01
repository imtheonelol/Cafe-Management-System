import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { DollarSign, LogOut, X } from 'lucide-react';
import type { Shift } from '../lib/database.types';

interface EndShiftProps {
  isOpen: boolean;
  onClose: () => void;
  shift: Shift;
  employeeId: string;
  onConfirm: () => void;
}

export function EndShiftModal({ isOpen, onClose, shift, employeeId, onConfirm }: EndShiftProps) {
  const [actualCash, setActualCash] = useState('');
  const [expectedCash, setExpectedCash] = useState(0);
  const [cashSales, setCashSales] = useState(0);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen && shift) {
      calculateExpectedCash();
    }
  }, [isOpen, shift]);

  const calculateExpectedCash = async () => {
    const { data } = await supabase
      .from('orders')
      .select('total')
      .eq('employee_id', employeeId)
      .eq('payment_method', 'cash')
      .gte('created_at', shift.start_time);

    const totalCashSales = data?.reduce((sum, order) => sum + order.total, 0) || 0;
    setCashSales(totalCashSales);
    setExpectedCash(shift.starting_cash + totalCashSales);
  };

  const handleEndShift = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const endingCashNum = parseFloat(actualCash);

    const { error } = await supabase
      .from('shifts')
      .update({
        ending_cash: endingCashNum,
        expected_cash: expectedCash,
        end_time: new Date().toISOString()
      })
      .eq('id', shift.id);

    setLoading(false);
    if (!error) {
      onConfirm(); // Trigger Logout
    } else {
      alert("Failed to end shift.");
    }
  };

  if (!isOpen) return null;

  const difference = parseFloat(actualCash || '0') - expectedCash;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl max-w-md w-full p-6 relative">
        <button onClick={onClose} className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"><X /></button>
        
        <div className="text-center mb-6">
          <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-100 mb-4">
            <LogOut className="h-6 w-6 text-red-600" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900">End of Shift Audit</h2>
          <p className="text-gray-600 text-sm mt-1">Count the drawer to finish your shift.</p>
        </div>

        <div className="bg-gray-50 p-4 rounded-lg mb-6 space-y-2 text-sm border border-gray-200">
          <div className="flex justify-between"><span className="text-gray-600">Starting Cash:</span> <span className="font-semibold">${shift.starting_cash.toFixed(2)}</span></div>
          <div className="flex justify-between"><span className="text-gray-600">Cash Sales:</span> <span className="font-semibold text-green-600">+ ${cashSales.toFixed(2)}</span></div>
          <div className="border-t pt-2 flex justify-between font-bold text-lg"><span className="text-gray-900">Expected in Drawer:</span> <span className="text-blue-600">${expectedCash.toFixed(2)}</span></div>
        </div>
        
        <form onSubmit={handleEndShift}>
          <label className="block text-sm font-semibold text-gray-900 mb-2 text-center">Enter Actual Cash in Drawer</label>
          <div className="relative rounded-md shadow-sm mb-4">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none"><DollarSign className="h-5 w-5 text-gray-400" /></div>
            <input type="number" step="0.01" required value={actualCash} onChange={(e) => setActualCash(e.target.value)} className="focus:ring-red-500 focus:border-red-500 block w-full pl-10 text-2xl font-bold border-gray-300 rounded-md py-3 border text-center" placeholder="0.00" />
          </div>

          {actualCash && (
            <div className={`text-center font-bold mb-6 ${difference === 0 ? 'text-green-600' : difference > 0 ? 'text-blue-600' : 'text-red-600'}`}>
              {difference === 0 ? "Drawer is perfectly balanced!" : difference > 0 ? `Overage: +$${difference.toFixed(2)}` : `Shortage: -$${Math.abs(difference).toFixed(2)}`}
            </div>
          )}

          <button type="submit" disabled={loading || !actualCash} className="w-full py-3 px-4 rounded-md shadow-sm text-lg font-medium text-white bg-red-600 hover:bg-red-700 disabled:bg-gray-400 flex justify-center items-center gap-2">
            {loading ? 'Processing...' : 'Submit Audit & Logout'}
          </button>
        </form>
      </div>
    </div>
  );
}