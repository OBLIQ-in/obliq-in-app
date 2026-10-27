# OBLIQ dashboard

[![Netlify Status](https://api.netlify.com/api/v1/badges/ad8956f2-849e-49fb-96ac-301ea70e979f/deploy-status)](https://app.netlify.com/projects/app-obliq/deploys)

Dashboard v1 built with Next.js 15, TypeScript, plain CSS, and Lucide icons. It follows the [OBLIQ dashboard design](https://www.figma.com/design/wlgXeMbhYuReooXYY1KOhS/OBLIQ_DASHBOARD_MAIN?node-id=0-1) and adds project, client, time, invoice, document, and accounting screens.

## Run

Use Node.js 22.18 or newer.

```sh
npm ci
npm run dev -- -p 4173
```

Open http://127.0.0.1:4173/. For a production build, run `npm run build` followed by `npm start -- -p 4173`. Stop the development server before building.

## Checks

```sh
npm run check
```

This runs Prettier, ESLint, TypeScript, tests, and the production build. Husky runs formatting on staged files, linting, type checking, and tests before commits.

The server tests include workspace isolation checks that need Postgres. They skip with a message when `DATABASE_URL` is not set; CI runs them against a database.

## Backend

The backend is in this app: Next.js route handlers under `src/app/api` and server code under `src/server`, with Postgres and [Drizzle ORM](https://orm.drizzle.team/). It needs Docker, or any Postgres 15+ database.

```sh
cp .env.example .env
docker compose up -d      # Postgres on 127.0.0.1:5433
npm run db:migrate        # apply drizzle/*.sql
npm run db:seed           # demo firm for DEV_AUTH_ID, from the design fixtures
```

Set `NEXT_PUBLIC_WORKSPACE_SOURCE=api` in `.env` and restart `npm run dev` to load the screens from the database. Without it, development uses browser storage and design fixtures so the app can run without a database. Production always uses the API path; it never falls back to browser fixtures.

For deployed environments, set `APP_ENV` and `NEXT_PUBLIC_APP_ENV` to the same value (`staging` or `production`) and set `NEXT_PUBLIC_WORKSPACE_SOURCE=api`. The app refuses browser fixture mode in staging/production and rejects unknown environment/source values. Production must never use the synthetic seed.

For a staging database only, use a dedicated, empty database whose name ends in `_staging` and a staging-only `DEV_AUTH_ID`. Set `APP_ENV=staging`, `NEXT_PUBLIC_APP_ENV=staging`, `NEXT_PUBLIC_WORKSPACE_SOURCE=api`, and `SEED_SYNTHETIC_DATA=true`, then run `npm run db:migrate` and `npm run db:seed`. The seed is explicitly synthetic, writes a `SYNTHETIC DEMO` firm name, and marks the firm so the dashboard displays a persistent synthetic-data warning. The seed rejects production configuration and staging database names without the `_staging` suffix. Never point this seed at a production database. Staging API access still follows the repository's configured authentication/session setup.

| Route                    | Method | Purpose                                     |
| ------------------------ | ------ | ------------------------------------------- |
| `/api/health`            | GET    | Server and database status                  |
| `/api/workspace`         | GET    | The firm's clients, projects, invoices, ... |
| `/api/workspace/records` | POST   | Create a client, project, invoice, document |
| `/api/workspace/time`    | POST   | Save a timer session                        |

There is no login yet (#10). In development, requests act as the seeded user named by `DEV_AUTH_ID`. In production the workspace routes return 401 until Auth0 is added.

After changing `src/server/db/schema.ts`, run `npm run db:generate` and commit the new file in `drizzle/`. `npm run db:studio` opens a database browser.

## Data

Development preview mode uses synthetic design fixtures from `src/data/dashboard.ts`; these are not production customer records. Staging and production use the API and firm-scoped database records. Staging demo firms are explicitly seeded as synthetic and visibly marked in the dashboard; production seeding is refused. Project metrics, invoices, team members, and activity in API mode come from that firm's records. A new firm with no records shows empty lists and zero totals. The chart measures tracked time-entry hours, not revenue; its values are calculated from the firm's saved time entries, and its CSV export uses the same unit. The timer remembers its project and start time across refreshes and closed tabs when browser storage is available. New projects do not change the selected project. A first session requires an explicit project selection.

`WorkspaceSource` defines async `load`, `create`, and `saveTime` methods. `src/lib/workspace-source.ts` exports the browser or API implementation; the screens access it through `useWorkspace`. Forms await successful saves, prevent repeat submissions while saving, and keep input when a request fails. Loading failures have a Retry action; failed time saves retain the duration for retry. Email delivery is not implemented.

See [the LLD](docs/lld.md) for the file structure, adapter contract, and backend layout.

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for branches, commits, pull requests, and labels.
