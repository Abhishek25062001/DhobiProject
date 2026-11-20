import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import { readSessionCookie } from '../middleware/sessionMiddleware.js';
import { ingestBatch } from '../services/analytics.js';
import { buildReport, buildLive } from '../services/analyticsReport.js';

// Attach the signed-in customer when there is a valid session, without requiring one.
// Staff (admin/rider) accounts are never linked to visitor data.
async function optionalCustomerId(req) {
  let token = readSessionCookie(req);
  if (req.headers.authorization?.startsWith('Bearer ')) token = req.headers.authorization.slice(7);
  if (!token) return null;
  let id;
  try { id = jwt.verify(token, process.env.JWT_SECRET)?.id; } catch { return null; }
  if (!id) return null;
  const user = await User.findById(id, { role: 1 }).lean().catch(() => null);
  return user && !['admin', 'rider'].includes(user.role) ? id : null;
}

// @desc    Receive a batch of website analytics events
// @route   POST /api/analytics/collect
// @access  Public (anonymous visitors included)
export const collectEvents = async (req, res) => {
  try {
    const result = await ingestBatch(req.body, { userAgent: req.get('user-agent'), userId: await optionalCustomerId(req) });
    return res.status(202).json({ success: true, ...result });
  } catch (error) {
    if (!error.statusCode) console.error(JSON.stringify({ event: 'analytics_collect_failed', error: error.message, requestId: req.requestId }));
    return res.status(error.statusCode || 500).json({ success: false, message: error.statusCode ? error.message : 'Analytics could not be recorded.' });
  }
};

// @desc    Visitor, behaviour, cart and conversion report for a date range
// @route   GET /api/admin/analytics/report?days=30 | ?from=ISO&to=ISO
// @access  Admin
export const getAnalyticsReport = async (req, res) => {
  try {
    return res.set('Cache-Control', 'no-store').json({ success: true, report: await buildReport(req.query) });
  } catch (error) {
    if (!error.statusCode) console.error('[Analytics Report Error]:', error);
    return res.status(error.statusCode || 500).json({ success: false, message: error.statusCode ? error.message : 'The analytics report could not be built.' });
  }
};

// @desc    Visitors active in the last 5 minutes and the latest events
// @route   GET /api/admin/analytics/live
// @access  Admin
export const getAnalyticsLive = async (req, res) => {
  try {
    return res.set('Cache-Control', 'no-store').json({ success: true, live: await buildLive() });
  } catch (error) {
    console.error('[Analytics Live Error]:', error);
    return res.status(500).json({ success: false, message: 'Live analytics could not be loaded.' });
  }
};
