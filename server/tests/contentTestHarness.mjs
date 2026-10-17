import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import { connectDB, disconnectDB } from '../config/db.js';

export async function contentTestHarness(t) {
  process.env.NODE_ENV = 'test';
  process.env.JWT_SECRET = 'isolated-content-test-secret';
  await connectDB();
  const { app } = await import('../server.js');
  const server = app.listen(0, '127.0.0.1');
  await new Promise(resolve => server.once('listening', resolve));
  t.after(async () => {
    await new Promise(resolve => server.close(resolve));
    await disconnectDB();
  });
  const users = {};
  for (const role of ['admin', 'customer']) {
    const user = await User.create({ name: `Test ${role}`, email: `${role}@example.test`, phone: role === 'admin' ? '9990000001' : '9990000002', password: 'isolated-test-password', role });
    users[role] = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: '1h' });
  }
  async function request(path, { method = 'GET', body, role } = {}) {
    const response = await fetch(`http://127.0.0.1:${server.address().port}/api${path}`, {
      method, headers: { 'Content-Type': 'application/json', ...(role ? { Authorization: `Bearer ${users[role]}` } : {}) },
      ...(body ? { body: JSON.stringify(body) } : {}),
    });
    return { status: response.status, body: await response.json() };
  }
  return { request, users };
}

export const testPrices = { washOnly: 35, standardSteamIron: 15, crispStarchPress: 25, delicatePress: 30, dryClean: 90 };
