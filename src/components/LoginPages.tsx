import { useState } from 'react';
import { Coffee, Lock, Mail, ShieldAlert } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { ApiService } from '../services/api';

export function EmployeeLogin() {
  return <LoginForm title="Employee POS Login" role="employee" />;
}

export function AdminLogin() {
  return <LoginForm title="Admin Secure Login" role="admin" icon={<ShieldAlert className="mx-auto h-12 w-12 text-red-600" />} />;
}

function LoginForm({ title, role, icon = <Coffee className="mx-auto h-12 w-12 text-blue-600" /> }: { title: string, role: string, icon?: React.ReactNode }) {
  const [email, setEmail] = useState(role === 'admin' ? 'admin@cafe.com' : 'staff@cafe.com');
  const [password, setPassword] = useState('password');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      await ApiService.login(email, password);
      if (role === 'admin') navigate('/admin/dashboard');
      else navigate('/pos');
    } catch (err: any) {
      setError(err.message);
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
        {icon}
        <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">{title}</h2>
      </div>
      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className={`bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10 border-t-4 ${role === 'admin' ? 'border-red-600' : 'border-blue-600'}`}>
          <form className="space-y-6" onSubmit={handleLogin}>
            {error && <div className="text-red-600 text-sm text-center bg-red-50 p-3 rounded-md">{error}</div>}
            <div>
              <label className="block text-sm font-medium text-gray-700">Email address</label>
              <div className="mt-1 relative rounded-md shadow-sm">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none"><Mail className="h-5 w-5 text-gray-400" /></div>
                <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} className="focus:ring-blue-500 focus:border-blue-500 block w-full pl-10 sm:text-sm border-gray-300 rounded-md py-2 border" />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Password</label>
              <div className="mt-1 relative rounded-md shadow-sm">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none"><Lock className="h-5 w-5 text-gray-400" /></div>
                <input type="password" required value={password} onChange={(e) => setPassword(e.target.value)} className="focus:ring-blue-500 focus:border-blue-500 block w-full pl-10 sm:text-sm border-gray-300 rounded-md py-2 border" />
              </div>
            </div>
            <button type="submit" disabled={loading} className={`w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white ${role === 'admin' ? 'bg-red-600 hover:bg-red-700' : 'bg-blue-600 hover:bg-blue-700'} focus:outline-none disabled:opacity-50`}>
              {loading ? 'Authenticating...' : 'Sign in'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}