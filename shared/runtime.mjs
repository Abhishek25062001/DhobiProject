export const DEFAULT_API_PORT = 5001;

export function apiPort(value = DEFAULT_API_PORT) {
  const port = Number(value);
  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new Error('PORT must be an integer between 1 and 65535.');
  }
  return port;
}

export function developmentApiTarget(port, configuredUrl) {
  const expectedPort = apiPort(port);
  const target = new URL(configuredUrl || `http://localhost:${expectedPort}`);
  if (!['http:', 'https:'].includes(target.protocol) || target.username || target.password || target.pathname !== '/' || target.search || target.hash) {
    throw new Error('VITE_API_URL must be an HTTP(S) origin without credentials, a path, or query parameters.');
  }
  if (['localhost', '127.0.0.1', '[::1]'].includes(target.hostname)) {
    const targetPort = Number(target.port || (target.protocol === 'https:' ? 443 : 80));
    if (targetPort !== expectedPort) {
      throw new Error(`API port mismatch: server PORT is ${expectedPort}, but VITE_API_URL uses ${targetPort}. Update server/.env or client/.env so they agree.`);
    }
  }
  return target.origin;
}

export async function waitForApi(target, { timeoutMs = 60000, intervalMs = 500 } = {}) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    try {
      const response = await fetch(`${target}/api/health`, {
        signal: AbortSignal.timeout(Math.min(1500, Math.max(1, deadline - Date.now()))),
      });
      const health = await response.json();
      if (response.ok && health.service === 'IndoDhobi API' && health.status === 'ok' && health.dbState === 'CONNECTED' && health.ready !== false) return;
    } catch {
      // The API may still be starting or reconnecting to MongoDB.
    }
    await new Promise(resolve => setTimeout(resolve, Math.min(intervalMs, Math.max(0, deadline - Date.now()))));
  }
  throw new Error(`API is not ready at ${target}. Start both apps with npm run dev from the project root and check the backend database/startup error. No frontend server was started.`);
}
