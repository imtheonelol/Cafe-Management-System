import { useEffect, useState, useMemo } from 'react';
import { supabase } from '../lib/supabase';
import { Users, DollarSign, ReceiptText, LogOut, Filter } from 'lucide-react';

export function AdminDashboard({ onLogout }: { onLogout: () => void }) {
  const [orders, setOrders] = useState<any[]>([]);
  const [employees, setEmployees] = useState<any[]>([]);
  
  // Filter States
  const [employeeFilter, setEmployeeFilter] = useState('all');
  const [timeFilter, setTimeFilter] = useState('all');

  useEffect(() => {
    fetchData();
    fetchEmployees();
    
    // Real-time subscription for new orders
    const channel = supabase
      .channel('public:orders')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'orders' }, () => {
        fetchData();
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);

  const fetchData = async () => {
    const { data: ordersData, error } = await supabase
      .from('orders')
      .select('*, profiles(email, full_name)')
      .order('created_at', { ascending: false });

    if (!error && ordersData) setOrders(ordersData);
  };

  const fetchEmployees = async () => {
    const { data } = await supabase.from('profiles').select('id, email, full_name, role');
    if (data) setEmployees(data);
  };

  const filteredOrders = useMemo(() => {
    let filtered = orders;

    if (employeeFilter !== 'all') {
      filtered = filtered.filter(order => order.employee_id === employeeFilter);
    }

    if (timeFilter !== 'all') {
      const now = new Date();
      filtered = filtered.filter(order => {
        const orderDate = new Date(order.created_at);
        if (timeFilter === 'today') return orderDate.toDateString() === now.toDateString();
        if (timeFilter === 'week') {
          const weekAgo = new Date(); weekAgo.setDate(now.getDate() - 7);
          return orderDate >= weekAgo;
        }
        if (timeFilter === 'month') {
          const monthAgo = new Date(); monthAgo.setDate(now.getDate() - 30);
          return orderDate >= monthAgo;
        }
        return true;
      });
    }

    return filtered;
  }, [orders, employeeFilter, timeFilter]);

  const stats = {
    totalSales: filteredOrders.reduce((acc, curr) => acc + curr.total, 0),
    totalOrders: filteredOrders.length
  };

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="flex justify-between items-center mb-8 max-w-7xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-900">Admin Dashboard</h1>
        <button onClick={onLogout} className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors">
          <LogOut className="w-5 h-5" /> Sign Out
        </button>
      </div>

      <div className="max-w-7xl mx-auto mb-6 bg-white p-4 rounded-xl shadow-sm border border-gray-200 flex flex-wrap gap-4 items-center">
        <div className="flex items-center gap-2 text-gray-500 font-medium">
          <Filter className="w-5 h-5" />
          <span>Filters:</span>
        </div>
        
        <select value={timeFilter} onChange={(e) => setTimeFilter(e.target.value)} className="border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-600 focus:outline-none">
          <option value="all">All Time</option>
          <option value="today">Today</option>
          <option value="week">Past 7 Days</option>
          <option value="month">Past 30 Days</option>
        </select>

        <select value={employeeFilter} onChange={(e) => setEmployeeFilter(e.target.value)} className="border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-600 focus:outline-none">
          <option value="all">All Employees</option>
          {employees.map(emp => (
            <option key={emp.id} value={emp.id}>
              {emp.full_name || emp.email} {emp.role === 'admin' ? '(Admin)' : ''}
            </option>
          ))}
        </select>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8 max-w-7xl mx-auto">
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 flex items-center gap-4">
          <div className="p-4 bg-green-100 rounded-lg text-green-600"><DollarSign size={32} /></div>
          <div>
            <p className="text-gray-500 font-medium">Filtered Sales</p>
            <p className="text-3xl font-bold">${stats.totalSales.toFixed(2)}</p>
          </div>
        </div>
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 flex items-center gap-4">
          <div className="p-4 bg-blue-100 rounded-lg text-blue-600"><ReceiptText size={32} /></div>
          <div>
            <p className="text-gray-500 font-medium">Filtered Transactions</p>
            <p className="text-3xl font-bold">{stats.totalOrders}</p>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden max-w-7xl mx-auto mb-20">
        <div className="p-6 border-b border-gray-200 flex justify-between items-center">
          <h2 className="text-xl font-bold">Transaction History</h2>
          <span className="text-sm text-gray-500">Showing {filteredOrders.length} results</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-gray-50">
              <tr>
                <th className="p-4 text-gray-600 font-medium">Order ID</th>
                <th className="p-4 text-gray-600 font-medium">Date</th>
                <th className="p-4 text-gray-600 font-medium">Employee</th>
                <th className="p-4 text-gray-600 font-medium">Method</th>
                <th className="p-4 text-gray-600 font-medium">Total</th>
              </tr>
            </thead>
            <tbody>
              {filteredOrders.length === 0 ? (
                <tr>
                  <td colSpan={5} className="p-8 text-center text-gray-500">No transactions match your filters.</td>
                </tr>
              ) : (
                filteredOrders.map((order) => (
                  <tr key={order.id} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="p-4 font-mono text-sm text-gray-600">{order.order_number}</td>
                    <td className="p-4 text-gray-800">{new Date(order.created_at).toLocaleString()}</td>
                    <td className="p-4 flex items-center gap-2 text-gray-800">
                      <Users className="w-4 h-4 text-gray-400"/> 
                      {order.profiles?.full_name || order.profiles?.email || 'Unknown'}
                    </td>
                    <td className="p-4 uppercase text-sm text-gray-600">{order.payment_method}</td>
                    <td className="p-4 font-bold text-green-600">${order.total.toFixed(2)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}