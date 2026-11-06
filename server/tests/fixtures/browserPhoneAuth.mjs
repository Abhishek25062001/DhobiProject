// Loaded by the disposable browser harness only. No SMS or external Firebase calls.
const sends = new Map();

export function setupRecaptcha() {
  return { clear() {} };
}

export async function sendPhoneOtp(phone) {
  const sequence = (sends.get(phone) ?? 0) + 1;
  sends.set(phone, sequence);
  const code = String(123455 + sequence).padStart(6, '0');
  let consumed = false;
  return {
    async confirm(input) {
      if (consumed || sends.get(phone) !== sequence) {
        throw Object.assign(new Error('Expired fixture code'), { code: 'auth/code-expired' });
      }
      if (input !== code) {
        throw Object.assign(new Error('Incorrect fixture code'), { code: 'auth/invalid-verification-code' });
      }
      consumed = true;
      return { user: { getIdToken: async () => `test_firebase_token_${phone}` } };
    },
  };
}
