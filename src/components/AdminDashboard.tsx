import { useEffect, useState, useMemo } from 'react';
import { Filter, ClipboardCheck, ShoppingBag, Search, CalendarDays, Send, TrendingUp, BarChart2 } from 'lucide-react';
import { ApiService } from '../services/api';

export function AdminDashboard({ profile }: any) {
  const [activeTab, setActiveTab] = useState<'transactions' | 'audits'>('transactions');
  const [orders, setOrders] = useState<any[]>([]);
  const [shifts, setShifts] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [timeFilter, setTimeFilter] = useState('today');
  const [sendingReport, setSendingReport] = useState(false);

  const fetchData = async () => {
    const data = await ApiService.getAdminDashboardData();
    if (profile?.role === 'employee') {
      setOrders(data.orders.filter((o:any) => o.employee_id === profile.id));
      setShifts(data.shifts.filter((s:any) => s.employee_id === profile.id));
    } else {
      setOrders(data.orders);
      setShifts(data.shifts);
    }
  };

  useEffect(() => {
    fetchData();
    window.addEventListener('db_changed', fetchData);
    const interval = setInterval(fetchData, 3000); 
    return () => { window.removeEventListener('db_changed', fetchData); clearInterval(interval); };
  }, [profile]);

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

  // ✨ METRICS CALCULATIONS
  const now = new Date();
  const currentYear = now.getFullYear();
  const lastYear = currentYear - 1;
  const currentMonth = now.getMonth();

  const monthlySales = useMemo(() => {
    return orders.filter(o => new Date(o.created_at).getMonth() === currentMonth && new Date(o.created_at).getFullYear() === currentYear).reduce((sum, o) => sum + o.total, 0);
  }, [orders, currentMonth, currentYear]);

  const thisYearSales = useMemo(() => {
    return orders.filter(o => new Date(o.created_at).getFullYear() === currentYear).reduce((sum, o) => sum + o.total, 0);
  }, [orders, currentYear]);

  const lastYearSales = useMemo(() => {
    return orders.filter(o => new Date(o.created_at).getFullYear() === lastYear).reduce((sum, o) => sum + o.total, 0);
  }, [orders, lastYear]);

  const stats = { totalSales: filteredOrders.reduce((acc, curr) => acc + curr.total, 0), totalOrders: filteredOrders.length };

  const handleSendTelegramReport = async () => {
    if(!confirm("Are you sure you want to trigger the ActivePieces Webhook for today's summary?")) return;
    try {
      setSendingReport(true);
      await ApiService.sendDailyReportToTelegram();
      alert("✅ Report Successfully Sent to ActivePieces!");
    } catch (err: any) {
      alert("❌ Error: " + err.message);
    } finally {
      setSendingReport(false);
    }
  };

  return (
    <div className="pb-24 p-6">
      <div className="max-w-7xl mx-auto mb-6 flex gap-4 border-b border-gray-200 pb-4 justify-between items-center">
        <div className="flex gap-4">
          <button onClick={() => setActiveTab('transactions')} className={`flex items-center gap-2 px-6 py-3 rounded-lg font-bold transition-colors ${activeTab === 'transactions' ? 'bg-blue-600 text-white' : 'bg-white text-gray-600 hover:bg-gray-100 border'}`}><ShoppingBag size={20} /> Transactions</button>
          <button onClick={() => setActiveTab('audits')} className={`flex items-center gap-2 px-6 py-3 rounded-lg font-bold transition-colors ${activeTab === 'audits' ? 'bg-purple-600 text-white' : 'bg-white text-gray-600 hover:bg-gray-100 border'}`}><ClipboardCheck size={20} /> Shift Audits</button>
        </div>
        
        {profile?.role === 'admin' && (
          <button onClick={handleSendTelegramReport} disabled={sendingReport} className="flex items-center gap-2 px-6 py-3 bg-[#0088cc] hover:bg-[#0077b3] text-white rounded-lg font-bold shadow-md disabled:opacity-50">
            <Send size={20} /> {sendingReport ? 'Sending...' : 'Send Telegram Report'}
          </button>
        )}
      </div>

      {/* ✨ TOP METRICS GRID (Monthly & Yearly Comparison) */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6 max-w-7xl mx-auto">
        <div className="bg-white p-5 rounded-xl shadow-sm border border-blue-100 flex flex-col justify-center">
           <p className="text-gray-500 font-bold text-sm mb-1 uppercase tracking-wider flex items-center gap-2"><Filter size={16}/> Filtered Sales</p>
           <p className="text-3xl font-black text-blue-600">₱{stats.totalSales.toFixed(2)}</p>
        </div>
        <div className="bg-white p-5 rounded-xl shadow-sm border border-green-100 flex flex-col justify-center">
           <p className="text-gray-500 font-bold text-sm mb-1 uppercase tracking-wider flex items-center gap-2"><CalendarDays size={16}/> This Month</p>
           <p className="text-3xl font-black text-green-600">₱{monthlySales.toFixed(2)}</p>
        </div>
        <div className="bg-gray-900 p-5 rounded-xl shadow-sm border border-gray-800 flex flex-col justify-center">
           <p className="text-gray-400 font-bold text-sm mb-1 uppercase tracking-wider flex items-center gap-2"><TrendingUp size={16}/> {currentYear} Total</p>
           <p className="text-3xl font-black text-yellow-400">₱{thisYearSales.toFixed(2)}</p>
        </div>
        <div className="bg-gray-100 p-5 rounded-xl shadow-sm border border-gray-200 flex flex-col justify-center">
           <p className="text-gray-500 font-bold text-sm mb-1 uppercase tracking-wider flex items-center gap-2"><BarChart2 size={16}/> {lastYear} Total</p>
           <p className="text-3xl font-black text-gray-700">₱{lastYearSales.toFixed(2)}</p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto mb-6 bg-white p-4 rounded-xl shadow-sm border flex flex-wrap gap-4 items-center">
        <div className="flex items-center gap-2 text-gray-500 font-medium"><Filter size={18}/><span>Table Filters:</span></div>
        <select value={timeFilter} onChange={(e) => setTimeFilter(e.target.value)} className="border rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-600"><option value="all">All Time</option><option value="today">Today</option><option value="week">This Week</option></select>
        <div className="relative flex-1"><Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} /><input type="text" placeholder="Search logs..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-600" /></div>
      </div>

      {activeTab === 'transactions' ? (
        <div className="bg-white rounded-xl shadow-sm border overflow-hidden max-w-7xl mx-auto">
          <table className="w-full text-left">
            <thead className="bg-gray-50"><tr><th className="p-4">Date</th><th className="p-4">Employee</th><th className="p-4">Method</th><th className="p-4">Total</th></tr></thead>
            <tbody>
              {filteredOrders.length === 0 ? <tr><td colSpan={4} className="p-4 text-center text-gray-500">No transactions found.</td></tr> : null}
              {filteredOrders.map((o) => <tr key={o.id} className="border-b hover:bg-gray-50"><td className="p-4 text-sm text-gray-600">{new Date(o.created_at).toLocaleString()}</td><td className="p-4 font-medium">{o.profiles?.full_name || o.profiles?.email}</td><td className="p-4 uppercase text-xs font-bold text-gray-500">{o.payment_method}</td><td className="p-4 font-bold text-green-600">₱{o.total.toFixed(2)}</td></tr>)}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="bg-white rounded-xl shadow-sm border overflow-hidden max-w-7xl mx-auto">
          <table className="w-full text-left">
            <thead className="bg-gray-50"><tr><th className="p-4">Employee</th><th className="p-4">Time Opened</th><th className="p-4">Expected Cash</th><th className="p-4">Actual Drawer</th><th className="p-4">Variance</th></tr></thead>
            <tbody>
              {filteredShifts.length === 0 ? <tr><td colSpan={5} className="p-4 text-center text-gray-500">No shifts found.</td></tr> : null}
              {filteredShifts.map(s => {
                const variance = s.ending_cash !== null ? s.ending_cash - s.expected_cash : 0;
                return <tr key={s.id} className="border-b hover:bg-gray-50"><td className="p-4 font-medium">{s.profiles?.full_name || s.profiles?.email}</td><td className="p-4 text-sm text-gray-600">{new Date(s.start_time).toLocaleString()}</td><td className="p-4">₱{s.expected_cash?.toFixed(2) || '---'}</td><td className="p-4">₱{s.ending_cash?.toFixed(2) || '---'}</td><td className={`p-4 font-bold ${variance < 0 ? 'text-red-600' : 'text-green-600'}`}>{s.ending_cash === null ? '🟢 Active Shift' : `${variance > 0 ? '+' : ''}₱${variance.toFixed(2)}`}</td></tr>
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}