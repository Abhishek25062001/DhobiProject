// Exposes ONLY verified webhook POSTs to the isolated acceptance API on 5101.
import http from 'node:http';
import crypto from 'node:crypto';
import fs from 'node:fs';
import dotenv from 'dotenv';
const env = dotenv.parse(fs.readFileSync(new URL('../.env', import.meta.url)));
if (!env.RAZORPAY_KEY_ID?.startsWith('rzp_test_')) throw new Error('Test keys required.');
const secret = env.RAZORPAY_WEBHOOK_SECRET || dotenv.parse(fs.readFileSync(new URL('../.env.webhook.local', import.meta.url))).RAZORPAY_WEBHOOK_SECRET;
if (!secret) throw new Error('Webhook secret required.');
const route = '/api/orders/webhook/razorpay';
const server = http.createServer(async (req, res) => {
  if (req.method !== 'POST' || req.url !== route) { res.writeHead(404); return res.end(); }
  let size = 0; const chunks = [];
  try {
    for await (const chunk of req) { size += chunk.length; if (size > 1024*1024) { res.writeHead(413); res.end(); return; } chunks.push(chunk); }
    const body = Buffer.concat(chunks), signature = req.headers['x-razorpay-signature'];
    if (typeof signature !== 'string' || !/^[a-f0-9]{64}$/i.test(signature) || !crypto.timingSafeEqual(crypto.createHmac('sha256',secret).update(body).digest(),Buffer.from(signature,'hex'))) { res.writeHead(400); return res.end('Invalid signature'); }
    const response = await fetch('http://127.0.0.1:5101'+route,{method:'POST',headers:{'Content-Type':'application/json','X-Razorpay-Signature':signature},body,signal:AbortSignal.timeout(20000)});
    const event = JSON.parse(body.toString('utf8')).event;
    console.log(JSON.stringify({at:new Date().toISOString(),event,status:response.status}));
    res.writeHead(response.status,{'Content-Type':'application/json'});res.end(await response.text());
  } catch { if(!res.headersSent)res.writeHead(503);res.end(); }
});
server.requestTimeout = 10000;server.headersTimeout = 10000;
server.listen(5102,'127.0.0.1',()=>console.log('Test-only signed webhook relay ready on 127.0.0.1:5102'));
for(const signal of ['SIGINT','SIGTERM'])process.on(signal,()=>server.close(()=>process.exit()));
