import mongoose from 'mongoose';
export function orderPage(req, filter) {
  const limit = req.query.limit === undefined ? 50 : Number(req.query.limit);
  if (!Number.isInteger(limit) || limit < 1 || limit > 100) throw Object.assign(new Error('Page size must be between 1 and 100.'), { statusCode: 400 });
  if (req.query.cursor !== undefined) {
    if (typeof req.query.cursor !== 'string' || !mongoose.isObjectIdOrHexString(req.query.cursor)) throw Object.assign(new Error('Invalid page cursor.'), { statusCode: 400 });
    filter._id = { $lt: new mongoose.Types.ObjectId(req.query.cursor) };
  }
  return limit;
}
export function pageResult(rows, limit) {
  const hasMore = rows.length > limit;
  if (hasMore) rows.pop();
  return { hasMore, nextCursor: hasMore ? String(rows.at(-1)._id) : null };
}
