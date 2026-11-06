import ContentState from '../components/ContentState';
import BrandLogo from '../components/BrandLogo';
import usePageCopy from '../hooks/usePageCopy';
import { useGlobalContent } from '../context/SiteContentContext';
import React, { useCallback, useState, useEffect, useRef } from 'react';
import { Link, Navigate, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  Lock,
  Mail,
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

function phoneAuthMessage(code, fallback) {
  switch (code) {
    case 'auth/network-request-failed': return 'Check your connection and try again.';
    case 'auth/too-many-requests': return 'Too many attempts. Wait a while before trying again.';
    case 'auth/invalid-phone-number': return 'Check your mobile number and try again.';
    // Firebase also returns this when the page's domain is not an Authorized domain in Firebase Authentication.
    case 'auth/captcha-check-failed': return 'The security check could not be verified. Please refresh the page and try again.';
    case 'auth/invalid-app-credential':
    case 'auth/missing-app-credential': return 'The security check could not be completed. Please refresh the page and try again.';
    case 'auth/billing-not-enabled':
    case 'auth/operation-not-allowed':
    case 'auth/unauthorized-domain':
    case 'auth/quota-exceeded': return 'Phone sign-in is currently unavailable. Please try again later.';
    default: return fallback;
  }
}

const LoginPage = () => {
  const copy = usePageCopy('login');
  const { global } = useGlobalContent();
  const branding = global.section('branding');
  const navigate = useNavigate();
  const location = useLocation();
  const { user, isAuthenticated, login, customerLoginWithFirebase, completeOnboarding } = useAuth();

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
  const [verifiedUser, setVerifiedUser] = useState(null);
  const [codeError, setCodeError] = useState('');
  const verifier = useRef(null);
  const captchaContainer = useRef(null);
  const codeInput = useRef(null);
  const otpBusy = useRef(false);
  const mounted = useRef(false);
  const attachCaptcha = useCallback(node => {
    // Page content can reload and replace the element that owns the reCAPTCHA widget.
    if (!node) {
      verifier.current?.clear();
      verifier.current = null;
    }
    captchaContainer.current = node;
  }, []);

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

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  useEffect(() => {
    if (otpStep !== 2 || verifiedUser || countdown === 0) return;
    const timer = setTimeout(() => setCountdown(seconds => seconds - 1), 1000);
    return () => clearTimeout(timer);
  }, [otpStep, verifiedUser, countdown]);

  function resetPhoneStep() {
    setOtpStep(1);
    setOtp('');
    setCodeError('');
    setConfirmationResult(null);
    setVerifiedUser(null);
  }

  async function requestCode(event) {
    event.preventDefault();
    if (otpBusy.current || (otpStep === 2 && countdown > 0)) return;
    if (!/^\d{10}$/.test(phone)) {
      toast.error('Please enter a valid 10-digit Indian mobile number.');
      return;
    }

    otpBusy.current = true;
    setLoading(true);
    try {
      verifier.current ??= setupRecaptcha(captchaContainer.current);
      const confirmation = await sendPhoneOtp(phone, verifier.current);
      if (!mounted.current) return;
      setConfirmationResult(confirmation);
      setOtp('');
      setCodeError('');
      setCountdown(30);
      setOtpStep(2);
      toast.success(`Code sent to +91 ${phone}`);
    } catch (error) {
      // Keep the Firebase code visible for diagnosis; the toast stays user-friendly.
      console.error('[PhoneAuth] Could not send code:', error.code, error.message);
      // A failed attempt can leave the invisible reCAPTCHA with a spent token. Start fresh next time.
      try { verifier.current?.clear(); } catch { /* widget already removed */ }
      verifier.current = null;
      if (mounted.current) toast.error(phoneAuthMessage(error.code, 'Could not send a code. Please try again.'));
    } finally {
      otpBusy.current = false;
      if (mounted.current) setLoading(false);
    }
  }

  async function handleVerifyOtp(event) {
    event.preventDefault();
    if (otpBusy.current) return;
    if (!confirmationResult) {
      resetPhoneStep();
      toast.error('Request a new code to continue.');
      return;
    }
    if (!verifiedUser && !/^\d{6}$/.test(otp)) {
      setCodeError('Enter the six digits from your latest SMS.');
      return;
    }

    otpBusy.current = true;
    setLoading(true);
    setCodeError('');
    try {
      // A successful confirmation consumes the SMS code. Retry the app sign-in with that user.
      let phoneUser = verifiedUser;
      if (!phoneUser) {
        const credential = await confirmationResult.confirm(otp);
        if (!mounted.current) return;
        phoneUser = credential.user;
        setVerifiedUser(phoneUser);
        setOtp('');
      }
      const idToken = await phoneUser.getIdToken();
      if (!mounted.current) return;
      const res = await customerLoginWithFirebase({ idToken, phone });
      if (mounted.current && res.success) {
        if (res.requiresName) setOtpStep(3);
        else routeByRole(res.user?.role);
      }
    } catch (error) {
      if (!mounted.current) return;
      if (error.code === 'auth/invalid-verification-code') {
        setOtp('');
        setCodeError('That code didn’t match. Enter the six digits from your latest SMS.');
        codeInput.current?.focus();
      } else if (['auth/code-expired', 'auth/invalid-verification-id', 'auth/missing-verification-id'].includes(error.code)) {
        resetPhoneStep();
        toast.error('This code has expired. Request a new one to sign in.');
      } else {
        toast.error(phoneAuthMessage(error.code, 'Could not finish phone sign-in. Please try again.'));
      }
    } finally {
      otpBusy.current = false;
      if (mounted.current) setLoading(false);
    }
  }

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

  const storedAccountPrompt = copy('new_to_indodhobi_sign_in_with_your_mobile_number_to_get_started_i_128a20f');
  const accountPrompt = /Sign in with your mobile number/.test(storedAccountPrompt) ? 'New to IndoDhobi? ' : (storedAccountPrompt || 'New to IndoDhobi? ');
  const accountAction = copy('create_an_account_7c1a0e2') || 'Create an account';

  if (isAuthenticated && (user?.role === 'admin' || user?.role === 'rider')) {
    return <Navigate to={user.role === 'admin' ? '/admin' : '/rider'} replace />;
  }

  return (
    <ContentState resource={copy}><div className="max-w-md mx-auto my-12 px-4 sm:px-6">
      <div className="bg-white rounded-3xl p-8 border border-slate-200/80 shadow-xl shadow-slate-100 space-y-6">
        
        {/* Invisible reCAPTCHA container for Firebase Phone Auth */}
        <div ref={attachCaptcha} id="recaptcha-container"></div>

        {/* Brand Header */}
        <div className="text-center space-y-2">
          <div className="w-12 h-12 mx-auto flex items-center justify-center">
            <BrandLogo reference={branding?.logo} className="w-full h-full object-contain" width={48} height={48} />
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
              <form onSubmit={requestCode} className="space-y-4">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1.5">{copy('mobile_phone_number_57c0337')}</label>
                  <div className="flex items-stretch rounded-xl border border-slate-300 overflow-hidden focus-within:ring-2 focus-within:ring-primary-500 focus-within:border-primary-500 transition-all">
                    <span className="inline-flex shrink-0 items-center whitespace-nowrap px-3.5 bg-slate-100 text-slate-700 font-bold text-xs border-r border-slate-200">
                      🇮🇳 +91
                    </span>
                    <input
                      type="tel"
                      required
                      autoFocus
                      maxLength="10"
                      value={phone}
                      disabled={loading}
                      onChange={(e) => setPhone(e.target.value.replace(/\D/g, ''))}
                      placeholder="9876543210"
                      className="min-w-0 flex-1 px-3.5 py-3 font-mono text-sm leading-5 tracking-wide focus:outline-hidden text-slate-800"
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
                    <span className="text-slate-500 block text-[10px]">{verifiedUser ? 'Verified number' : copy('code_sent_to_39ade83')}</span>
                    <span className="font-bold text-teal-800 font-mono">+91 {phone}</span>
                  </div>
                  <button
                    type="button"
                    disabled={loading}
                    onClick={resetPhoneStep}
                    className="text-xs text-primary-600 hover:underline font-semibold cursor-pointer"
                  >{copy('change_c0bf75b')}</button>
                </div>

                {verifiedUser ? (
                  !loading && <p role="status">Your number is verified. Continue to finish signing in.</p>
                ) : <div>
                  <label htmlFor="login-otp" className="block font-semibold text-slate-700 mb-1.5">{copy('enter_6_digit_sms_verification_code_6ac02ae')}</label>
                  <div className="relative">
                    <KeyRound className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      required
                      maxLength="6"
                      autoFocus
                      id="login-otp"
                      ref={codeInput}
                      inputMode="numeric"
                      autoComplete="one-time-code"
                      readOnly={loading}
                      aria-invalid={Boolean(codeError)}
                      aria-describedby={codeError ? 'login-otp-error' : undefined}
                      value={otp}
                      onChange={(e) => {
                        setOtp(e.target.value.replace(/\D/g, ''));
                        setCodeError('');
                      }}
                      placeholder="••••••"
                      className="w-full pl-9 pr-3.5 py-3 rounded-xl border border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-primary-500 font-mono text-center tracking-widest text-xl font-bold text-slate-900"
                    />
                  </div>
                  {codeError && <p id="login-otp-error" role="alert" className="mt-2 text-red-700">{codeError}</p>}
                </div>}

                <button
                  type="submit"
                  disabled={loading || (!verifiedUser && otp.length !== 6)}
                  className="w-full py-3.5 px-4 rounded-xl font-bold text-white bg-teal-600 hover:bg-teal-700 shadow-md shadow-teal-600/30 transition-all flex items-center justify-center gap-2 disabled:opacity-60 cursor-pointer"
                >
                  {loading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <>
                      <CheckCircle2 className="w-4 h-4" />
                      <span>{verifiedUser ? 'Finish signing in' : copy('verify_continue_ce8b07b')}</span>
                    </>
                  )}
                </button>

                {!verifiedUser && <div className="text-center text-xs">
                  {countdown === 0 ? (
                    <button
                      type="button"
                      onClick={requestCode}
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
                </div>}
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
              disabled={loading}
              onClick={() => {
                setAuthMode('password');
                resetPhoneStep();
              }}
              className="text-slate-600 hover:text-primary-600 font-semibold transition-colors cursor-pointer"
            >{copy('staff_or_prefer_password_aaa4661')}<span className="underline">{copy('sign_in_with_email_password_c6f4879')}</span>
            </button>
          ) : (
            <button
              type="button"
              disabled={loading}
              onClick={() => {
                setAuthMode('otp');
                resetPhoneStep();
              }}
              className="text-slate-600 hover:text-primary-600 font-semibold transition-colors cursor-pointer"
            >{copy('customer_7ffe79f')}<span className="underline">{copy('sign_in_with_mobile_number_otp_0e5044e')}</span>
            </button>
          )}
        </div>

        {/* Register Link */}
        <div className="text-center text-[11px] text-slate-400">
          <span>{accountPrompt}</span>
          <Link
            to={{ pathname: '/register', search: location.search, state: location.state }}
            className="font-bold text-primary-600 hover:underline"
          >{accountAction}</Link>
        </div>

      </div>
    </div></ContentState>
  );
};

export default LoginPage;
