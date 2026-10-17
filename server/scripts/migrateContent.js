import dotenv from 'dotenv';
import { mkdir, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { connectDB, disconnectDB } from '../config/db.js';
import { contentMigration } from '../services/contentMigration.js';

dotenv.config({ path: fileURLToPath(new URL('../.env', import.meta.url)) });
try {
  await connectDB();
  const plan = await contentMigration();
  if (process.argv.includes('--apply')) {
    const directory = new URL('../../.local-backups/', import.meta.url);
    await mkdir(directory, { recursive: true });
    const backup = new URL(`content-${Date.now()}.json`, directory);
    await writeFile(backup, JSON.stringify({ pages: plan.pages, assets: plan.assets }, null, 2), { mode: 0o600 });
    await contentMigration({ apply: true });
    console.log(`Backup saved: ${fileURLToPath(backup)}`);
  }
  console.log(JSON.stringify({ mode: process.argv.includes('--apply') ? 'applied' : 'dry-run', changed: plan.changed }));
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
} finally { await disconnectDB(); }
