import { useState } from 'react';
import { supabase } from '../lib/supabase';
import { DollarSign, AlertCircle } from 'lucide-react';
import type { Shift } from '../lib/database.types';

export function StartShift({ employeeId, onShiftStarted }: { employeeId: string, onShiftStarted: (shift: Shift) => void }) {
  const [cash, setCash] = useState('');
  const [loading, setLoading] = useState(false);

  const handleStartShift = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    
    const { data, error } = await supabase.from('shifts').insert({
      employee_id: employeeId,
      starting_cash: parseFloat(cash)
    }).select().single();

    if (!error && data) {
      onShiftStarted(data);
    } else {
      alert("Error starting shift.");
    }
    setLoading(false);
  };

  return (
    <div className="fixed inset-0 bg-gray-900 bg-opacity-75 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl max-w-md w-full p-6 text-center">
        <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-yellow-100 mb-4">
          <AlertCircle className="h-6 w-6 text-yellow-600" />
        </div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Start Your Shift</h2>
        <p className="text-gray-600 mb-6">Please count the money in the POS drawer left by the previous employee.</p>
        
        <form onSubmit={handleStartShift}>
          <div className="relative rounded-md shadow-sm mb-6">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <DollarSign className="h-5 w-5 text-gray-400" />
            </div>
            <input
              type="number" step="0.01" required value={cash} onChange={(e) => setCash(e.target.value)}
              className="focus:ring-blue-500 focus:border-blue-500 block w-full pl-10 text-xl border-gray-300 rounded-md py-3 border text-center"
              placeholder="0.00"
            />
          </div>
          <button type="submit" disabled={loading || !cash} className="w-full py-3 px-4 rounded-md shadow-sm text-lg font-medium text-white bg-green-600 hover:bg-green-700 disabled:bg-gray-400">
            {loading ? 'Starting...' : 'Confirm Cash & Start POS'}
          </button>
        </form>
      </div>
    </div>
  );
}