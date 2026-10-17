import { SiteContentProvider } from './context/SiteContentContext';
import PageMetadata from './components/PageMetadata';
import React, { lazy, Suspense } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider } from './context/AuthContext';
import { OrderBookingProvider } from './context/OrderBookingContext';
import Navbar from './components/Navbar';
import Footer from './components/Footer';
import ProtectedRoute from './components/ProtectedRoute';
import BookingConfigGate from './components/BookingConfigGate';

import HomePage from './pages/HomePage';
const BookingPage = lazy(() => import('./pages/BookingPage'));
const PricingPage = lazy(() => import('./pages/PricingPage'));
const MyOrdersPage = lazy(() => import('./pages/MyOrdersPage'));
const AdminDashboardPage = lazy(() => import('./pages/AdminDashboardPage'));
const RiderDashboardPage = lazy(() => import('./pages/RiderDashboardPage'));
const OrderSuccessPage = lazy(() => import('./pages/OrderSuccessPage'));
const LoginPage = lazy(() => import('./pages/LoginPage'));
const RegisterPage = lazy(() => import('./pages/RegisterPage'));
const ProfilePage = lazy(() => import('./pages/ProfilePage'));
const PrivacyPolicyPage = lazy(() => import('./pages/PrivacyPolicyPage'));
const TermsOfServicePage = lazy(() => import('./pages/TermsOfServicePage'));
const OperationalAreasPage = lazy(() => import('./pages/OperationalAreasPage'));

// Dedicated redirect component that ONLY executes when mounted on /partner
const PartnerRedirect = () => {
  React.useEffect(() => {
    window.location.href = 'https://avyaktinfotech.com';
  }, []);

  return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center p-8 text-center space-y-3">
      <div className="w-8 h-8 border-3 border-primary-600 border-t-transparent rounded-full animate-spin" />
      <p className="text-sm font-semibold text-slate-700">Redirecting to Avyakt Infotech Partner Portal...</p>
      <a
        href="https://avyaktinfotech.com"
        className="text-xs font-bold text-primary-600 underline"
      >
        Click here if you are not redirected automatically
      </a>
    </div>
  );
};

function App() {
  return (
    <Router>
      <AuthProvider>
        <OrderBookingProvider>
          <SiteContentProvider>
          <PageMetadata />
          <div className="flex flex-col min-h-screen bg-slate-50 text-slate-800">
            {/* Global Toast Notifications */}
            <Toaster
              position="top-right"
              containerStyle={{
                zIndex: 100000,
              }}
              toastOptions={{
                duration: 4000,
                style: {
                  zIndex: 100000,
                  background: '#0f172a',
                  color: '#f8fafc',
                  fontSize: '13px',
                  fontWeight: 600,
                  borderRadius: '16px',
                  padding: '12px 18px',
                  boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.2), 0 10px 10px -5px rgba(0, 0, 0, 0.1)',
                },
                success: {
                  iconTheme: {
                    primary: '#14b8a6',
                    secondary: '#ffffff',
                  },
                },
                error: {
                  iconTheme: {
                    primary: '#f43f5e',
                    secondary: '#ffffff',
                  },
                },
              }}
            />

            {/* Navigation Header */}
            <Navbar />

            {/* Main Application Routes */}
            <main className="grow">
              <Suspense fallback={<div role="status" className="min-h-[60vh] flex items-center justify-center gap-3 text-sm text-slate-500"><span className="h-5 w-5 rounded-full border-2 border-primary-200 border-t-primary-600 motion-safe:animate-spin" aria-hidden="true" />Loading…</div>}>
              <Routes>
                <Route path="/" element={<BookingConfigGate><HomePage /></BookingConfigGate>} />
                <Route path="/book" element={<BookingConfigGate><BookingPage /></BookingConfigGate>} />
                <Route path="/pricing" element={<BookingConfigGate><PricingPage /></BookingConfigGate>} />
                <Route
                  path="/my-orders"
                  element={
                    <ProtectedRoute>
                      <MyOrdersPage />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/profile"
                  element={
                    <ProtectedRoute>
                      <ProfilePage />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/order-success"
                  element={<OrderSuccessPage />}
                />
                <Route
                  path="/admin"
                  element={
                    <ProtectedRoute adminOnly={true}>
                      <AdminDashboardPage />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/rider"
                  element={
                    <ProtectedRoute riderOnly={true}>
                      <RiderDashboardPage />
                    </ProtectedRoute>
                  }
                />
                <Route path="/login" element={<LoginPage />} />
                <Route path="/register" element={<RegisterPage />} />
                <Route path="/privacy" element={<PrivacyPolicyPage />} />
                <Route path="/privacy-policy" element={<PrivacyPolicyPage />} />
                <Route path="/terms" element={<TermsOfServicePage />} />
                <Route path="/terms-of-service" element={<TermsOfServicePage />} />
                <Route path="/operational-areas" element={<OperationalAreasPage />} />
                <Route path="/service-areas" element={<OperationalAreasPage />} />
                <Route path="/partner" element={<PartnerRedirect />} />
                <Route path="*" element={<Navigate to="/" replace />} />
              </Routes>
              </Suspense>
            </main>

            {/* Application Footer */}
            <Footer />
          </div>
        </SiteContentProvider>
        </OrderBookingProvider>
      </AuthProvider>
    </Router>
  );
}

export default App;
