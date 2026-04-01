import { useEffect, useState, useMemo } from 'react';
import { Users, DollarSign, ReceiptText, Filter, ClipboardCheck, ShoppingBag } from 'lucide-react';
import { ApiService } from '../services/api';
import { supabase } from '../lib/supabase';

export function AdminDashboard() {
  const [activeTab, setActiveTab] = useState<'transactions' | 'audits'>('transactions');
  const [orders, setOrders] = useState<any[]>([]);
  const [shifts, setShifts] = useState<any[]>([]);
  const [employees, setEmployees] = useState<any[]>([]);
  
  const [employeeFilter, setEmployeeFilter] = useState('all');
  const [timeFilter, setTimeFilter] = useState('all');

  useEffect(() => {
    fetchData();
    const channel = supabase.channel('public:orders').on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'orders' }, () => { fetchData(); }).subscribe();
    return () => { supabase.removeChannel(channel); };
  }, []);

  const fetchData = async () => {
    const data = await ApiService.getAdminDashboardData();
    setOrders(data.orders);
    setShifts(data.shifts);
    setEmployees(data.employees);
  };

  const filteredOrders = useMemo(() => {
    let filtered = orders;
    if (employeeFilter !== 'all') filtered = filtered.filter(o => o.employee_id === employeeFilter);
    if (timeFilter !== 'all') {
      const now = new Date();
      filtered = filtered.filter(o => {
        const d = new Date(o.created_at);
        if (timeFilter === 'today') return d.toDateString() === now.toDateString();
        if (timeFilter === 'week') { const w = new Date(); w.setDate(now.getDate() - 7); return d >= w; }
        if (timeFilter === 'month') { const m = new Date(); m.setDate(now.getDate() - 30); return d >= m; }
        return true;
      });
    }
    return filtered;
  }, [orders, employeeFilter, timeFilter]);

  const stats = { totalSales: filteredOrders.reduce((acc, curr) => acc + curr.total, 0), totalOrders: filteredOrders.length };

  return (
    <div className="pb-24">
      {/* Tabs */}
      <div className="max-w-7xl mx-auto mb-6 flex gap-4 border-b border-gray-200 pb-4">
        <button onClick={() => setActiveTab('transactions')} className={`flex items-center gap-2 px-6 py-3 rounded-lg font-bold transition-colors ${activeTab === 'transactions' ? 'bg-blue-600 text-white' : 'bg-white text-gray-600 hover:bg-gray-100 border'}`}>
          <ShoppingBag size={20} /> Transactions
        </button>
        <button onClick={() => setActiveTab('audits')} className={`flex items-center gap-2 px-6 py-3 rounded-lg font-bold transition-colors ${activeTab === 'audits' ? 'bg-purple-600 text-white' : 'bg-white text-gray-600 hover:bg-gray-100 border'}`}>
          <ClipboardCheck size={20} /> Shift Audits
        </button>
      </div>

      {activeTab === 'transactions' ? (
        <>
          <div className="max-w-7xl mx-auto mb-6 bg-white p-4 rounded-xl shadow-sm border border-gray-200 flex flex-wrap gap-4 items-center">
            <div className="flex items-center gap-2 text-gray-500 font-medium"><Filter className="w-5 h-5" /><span>Filters:</span></div>
            <select value={timeFilter} onChange={(e) => setTimeFilter(e.target.value)} className="border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-600 focus:outline-none">
              <option value="all">All Time</option><option value="today">Today</option><option value="week">Past 7 Days</option><option value="month">Past 30 Days</option>
            </select>
            <select value={employeeFilter} onChange={(e) => setEmployeeFilter(e.target.value)} className="border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-600 focus:outline-none">
              <option value="all">All Employees</option>
              {employees.map(emp => <option key={emp.id} value={emp.id}>{emp.full_name || emp.email}</option>)}
            </select>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8 max-w-7xl mx-auto">
            <div className="bg-white p-6 rounded-xl shadow-sm border flex items-center gap-4"><div className="p-4 bg-green-100 rounded-lg text-green-600"><DollarSign size={32} /></div><div><p className="text-gray-500 font-medium">Filtered Sales</p><p className="text-3xl font-bold">${stats.totalSales.toFixed(2)}</p></div></div>
            <div className="bg-white p-6 rounded-xl shadow-sm border flex items-center gap-4"><div className="p-4 bg-blue-100 rounded-lg text-blue-600"><ReceiptText size={32} /></div><div><p className="text-gray-500 font-medium">Filtered Transactions</p><p className="text-3xl font-bold">{stats.totalOrders}</p></div></div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border overflow-hidden max-w-7xl mx-auto">
            <table className="w-full text-left">
              <thead className="bg-gray-50">
                <tr><th className="p-4 text-gray-600 font-medium">Order ID</th><th className="p-4 text-gray-600 font-medium">Date</th><th className="p-4 text-gray-600 font-medium">Employee</th><th className="p-4 text-gray-600 font-medium">Method</th><th className="p-4 text-gray-600 font-medium">Total</th></tr>
              </thead>
              <tbody>
                {filteredOrders.map((order) => (
                  <tr key={order.id} className="border-b hover:bg-gray-50">
                    <td className="p-4 font-mono text-sm">{order.order_number}</td>
                    <td className="p-4">{new Date(order.created_at).toLocaleString()}</td>
                    <td className="p-4 flex items-center gap-2"><Users className="w-4 h-4 text-gray-400"/>{order.profiles?.full_name || order.profiles?.email}</td>
                    <td className="p-4 uppercase text-sm">{order.payment_method}</td>
                    <td className="p-4 font-bold text-green-600">${order.total.toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      ) : (
        <div className="bg-white rounded-xl shadow-sm border overflow-hidden max-w-7xl mx-auto">
          <div className="p-6 border-b border-gray-200"><h2 className="text-xl font-bold">End of Shift Audits</h2></div>
          <table className="w-full text-left">
            <thead className="bg-gray-50">
              <tr><th className="p-4 text-gray-600 font-medium">Employee</th><th className="p-4 text-gray-600 font-medium">Start / End Time</th><th className="p-4 text-gray-600 font-medium">Starting Cash</th><th className="p-4 text-gray-600 font-medium">Expected Cash</th><th className="p-4 text-gray-600 font-medium">Actual Cash</th><th className="p-4 text-gray-600 font-medium">Variance</th></tr>
            </thead>
            <tbody>
              {shifts.map((shift) => {
                const variance = shift.ending_cash !== null ? shift.ending_cash - shift.expected_cash : 0;
                const statusColor = shift.ending_cash === null ? 'text-gray-500' : variance === 0 ? 'text-green-600' : variance > 0 ? 'text-blue-600' : 'text-red-600';
                return (
                  <tr key={shift.id} className="border-b hover:bg-gray-50">
                    <td className="p-4 font-medium">{shift.profiles?.full_name || shift.profiles?.email}</td>
                    <td className="p-4 text-sm text-gray-600">
                      <div>In: {new Date(shift.start_time).toLocaleString()}</div>
                      <div>Out: {shift.end_time ? new Date(shift.end_time).toLocaleString() : 'Active Shift'}</div>
                    </td>
                    <td className="p-4">${shift.starting_cash.toFixed(2)}</td>
                    <td className="p-4 font-semibold text-gray-800">{shift.expected_cash ? `$${shift.expected_cash.toFixed(2)}` : '---'}</td>
                    <td className="p-4 font-semibold text-gray-800">{shift.ending_cash ? `$${shift.ending_cash.toFixed(2)}` : '---'}</td>
                    <td className={`p-4 font-bold ${statusColor}`}>
                      {shift.ending_cash === null ? 'In Progress' : (variance === 0 ? 'Perfect' : variance > 0 ? `+$${variance.toFixed(2)}` : `-$${Math.abs(variance).toFixed(2)}`)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}