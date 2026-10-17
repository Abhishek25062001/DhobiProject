# Website administration implementation tasks

Implement one task at a time and pass its checks before proceeding. Preserve the current public website design and existing administrator data. T02's content-ownership contract defines the boundaries between catalog, media, configuration, content and transactions.

| Task | Scope | Prerequisites | Completion check | Status |
| --- | --- | --- | --- | --- |
| T01 | Reliable API startup, fixed ports, readiness and outage recovery | None | Startup/outage tests, basket persistence and Home/Book/Pricing recovery | Complete |
| T02 | Content inventory, canonical owners, shared storage identifiers and migration contract | T01 | Database/client compatibility tests and production build | In verification |
| T03 | Connect products and every category selector to Category IDs | T02 | Add/rename/order/archive categories without orphaning products; preserve existing labels | Pending |
| T04 | Complete garment fields and admin product editing | T03 | Names, descriptions, images, availability and ordering persist and reach all catalog consumers | Pending |
| T05 | Shared media upload, selection, replacement and removal | T04 | Real upload failures; reference-safe replacement/removal; correct product images | Pending |
| T06 | Shared pricing calculation and admin-managed booking rules/options | T05 | Client/server totals agree for all supported combinations, fees, GST and zero values | Pending |
| T07 | Authoritative booking validation and transaction snapshots | T06 | Reject inactive/invalid selections and forged totals; retain historical amounts | Pending |
| T08 | Structured content storage, public API and admin editors | T07 | Validate, save and read content revisions; prevent stale saves and unauthorized writes | Pending |
| T09 | Connect homepage sections and media to their owners | T08 | Edit all homepage screenshot sections through admin; derived prices; unchanged layout | Pending |
| T10 | Connect Book content, photos and options to their owners | T09 | All Book imagery/text/options editable; empty states respected; custom template independent of filters | Pending |
| T11 | Shared service areas, pincode checker and booking coverage validation | T10 | Active coverage agrees across pages and checkout; display ranges do not imply eligibility | Pending |
| T12 | Global branding, footer, legal, metadata and remaining public-page content | T11 | Admin changes propagate to all relevant surfaces; identity/fee values have one owner | Pending |
| T13 | Cache refresh, revision propagation and basket reconciliation | T12 | Open tabs refresh within the documented bound; stale baskets are reviewed; old invoices remain unchanged | Pending |
| T14 | Migrate existing content/assets/data and remove obsolete fallbacks | T13 | Dry run, repeatability, preservation of admin changes, rollback and visual comparison | Pending |
| T15 | Full admin-to-public acceptance and regression pass | T14 | Every T02 acceptance case, responsive visuals, upload failure and outage paths pass | Pending |

Each schema-changing task needs its own compatibility path and migration checks before use with existing records. T14 consolidates and verifies migration of remaining hard-coded content; it is not permission to leave intermediate tasks unusable.

Coverage checks requiring ServiceArea cannot be marked complete in T07 before T11 supplies that source. T07 establishes the validation boundary and transaction snapshot behavior; T11 adds and verifies coverage enforcement there.

## Completed task evidence

T01: 19 automated tests passed; production build passed; isolated browser checks verified configuration/catalog outages and recovery on Home, Book and Pricing, preserving the saved basket. Live frontend and API remained healthy after test cleanup.

T02 evidence will be recorded after its verification finishes. Product editors, CMS controls and content migration are not included in T02 completion.
