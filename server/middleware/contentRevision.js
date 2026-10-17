import { createHash } from 'node:crypto';

export default function contentRevision(req, res, next) {
  if (req.method !== 'GET' || !/^\/api\/(?:content\/|catalog\/|config\/public$|service-areas(?:\/|$))/.test(req.path)) return next();
  const json = res.json.bind(res);
  res.json = body => {
    if (body?.success) {
      const revision = createHash('sha256').update(JSON.stringify(body)).digest('hex');
      res.set('Cache-Control', 'no-store');
      return json({ ...body, revision });
    }
    return json(body);
  };
  next();
}
