export const sessionCookie = 'indodhobi_session';
export function readSessionCookie(req) {
  const value = (req.headers.cookie || '').split(';').map(part => part.trim()).find(part => part.startsWith(`${sessionCookie}=`));
  return value ? value.slice(sessionCookie.length + 1) : null;
}
export function sessionTransport(allowedOrigins) {
  return (req, res, next) => {
    const cookieMode = req.headers['x-session-mode'] === 'cookie' || Boolean(readSessionCookie(req));
    if (cookieMode && !['GET', 'HEAD', 'OPTIONS'].includes(req.method)) {
      if (req.headers['x-csrf-protection'] !== '1' || (req.headers.origin && !allowedOrigins.has(req.headers.origin))) return res.status(403).json({ success: false, message: 'Session request could not be verified. Refresh and try again.' });
    }
    const json = res.json.bind(res);
    res.json = data => {
      if (cookieMode && typeof data?.token === 'string') {
        res.cookie(sessionCookie, data.token, { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax', path: '/api', maxAge: 30 * 86400000 });
        const { token, ...publicData } = data;
        return json({ ...publicData, session: true });
      }
      return json(data);
    };
    next();
  };
}
