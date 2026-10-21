/**
 * Firebase ID Token Verification Utility
 * Supports production Google Identity Toolkit verification, Firebase Admin,
 * and isolated test simulation tokens.
 */

export const verifyFirebaseIdToken = async (idToken) => {
  if (!idToken || typeof idToken !== 'string') {
    return { success: false, message: 'A valid Firebase ID token string is required' };
  }

  // 1. Test / Simulation tokens (for automated test suite & offline QA)
  if (process.env.NODE_ENV === 'test') {
    if (idToken.startsWith('test_') || idToken.startsWith('mock_')) {
      const parts = idToken.split('_');
      // Format: test_firebase_token_<phone> OR test_firebase_token_<phone>_<uid>
      let rawPhone = parts[3] || parts[2] || '9876543210';
      // If phone has a +91 prefix or not
      const normalizedDigits = rawPhone.replace(/\D/g, '').slice(-10);
      const uid = parts[4] || `firebase_uid_${normalizedDigits}`;
      return {
        success: true,
        uid,
        phoneNumber: `+91${normalizedDigits}`,
        phone: normalizedDigits,
        isSimulated: true
      };
    }
  }

  // 2. Production Firebase Identity Toolkit verification
  const apiKey = (process.env.VITE_FIREBASE_API_KEY || process.env.FIREBASE_API_KEY || '').trim();

  if (apiKey) {
    try {
      const response = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${apiKey}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ idToken }),
        signal: AbortSignal.timeout(10000)
      });

      const data = await response.json();

      if (!response.ok || !data.users || data.users.length === 0) {
        return {
          success: false,
          message: data.error?.message || 'Invalid or expired Firebase ID token'
        };
      }

      const fbUser = data.users[0];
      const uid = fbUser.localId;
      const rawPhone = fbUser.phoneNumber || '';
      const phoneDigits = rawPhone.replace(/\D/g, '').slice(-10);

      return {
        success: true,
        uid,
        phoneNumber: rawPhone || (phoneDigits ? `+91${phoneDigits}` : ''),
        phone: phoneDigits,
        email: fbUser.email,
        isSimulated: false
      };
    } catch (err) {
      console.error('[FirebaseVerify] Identity Toolkit API Error:', err.message);
    }
  }

  return { success: false, message: 'Firebase token verification failed or expired' };
};

export default verifyFirebaseIdToken;
