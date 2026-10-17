import ContentState from '../components/ContentState';
import usePageCopy from '../hooks/usePageCopy';
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
  User,
  CheckCircle2,
  RotateCcw,
  KeyRound,
  ShieldCheck,
  Sparkles
} from 'lucide-react';
import toast from 'react-hot-toast';
import { setupRecaptcha, sendPhoneOtp } from '../config/firebase';

const LoginPage = () => {
  const copy = usePageCopy('login');
  const navigate = useNavigate();
  const location = useLocation();
  const { login, customerLoginWithFirebase, completeOnboarding } = useAuth();

  // Mode: 'otp' (Mobile OTP) | 'password' (Email + Password)
  const [authMode, setAuthMode] = useState('otp');

  // OTP Steps: 1 = Enter Phone, 2 = Enter 6-digit OTP, 3 = First-time User (Enter Name)
  const [otpStep, setOtpStep] = useState(1);
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [fullName, setFullName] = useState('');
  const [emailOptional, setEmailOptional] = useState('');
  const [confirmationResult, setConfirmationResult] = useState(null);
  const [countdown, setCountdown] = useState(30);
  const [canResend, setCanResend] = useState(false);

  // Email + Password state
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  // Loading state
  const [loading, setLoading] = useState(false);

  const redirect = new URLSearchParams(window.location.search).get('redirect') || location.state?.from?.pathname || '/';

  const routeByRole = (role) => {
    if (role === 'admin') {
      navigate('/admin', { replace: true });
    } else if (role === 'rider') {
      navigate('/rider', { replace: true });
    } else {
      navigate(redirect, { replace: true });
    }
  };

  // Timer for OTP resend countdown
  useEffect(() => {
    let timer;
    if (otpStep === 2 && countdown > 0) {
      timer = setInterval(() => {
        setCountdown((prev) => prev - 1);
      }, 1000);
    } else if (countdown === 0) {
      setCanResend(true);
    }
    return () => clearInterval(timer);
  }, [otpStep, countdown]);

  // Step 1: Send OTP
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
      setOtpStep(2);
      setCountdown(30);
      setCanResend(false);

      if (confirmation?.isDevFallback) {
        toast('Dev Mode: Enter OTP 123456 to verify.', { icon: '🧪', duration: 5000 });
      } else {
        toast.success(`OTP sent to +91 ${cleanDigits}`);
      }
    } catch (error) {
      console.error('[Firebase OTP Error]:', error);
      toast.error(error.message || 'Failed to send OTP. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Resend OTP
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
      toast.success(`New OTP sent to +91 ${cleanDigits}`);
    } catch (error) {
      toast.error(error.message || 'Failed to resend OTP.');
    } finally {
      setLoading(false);
    }
  };

  // Step 2: Verify OTP
  const handleVerifyOtp = async (e) => {
    e.preventDefault();
    const cleanOtp = otp.trim();

    if (!cleanOtp || cleanOtp.length !== 6) {
      toast.error('Please enter the 6-digit verification code.');
      return;
    }

    if (!confirmationResult) {
      toast.error('Session expired. Please request a new OTP.');
      setOtpStep(1);
      return;
    }

    setLoading(true);
    try {
      const userCredential = await confirmationResult.confirm(cleanOtp);
      const idToken = await userCredential.user.getIdToken();
      const cleanDigits = phone.replace(/\D/g, '').slice(-10);

      // Backend returns { isNewUser, requiresName, token, user }
      const res = await customerLoginWithFirebase({
        idToken,
        phone: cleanDigits
      });

      if (res.success) {
        if (res.requiresName) {
          // First-time user needs name
          setOtpStep(3);
        } else {
          // Returning user: redirect immediately!
          routeByRole(res.user?.role);
        }
      }
    } catch (error) {
      console.error('[OTP Verification Error]:', error);
      toast.error(error.message || 'Invalid verification code. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Step 3: Complete Onboarding for First-time user
  const handleCompleteOnboarding = async (e) => {
    e.preventDefault();
    if (!fullName || !fullName.trim()) {
      toast.error('Please enter your full name to complete registration.');
      return;
    }

    setLoading(true);
    try {
      const res = await completeOnboarding({
        name: fullName.trim(),
        email: emailOptional.trim() || undefined
      });

      if (res.success) {
        routeByRole(res.user?.role || 'customer');
      }
    } catch (error) {
      toast.error(error.message || 'Failed to complete profile.');
    } finally {
      setLoading(false);
    }
  };

  // Email + Password Login
  const handlePasswordLogin = async (e) => {
    e.preventDefault();
    if (!email || !password) {
      toast.error('Please enter both email and password.');
      return;
    }

    setLoading(true);
    try {
      const res = await login(email.trim(), password);
      if (res.success) {
        routeByRole(res.user?.role);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <ContentState resource={copy}><div className="max-w-md mx-auto my-12 px-4 sm:px-6">
      <div className="bg-white rounded-3xl p-8 border border-slate-200/80 shadow-xl shadow-slate-100 space-y-6">
        
        {/* Invisible reCAPTCHA container for Firebase Phone Auth */}
        <div id="recaptcha-container"></div>

        {/* Brand Header */}
        <div className="text-center space-y-2">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-primary-600 to-teal-500 text-white flex items-center justify-center mx-auto shadow-md">
            <Shirt className="w-6 h-6 stroke-[2.2]" />
          </div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">{copy('sign_in_to_indo_ec99bee')}<span className="text-primary-600">{copy('dhobi_5205e15')}</span>
          </h1>
          <p className="text-xs text-slate-500">{copy('smart_doorstep_laundry_ironing_across_delhi_ncr_7a1f3aa')}</p>
        </div>

        {/* ───────────── OTP MODE ───────────── */}
        {authMode === 'otp' && (
          <div className="space-y-4 text-xs">
            {/* Step 1: Phone input */}
            {otpStep === 1 && (
              <form onSubmit={handleSendOtp} className="space-y-4">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1.5">{copy('mobile_phone_number_57c0337')}</label>
                  <div className="relative flex rounded-xl border border-slate-300 overflow-hidden focus-within:ring-2 focus-within:ring-primary-500 focus-within:border-primary-500 transition-all">
                    <span className="inline-flex items-center px-3.5 bg-slate-100 text-slate-700 font-bold text-xs border-r border-slate-200">
                      🇮🇳 +91
                    </span>
                    <input
                      type="tel"
                      required
                      autoFocus
                      maxLength="10"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value.replace(/\D/g, ''))}
                      placeholder="9876543210"
                      className="w-full px-3.5 py-3 font-mono text-sm tracking-wide focus:outline-hidden text-slate-800"
                    />
                  </div>
                  <p className="text-[11px] text-slate-400 mt-1.5">{copy('we_ll_send_a_6_digit_sms_verification_code_to_your_phone_b180fd0')}</p>
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
                      <span>{copy('continue_with_mobile_otp_3987232')}</span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </form>
            )}

            {/* Step 2: 6-digit OTP code */}
            {otpStep === 2 && (
              <form onSubmit={handleVerifyOtp} className="space-y-4">
                <div className="p-3 bg-teal-50 border border-teal-200 rounded-xl flex items-center justify-between">
                  <div className="text-xs">
                    <span className="text-slate-500 block text-[10px]">{copy('code_sent_to_39ade83')}</span>
                    <span className="font-bold text-teal-800 font-mono">+91 {phone}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setOtpStep(1);
                      setOtp('');
                    }}
                    className="text-xs text-primary-600 hover:underline font-semibold cursor-pointer"
                  >{copy('change_c0bf75b')}</button>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1.5">{copy('enter_6_digit_sms_verification_code_6ac02ae')}</label>
                  <div className="relative">
                    <KeyRound className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      required
                      maxLength="6"
                      autoFocus
                      value={otp}
                      onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
                      placeholder="••••••"
                      className="w-full pl-9 pr-3.5 py-3 rounded-xl border border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-primary-500 font-mono text-center tracking-widest text-xl font-bold text-slate-900"
                    />
                  </div>
                  {(confirmationResult?.isDevFallback || confirmationResult?.isSimulated) && (
                    <div className="mt-2 p-2.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-[11px] flex items-center justify-between">
                      <span>{copy('dev_mode_code_is_768506f')}<strong className="font-mono bg-amber-100 px-1 py-0.5 rounded">123456</strong></span>
                      <button
                        type="button"
                        onClick={() => setOtp('123456')}
                        className="text-amber-700 underline font-semibold cursor-pointer hover:text-amber-900"
                      >{copy('auto_fill_68631d1')}</button>
                    </div>
                  )}
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
                      <span>{copy('verify_continue_ce8b07b')}</span>
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
                      <span>{copy('resend_verification_code_e557f7c')}</span>
                    </button>
                  ) : (
                    <span className="text-slate-400">{copy('resend_code_in_e947053')}<span className="font-bold text-slate-600">{countdown}{copy('s_043a718')}</span>
                    </span>
                  )}
                </div>
              </form>
            )}

            {/* Step 3: Enter Name ONLY if first-time user */}
            {otpStep === 3 && (
              <form onSubmit={handleCompleteOnboarding} className="space-y-4">
                <div className="p-3 bg-primary-50 border border-primary-200 rounded-xl space-y-1">
                  <div className="flex items-center gap-1.5 text-primary-800 font-bold text-xs">
                    <Sparkles className="w-3.5 h-3.5 text-primary-600" />
                    <span>{copy('welcome_to_indodhobi_5a7576e')}</span>
                  </div>
                  <p className="text-[11px] text-primary-700">{copy('your_phone_number_45644e0')}<strong className="font-mono">+91 {phone}</strong>{copy('is_verified_please_provide_your_full_name_to_finish_setting_up_yo_ff603f8')}</p>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">{copy('full_name_8e00cdf')}</label>
                  <div className="relative">
                    <User className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      required
                      autoFocus
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      placeholder={copy('e_g_priya_nair_0e0a164')}
                      className="w-full pl-9 pr-3.5 py-2.5 rounded-xl border border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-primary-500 font-medium text-slate-800"
                    />
                  </div>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">{copy('email_address_b85fda9')}<span className="text-slate-400 font-normal">{copy('optional_for_receipts_743b27a')}</span>
                  </label>
                  <div className="relative">
                    <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="email"
                      value={emailOptional}
                      onChange={(e) => setEmailOptional(e.target.value)}
                      placeholder={copy('priya_example_com_6bdb7e9')}
                      className="w-full pl-9 pr-3.5 py-2.5 rounded-xl border border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-primary-500 font-medium text-slate-800"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading || !fullName.trim()}
                  className="w-full py-3.5 px-4 rounded-xl font-bold text-white bg-primary-600 hover:bg-primary-700 shadow-md shadow-primary-600/30 transition-all flex items-center justify-center gap-2 disabled:opacity-60 cursor-pointer"
                >
                  {loading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <>
                      <span>{copy('complete_registration_965f385')}</span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </form>
            )}
          </div>
        )}

        {/* ───────────── PASSWORD MODE ───────────── */}
        {authMode === 'password' && (
          <form onSubmit={handlePasswordLogin} className="space-y-4 text-xs">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">{copy('email_address_09bf25e')}</label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="email"
                  required
                  autoFocus
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder={copy('name_example_com_7b17fb0')}
                  className="w-full pl-9 pr-3.5 py-2.5 rounded-xl border border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-primary-500 font-medium text-slate-800"
                />
              </div>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">{copy('password_e7cf3ef')}</label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-9 pr-3.5 py-2.5 rounded-xl border border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-primary-500 font-medium text-slate-800"
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
                  <span>{copy('sign_in_bcc0bcc')}</span>
                </>
              )}
            </button>
          </form>
        )}

        {/* Mode Switcher Link */}
        <div className="pt-2 text-center text-xs border-t border-slate-100">
          {authMode === 'otp' ? (
            <button
              type="button"
              onClick={() => {
                setAuthMode('password');
                setOtpStep(1);
              }}
              className="text-slate-600 hover:text-primary-600 font-semibold transition-colors cursor-pointer"
            >{copy('staff_or_prefer_password_aaa4661')}<span className="underline">{copy('sign_in_with_email_password_c6f4879')}</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={() => {
                setAuthMode('otp');
                setOtpStep(1);
              }}
              className="text-slate-600 hover:text-primary-600 font-semibold transition-colors cursor-pointer"
            >{copy('customer_7ffe79f')}<span className="underline">{copy('sign_in_with_mobile_number_otp_0e5044e')}</span>
            </button>
          )}
        </div>

        {/* Register Link */}
        <div className="text-center text-[11px] text-slate-400">{copy('new_to_indodhobi_sign_in_with_your_mobile_number_to_get_started_i_128a20f')}</div>

      </div>
    </div></ContentState>
  );
};

export default LoginPage;
