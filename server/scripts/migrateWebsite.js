import dotenv from 'dotenv';
import { fileURLToPath } from 'node:url';
import { connectDB, disconnectDB } from '../config/db.js';
import { migrateWebsite, rollbackWebsite } from '../services/websiteMigration.js';

dotenv.config({ path: fileURLToPath(new URL('../.env', import.meta.url)) });
try {
  await connectDB();
  const args = process.argv.slice(2);
  const rollbackIndex = args.indexOf('--rollback');
  const result = rollbackIndex >= 0
    ? await rollbackWebsite(args[rollbackIndex + 1], { apply: args.includes('--apply') })
    : await migrateWebsite({ apply: args.includes('--apply') });
  console.log(JSON.stringify(result, null, 2));
  if (result.errors?.length) process.exitCode = 1;
} catch (error) { console.error(error.message); process.exitCode = 1; }
finally { await disconnectDB(); }
