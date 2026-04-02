import { useEffect, useState, useMemo } from 'react';
import { Users, DollarSign, ReceiptText, Filter, ClipboardCheck, ShoppingBag, Search, CalendarDays } from 'lucide-react';
import { ApiService } from '../services/api';

export function AdminDashboard() {
  const [activeTab, setActiveTab] = useState<'transactions' | 'audits'>('transactions');
  const [orders, setOrders] = useState<any[]>([]);
  const [shifts, setShifts] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [timeFilter, setTimeFilter] = useState('all');

  const fetchData = async () => {
    const data = await ApiService.getAdminDashboardData();
    setOrders(data.orders);
    setShifts(data.shifts);
  };

  useEffect(() => {
    fetchData();
    window.addEventListener('db_changed', fetchData);
    const interval = setInterval(fetchData, 3000); 
    return () => { window.removeEventListener('db_changed', fetchData); clearInterval(interval); };
  }, []);

  const isWithinTime = (dateStr: string) => {
    if (timeFilter === 'all') return true;
    const date = new Date(dateStr);
    const now = new Date();
    if (timeFilter === 'today') return date.toDateString() === now.toDateString();
    if (timeFilter === 'week') { const w = new Date(); w.setDate(now.getDate() - 7); return date >= w; }
    return true;
  };

  const filteredOrders = useMemo(() => orders.filter(o => isWithinTime(o.created_at) && (o.profiles?.email?.toLowerCase().includes(searchQuery.toLowerCase()) || o.profiles?.full_name?.toLowerCase().includes(searchQuery.toLowerCase()))), [orders, searchQuery, timeFilter]);
  const filteredShifts = useMemo(() => shifts.filter(s => isWithinTime(s.start_time) && (s.profiles?.email?.toLowerCase().includes(searchQuery.toLowerCase()) || s.profiles?.full_name?.toLowerCase().includes(searchQuery.toLowerCase()))), [shifts, searchQuery, timeFilter]);

  const monthlySales = useMemo(() => {
    const currentMonth = new Date().getMonth();
    const currentYear = new Date().getFullYear();
    return orders.filter(o => new Date(o.created_at).getMonth() === currentMonth && new Date(o.created_at).getFullYear() === currentYear).reduce((sum, o) => sum + o.total, 0);
  }, [orders]);

  const stats = { totalSales: filteredOrders.reduce((acc, curr) => acc + curr.total, 0), totalOrders: filteredOrders.length };

  return (
    <div className="pb-24 p-6">
      <div className="max-w-7xl mx-auto mb-6 flex gap-4 border-b border-gray-200 pb-4">
        <button onClick={() => setActiveTab('transactions')} className={`flex items-center gap-2 px-6 py-3 rounded-lg font-bold transition-colors ${activeTab === 'transactions' ? 'bg-blue-600 text-white' : 'bg-white text-gray-600 hover:bg-gray-100 border'}`}><ShoppingBag size={20} /> Transactions</button>
        <button onClick={() => setActiveTab('audits')} className={`flex items-center gap-2 px-6 py-3 rounded-lg font-bold transition-colors ${activeTab === 'audits' ? 'bg-purple-600 text-white' : 'bg-white text-gray-600 hover:bg-gray-100 border'}`}><ClipboardCheck size={20} /> Shift Audits</button>
      </div>

      <div className="max-w-7xl mx-auto mb-6 bg-white p-4 rounded-xl shadow-sm border flex flex-wrap gap-4 items-center">
        <div className="flex items-center gap-2 text-gray-500 font-medium"><Filter size={18}/><span>Filters:</span></div>
        <select value={timeFilter} onChange={(e) => setTimeFilter(e.target.value)} className="border rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-600"><option value="all">All Time</option><option value="today">Today</option><option value="week">This Week</option></select>
        <div className="relative flex-1"><Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} /><input type="text" placeholder="Search by email or name..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-600" /></div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8 max-w-7xl mx-auto">
        <div className="bg-white p-6 rounded-xl shadow-sm border flex items-center gap-4"><div className="p-4 bg-green-100 rounded-lg text-green-600 font-bold text-2xl">₱</div><div><p className="text-gray-500 font-medium">Filtered Sales</p><p className="text-3xl font-bold">₱{stats.totalSales.toFixed(2)}</p></div></div>
        <div className="bg-white p-6 rounded-xl shadow-sm border flex items-center gap-4"><div className="p-4 bg-blue-100 rounded-lg text-blue-600"><ReceiptText size={32} /></div><div><p className="text-gray-500 font-medium">Filtered Transactions</p><p className="text-3xl font-bold">{stats.totalOrders}</p></div></div>
        <div className="bg-gray-900 text-white p-6 rounded-xl shadow-sm border flex items-center gap-4"><div className="p-4 bg-gray-800 rounded-lg text-yellow-400"><CalendarDays size={32} /></div><div><p className="text-gray-400 font-medium">Sales This Month</p><p className="text-3xl font-bold text-yellow-400">₱{monthlySales.toFixed(2)}</p></div></div>
      </div>

      {activeTab === 'transactions' ? (
        <div className="bg-white rounded-xl shadow-sm border overflow-hidden max-w-7xl mx-auto">
          <table className="w-full text-left">
            <thead className="bg-gray-50"><tr><th className="p-4">Date</th><th className="p-4">Employee</th><th className="p-4">Method</th><th className="p-4">Total</th></tr></thead>
            <tbody>
              {filteredOrders.map((o) => <tr key={o.id} className="border-b hover:bg-gray-50"><td className="p-4">{new Date(o.created_at).toLocaleString()}</td><td className="p-4">{o.profiles?.full_name || o.profiles?.email}</td><td className="p-4 uppercase text-sm font-bold">{o.payment_method}</td><td className="p-4 font-bold text-green-600">₱{o.total.toFixed(2)}</td></tr>)}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="bg-white rounded-xl shadow-sm border overflow-hidden max-w-7xl mx-auto">
          <table className="w-full text-left">
            <thead className="bg-gray-50"><tr><th className="p-4">Employee</th><th className="p-4">Starting Cash</th><th className="p-4">Expected</th><th className="p-4">Actual</th><th className="p-4">Variance</th></tr></thead>
            <tbody>
              {filteredShifts.map(s => {
                const variance = s.ending_cash !== null ? s.ending_cash - s.expected_cash : 0;
                return <tr key={s.id} className="border-b hover:bg-gray-50"><td className="p-4">{s.profiles?.full_name || s.profiles?.email}</td><td className="p-4">₱{s.starting_cash.toFixed(2)}</td><td className="p-4">₱{s.expected_cash?.toFixed(2) || '---'}</td><td className="p-4">₱{s.ending_cash?.toFixed(2) || '---'}</td><td className={`p-4 font-bold ${variance < 0 ? 'text-red-600' : 'text-green-600'}`}>{s.ending_cash === null ? 'Active' : `₱${variance.toFixed(2)}`}</td></tr>
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}