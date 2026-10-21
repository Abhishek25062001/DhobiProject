// Creates once; never prints or rotates an existing secret.
import { randomBytes } from 'node:crypto';
import { writeFileSync, chmodSync } from 'node:fs';
const path = new URL('../.env.webhook.local', import.meta.url);
try {
  writeFileSync(path, `RAZORPAY_WEBHOOK_SECRET=${randomBytes(32).toString('hex')}\n`, { flag: 'wx', mode: 0o600 });
  console.log('Created private server/.env.webhook.local. Copy its value into the matching Razorpay Test Mode webhook secret field.');
} catch (error) {
  if (error.code !== 'EEXIST') throw error;
  console.log('Existing webhook secret preserved.');
}
chmodSync(path, 0o600);
