import dotenv from 'dotenv';
import mongoose from 'mongoose';
import { mkdir, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { connectDB, disconnectDB } from '../config/db.js';
import SiteContent from '../models/SiteContent.js';
import { planAreasContentRefresh, applyAreasContentRefresh } from '../services/areasContentRefresh.js';

dotenv.config({ path: fileURLToPath(new URL('../.env', import.meta.url)) });
try {
  await connectDB();
  const plan = planAreasContentRefresh(await SiteContent.findOne({ pageKey: 'areas' }).lean());
  console.log(JSON.stringify({ mode: process.argv.includes('--apply') ? 'apply' : 'dry-run', changes: plan.changes }, null, 2));
  if (process.argv.includes('--apply') && plan.changes.length) {
    const directory = new URL('../../.local-backups/', import.meta.url);
    await mkdir(directory, { recursive: true, mode: 0o700 });
    const backup = new URL(`areas-content-${Date.now()}-${process.pid}.json`, directory);
    await writeFile(backup, mongoose.mongo.BSON.EJSON.stringify({ database: mongoose.connection.name, ...plan }, null, 2), { mode: 0o600, flag: 'wx' });
    console.log(`Backup saved: ${fileURLToPath(backup)}`);
    console.log(JSON.stringify(await applyAreasContentRefresh(plan)));
  }
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
} finally { await disconnectDB(); }
