# T02–T15 acceptance results

Verified on 17 October 2026. Implementation and local acceptance are complete. The existing public layout, styling and image framing are retained; the content sources now use their designated database owners. These results cover local code and the migrated existing installation, not a production deployment.

## Final automated run

| Check | Result |
| --- | --- |
| Connectivity, readiness, API recovery and saved drafts | 19 passed |
| Shared catalog/storage contracts | 6 passed |
| Resource cache and basket reconciliation | 8 passed |
| Server administration, content, media, pricing, booking, coverage, migration and payment boundaries | 87 passed |
| Total, `npm run test:acceptance` | **120 passed; zero failed, skipped or cancelled** |
| `npm run build:client` | Passed |
| `git diff --check` | Passed |

The production build still reports the existing large invoice bundle warning (approximately 606 kB before gzip). It does not prevent the build. The broad legacy `npm test` scripts were not run because they include external-provider assumptions; the isolated acceptance command is the supported repeatable check for this work.

## T02 acceptance case coverage

The automated checks exercise authenticated admin APIs, persisted records and public projections. Targeted browser checks below additionally verify the UI. This is not a claim that every admin field was manually clicked.

| Case | Verified behavior | Principal automated coverage |
| --- | --- | --- |
| 1. Categories | Rename/order/archive retain IDs and product links; inactive categories are unavailable publicly and at checkout. | `server/tests/categories.test.mjs`, `booking.test.mjs` |
| 2. Product details | Saved names, descriptions, supported options, media and rates reach public catalog consumers; baskets reconcile updated records. | `server/tests/products.test.mjs`, `client/tests/basketReconciliation.test.mjs` |
| 3. Independent images | Towel and bedsheet retain independent asset references; replacing/removing one does not change the other. | `server/tests/media.test.mjs`, `acceptance.test.mjs` |
| 4. Removal/upload failure | Explicit null stays removed; invalid files and provider failure preserve previous images and return failure. | `server/tests/media.test.mjs`, `globalContent.test.mjs` |
| 5. Zero amounts | Zero GST, fees, prices and coupon caps remain valid; client/server minor-unit arithmetic agrees. | `server/tests/pricing.test.mjs`, `booking.test.mjs`, `tests/catalogContract.test.mjs` |
| 6. Empty availability | Empty/inactive services, finishes, preferences and slots are respected; reads do not recreate defaults. | `server/tests/bookContent.test.mjs`, `pricing.test.mjs`, `websiteMigration.test.mjs` |
| 7. Screenshot content | Home hero, basket, journey, services, comparison, testimonials and hubs resolve CMS/catalog/media/coverage owners; Book photos resolve garment media. | `server/tests/homeContent.test.mjs`, `bookContent.test.mjs`, `serviceAreas.test.mjs` |
| 8. Rates/history | Promotional From prices derive from eligible catalog combinations; accepted orders and invoice identity/charges retain snapshots. | `server/tests/homeContent.test.mjs`, `booking.test.mjs`, `revisions.test.mjs` |
| 9. Coverage | Exact active pincodes govern checker and booking; descriptive ranges grant no coverage; overlapping active assignments are rejected. | `server/tests/serviceAreas.test.mjs`, `booking.test.mjs` |
| 10. Book | Copy/media/options use their owners; custom template remains independent of category/search filters. | `server/tests/bookContent.test.mjs` |
| 11. Concurrency/access | Stale CMS saves conflict; public projections exclude private/provider metadata; unauthorized writes and inactive catalog reads fail. | `server/tests/content.test.mjs`, `categories.test.mjs`, `acceptance.test.mjs` |
| 12. Repeat/outage | Migration repeats change nothing, preserve admin edits/intentional empty values and support guarded rollback; outages retain recoverable baskets. | `server/tests/websiteMigration.test.mjs`, `client/tests/apiRecovery.test.mjs`, `resourceCache.test.mjs`, `bookingDraft.test.mjs` |

Additional final regressions verify that concurrent requests cannot both book the last slot, stale server quote fingerprints fail before order creation, cancelled/COD/mismatched sessions cannot verify online payment, gateway failures do not fabricate sessions, and only exact cryptographic payment signatures are accepted. URL-only Cloudinary configuration is parsed explicitly and invalid configuration fails closed.

## Browser verification

Admin mutation checks ran against a disposable in-memory replica set on ports 5101/5174, with live upload/payment credentials disabled. Existing-installation checks used the normal site on 5173 and API on 5001. Responsive checks used an isolated wrapper with actual 390 px and 768 px iframe viewports; they exercise browser responsive layout, not physical device hardware.

| Browser check | Observed result | Screenshot filename |
| --- | --- | --- |
| Admin rate edit with an already open Book tab | Shirt unit total updated from ₹50 to ₹60 without reload; old/new price review and acknowledgement appeared. | `t13-basket-review.png` |
| Admin Home publication | Edited hero eyebrow appeared publicly; fixture baseline restored afterward. | `t15-admin-home-publish.png` |
| Admin Book publication | Edited Select Clothes heading appeared as Choose Clothes on mobile and tablet. | `t15-mobile-book.png`, `t15-tablet-book.png` |
| Remove towel image | Towel used the neutral placeholder; bedsheet kept its image. | `t15-removed-image.png` |
| Mobile API outage/recovery | Retry state retained the selected towel and saved basket; recovery restored the same one-item ₹103.95 total. | `t15-mobile-outage.png`, `t15-tablet-book.png` |
| Mobile Home and Book; tablet Book | Existing styling and responsive card arrangements remained usable. | `t15-mobile-home.png`, `t15-mobile-book.png`, `t15-tablet-book.png` |
| Existing-installation Home and Book | Original artwork, typography, card framing and booking layout remained; final Book page loaded without captured reference/hook runtime errors. | `t14-home-migrated.png`, `t15-book-final.png` |

Screenshots are saved in `/Users/shivamchowdhry/Documents/ChatGPT/indo/`. Their test-only content changes are not changes to the existing installation's customer data.

## Existing data and migration evidence

- Existing garment IDs were preserved: 17 stored garments, including 16 active records; six categories, 27 media assets and 12 content pages are present.
- Consolidated preflight/repeat completed with no errors and zero changes in every migration step.
- Relevant final journals: `.local-backups/website-1792258990247-22242.json` and `.local-backups/website-1792259710874-24001.json`. Earlier task-specific migrations also retained their individual backups. Journals are private and excluded from version control.
- One administrator product (`6ad121013799aca0355a1d14`) has no known original artwork. Its neutral placeholder is intentional until an administrator selects an image; no unrelated photo was assigned.
- Health reported ready with the database connected. Catalog, public configuration, Home content, Book content and service-area endpoints returned HTTP 200; data responses included content revisions.
- Test mutations, orders and failure injection were isolated from the existing customer database. The existing installation received the documented backed-up migrations, not browser-test edits.

## Deployment verification still required

Real Cloudinary uploads and Razorpay transactions were not performed. Upload success/failure used a controlled provider adapter; payment verification exercised cryptographic and failure boundaries. Provider credentials were detected without exposing their values. Verify the intended live accounts and their end-to-end provider behavior during deployment commissioning.

Checkout now requires MongoDB Atlas or a replica set because capacity checking and order insertion share a transaction. The acceptance database uses an isolated single-member replica set. An online gateway session prepared before a conflicting database change can remain unused; it is not treated as a paid or successful booking.

See [the administrator guide](website-administration.md) for publishing, refresh timing, backup/rollback and fresh-installation instructions. No deployment, commit or push was performed by this implementation loop.
