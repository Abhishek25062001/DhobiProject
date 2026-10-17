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

## Verification

- `npm run test:connectivity`: isolated startup, readiness, outage/recovery and booking-draft checks; no production database writes.
- `npm run test:contracts`: shared catalog/order identifier compatibility against database schemas and website payload validation; no database connection.
- `npm run build:client`: production frontend build.
- `npm test`: the existing full server verification suite (uses its test database).

T01 changes startup and failure handling only. Existing page layouts, styles,
imagery, content and normal booking calculations are retained. Content-management
and basket reconciliation improvements are separate subsequent tasks.

## Content management implementation

See `docs/implementation-tasks.md` for task order and completion checks, and
`docs/content-ownership.md` for the current content inventory, canonical data
owners, migration rules and acceptance cases. T02 introduces shared storage
identifiers without changing customer-facing labels, rates or page design.
