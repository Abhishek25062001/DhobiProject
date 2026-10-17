# Website content ownership and data contract

T02 establishes where website data belongs and how the remaining implementation tasks must connect it. Keep the current layout, CSS, typography, image framing, responsive behavior and booking flow. Replace the sources of content inside those components.

This document preserves the T02 baseline and implementation contract. T02 itself only shared existing catalog price keys and order selection codes between the database schemas and website validator. The subsequent T03–T15 work is now complete; see [task progress](implementation-tasks.md), [administrator instructions](website-administration.md) and [acceptance results](acceptance-results.md) for the implemented behavior and verification. Statements about the original sources below describe the pre-migration baseline.

## Original T02 baseline

Checked against source and the local public API on 17 October 2026:

- The catalog returns 16 garments, including one custom-item template. All 16 currently have an empty `imageUrl`. The repeated photographs therefore come from frontend fallback artwork.
- Garment categories are stored as names from a four-value enum. The separate Category collection also contains Kids, Household & Bedding and an additional administrator-created category. Editing that collection does not update the enum or the fixed filters.
- Home basket, Book cards and the Pricing table fetch garment prices. The homepage service cards independently contain ₹30, ₹45, ₹25 and ₹90 promotional prices.
- Public configuration currently has 0% GST and a 24-hour minimum turnaround. Pricing still advertises 5% GST; several marketing sections say 48 hours. A minimum booking interval and a customer-facing delivery promise are different fields and must not be substituted for one another.
- Products already have an admin image upload and Remove Image action. Saving the product persists the URL, but removing it allows the website to show the hard-coded fallback again. There is no shared media library or homepage/Book content editor.

## Ownership map

“Owner” means the only record allowed to supply that value. A public response may include a read-only projection of another owner's data; it must not create a second editable copy.

| Website content | Current source and gap | Target owner and admin control | Task |
| --- | --- | --- | --- |
| Category names, short labels, order, visibility | `server/models/Category.js`; fixed names in Garment, Book, Pricing and `homepageCatalog.js` | Category; Products → Categories | T03 |
| Garment name, short name, description, ordering, availability | Garment has name/status; short labels inferred from names; description absent | Garment; Products → Garments | T04 |
| Product photo and optional gallery | `imageUrl` plus hard-coded/name-based artwork in `LaundryArtwork.jsx` and Book thumbnails | Garment references MediaAsset; Products image picker | T04, T05 |
| Prices for each garment | Five Garment pricing fields; calculation duplicated on client/server | Garment owns amounts; shared pricing function owns arithmetic | T06, T07 |
| Service and finish labels, descriptions, order and availability | PlatformConfig arrays exist; selectors still use fixed arrays | PlatformConfig; Platform → Services and Finishes | T06, T10 |
| Detergent and packaging options and charges | PlatformConfig; Book can restore fallback choices when lists are empty | PlatformConfig; Platform → Care Preferences | T06, T10 |
| Delivery threshold/fee, express surcharge, GST, minimum turnaround | PlatformConfig plus repeated literal values in promotional text | PlatformConfig; Platform → Rules; presentation uses data bindings | T06, T09, T12 |
| Slots and capacity | TimeSlot plus fallback slot creation and labels | TimeSlot; Platform → Slots; availability API owns remaining capacity | T06, T07, T10 |
| Coupons, eligibility and discounts | Coupon and order controllers; public bootstrap repeats coupon data | Coupon; Coupons; server validates eligibility | T06, T07, T13 |
| Hero headline, supporting text and CTAs | `LaundryHero.jsx` literals | SiteContent `home.hero`; Website → Home | T08, T09 |
| Hero before/after images and comparison labels | Fixed scene URLs in `GarmentComparison.jsx` | SiteContent `home.hero.comparison` references MediaAsset | T05, T08, T09 |
| How it works text and four illustrations | `LaundryJourney.jsx` and `LaundryArtwork.jsx` | SiteContent `home.journey` references MediaAsset | T05, T08, T09 |
| Service-card titles, descriptions, photos, badge and CTA | Array in `HomePageSections.jsx` and fixed service image paths | SiteContent `home.services`; price is a derived catalog value | T08, T09 |
| Comparison table headers, rows and CTA | Array and JSX in `HomePageSections.jsx` | SiteContent `home.comparison`; Website → Home | T08, T09 |
| Testimonials, attribution, rating and optional avatar | Array in `HomePageSections.jsx` | SiteContent `home.testimonials` references MediaAsset | T08, T09 |
| Service-area cards, locality details and operating hours | Separate arrays in Home and `OperationalAreasPage.jsx` | ServiceArea; Service Areas; Home references the same hub IDs | T11 |
| Pincode eligibility | Browser-only HUBS matching | ServiceArea; API validates exact coverage during booking | T07, T11 |
| Book headings, help text, empty states, imagery and CTAs | `BookingPage.jsx` and booking components | SiteContent `book`; product data remains Garment, options remain PlatformConfig | T08, T10 |
| Pricing-page headings, column labels and assurances | `PricingPage.jsx`; fixed fee/GST copy | SiteContent `pricing`; numeric claims bound to catalog/configuration | T08, T12 |
| Brand logo, tagline, navigation labels, footer links and images | `Navbar.jsx`, `Footer.jsx` and `client/index.html` | SiteContent `global`; legal business identity remains PlatformConfig | T08, T12 |
| Support contacts and invoice business identity | PlatformConfig plus repeated footer/legal content | PlatformConfig; global/legal templates reference those fields | T06, T12 |
| Terms, privacy text, page titles, descriptions, favicon/share image | Legal page JSX and `client/index.html` | SiteContent `terms`, `privacy`, per-page `seo`, and `global` | T08, T12 |
| Account, order, authentication and payment-page explanatory copy | Page/component JSX | Named SiteContent page sections; account/order/payment facts stay in their existing models | T08, T12 |
| Existing orders and invoices | Order snapshots, populated current garment fields and current configuration | Order stores the accepted transaction snapshot; historical displays use it | T07, T13 |

## Record contracts

Retain existing IDs, stored machine codes, currency and price-field meanings during migration. Add fields rather than renaming keys underneath existing clients or orders. Proposed names below are canonical for the subsequent tasks.

### Category and garment

| Record | Required contract |
| --- | --- |
| Category | `_id`, unique `slug`, `name`, optional `shortName`, `description`, allowlisted `icon`, `sortOrder`, `isActive`, timestamps |
| Garment | Existing `_id`, `name`, `iconName`, `pricing`, `isActive`, `isCustom`; add `categoryId`, `shortName`, `description`, `sortOrder`, `primaryImage`, `gallery`, `allowedServices`, `allowedIroningTiers` |
| Image reference | `assetId`, placement-specific `alt`, `decorative`; `null` means intentionally no image |

`categoryId` references Category. Keep legacy `category` temporarily as a compatibility projection; administrators must not edit both independently. Renaming a category must not orphan products or change existing order labels. Category deletion is an archive while referenced. Products under inactive categories cannot be booked.

For existing labels, resolve Men → `men`, Women → `women`, Household → `household-bedding`, and Winter & Heavy → `winter-heavy` using existing Category IDs. Preserve Home and Winter as short labels where currently displayed. Leave Kids and administrator-created categories intact. Ambiguous/unmapped records must appear in the migration report rather than being silently reassigned. Never regenerate existing IDs.

`shortName` replaces name-guessing such as converting every matching name to Shirt or Suit / Blazer. An omitted short name displays the real `name`. Product descriptions must be editable and available to existing detail/help surfaces without adding a new page design.

The custom-item template remains a real Garment with `isCustom: true`. Resolve it independently of category/search filtering; never synthesize a database ID in the browser. Its availability and supported services follow the same validation rules.

### Media

MediaAsset owns `_id`, `provider`, provider asset ID, URL, MIME type, dimensions, byte size, generated variants, default alt text, version, status and timestamps. Existing bundled assets may start with provider `local`; new uploads use configured storage. Local sprite crops may retain crop metadata so initial migration preserves the exact artwork and framing.

Product records and content sections reference media IDs; they do not each maintain their own uploaded copies. Replace a shared asset by creating a new version, preserving references and changing the delivered URL so browser caches cannot keep the previous image. Replacing only one placement instead changes that placement's reference.

Removing an image clears its reference after save. Keep the current image container and use a neutral placeholder where necessary; do not resurrect a shirt, bedsheet or unrelated product photo. Clearing an optional section image may leave that placement empty. Delete storage files only after checking that no product, published content, draft or retained historical reference uses them. Failed uploads must report failure and leave the existing image intact.

### Pricing and booking rules

The stable identifiers are exported from `shared/catalogContract.mjs`. They are application protocol identifiers, not customer-facing copy or editable prices.

| Selection | Existing price meaning to preserve |
| --- | --- |
| `WASH_AND_FOLD` | `washOnly` |
| `WASH_AND_IRON` | `washOnly` plus selected ironing component |
| `IRON_ONLY` | Selected ironing component |
| `DRY_CLEAN` | `dryClean` |
| `STANDARD_STEAM` | `standardSteamIron` |
| `CRISP_STARCH` | `crispStarchPress` |
| `DELICATE_PRESS` | `delicatePress` |

Amounts remain INR values in the existing fields. The shared calculation in T06 must use consistent minor-unit rounding internally and retain the response unit. Changing stored units requires an explicit, separately verified migration. A valid zero is not missing and does not disable a service. Availability is explicit in global configuration and garment selections.

`NONE` is the stored finish for services without ironing. T06/T07 must reject unsupported service/finish combinations instead of interpreting an unknown code as a default price. Global service/tier records own editable names, short labels, descriptions, ordering and active state. Disabling an option never causes a fallback to re-enable it.

Service promotions store a service code and optional finish code. “From” prices are calculated from active, bookable, non-custom garments in active categories using that exact combination. No eligible garments means no price claim and no booking CTA for that service. Currency symbols and formatting stay in the presentation layer.

Fees, GST and delivery thresholds in page copy use approved field bindings to PlatformConfig. Do not offer an independent text field for a second numeric price/fee. Testimonials remain authored quotations; publishing checks should flag conflicting numerical claims for review rather than silently rewriting a customer's quotation. Delivery-promise copy is separately editable and validated against the applicable operational rules.

### Structured page content

SiteContent contains `pageKey`, `schemaVersion`, `revision`, page-level `seo`, ordered `sections`, and timestamps. A section has a stable `key`, allowlisted `type`, `isVisible`, `sortOrder` and a validated `content` object. Repeated items have stable IDs, their own visibility and order. Headings retain separate plain/accent text fields so the current two-color design is preserved.

Use structured fields for text, images, safe links, badges and icon choices. Retain the existing React components, DOM structure and CSS. Do not expose executable templates, arbitrary HTML/JavaScript or editable CSS as website content. Allow links to supported internal routes or validated HTTPS/contact destinations.

Admin Save persists and publishes a complete validated revision atomically. The editor sends the revision it loaded; a stale save returns a conflict instead of overwriting newer work. Successful saves return the new revision for cache invalidation. An optional future draft workflow must not make Save silently stop updating the public site.

SiteContent must not own garment prices, delivery fees, GST, pincode eligibility, service availability or payment credentials. For those values it stores a typed reference/binding to the owning record. Global marketing brand text may differ from the legal business name, but invoices and legal-identity bindings use PlatformConfig.

### Coverage and transactions

ServiceArea owns hub ID/slug, name, short name, badge, locality descriptions, exact six-digit pincodes, opening hours, timezone, turnaround promise, `sortOrder` and `isActive`. A displayed range such as 110001–110085 is descriptive; it does not make every intermediate pincode serviceable. Overlapping active pincode assignments require an explicit resolution rule. Both the public checker and order validation use the same records.

TimeSlot owns schedule definitions and capacities. The availability response derives remaining capacity from orders for the requested date. No active slots means booking is unavailable; public reads must not create new slots.

New orders are repriced and validated on the server using current active garments, categories, services, preferences, coupons, coverage and slots. Store accepted item labels, selected option labels, rates, fee/tax breakdown, business identity and applicable revisions on the order. Subsequent catalog/content changes update future bookings without rewriting previously accepted invoices.

## Read and write boundaries

| API area | Existing route or planned contract | Required behavior |
| --- | --- | --- |
| Catalog | Existing `/api/catalog/garments`, `/api/catalog/categories`; admin category routes | Explicit public field projection; active records only; inactive access requires admin authorization |
| Configuration | Existing `/api/config/public`, `/api/config/settings`, `/api/config/slots/*` | Public fields only; one configuration owner; admin-only mutation |
| Uploads | Existing `/api/config/upload-image`; planned media list/replace/remove routes | Shared media metadata; verified upload result; role and ownership checks |
| Page content | Planned public `/api/content/:pageKey` and admin `/api/admin/content/:pageKey` | Published validated content; revision on reads/saves; admin-only mutation |
| Service areas | Planned public `/api/service-areas` and serviceability lookup; admin management | Same exact coverage data for marketing, checker and booking |
| Orders | Existing order APIs | Server authority over eligibility and amounts; client-sent totals are not trusted |

Public GETs are read-only. Default creation belongs to an explicit migration/seed workflow. Database credentials, upload secrets, payment secrets and administrative-only metadata must never appear in public content/configuration responses.

## Empty values and update propagation

- Omitted update field means keep the saved value. `null` clears an optional reference. An empty array means intentionally no items. A valid empty response is not a network failure.
- Missing/invalid catalog or booking configuration blocks affected booking actions with the T01 recovery UI. It must not invent prices, restore hidden items or create records.
- Missing optional marketing content hides only that optional placement; first migration seeds the current content so successful reads retain the existing design.
- T13 will use revisions to invalidate shared catalog/config/content caches after admin saves, notify same-browser tabs, and revalidate public clients on focus and periodically while visible. Define and test a bounded update interval; immediate same-session updates must not require a deployment.
- A restored basket contains selections, not pricing authority. Reconcile it against current records, show price changes, remove/block unavailable selections and require review before payment. Never silently substitute another garment or finish.

## Acceptance cases for later tasks

1. Rename/reorder/archive a category: Home, Book, Pricing and admin filters agree; references and old orders remain intact.
2. Change one garment name, short name, description, image or rate: every current catalog surface and refreshed basket uses that garment's record.
3. Replace the towel image: towel placements change; bedsheet placements do not unless intentionally linked to the same shared asset.
4. Remove an image and refresh: it stays removed. A broken upload keeps the previous saved image and reports an error.
5. Change GST to zero or fees to zero: all relevant displays and the server calculation use zero, not defaults.
6. Disable every service, preference or slot: no hidden fallback restores it; the user sees the appropriate unavailable state.
7. Edit each of the eight screenshot areas through admin: content/media changes appear without source-code edits and without layout changes.
8. Update a service rate: derived “From” pricing changes consistently; historical orders retain their accepted amounts.
9. Disable a hub/pincode: Home and service-area displays update; the checker and server reject new bookings there.
10. Edit Book content and product images: Book and its bag use the right owners; filter/search does not break the custom-item template.
11. Save competing admin edits: the stale revision cannot overwrite the newer save. Public users cannot read inactive/private records or mutate content.
12. Repeat migration and simulate an outage: no duplicate seeds, no overwriting admin edits, no fabricated prices, and the basket remains recoverable.

## Verification for T02

`npm run test:contracts` validates real Mongoose documents and serialized catalog payloads without a database connection. It covers legacy price fields and order codes, zero values, missing/negative prices, invalid selection codes and renamed display labels. `npm run test:connectivity` retains T01 and basket-draft regression checks. The production client build verifies that the shared module resolves in the frontend bundle.

No CSS, page markup, images, stored prices or calculation formulas are changed by T02. Admin editors, content APIs, migrations and update propagation remain assigned to the remaining implementation tasks.
