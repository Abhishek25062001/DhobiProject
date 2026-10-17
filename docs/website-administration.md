# Website administration and verification

The public layout stays in React/CSS. Administrators manage its content and images through the existing admin dashboard.

- **Products & Categories → Garment Rate Card**: names, short labels, descriptions, photos/gallery, prices, order, category and supported services/finishes. The short label is used on compact Home cards; Book uses the full name.
- **Products & Categories → Dynamic Categories**: names, short labels, order, visibility. Archive referenced categories instead of deleting them.
- **Products & Categories → Media library**: upload, replace, describe and archive images. Replacement updates every reference to that asset. Select a different asset on one product/page to change that placement alone. Towel and bedsheet artwork begins with separate asset IDs even where the original sprite crop was identical.
- **Website Content**: choose Home, Book, Global, Pricing, Areas, Terms, Privacy or the account/order pages. Expand a section, edit fields/images, then Save and publish. Copy sections have searchable entries. Blank text and hidden sections are intentional. Pricing/configuration bindings retain their current owner rather than copying a number into marketing text.
- **Service Areas**: exact pincodes, locality text, card/footer names, hours, order and active state. India Standard Time is the supported scheduling timezone. Displayed ranges do not grant coverage.
- **Platform & Alerts**: fees, GST, contacts, service/finish names and availability, preferences/charges, turnaround and slots/capacity.

Saving publishes immediately. Tabs in the same browser receive an update notification. Other visible clients refresh within 30 seconds plus network time; background tabs refresh when focused. Unavailable APIs show retry/recovery states, retain the basket and prevent checkout using stale configuration. A changed basket total or unavailable item requires review. The server validates the final quote again before creating an order. Capacity checks and insertion share a MongoDB transaction, so simultaneous bookings cannot both take the last place. MongoDB Atlas or a replica set is required for checkout.

Historical orders/invoices use their accepted snapshots. Editing the catalog does not reprice them. Legacy invoices without recorded business/tax identity show that absence explicitly.

## Existing installations

From the repository root:

```sh
npm run migrate:website
npm run migrate:website -- --apply
npm run migrate:website
```

The first command is a read-only preflight. Resolve any unmapped category or unsupported image URL listed in `errors`. Unknown original artwork is reported and retains a neutral placeholder. Do not guess a mapping or overwrite administrator records.

For an apply/rollback deployment window, stop administrative writes and take a normal database backup. The apply command additionally saves a private, BSON-preserving journal under `.local-backups/website-*.json` before writing. It includes only categories, garments, website media, platform configuration, page content, areas and the migration ledger. Orders, users and payments are excluded. Keep this directory out of version control and retain the journal path printed by the command.

Each migration fills missing fields or inserts first-run defaults. Existing IDs, prices, administrator labels, inactive records, empty arrays, explicit null images and saved pages are preserved. A completion ledger prevents removed pages/hubs from being reseeded later. Reads and ordinary server startup do not seed content. Repeating the migration should report zero content changes.

A migration lock prevents two consolidated applies from running together. If a process is interrupted, inspect its journal and database before clearing `website-migration-lock`; do not start another apply blindly. A gracefully failed step records its actual resulting snapshot and can be rolled back.

## Rollback

With application/administrative writes stopped, first verify the exact journal:

```sh
npm run migrate:website -- --rollback /absolute/path/to/website-journal.json
npm run migrate:website -- --rollback /absolute/path/to/website-journal.json --apply
```

Rollback restores the participating collections exactly, including BSON IDs/dates and originally absent fields. It refuses if any participating content changed after the recorded run, protecting later admin edits. For such a conflict, restore individual fields from the journal after review. A hard process interruption before an after-snapshot is safely recorded also requires selective recovery from the before-snapshot and the normal database backup. Do not force a wholesale rollback over newer edits.

## Fresh installations

`npm run seed` is an explicit, one-time initialization for an empty catalog/configuration database; it then migrates page content and media. It refuses a populated installation and does nothing once its completion ledger exists. It does not create demo users or orders in a normal environment. Provision the initial administrator through the deployment's account administration process; do not ship shared demonstration credentials.

The disposable browser acceptance harness (`node server/scripts/browserAcceptance.mjs --isolated`) creates its own in-memory database on ports 5101/5174. Its demo users/orders are restricted to test mode and its payment/upload provider credentials are disabled. It never uses the main database.

## Verification

`npm run test:acceptance` runs the isolated connectivity, data-contract, cache/basket and admin-content suites. `npm run build:client` verifies the production bundle. The original broad legacy `npm test` includes integration scripts with external-provider assumptions and is not part of this isolated verification command.

Image upload validation/provider failure is tested with a controlled adapter. A production Cloudinary account and Razorpay account still require deployment credentials and their own live commissioning checks; acceptance tests do not make real uploads or financial transactions.

Payment failures do not create simulated gateway sessions or accept fabricated signatures. A cancelled order cannot start another payment session. If an online gateway session was prepared but a concurrent slot/configuration change prevents the database order, that unused gateway session does not constitute payment and is not returned as a successful booking.
