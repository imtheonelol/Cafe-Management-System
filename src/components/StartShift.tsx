import { useState, useEffect } from 'react';
import { Wallet } from 'lucide-react';
import { ApiService } from '../services/api';

export function StartShift({ employeeId, onShiftStarted }: any) {
  const [floatAmount, setFloatAmount] = useState(800);
  const [actualCount, setActualCount] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    ApiService.getSettings().then(s => {
      setFloatAmount(parseFloat(s.default_floating_cash || '800'));
      setLoading(false);
    });
  }, []);

  const handleStart = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    // Saves exactly what the cashier counted as the starting point
    const shift = await ApiService.startShift(employeeId, parseFloat(actualCount));
    onShiftStarted(shift);
  };

  if (loading) return null;

  const difference = parseFloat(actualCount || '0') - floatAmount;

  return (
    <div className="fixed inset-0 bg-gray-900 bg-opacity-75 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl max-w-md w-full p-8 text-center shadow-2xl">
        <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-blue-100 mb-6"><Wallet className="h-8 text-blue-600" /></div>
        <h2 className="text-2xl font-bold mb-2">Open Register</h2>
        <p className="text-gray-600 mb-6">Recount the drawer to verify the change fund.</p>
        
        <div className="bg-gray-50 rounded-lg p-4 mb-6 border border-gray-200 flex justify-between items-center">
          <span className="text-gray-600 font-semibold">Expected Fund:</span>
          <span className="text-2xl font-bold text-blue-600">₱{floatAmount.toFixed(2)}</span>
        </div>
        
        <form onSubmit={handleStart}>
          <label className="block text-sm font-bold text-gray-700 mb-2 text-left">Actual Counted Cash</label>
          <div className="relative rounded-md shadow-sm mb-4">
            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none"><span className="text-gray-500 font-bold text-xl">₱</span></div>
            <input type="number" step="0.01" required value={actualCount} onChange={(e) => setActualCount(e.target.value)} className="focus:ring-blue-500 w-full pl-10 text-3xl font-bold border rounded-md py-4 text-center outline-none" placeholder="0.00" />
          </div>

          {actualCount && (
            <div className={`text-sm font-bold mb-6 p-3 rounded border ${difference === 0 ? 'text-green-700 bg-green-50 border-green-200' : difference > 0 ? 'text-blue-700 bg-blue-50 border-blue-200' : 'text-red-700 bg-red-50 border-red-200'}`}>
              {difference === 0 ? "Drawer is perfectly balanced!" : difference > 0 ? `Overage of ₱${difference.toFixed(2)} detected.` : `Shortage of ₱${Math.abs(difference).toFixed(2)} detected.`}
            </div>
          )}

          <button type="submit" disabled={submitting || !actualCount} className="w-full py-4 bg-blue-600 text-white rounded-xl font-bold text-lg hover:bg-blue-700 disabled:bg-gray-400 transition-colors shadow-sm">
            {submitting ? 'Opening...' : 'Confirm & Start Shift'}
          </button>
        </form>
      </div>
    </div>
  );
}