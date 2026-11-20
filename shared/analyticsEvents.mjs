// Single source of truth for analytics event names, shared by the website tracker and the API.
// The API rejects any event name not listed here, so add new events here first.

export const ANALYTICS_EVENTS = Object.freeze({
  // Visitor & session lifecycle
  SESSION_START: 'session_start',
  PAGE_VIEW: 'page_view',
  SCREEN_TIME: 'screen_time', // emitted when a screen is left: engaged time + scroll depth
  IDENTIFY: 'identify', // anonymous visitor became a known (logged-in) user
  LOGOUT: 'logout',

  // Behaviour
  CLICK: 'click',
  SEARCH: 'search',
  FILTER: 'filter',
  PRODUCT_VIEW: 'product_view', // garment card seen on screen for ≥1s
  PRODUCT_OPTION_CHANGE: 'product_option_change', // service / finish changed on a garment

  // Cart
  ADD_TO_CART: 'add_to_cart',
  REMOVE_FROM_CART: 'remove_from_cart',
  CART_CLEARED: 'cart_cleared',
  COUPON_APPLIED: 'coupon_applied',
  COUPON_REMOVED: 'coupon_removed',

  // Checkout & conversion
  BEGIN_CHECKOUT: 'begin_checkout',
  CHECKOUT_STEP: 'checkout_step',
  CHECKOUT_LOGIN_REQUIRED: 'checkout_login_required',
  PLACE_ORDER_CLICK: 'place_order_click',
  ORDER_FAILED: 'order_failed',
  PAYMENT_OPENED: 'payment_opened',
  PAYMENT_DISMISSED: 'payment_dismissed',
  PURCHASE: 'purchase', // client-side confirmation that the order was created

  // Server-only (authoritative; never accepted from the browser)
  ORDER_PLACED: 'order_placed',
  PAYMENT_CAPTURED: 'payment_captured',
});

export const SERVER_ONLY_EVENTS = new Set([ANALYTICS_EVENTS.ORDER_PLACED, ANALYTICS_EVENTS.PAYMENT_CAPTURED]);
export const CLIENT_EVENTS = new Set(Object.values(ANALYTICS_EVENTS).filter(name => !SERVER_ONLY_EVENTS.has(name)));

// Request headers the website sends with every API call so server-side events
// (orders, payments) can be joined to the anonymous browsing session.
export const VISITOR_HEADER = 'x-analytics-visitor';
export const SESSION_HEADER = 'x-analytics-session';

// A session ends after 30 minutes without activity (same default as GA4).
export const SESSION_TIMEOUT_MS = 30 * 60 * 1000;

export const ANALYTICS_ID_PATTERN = /^[A-Za-z0-9_-]{8,64}$/;
