import { GARMENT_PRICE_KEYS } from '../../../shared/catalogContract.mjs';

function pause(milliseconds, signal) {
  return new Promise((resolve, reject) => {
    const abort = () => {
      clearTimeout(timer);
      reject(new DOMException('Request cancelled', 'AbortError'));
    };
    const timer = setTimeout(() => {
      signal?.removeEventListener('abort', abort);
      resolve();
    }, milliseconds);
    if (signal?.aborted) abort();
    else signal?.addEventListener('abort', abort, { once: true });
  });
}

// Retry reads only. Orders, payments, uploads and other writes must never be replayed.
export async function readWithRetry(client, url, options = {}, delays = [500, 1000]) {
  for (let attempt = 0; ; attempt += 1) {
    try {
      return await client.get(url, { timeout: 5000, ...options });
    } catch (error) {
      const cancelled = options.signal?.aborted || error.code === 'ERR_CANCELED' || error.name === 'AbortError';
      const transient = error.response
        ? [502, 503, 504].includes(error.response.status)
        : ['ERR_NETWORK', 'ECONNABORTED', 'ETIMEDOUT', 'ECONNREFUSED', 'ECONNRESET'].includes(error.code);
      if (cancelled || !transient || attempt >= delays.length) throw error;
      await pause(delays[attempt], options.signal);
    }
  }
}

export function requireCatalog(payload) {
  if (!payload?.success || !Array.isArray(payload.data) || payload.data.some(garment =>
    !garment?._id || typeof garment.name !== 'string' || !GARMENT_PRICE_KEYS.every(key => Number.isFinite(garment.pricing?.[key]) && garment.pricing[key] >= 0)
  )) throw new Error('The garment catalog could not be loaded. Please try again.');
  return payload;
}

export function requirePublicConfig(payload) {
  const fields = ['freeDeliveryThreshold', 'deliveryFee', 'expressSurcharge', 'gstPercentage', 'minStandardTurnaroundHours'];
  if (!payload?.success || !payload.config || !Array.isArray(payload.slots) ||
    !fields.every(key => Number.isFinite(payload.config[key]) && payload.config[key] >= 0) ||
    payload.config.gstPercentage > 100 ||
    !['detergentOptions', 'packagingOptions', 'serviceTypes', 'ironingTiers'].every(key => Array.isArray(payload.config[key]))) {
    throw new Error('Booking information could not be loaded. Please try again.');
  }
  return payload;
}
