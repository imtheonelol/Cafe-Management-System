import { useState, useEffect } from 'react';
import { Wallet } from 'lucide-react';
import { ApiService } from '../services/api';

export function StartShift({ employeeId, onShiftStarted }: any) {
  const [floatAmount, setFloatAmount] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    ApiService.getSettings().then(s => {
      setFloatAmount(parseFloat(s.default_floating_cash || '1500'));
      setLoading(false);
    });
  }, []);

  const handleStart = async () => {
    setLoading(true);
    const shift = await ApiService.startShift(employeeId, floatAmount);
    onShiftStarted(shift);
  };

  if (loading) return null;

  return (
    <div className="fixed inset-0 bg-gray-900 bg-opacity-75 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl max-w-md w-full p-8 text-center">
        <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-blue-100 mb-6"><Wallet className="h-8 text-blue-600" /></div>
        <h2 className="text-2xl font-bold mb-2">Open Register</h2>
        <p className="text-gray-600 mb-6">Verify your drawer contains the default change fund before starting.</p>
        
        <div className="bg-gray-50 rounded-lg p-6 mb-8 border border-gray-200">
          <p className="text-sm text-gray-500 font-semibold mb-1">Starting Change Fund</p>
          <p className="text-5xl font-bold text-blue-600">₱{floatAmount.toFixed(2)}</p>
        </div>
        
        <button onClick={handleStart} className="w-full py-4 bg-blue-600 text-white rounded-xl font-bold text-lg hover:bg-blue-700 transition-colors">Confirm & Start Shift</button>
      </div>
    </div>
  );
}