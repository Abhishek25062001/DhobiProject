import 'dotenv/config';
import { connectDB, disconnectDB } from '../config/db.js';
import { runPaymentMaintenance } from '../services/paymentMaintenance.js';
try {
  await connectDB();
  const result = await runPaymentMaintenance();
  if (result.unresolved) process.exitCode = 1;
} finally { await disconnectDB(); }
