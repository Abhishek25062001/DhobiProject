import { initializeApp, getApps, getApp } from '@firebase/app';
import { getAuth, RecaptchaVerifier, signInWithPhoneNumber } from '@firebase/auth';

const firebaseConfig = {
  apiKey: (import.meta.env.VITE_FIREBASE_API_KEY || '').trim(),
  authDomain: (import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || 'indodhobi.firebaseapp.com').trim(),
  projectId: (import.meta.env.VITE_FIREBASE_PROJECT_ID || 'indodhobi').trim(),
  storageBucket: (import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || 'indodhobi.firebasestorage.app').trim(),
  messagingSenderId: (import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || '678908407354').trim(),
  appId: (import.meta.env.VITE_FIREBASE_APP_ID || '1:678908407354:web:ae7c3fa1a6635d65300f03').trim()
};

let app = null;
let auth = null;

try {
  if (firebaseConfig.apiKey) {
    app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
    auth = getAuth(app);
  }
} catch (err) {
  console.warn('[Firebase] Client initialization notice:', err.message);
}

export { app, auth };

export function setupRecaptcha(container) {
  if (!auth) throw Object.assign(new Error('Phone sign-in is unavailable.'), { code: 'auth/operation-not-allowed' });
  return new RecaptchaVerifier(auth, container, { size: 'invisible' });
}

export function sendPhoneOtp(phone, verifier) {
  return signInWithPhoneNumber(auth, `+91${phone}`, verifier);
}

export default auth;
