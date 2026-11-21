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

## Saved bag & abandoned-bag reminders

- Signed-in customers' bags are saved on the server (`GET/PUT /api/bag`, model `SavedBag`), so a bag
  survives closed tabs and follows the customer across devices. On sign-in an empty browser bag is
  filled from the server (`bag_restored` event); otherwise the browser bag wins and is saved.
- A job (`server/services/bagRecovery.js`, every 10 minutes) sends **one** reminder per bag once it has been
  idle for the reminder delay, for active customer accounts only, and never for bags older than 7 days or
  when the customer has ordered since. The bag is claimed before sending, so several servers never double-send.
- The in-app reminder opens `/book?utm_source=bag_reminder&utm_medium=in_app&utm_campaign=abandoned_bag`,
  so the reminder appears as its own campaign in the traffic reports.
- Placing an order empties the saved bag. A reminder followed by an order within 7 days counts as
  **recovered** (`BagReminderLog`), shown under **Website Analytics → Cart & Conversion**.

| Variable | Default |
|---|---|
| `BAG_REMINDER_ENABLED` | `true` (`false` turns reminders off) |
| `BAG_REMINDER_DELAY_MINUTES` | `120` (min 15) |
| `BAG_REMINDER_CHANNELS` | `in_app` (comma-separated) |

**Adding WhatsApp/SMS/email later:** call `registerBagReminderSender('whatsapp', async ({ user, bag, copy, link }) => …)`
at server start (it should resolve `true` once delivered), then set `BAG_REMINDER_CHANNELS=in_app,whatsapp`.
If every channel fails, the reminder is retried on the next run.
