import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  Shirt,
  Lock,
  Mail,
  Phone,
  ArrowRight,
  Loader2,
  Sparkles,
  User,
  ShieldCheck,
  CheckCircle2,
  RotateCcw,
  KeyRound
} from 'lucide-react';
import toast from 'react-hot-toast';
import { setupRecaptcha, sendPhoneOtp } from '../config/firebase';

const LoginPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { login, loginAsStaff, customerLoginWithFirebase } = useAuth();

  // Active Tab: 'customer' (Mobile OTP) | 'staff' (Email/Password)
  const [activeTab, setActiveTab] = useState('customer');

  // Customer Phone OTP State
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [confirmationResult, setConfirmationResult] = useState(null);
  const [countdown, setCountdown] = useState(30);
  const [canResend, setCanResend] = useState(false);

  // Staff State
  const [staffEmail, setStaffEmail] = useState('');
  const [staffPassword, setStaffPassword] = useState('');

  // Global loading
  const [loading, setLoading] = useState(false);

  const from = location.state?.from?.pathname || '/';

  // Timer for OTP resend countdown
  useEffect(() => {
    let timer;
    if (otpSent && countdown > 0) {
      timer = setInterval(() => {
        setCountdown((prev) => prev - 1);
      }, 1000);
    } else if (countdown === 0) {
      setCanResend(true);
    }
    return () => clearInterval(timer);
  }, [otpSent, countdown]);

  // Handle Send OTP
  const handleSendOtp = async (e) => {
    e.preventDefault();
    const cleanDigits = phone.replace(/\D/g, '').slice(-10);

    if (cleanDigits.length !== 10) {
      toast.error('Please enter a valid 10-digit Indian mobile number.');
      return;
    }

    setLoading(true);
    try {
      const appVerifier = setupRecaptcha('recaptcha-container');
      const confirmation = await sendPhoneOtp(cleanDigits, appVerifier);
      setConfirmationResult(confirmation);
      setOtpSent(true);
      setCountdown(30);
      setCanResend(false);
      if (confirmation?.isDevFallback) {
        toast('Dev Mode active: Enter OTP 123456 to verify.', { icon: '🧪', duration: 6000 });
      } else {
        toast.success(`OTP sent successfully to +91 ${cleanDigits}`);
      }
    } catch (error) {
      console.error('[Firebase OTP Error]:', error);
      toast.error(error.message || 'Failed to send OTP. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Handle Resend OTP
  const handleResendOtp = async () => {
    if (!canResend) return;
    const cleanDigits = phone.replace(/\D/g, '').slice(-10);
    setLoading(true);
    try {
      const appVerifier = setupRecaptcha('recaptcha-container');
      const confirmation = await sendPhoneOtp(cleanDigits, appVerifier);
      setConfirmationResult(confirmation);
      setCountdown(30);
      setCanResend(false);
      if (confirmation?.isDevFallback) {
        toast('Dev Mode: Enter OTP 123456.', { icon: '🧪' });
      } else {
        toast.success(`New OTP sent to +91 ${cleanDigits}`);
      }
    } catch (error) {
      toast.error(error.message || 'Failed to resend OTP.');
    } finally {
      setLoading(false);
    }
  };

  // Handle OTP Verification & Customer Login
  const handleVerifyOtp = async (e) => {
    e.preventDefault();
    const cleanOtp = otp.trim();

    if (!cleanOtp || cleanOtp.length !== 6) {
      toast.error('Please enter the 6-digit verification code.');
      return;
    }

    if (!confirmationResult) {
      toast.error('Session expired. Please request a new OTP.');
      setOtpSent(false);
      return;
    }

    setLoading(true);
    try {
      const userCredential = await confirmationResult.confirm(cleanOtp);
      const idToken = await userCredential.user.getIdToken();
      const cleanDigits = phone.replace(/\D/g, '').slice(-10);

      const res = await customerLoginWithFirebase({
        idToken,
        name: customerName,
        phone: cleanDigits
      });

      if (res.success) {
        navigate(from === '/' ? '/booking' : from, { replace: true });
      }
    } catch (error) {
      console.error('[OTP Verification Error]:', error);
      toast.error(error.message || 'Invalid verification code. Please check and try again.');
    } finally {
      setLoading(false);
    }
  };

  // Handle Staff Email/Password Login
  const handleStaffSubmit = async (e) => {
    e.preventDefault();
    if (!staffEmail || !staffPassword) {
      toast.error('Please enter both email and password.');
      return;
    }

    setLoading(true);
    const res = await loginAsStaff(staffEmail, staffPassword);
    setLoading(false);

    if (res.success) {
      if (res.user.role === 'admin') {
        navigate('/admin');
      } else if (res.user.role === 'rider') {
        navigate('/rider');
      } else {
        navigate(from, { replace: true });
      }
    }
  };

  // Quick 1-Click Demo Switcher
  const handleQuickDemo = async (roleType, userEmail, userPassword, demoPhone = '9876543210') => {
    setLoading(true);
    if (roleType === 'customer') {
      setActiveTab('customer');
      // Execute demo login
      const res = await login(userEmail, userPassword);
      setLoading(false);
      if (res.success) {
        navigate(from === '/' ? '/booking' : from, { replace: true });
      }
    } else {
      setActiveTab('staff');
      setStaffEmail(userEmail);
      setStaffPassword(userPassword);
      const res = await loginAsStaff(userEmail, userPassword);
      setLoading(false);
      if (res.success) {
        if (roleType === 'admin') navigate('/admin');
        else if (roleType === 'rider') navigate('/rider');
        else navigate(from, { replace: true });
      }
    }
  };

  return (
    <div className="max-w-md mx-auto my-10 px-4 sm:px-6">
      <div className="bg-white rounded-3xl p-8 border border-slate-200/80 shadow-xl shadow-slate-100 space-y-6">
        
        {/* Invisible reCAPTCHA container */}
        <div id="recaptcha-container"></div>

        {/* Brand Header */}
        <div className="text-center space-y-2">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-primary-600 to-teal-500 text-white flex items-center justify-center mx-auto shadow-md">
            <Shirt className="w-6 h-6 stroke-[2.2]" />
          </div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">
            Sign In to Indo<span className="text-primary-600">Dhobi</span>
          </h1>
          <p className="text-xs text-slate-500">
            Smart Doorstep Laundry & Ironing across Delhi-NCR
          </p>
        </div>

        {/* Dual Mode Tab Selector */}
        <div className="flex p-1 bg-slate-100 rounded-2xl">
          <button
            type="button"
            onClick={() => setActiveTab('customer')}
            className={`flex-1 py-2.5 text-xs font-bold rounded-xl flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
              activeTab === 'customer'
                ? 'bg-white text-primary-700 shadow-xs'
                : 'text-slate-500 hover:text-slate-900'
            }`}
          >
            <Phone className="w-3.5 h-3.5" />
            <span>Customer (Phone OTP)</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('staff')}
            className={`flex-1 py-2.5 text-xs font-bold rounded-xl flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
              activeTab === 'staff'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-500 hover:text-slate-900'
            }`}
          >
            <ShieldCheck className="w-3.5 h-3.5 text-teal-600" />
            <span>Staff (Admin & Rider)</span>
          </button>
        </div>

        {/* Customer Tab: Phone OTP Login */}
        {activeTab === 'customer' && (
          <div className="space-y-4 text-xs">
            {!otpSent ? (
              <form onSubmit={handleSendOtp} className="space-y-4">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1.5">
                    Mobile Phone Number
                  </label>
                  <div className="relative flex rounded-xl border border-slate-300 overflow-hidden focus-within:ring-2 focus-within:ring-primary-500 focus-within:border-primary-500">
                    <span className="inline-flex items-center px-3.5 bg-slate-100 text-slate-700 font-bold text-xs border-r border-slate-200">
                      🇮🇳 +91
                    </span>
                    <input
                      type="tel"
                      required
                      maxLength="10"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value.replace(/\D/g, ''))}
                      placeholder="9876543210"
                      className="w-full px-3.5 py-2.5 font-mono text-sm tracking-wide focus:outline-hidden text-slate-800"
                    />
                  </div>
                  <p className="text-[11px] text-slate-400 mt-1.5">
                    We will send a 6-digit SMS verification code to verify your number.
                  </p>
                </div>

                <button
                  type="submit"
                  disabled={loading || phone.length < 10}
                  className="w-full py-3.5 px-4 rounded-xl font-bold text-white bg-primary-600 hover:bg-primary-700 shadow-md shadow-primary-600/30 transition-all flex items-center justify-center gap-2 disabled:opacity-60 cursor-pointer"
                >
                  {loading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <>
                      <span>Send Verification Code</span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </form>
            ) : (
              <form onSubmit={handleVerifyOtp} className="space-y-4">
                <div className="p-3 bg-teal-50 border border-teal-200 rounded-xl flex items-center justify-between">
                  <div className="text-xs">
                    <span className="text-slate-500 block text-[10px]">Code sent to</span>
                    <span className="font-bold text-teal-800 font-mono">+91 {phone}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setOtpSent(false);
                      setOtp('');
                    }}
                    className="text-xs text-primary-600 hover:underline font-semibold cursor-pointer"
                  >
                    Change
                  </button>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1.5">
                    Enter 6-Digit SMS Code
                  </label>
                  <div className="relative">
                    <KeyRound className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      required
                      maxLength="6"
                      autoFocus
                      value={otp}
                      onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
                      placeholder="123456"
                      className="w-full pl-9 pr-3.5 py-2.5 rounded-xl border border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-primary-500 font-mono text-center tracking-widest text-lg font-bold"
                    />
                  </div>
                  {(confirmationResult?.isDevFallback || confirmationResult?.isSimulated) && (
                    <div className="mt-2 p-2 rounded-lg bg-amber-50 border border-amber-200 text-amber-800 text-[11px] flex items-center justify-between">
                      <span>🧪 Dev Mode: Code is <strong className="font-mono bg-amber-100 px-1 py-0.5 rounded">123456</strong></span>
                      <button
                        type="button"
                        onClick={() => setOtp('123456')}
                        className="text-amber-700 underline font-semibold cursor-pointer hover:text-amber-900"
                      >
                        Auto-Fill
                      </button>
                    </div>
                  )}
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Your Name <span className="text-slate-400 font-normal">(Optional for new customers)</span>
                  </label>
                  <div className="relative">
                    <User className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      value={customerName}
                      onChange={(e) => setCustomerName(e.target.value)}
                      placeholder="e.g. Rohan Sharma"
                      className="w-full pl-9 pr-3.5 py-2.5 rounded-xl border border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-primary-500 font-medium"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading || otp.length !== 6}
                  className="w-full py-3.5 px-4 rounded-xl font-bold text-white bg-teal-600 hover:bg-teal-700 shadow-md shadow-teal-600/30 transition-all flex items-center justify-center gap-2 disabled:opacity-60 cursor-pointer"
                >
                  {loading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <>
                      <CheckCircle2 className="w-4 h-4" />
                      <span>Verify & Sign In</span>
                    </>
                  )}
                </button>

                <div className="text-center text-xs">
                  {canResend ? (
                    <button
                      type="button"
                      onClick={handleResendOtp}
                      disabled={loading}
                      className="text-primary-600 hover:underline font-semibold inline-flex items-center gap-1 cursor-pointer"
                    >
                      <RotateCcw className="w-3 h-3" />
                      <span>Resend Verification Code</span>
                    </button>
                  ) : (
                    <span className="text-slate-400">
                      Resend code in <span className="font-bold text-slate-600">{countdown}s</span>
                    </span>
                  )}
                </div>
              </form>
            )}
          </div>
        )}

        {/* Staff Tab: Email & Password */}
        {activeTab === 'staff' && (
          <form onSubmit={handleStaffSubmit} className="space-y-4 text-xs">
            <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-amber-800 text-[11px] leading-relaxed">
              <strong>Staff Only:</strong> Reserved strictly for IndoDhobi Administrators and Field Logistics Riders.
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Staff Email Address</label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="email"
                  required
                  value={staffEmail}
                  onChange={(e) => setStaffEmail(e.target.value)}
                  placeholder="admin@indodhobi.com"
                  className="w-full pl-9 pr-3.5 py-2.5 rounded-xl border border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-primary-500 font-medium"
                />
              </div>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Staff Password</label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="password"
                  required
                  value={staffPassword}
                  onChange={(e) => setStaffPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-9 pr-3.5 py-2.5 rounded-xl border border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-primary-500 font-medium"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 px-4 rounded-xl font-bold text-white bg-slate-900 hover:bg-slate-800 shadow-md shadow-slate-900/20 transition-all flex items-center justify-center gap-2 disabled:opacity-60 cursor-pointer"
            >
              {loading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <>
                  <ShieldCheck className="w-4 h-4" />
                  <span>Authenticate Staff Session</span>
                </>
              )}
            </button>
          </form>
        )}

        {/* Quick 1-Click Demo Buttons */}
        <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 space-y-2 text-xs">
          <span className="font-bold text-slate-600 block text-[11px] uppercase tracking-wider">
            ⚡ Quick 1-Click Demo Access
          </span>
          <div className="grid grid-cols-3 gap-1.5">
            <button
              type="button"
              disabled={loading}
              onClick={() => handleQuickDemo('customer', 'customer@indodhobi.com', 'password123', '9876543210')}
              className="py-2 px-2 rounded-xl bg-white border border-slate-200 text-slate-700 hover:text-primary-600 hover:border-primary-400 font-semibold shadow-2xs text-left transition-all"
            >
              <div className="font-bold text-[11px] truncate">Customer</div>
              <span className="text-[10px] text-slate-400 block truncate">Rohan</span>
            </button>

            <button
              type="button"
              disabled={loading}
              onClick={() => handleQuickDemo('rider', 'rider@indodhobi.com', 'rider123', '9876543211')}
              className="py-2 px-2 rounded-xl bg-white border border-slate-200 text-slate-700 hover:text-teal-600 hover:border-teal-400 font-semibold shadow-2xs text-left transition-all"
            >
              <div className="font-bold text-[11px] truncate">Rider</div>
              <span className="text-[10px] text-slate-400 block truncate">Ramesh</span>
            </button>

            <button
              type="button"
              disabled={loading}
              onClick={() => handleQuickDemo('admin', 'admin@indodhobi.com', 'admin123')}
              className="py-2 px-2 rounded-xl bg-white border border-slate-200 text-slate-700 hover:text-primary-600 hover:border-primary-400 font-semibold shadow-2xs text-left transition-all"
            >
              <div className="font-bold text-[11px] truncate">Admin</div>
              <span className="text-[10px] text-slate-400 block truncate">Pooja</span>
            </button>
          </div>
        </div>

        {/* Footer Link */}
        <div className="pt-2 text-center text-xs text-slate-500">
          <span>New to IndoDhobi? Enter your mobile number above for instant access!</span>
        </div>

      </div>
    </div>
  );
};

export default LoginPage;
