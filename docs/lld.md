# Dashboard LLD

## File responsibilities

```text
src/
  app/
    layout.tsx              Persistent dashboard instance and page metadata
    page.tsx                Home route
    [section]/page.tsx      Section validation and 404 handling
    api/                    Route handlers: health, workspace, records, time
    globals.css             Stylesheet imports
  middleware.ts             Auth0 routes and redirect to /login when login is on
  components/
    dashboard-app.tsx       Navigation, search, dialogs, and screen selection
    dashboard/
      home.tsx              Home composition
      home-widgets.tsx      Metrics, activity, and quick actions
      sidebar.tsx           Navigation links and mobile menu
      search.tsx            Search results
      earnings-chart.tsx    Chart and CSV download
      project-table.tsx     Project list shared by home and projects
      ui.tsx                Headings, status badges, and filters
      contracts.ts          Shared callback types
      workspace-modal.tsx   Record form and input validation
      project-drawer.tsx    Project details
      pages/                One component per workspace screen
  data/dashboard.ts         Typed design fixtures
  types/workspace.ts        Frontend record types
  lib/
    routes.ts               Route names, labels, and URL helper
    format.ts               Money, date, and duration formatting
    storage-validation.ts  Runtime checks for stored record fields
    workspace-source.ts    Async data source, browser implementation, source switch
    api-workspace-source.ts WorkspaceSource that calls /api/workspace
    use-workspace.ts        Workspace state, loading, and request results
    timer-state.ts          Timer snapshot validation, persistence, and duration
    use-timer.ts            Selected project and running or stopped session
    use-dialog.ts           Focus trap, Escape, and focus restoration
    auth/config.ts          Login switch, public paths, and safe return paths
    auth/auth0.ts           Auth0 client, created on first use
    auth/session.ts         Signed-in user as a provider-neutral AuthUser
    spreadsheet/
      parser.ts             CSV import parser and result assembly
      validator.ts          Row, date, amount, and completion validation
      totals.ts             Decimal-safe total reconciliation
      types.ts              Spreadsheet import contracts
      index.ts              Public spreadsheet API
  styles/                   Base, shell, home, shared UI, pages, dialogs, breakpoints
  server/                   Server code; never import it from a client component
    http.ts                 Session check and JSON errors for route handlers
    auth/session.ts         Current user and firm (development stub until #10)
    db/client.ts            Lazy Postgres connection pool
    db/schema.ts            Tables and enums; source for drizzle/*.sql
    db/seed.ts              Demo firm from the design fixtures
    workspace/input.ts      Request validation for each record kind
    workspace/mappers.ts    Database rows to frontend records
    workspace/service.ts    Firm-scoped queries and writes
drizzle/                    Generated SQL migrations; commit with schema changes
tests/
  client/                   Browser-side state; run with npm run test:client
    timer-state.test.mjs
  server/                   Data, validation, and API; run with npm run test:server
    api-workspace-source.test.mjs
    spreadsheet-parser.test.mjs
    storage-validation.test.mjs
    workspace-input.test.mjs
    workspace-source.test.mjs
```

The root layout keeps the dashboard mounted across routes. Route pages validate the URL; the dashboard selects the corresponding screen from the pathname. Unknown sections render Next.js's 404 page. This lets the v1 timer continue during navigation without a context provider or state library.

## Data flow

`useWorkspace` loads records through `WorkspaceSource`. The local implementation reads each browser collection only after its record validator passes. Invalid storage falls back to the design fixtures. Writes update memory before storage, so the preview still works when the browser denies storage access.

Screens receive records and callbacks through props. Forms collect input, then await `useWorkspace.create`. The source owns persistence and returns the updated workspace. `DashboardApp` closes the form and navigates after success. Failed submissions retain the form and show an error.

The timer stores its selected project and session in `obliq-preview-timer-v1`. A session captures the project's ID and name when started, plus a Unix timestamp in milliseconds. Elapsed time is calculated from that timestamp, including time while the page was closed. Selection stays fixed until the session is saved. A stopped session stores its stop time before the save request, so a failed save can be retried after reload. Successful saves clear only the session and retain the project for next time. Invalid timer storage falls back to an empty selection; unavailable storage shows a warning.

## Adding a screen

Add its route in `routes.ts`, its icon in `sidebar.tsx`, and its component under `dashboard/pages`. Add its render branch in `dashboard-app.tsx`. Keep screen-specific state in that screen. Put a shared component in `ui.tsx` only when more than one screen needs it.

## Backend

The source contract is defined in `src/types/workspace.ts`:

```ts
type WorkspaceSource = {
  load: () => Promise<WorkspaceData>;
  create: (kind: ModalKind, values: FormValues) => Promise<WorkspaceData>;
  saveTime: (project: string, seconds: number) => Promise<WorkspaceData>;
};
```

`NEXT_PUBLIC_WORKSPACE_SOURCE=api` selects `createApiWorkspace`, which calls these routes. Each returns the full `WorkspaceData`, so the screens stay unchanged.

| Method     | Route                         | Body                   | Service         |
| ---------- | ----------------------------- | ---------------------- | --------------- |
| `load`     | `GET /api/workspace`          |                        | `loadWorkspace` |
| `create`   | `POST /api/workspace/records` | `{ kind, values }`     | `createRecord`  |
| `saveTime` | `POST /api/workspace/time`    | `{ project, seconds }` | `saveTime`      |

A request goes through three layers:

1. The route file in `src/app/api` wraps its handler in `route()` from `src/server/http.ts`. `route()` loads the session, returns 401 without one, and turns validation errors into 400 responses.
2. The handler parses the body with a Zod schema from `workspace/input.ts`. Each record kind accepts only the fields its form shows.
3. The service runs firm-scoped queries in `workspace/service.ts` and maps rows to frontend records in `workspace/mappers.ts`.

### Data model

`users` hold the email (unique, ignoring case), the user type (client or firm, set by onboarding in #11), and when onboarding finished. How a user signs in lives in `user_identities` (`provider`, `provider_user_id`), so Auth0 (#10) can later be replaced by passwords without changing `users`. A `firm_members` row links a user to a firm with an internal role (`owner`, `article_assistant`, or `reviewer`). `firm_invites` store invitation-code hashes and expiry, revocation, and acceptance metadata (#12). Role naming and the full permission matrix are coordinated in #29.

Every other table has a `firm_id`, and the service takes it from the session, never from the request. Records link to clients and projects by ID. Statuses and document types are Postgres enums whose values match the strings the screens filter on. Activity stores a user ID and a timestamp; the label ("You", "2 hours ago") is worked out when it is read. Dates use India time.

The screens still send client and project names (see #7). The service looks them up within the firm and returns 400 for an unknown name. When the forms send IDs, change `input.ts` and the two lookups in `service.ts`.

### Sessions

`getSession()` in `src/server/auth/session.ts` is the only place that knows who is signed in. Until Auth0 is added (#10), development uses the `dev` identity named by `DEV_AUTH_ID`, and production returns no session, so the workspace routes return 401. A signed-in user who has no firm yet gets a session with `firmId: null`, and the workspace routes return 403 with `code: "onboarding_required"` so the client can send them to onboarding (#11). Auth0 calls `findSession("auth0", sub)` from `getSession()`; routes and services do not change.

### Firm invitations

The invitation API and transaction rules are documented in [firm-invitations.md](firm-invitations.md).
Owner GET/POST/DELETE operations under `/api/firm/invitations` use the shared
session and require current owner membership in its firm. `/api/invitations/redeem`
accepts the shared signed-in session even before firm membership exists; the
invitation determines the target firm and role. The internal user UUID remains
independent of its login provider.

`npm test` runs the non-database suites through the shared runner. PostgreSQL
integration tests run separately with `npm run test:db`, using a disposable test
database and the server runtime. CI executes both suites. This keeps database
setup and Next server startup out of the concurrent unit-test pass.

### Adding an endpoint

1. Add the input schema to `src/server/<area>/input.ts` and the queries to `service.ts`. Filter every query by `session.firmId`.
2. Add `src/app/api/<area>/route.ts` that exports `GET` or `POST = route(...)`.
3. Change the schema only in `db/schema.ts`, then run `npm run db:generate` and commit the SQL file.
4. Add tests for input and mapping. They run without a database.

Keep credentials on the server and never put secrets in `NEXT_PUBLIC_*` variables. The database client, session, route helper, and services import `server-only`, so importing them from a client component fails the build. When collections become large, fetch and paginate them by screen rather than loading every record.

### Spreadsheet imports

Issue #37 provides the parser and validation pipeline in `src/lib/spreadsheet`. It is a pure module: upload/storage (#36), row pagination (#38), row details (#39), and version switching (#40) remain separate.

```ts
parseSpreadsheet(
  input: string | Uint8Array | ArrayBuffer,
  options: {
    sheetName: string;
    version: string;
    importedAt?: Date | string;
    declaredTotal?: string | number;
    today?: Date | string;
    maxFutureDays?: number;
    maxBytes?: number;
    columns?: Partial<SpreadsheetColumnMap>;
  },
): { meta, rows, errors }
```

The current input format is UTF-8 CSV with a header row. XLSX remains unsupported until the approved workbook schema (#16) and a parser dependency are agreed. The default headers are `row_id`, `invoice_date`, `customer`, `document_ref`, and `amount`; `columns` maps different workbook headers to those fields. `sheetName` and `version` are required metadata. The default file-size limit is 5 MB.

Dates accept `YYYY-MM-DD` or `DD/MM/YYYY` and are normalized to ISO. Dates after `today` plus `maxFutureDays` (default `0`) are required errors. Amounts must be non-negative numbers with up to two decimal places and may use thousands separators. Customer and document reference values are required. Totals use integer paise internally.

`meta` records the sheet name, version, import time, row counts, and computed totals. When `declaredTotal` is supplied it also records the declared total, delta, match flag, and minor-unit equivalents. `rows` contains every data row, including invalid rows. Invalid rows remain in the result with `_valid: false` and their `_errors`; they are never filtered out. Fully blank rows are counted and reported as warnings rather than data rows.

| Error code                 | Severity | Meaning                                              |
| -------------------------- | -------- | ---------------------------------------------------- |
| `missing_required_column`  | required | A mapped header is absent                            |
| `duplicate_column`         | required | The same normalized header appears more than once    |
| `row_identifier_required`  | required | A row has no identifier                              |
| `duplicate_row_identifier` | required | A row identifier repeats within the sheet            |
| `invalid_date`             | required | Date is empty, malformed, or not a real calendar day |
| `date_in_future`           | required | Date exceeds the configured future limit             |
| `invalid_amount`           | required | Amount is empty or not numeric                       |
| `negative_amount`          | required | Amount is below zero                                 |
| `amount_too_large`         | required | Amount exceeds exact safe integer paise              |
| `required_value_missing`   | required | Customer or document reference is empty              |
| `invalid_declared_total`   | required | Supplied declared total is invalid                   |
| `metadata_required`        | required | Sheet name or version is empty                       |
| `empty_spreadsheet`        | required | No header row was found                              |
| `no_data_rows`             | required | Header exists but there are no data rows             |
| `invalid_encoding`         | required | Input is not valid UTF-8                             |
| `file_too_large`           | required | Input exceeds `maxBytes`                             |
| `total_mismatch`           | warning  | Declared total differs from the valid-row total      |
| `blank_row`                | warning  | A fully blank row was skipped                        |

Callers must use `canCompleteImport(errors)` before changing an import to complete. It returns `false` while any required error remains. Total mismatches are reported as warnings and do not block completion by themselves. Because no upload route exists yet, tenant ownership, authentication, and file-type checks remain the responsibility of the future route from #36.

## Login

Login is behind `AUTH_ENABLED` and off by default. When it is on, `middleware.ts` lets the Auth0 SDK handle `/auth/login`, `/auth/logout` and `/auth/callback`, and sends signed-out visitors to `/login?returnTo=<path>`. Return paths are limited to paths on this site.

Server code reads the signed-in person with `getAuthUser()`, which returns `{ provider, providerUserId, email, name }` and no Auth0 types. `provider` and `providerUserId` are the key of the backend's `user_identities` table, so a different provider only needs a new `getAuthUser()`.

## Working rules

- Keep route definitions in one place. Use Next.js links for navigation.
- Keep record creation out of screen components and formatting out of JSX.
- Use strict TypeScript and typed fixtures. Check stored JSON at runtime.
- Keep styles grouped by responsibility and put breakpoint rules in `responsive.css`.
- Add a helper when it removes repeated behavior. Avoid wrappers that only rename a call.
- Run `npm run check` and verify the affected browser journey before sharing a change.

## References

- [Next.js project structure](https://nextjs.org/docs/app/getting-started/project-structure) allows several organization approaches. This preview uses routes in `app`, UI in `components`, and browser logic in `lib`.
- [Next.js server and client components](https://nextjs.org/docs/app/getting-started/server-and-client-components) explains the client boundary. The local preview needs client state; backend integration can move record fetching into server route pages.
- [TypeScript strict checking](https://www.typescriptlang.org/tsconfig/strict) catches type errors during development. Runtime storage validation handles values the compiler cannot check.
- [Husky setup](https://typicode.github.io/husky/get-started.html) and [lint-staged](https://github.com/lint-staged/lint-staged) describe installing hooks and formatting staged files.
- [Martin Fowler on YAGNI](https://martinfowler.com/bliki/Yagni.html) supports deferring speculative features while keeping existing code easy to change. V1 uses props and small hooks rather than an extra state library or service layer.
