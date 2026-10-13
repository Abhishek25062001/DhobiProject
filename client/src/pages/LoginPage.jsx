import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Shirt, Lock, Mail, ArrowRight, Loader2, Sparkles, User, ShieldCheck } from 'lucide-react';
import toast from 'react-hot-toast';

const LoginPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { login } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const from = location.state?.from?.pathname || '/';

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email || !password) {
      toast.error('Please enter both email and password.');
      return;
    }

    setLoading(true);
    const res = await login(email, password);
    setLoading(false);

    if (res.success) {
      if (res.user.role === 'admin' && from === '/') {
        navigate('/admin');
      } else {
        navigate(from, { replace: true });
      }
    }
  };

  const handleQuickLogin = async (userEmail, userPassword) => {
    setEmail(userEmail);
    setPassword(userPassword);
    setLoading(true);
    const res = await login(userEmail, userPassword);
    setLoading(false);

    if (res.success) {
      if (res.user.role === 'admin' && from === '/') {
        navigate('/admin');
      } else {
        navigate(from, { replace: true });
      }
    }
  };

  return (
    <div className="max-w-md mx-auto my-12 px-4 sm:px-6">
      <div className="bg-white rounded-3xl p-8 border border-slate-200/80 shadow-xl shadow-slate-100 space-y-6">
        
        {/* Header */}
        <div className="text-center space-y-2">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-primary-600 to-teal-500 text-white flex items-center justify-center mx-auto shadow-md">
            <Shirt className="w-6 h-6 stroke-[2.2]" />
          </div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">
            Sign In to Indo<span className="text-primary-600">Dhobi</span>
          </h1>
          <p className="text-xs text-slate-500">
            Access your active wash orders, address book, and invoices.
          </p>
        </div>

        {/* Quick 1-Click Demo Buttons */}
        <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 space-y-2 text-xs">
          <span className="font-bold text-slate-600 block text-[11px] uppercase tracking-wider">
            ⚡ Quick 1-Click Demo Access
          </span>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              disabled={loading}
              onClick={() => handleQuickLogin('customer@indodhobi.com', 'password123')}
              className="py-2 px-2.5 rounded-xl bg-white border border-slate-200 text-slate-700 hover:text-primary-600 hover:border-primary-400 font-semibold shadow-2xs text-left transition-all"
            >
              <div className="font-bold text-xs truncate">Demo Customer</div>
              <span className="text-[10px] text-slate-400 block truncate">Rohan (Delhi)</span>
            </button>

            <button
              type="button"
              disabled={loading}
              onClick={() => handleQuickLogin('admin@indodhobi.com', 'admin123')}
              className="py-2 px-2.5 rounded-xl bg-white border border-slate-200 text-slate-700 hover:text-primary-600 hover:border-primary-400 font-semibold shadow-2xs text-left transition-all"
            >
              <div className="font-bold text-xs truncate">Demo Admin</div>
              <span className="text-[10px] text-slate-400 block truncate">Ops Hub Master</span>
            </button>
          </div>
        </div>

        {/* Login Form */}
        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          <div>
            <label className="block font-semibold text-slate-700 mb-1">Email Address</label>
            <div className="relative">
              <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="customer@indodhobi.com"
                className="w-full pl-9 pr-3.5 py-2.5 rounded-xl border border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-primary-500 font-medium"
              />
            </div>
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">Password</label>
            <div className="relative">
              <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full pl-9 pr-3.5 py-2.5 rounded-xl border border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-primary-500 font-medium"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3.5 px-4 rounded-xl font-bold text-white bg-primary-600 hover:bg-primary-700 shadow-md shadow-primary-600/30 transition-all flex items-center justify-center gap-2 disabled:opacity-60 cursor-pointer"
          >
            {loading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <>
                <span>Sign In to Account</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>

        {/* Footer Link */}
        <div className="pt-2 text-center text-xs text-slate-500">
          <span>New to IndoDhobi? </span>
          <Link to="/register" className="font-bold text-primary-600 hover:underline">
            Create an Account
          </Link>
        </div>

      </div>
    </div>
  );
};

export default LoginPage;
