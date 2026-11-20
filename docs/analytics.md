# Website analytics

First-party visitor, behaviour, cart and conversion tracking. Data is stored in the project's MongoDB
(`analyticsevents`, `analyticssessions`, `analyticsvisitors`); no third-party account is required.
Reports: **Admin → Website Analytics** (Visitors, Behaviour, Cart & Conversion, Journeys, Retention, Live).

## How it works

| Piece | File |
|---|---|
| Event names (shared contract) | `shared/analyticsEvents.mjs` |
| Browser tracker (ids, sessions, batching, screen time, click autocapture) | `client/src/services/analytics.js` |
| Route views + sign-in linking | `client/src/components/AnalyticsTracker.jsx` |
| Bag add/remove diffing | `client/src/services/cartAnalytics.mjs`, `OrderBookingContext.jsx` |
| Garment impressions (≥60% visible for 1s) | `client/src/hooks/useProductImpression.js` |
| Search, filter, checkout steps, payment events | `client/src/pages/BookingPage.jsx` |
| Ingestion (validation, bot filter, PII scrubbing, rollups) | `server/services/analytics.js` |
| Reports | `server/services/analyticsReport.js` |
| API | `POST /api/analytics/collect` (public), `GET /api/admin/analytics/report?days=30`, `GET /api/admin/analytics/live` |

- **Visitor** = one browser (random id in localStorage). **Session** ends after 30 minutes of inactivity
  or when a new `utm_*` campaign link is opened.
- `order_placed` and `payment_captured` are recorded **by the API** (authoritative, cannot be faked from
  the browser) and joined to the browsing session through the `X-Analytics-Visitor/Session` headers the
  website sends with every API call. Razorpay webhooks are joined via the order id.
- Bag abandonment = sessions that added to the bag but placed no order. Checkout abandonment = sessions
  that moved past step 1 of `/book` but placed no order.
- Staff screens (`/admin`, `/rider`) are not tracked, and staff accounts are never linked to visitors.

## Privacy

No names, phone numbers, emails, addresses, form values, URL query strings or custom garment
descriptions are collected; the server additionally drops any property whose name looks personal.
Referrers are stored as host names only. Global Privacy Control is honoured, and visitors can opt out with
`window.indodhobiAnalytics.optOut()`. Update the privacy policy to mention first-party usage analytics.

## Configuration (optional)

| Variable | Where | Default |
|---|---|---|
| `ANALYTICS_RETENTION_DAYS` | server | `400` — raw events expire after this; sessions/visitors are kept |
| `ANALYTICS_TIMEZONE` | server | `Asia/Kolkata` — day boundaries in reports |
| `VITE_ANALYTICS_DISABLED=true` | client | tracking on |

## Adding an event

1. Add the name to `ANALYTICS_EVENTS` in `shared/analyticsEvents.mjs` (the API rejects unknown names).
2. Call `track(EVENTS.YOUR_EVENT, { ...nonPersonalProps })` from the client.
3. Add a buttons-only label with `data-track="Label"`, or exclude an element from click capture with `data-track-ignore`.
