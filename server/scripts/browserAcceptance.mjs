// Disposable local acceptance environment. Never connects to the configured project database.
import { fileURLToPath } from 'node:url';
import { existsSync, readFileSync } from 'node:fs';
import dotenv from 'dotenv';
const gatewayFixture = process.argv.includes('--razorpay-test') ? dotenv.parse(readFileSync(new URL('../.env', import.meta.url))) : null;
if (gatewayFixture && !gatewayFixture.RAZORPAY_KEY_ID?.startsWith('rzp_test_')) throw new Error('Only test-mode gateway credentials are permitted.');
if (!process.argv.includes('--isolated')) throw new Error('This runner requires --isolated.');
process.env.NODE_ENV = 'test';
process.env.PORT = '5101';
process.env.VITE_API_URL = 'http://127.0.0.1:5101';
process.env.JWT_SECRET = 'isolated-browser-acceptance-only';
for (const key of ['MONGO_URI', 'RAZORPAY_KEY_ID', 'RAZORPAY_KEY_SECRET', 'RAZORPAY_WEBHOOK_SECRET', 'CLOUDINARY_CLOUD_NAME', 'CLOUDINARY_API_KEY', 'CLOUDINARY_API_SECRET', 'CLOUDINARY_URL', 'CLAUDINARY_CLOUD_NAME', 'CLAUDINARY_API_KEY', 'CLAUDINARY_API_SECRET', 'CLAUDINARY_URL']) process.env[key] = '';
if (gatewayFixture) { process.env.RAZORPAY_KEY_ID = gatewayFixture.RAZORPAY_KEY_ID; process.env.RAZORPAY_KEY_SECRET = gatewayFixture.RAZORPAY_KEY_SECRET;
  const secretPath = new URL('../.env.webhook.local', import.meta.url);
  process.env.RAZORPAY_WEBHOOK_SECRET = gatewayFixture.RAZORPAY_WEBHOOK_SECRET || (existsSync(secretPath) ? dotenv.parse(readFileSync(secretPath)).RAZORPAY_WEBHOOK_SECRET : '') || '';
}
const { connectDB, disconnectDB } = await import('../config/db.js');
await connectDB();
const { app } = await import('../server.js');
const { seedData } = await import('../utils/seeder.js');
await seedData({ demo: true });
for (const name of ['category', 'product', 'media', 'options', 'content', 'serviceArea']) {
  const module = await import(`../services/${name}Migration.js`);
  await module[`${name}Migration`]({ apply: true });
}
const server = app.listen(5101, '127.0.0.1');
await new Promise(resolve => server.once('listening', resolve));
process.chdir(fileURLToPath(new URL('../../client', import.meta.url)));
const { createServer } = await import('../../client/node_modules/vite/dist/node/index.js');
const viewportFixture = { name: 'isolated-acceptance-viewport', configureServer(server) {
  server.middlewares.use((req, res, next) => {
    const url = new URL(req.url, 'http://127.0.0.1:5174');
    if (url.pathname.startsWith('/api/') && existsSync('/tmp/indodhobi-acceptance-outage')) { res.statusCode = 503; res.setHeader('Content-Type', 'application/json'); return res.end(JSON.stringify({ success: false, message: 'Controlled acceptance outage' })); }
    if (url.pathname !== '/__acceptance/viewport') return next();
    const width = [390, 768, 1280].includes(Number(url.searchParams.get('width'))) ? Number(url.searchParams.get('width')) : 390;
    const route = ['/', '/book', '/pricing'].includes(url.searchParams.get('page')) ? url.searchParams.get('page') : '/';
    res.setHeader('Content-Type', 'text/html');
    res.end(`<!doctype html><html><head><meta charset="utf-8"><title>Isolated responsive acceptance</title><meta name="viewport" content="width=device-width, initial-scale=1"></head><body style="margin:12px;background:#e2e8f0;font:14px system-ui"><p>Disposable preview · viewport ${width}px · ${route}</p><nav>${[390,768,1280].map(size => `<a style="margin-right:20px" href="?width=${size}&page=${encodeURIComponent(route)}">${size}px</a>`).join('')}${['/','/book','/pricing'].map(page => `<a style="margin-right:20px" href="?width=${width}&page=${encodeURIComponent(page)}">${page}</a>`).join('')}</nav><iframe title="Responsive website" src="${route}" width="${width}" height="900" style="display:block;border:0;margin-top:12px;background:white"></iframe></body></html>`);
  });
} };
const vite = await createServer({ plugins: [viewportFixture], cacheDir: '/tmp/indodhobi-acceptance-vite', root: fileURLToPath(new URL('../../client', import.meta.url)), configFile: fileURLToPath(new URL('../../client/vite.config.js', import.meta.url)), server: { host: '127.0.0.1', port: 5174, strictPort: true } });
await vite.listen();
console.log('Disposable browser acceptance site ready at http://127.0.0.1:5174');
console.log('Fixture admin: admin@indodhobi.com / admin123. Fixture customer: customer@indodhobi.com / password123.');
let closing = false;
async function close() {
  if (closing) return; closing = true;
  await vite.close(); await new Promise(resolve => server.close(resolve)); await disconnectDB(); process.exit(0);
}
process.on('SIGINT', close); process.on('SIGTERM', close);
