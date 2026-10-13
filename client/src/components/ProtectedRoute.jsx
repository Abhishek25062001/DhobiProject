import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { ShieldAlert, Loader2 } from 'lucide-react';

const ProtectedRoute = ({ children, adminOnly = false, riderOnly = false }) => {
  const { user, isAuthenticated, loading, isAdmin, isRider } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center gap-3">
        <Loader2 className="w-8 h-8 text-primary-600 animate-spin" />
        <p className="text-sm font-medium text-slate-500">Authenticating IndoDhobi session...</p>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (adminOnly && !isAdmin) {
    return (
      <div className="max-w-md mx-auto my-20 p-8 bg-white rounded-3xl shadow-lg border border-slate-200 text-center space-y-4">
        <div className="w-14 h-14 bg-rose-100 text-rose-600 rounded-2xl flex items-center justify-center mx-auto">
          <ShieldAlert className="w-8 h-8" />
        </div>
        <h3 className="text-xl font-bold text-slate-900">Restricted Admin Access</h3>
        <p className="text-xs text-slate-600 leading-relaxed">
          You are currently signed in as a customer ({user?.email}). The Dhobi Operations Hub is reserved for administrators and riders.
        </p>
        <div className="pt-2">
          <a
            href="/my-orders"
            className="inline-block px-5 py-2.5 rounded-xl bg-primary-600 text-white text-xs font-bold hover:bg-primary-700 transition-colors"
          >
            Go to My Orders
          </a>
        </div>
      </div>
    );
  }

  return children;
};

export default ProtectedRoute;
