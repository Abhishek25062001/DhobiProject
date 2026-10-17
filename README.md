# IndoDhobi

## Local development

Install dependencies with `npm run install:all`, then run `npm run dev` from this directory.
The API uses port **5001** and the website uses **5173**. Vite waits up to 60 seconds for
the API and MongoDB to be ready before opening its listener. If startup fails, fix the
reported backend error and run the command again.

`server/.env` must contain a valid `MONGO_URI` and `PORT=5001`. The matching client
setting is `VITE_API_URL=http://localhost:5001` in `client/.env`. If changing the API
port, change both values. Neither server silently switches to another port. Port
5000 is commonly occupied by macOS Control Center.

For separate terminals, run `npm run server` first, then `npm run client`.
`/api/health` returns HTTP 200 with `ready: true` only after startup and database
connection; unavailable services return HTTP 503. A running frontend retries
temporary catalog/configuration read failures twice, then offers a manual retry.
It also retries failed reads when the browser regains focus or connectivity.
Orders, payments and uploads are never automatically retried.

## Administration and migrations

See [the administrator guide](docs/website-administration.md) for product, image, page-content, coverage and pricing controls, migration commands and rollback instructions. The website's existing public layout is retained.

For an existing installation, run `npm run migrate:website` to inspect the read-only plan, then `npm run migrate:website -- --apply` to apply with a backup. Default content is never seeded on startup or public reads. An empty installation uses the explicit `npm run seed` command; normal seeding does not create demo accounts or orders.

Booking capacity is enforced using MongoDB transactions. Use MongoDB Atlas or a replica set; a standalone MongoDB server is not sufficient for order creation. The isolated test database starts its own single-member replica set.

## Verification

- `npm run test:acceptance`: isolated startup, API/data contracts, basket/cache, administration, migration/rollback, coverage, pricing and payment-boundary checks.
- `npm run build:client`: production frontend build.
- `node server/scripts/browserAcceptance.mjs --isolated`: disposable browser fixture at ports 5101/5174, with external payment/upload credentials disabled.

The older `npm test` command invokes legacy integration scripts with external-provider assumptions; it is separate from the isolated acceptance suite.

[Task progress](docs/implementation-tasks.md), [content ownership](docs/content-ownership.md), and [acceptance evidence](docs/acceptance-results.md) record scope, owners and validation results.
