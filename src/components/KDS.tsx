import { useEffect, useState } from 'react';
import { ApiService } from '../services/api';
import { CheckCircle, Clock, ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export function KDS() {
  const [orders, setOrders] = useState<any[]>([]);
  const navigate = useNavigate();

  const load = async () => { try { setOrders(await ApiService.getPendingOrders()); } catch(e) {} };

  useEffect(() => {
    load();
    const interval = setInterval(load, 3000);
    return () => clearInterval(interval);
  }, []);

  const handleComplete = async (id: string) => { await ApiService.markOrderCompleted(id); load(); };

  return (
    <div className="min-h-screen bg-gray-900 text-white p-6">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-3xl font-bold text-yellow-400">Kitchen Display System</h1>
        <button onClick={() => navigate('/pos')} className="flex items-center gap-2 bg-gray-800 px-4 py-2 rounded-lg hover:bg-gray-700 font-bold"><ArrowLeft size={18}/> Back to POS</button>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {orders.length === 0 && <p className="text-gray-400 col-span-full text-center mt-20 text-xl font-bold">No pending orders.</p>}
        {orders.map(o => (
           <div key={o.id} className="bg-gray-800 p-4 rounded-xl border border-gray-700 shadow-lg flex flex-col">
              <div className="flex justify-between border-b border-gray-700 pb-3 mb-3"><span className="font-bold text-xl">{o.order_number}</span><span className="text-gray-400 flex items-center gap-1 text-sm"><Clock size={14}/> {new Date(o.created_at).toLocaleTimeString()}</span></div>
              <ul className="space-y-3 mb-6 flex-1">
                 {o.items.map((i: any, idx: number) => <li key={idx} className="text-lg flex justify-between font-semibold"><span className="text-yellow-400">{i.quantity}x</span><span className="text-right flex-1 ml-3">{i.name}</span></li>)}
              </ul>
              <button onClick={() => handleComplete(o.id)} className="w-full py-4 bg-green-600 rounded-lg font-bold flex justify-center items-center gap-2 hover:bg-green-500 transition-colors text-lg"><CheckCircle/> Mark Ready</button>
           </div>
        ))}
      </div>
    </div>
  )
}