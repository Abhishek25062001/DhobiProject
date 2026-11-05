# Homepage scroll-animation tasks

Created: 5 November 2026

## Objective

Add subtle scroll-triggered entrances to the existing IndoDhobi homepage while preserving its layout, content, accessibility, and booking functionality. All tasks below are implemented and verified locally. The existing layout and booking behavior are preserved.

## Implementation boundaries

- Keep the current typography, colors, spacing, responsive grids, and content order.
- Use native `IntersectionObserver` and scoped CSS; no additional animation library.
- Apply motion to existing elements through refs or attributes without adding layout-changing wrappers.
- Use opacity and small vertical transforms. Play entrances once per mounted page visit, then stop observing revealed elements.
- Desktop starting values: 14px movement, 450–550ms duration, approximately 60ms stagger increments capped at 180ms.
- Mobile starting values: 8px movement, 300–400ms duration, and little or no stagger. Reveal each card when it enters view rather than revealing a whole vertical list together.
- Keep content visible by default; enable pending animation states only after successful initialization. Content already visible when initialized should remain visible.
- Respect reduced-motion preferences and make keyboard-focused content immediately visible.
- Keep hero interactions, basket controls, order tracking, navigation, checkout, authentication, admin and rider screens outside the new animation scope.
- Preserve normal scrolling. Do not add parallax, pinned sections, scroll interception, or repeated entrances on every scroll.
- Preserve admin-managed additions, visibility, ordering, and content refreshes. No schema changes or database migration are required.

## Task checklist

- [x] **SA01 — Audit the codebase and existing motion.**
  Reviewed the homepage composition, shared application structure, content loading, responsive styles, and existing journey animation. Checked the running homepage at 1440px, 768px, and 390px with no horizontal overflow. Confirmed reduced-motion handling and the journey's existing entrance and two-cycle connector animation. No animation implementation changes were made during this audit.

- [x] **SA02 — Build the reusable scroll-reveal foundation.**
  Add a reusable `useScrollReveal` hook and homepage-scoped motion stylesheet. Register opted-in elements with a shared observer, support bounded delays, reveal once, and clean up on unmount. Handle React Strict Mode without duplicate observers or animation restarts. Avoid continuous scroll handlers and permanent `will-change` styling.
  **Depends on:** SA01.
  **Done when:** A representative element reveals once, retains its original layout, and unregisters correctly after reveal or unmount.

- [x] **SA03 — Add accessibility and failure handling.**
  Keep content readable when observation is unavailable or initialization fails. Disable motion for reduced-motion preferences, including preference changes while the page is open. Reveal a target immediately on keyboard focus and ensure printed content remains visible.
  **Depends on:** SA02.
  **Done when:** Unsupported-observer, reduced-motion, keyboard-focus, and print checks leave all relevant content visible and usable.

- [x] **SA04 — Animate section headings.**
  Add a gentle fade and upward entrance to the services, comparison, testimonials, and service-area heading groups. Keep the hero headline and primary booking controls immediately available.
  **Depends on:** SA02, SA03.
  **Done when:** Each heading animates once without moving its section's layout or delaying an associated action.

- [x] **SA05 — Animate service cards.**
  Add individual entrances to service cards with a short stagger across cards entering together. Reduce or remove delays when cards stack on mobile. Keep prices, images, badges, and booking links intact.
  **Depends on:** SA04.
  **Done when:** Desktop rows enter in a restrained sequence, mobile cards trigger individually, and every booking link remains usable.

- [x] **SA06 — Coordinate the existing journey animation.**
  Integrate the journey with the shared motion approach. Preserve its illustrations, numbered stages, and dotted connector. Replace or adapt the existing stage trigger so new and old entrance effects do not run on the same element. Keep the connector animation finite and reduced-motion compatible.
  **Depends on:** SA02, SA03.
  **Done when:** Each stage enters once when visible, existing illustration transforms remain correct, and no duplicate entrance or endless connector motion is introduced.

- [x] **SA07 — Reveal the comparison table as one unit.**
  Use a simple fade for the complete table container. Preserve semantic table markup, its focusable scrolling region, and horizontal scrolling on narrow screens. Do not animate individual rows or columns.
  **Depends on:** SA04.
  **Done when:** All columns remain aligned and both touch and keyboard scrolling work before, during, and after the entrance.

- [x] **SA08 — Animate testimonials and service-area cards.**
  Apply the shared card entrance to reviews and coverage cards, with bounded desktop staggering and individual mobile triggers. Preserve review content, coverage details, and the pincode-check action.
  **Depends on:** SA05.
  **Done when:** Cards animate consistently with the service cards and coverage content arriving later is handled correctly.

- [x] **SA09 — Verify dynamic content and navigation lifecycle.**
  Check delayed content, service-area loading, admin reordering, hidden or removed sections, inserted items, content refreshes, route changes, and returning to the homepage. Register newly mounted targets without replaying unchanged content. Use mocked responses or an isolated fixture for admin-content checks.
  **Depends on:** SA04–SA08.
  **Done when:** No content remains hidden, removed targets leave no observers behind, unchanged content does not flash on refresh, and navigation produces no duplicate motion or errors.

- [x] **SA10 — Verify responsive layout and existing interactions.**
  Review 1440px, 1024px, 768px, 390px, and 320px layouts. Check normal and fast scrolling, keyboard navigation, reduced motion, the before/after slider, service selection, quantity controls, basket totals, and navigation into booking. Compare settled layouts against the current design. Do not submit real orders or payments for these checks.
  **Depends on:** SA09.
  **Done when:** No new overflow or layout shifts are introduced, focus remains visible, and the existing customer interactions behave as before.

- [x] **SA11 — Complete build verification and record evidence.**
  Run `npm run build:client` and `git diff --check`. Run focused existing checks if implementation touches their behavior; avoid unrelated test expansion. Record screenshots or a short motion preview, the checks actually performed, and any remaining limitations in this file.
  **Depends on:** SA10.
  **Done when:** Build and relevant checks pass, browser errors are resolved, and all completed tasks have supporting evidence.

## Primary implementation locations

| File | Responsibility |
| --- | --- |
| `client/src/pages/HomePage.jsx` | Homepage assembly and content lifecycle |
| `client/src/components/home/HomePageSections.jsx` | Headings, service cards, table, reviews, and service-area cards |
| `client/src/components/home/LaundryJourney.jsx` | Existing observer and journey stage entrances |
| `client/src/components/home/LaundryHero.css` | Existing journey animation and illustration transforms |
| `client/src/components/home/HomePageTheme.css` | Homepage styling and existing reduced-motion rules |
| `client/src/hooks/useScrollReveal.js` | Shared reveal behavior and cleanup |
| `client/src/components/home/HomeScrollMotion.css` | Scoped entrance styles and responsive timing |

## Completion evidence

- **SA01:** Code review and read-only browser inspection completed on 5 November 2026. Existing homepage motion and responsive layouts documented above.
- **SA02:** Added `useScrollReveal` with one intersection observer and one child-list observer per mounted homepage. Browser instrumentation confirmed completed targets are unobserved, removed nodes leave no observer registrations, and route changes/Strict Mode do not duplicate active observers. Pending content retains its normal visible styling.
- **SA03:** Verified visible content with `IntersectionObserver` missing, its constructor failing, and target registration failing. Verified immediate keyboard focus, live reduced-motion changes, print styles, and `beforeprint` behavior. Changing back to normal motion does not replay finished targets.
- **SA04–SA08:** Implemented heading/card entrances and a whole-table fade. Desktop entrances use 14px/500ms with row-based delays capped at 180ms; mobile uses 8px/350ms with no stagger. The journey shares the observer, uses individual stage entrances, and retains a two-cycle connector. Removed its superseded trigger and persistent `will-change`. Confirmed distinct entrance events, expected timing, and no replay when scrolling back.
- **SA09:** Mocked public API responses verified delayed service-area loading, changed copy, reordered sections, a removed comparison section, inserted reviews, and unchanged refreshes. Existing reviews retained their completed state; a new review entered once. All fixture changes were browser-local; no content/database writes occurred.
- **SA10:** Compared bounding-box measurements, overall document height, and scroll width against the original at 1440, 1024, 768, 390, and 320px. Settled measurements matched within 1px and there was no horizontal page overflow. Verified keyboard table scrolling, the before/after slider's Home/End controls, service selection, quantity controls, basket arithmetic, refresh persistence, and booking handoff. Found and fixed focus-induced movement during a pointer press; active entrances pause during presses and complete after click handling. Deterministic early-animation checks passed for mouse, touch, and cancelled presses. Keyboard focus still reveals immediately.
- **SA11:** Production build, JavaScript syntax check, and whitespace check passed. All 13 existing booking-draft, basket-reconciliation, and resource-cache tests passed. Completed browser scenarios reported no application page errors. Desktop/mobile screenshots and a 4.8-second recording of the actual service-card entrance were reviewed.

### Verification commands

```sh
npm run build:client
node --check client/src/hooks/useScrollReveal.js
node --test client/tests/bookingDraft.test.mjs client/tests/basketReconciliation.test.mjs client/tests/resourceCache.test.mjs
git diff --check
```

### Local review artifacts

- [Animation recording](/Users/shivamchowdhry/Documents/ChatGPT/indo/scroll-animation-preview.mp4)
- [Desktop service cards](/Users/shivamchowdhry/Documents/ChatGPT/indo/scroll-services-desktop.png)
- [Mobile journey](/Users/shivamchowdhry/Documents/ChatGPT/indo/scroll-journey-mobile.png)
- [Full desktop layout](/Users/shivamchowdhry/Documents/ChatGPT/indo/scroll-after-1440.png)
- [Full mobile layout](/Users/shivamchowdhry/Documents/ChatGPT/indo/scroll-after-390.png)

### Scope of verification

Browser checks used installed Chrome with desktop/mobile viewport and touch emulation. They are not a claim of testing every browser or physical device. The existing large deferred invoice-bundle warning remains; no new build errors were introduced. No orders or payments were submitted. Changes are local and have not been deployed.
