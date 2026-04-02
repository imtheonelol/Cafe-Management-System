import { useEffect, useState } from 'react';
import { ApiService } from '../services/api';
import { CheckCircle, Clock } from 'lucide-react';

export function KDS() {
  const [orders, setOrders] = useState<any[]>([]);

  const load = async () => {
    try { setOrders(await ApiService.getPendingOrders()); } catch(e) {}
  };

  useEffect(() => {
    load();
    const interval = setInterval(load, 3000); // Poll every 3 seconds
    return () => clearInterval(interval);
  }, []);

  const handleComplete = async (id: string) => {
    await ApiService.markOrderCompleted(id);
    load();
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white p-6">
      <h1 className="text-3xl font-bold mb-6 text-yellow-400">Kitchen Display System (KDS)</h1>
      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {orders.length === 0 && <p className="text-gray-400 col-span-full">No pending orders.</p>}
        {orders.map(o => (
           <div key={o.id} className="bg-gray-800 p-4 rounded-xl border border-gray-700 shadow-lg flex flex-col">
              <div className="flex justify-between border-b border-gray-700 pb-3 mb-3">
                 <span className="font-bold text-xl">{o.order_number}</span>
                 <span className="text-gray-400 flex items-center gap-1 text-sm"><Clock size={14}/> {new Date(o.created_at).toLocaleTimeString()}</span>
              </div>
              <ul className="space-y-3 mb-6 flex-1">
                 {o.items.map((i: any, idx: number) => (
                   <li key={idx} className="text-lg flex justify-between font-semibold">
                     <span className="text-yellow-400">{i.quantity}x</span>
                     <span className="text-right flex-1 ml-3">{i.name}</span>
                   </li>
                 ))}
              </ul>
              <button onClick={() => handleComplete(o.id)} className="w-full py-4 bg-green-600 rounded-lg font-bold flex justify-center items-center gap-2 hover:bg-green-500 transition-colors text-lg">
                <CheckCircle/> Mark Ready
              </button>
           </div>
        ))}
      </div>
    </div>
  )
}