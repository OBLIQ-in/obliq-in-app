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

## Data and backend integration

V1 uses sample data and browser storage. Authentication, backend endpoints, email delivery, and server validation are not implemented. Headline metrics and earnings use design fixtures. The timer remembers its project and start time across refreshes and closed tabs when browser storage is available. New projects do not change the selected project. A first session requires an explicit project selection.

`WorkspaceSource` defines async `load`, `create`, and `saveTime` methods. The local implementation is in `src/lib/workspace-source.ts`; the screens access it through `useWorkspace`. Replace the exported source with an API implementation when the backend contract is available. Forms await successful saves, prevent repeat submissions while saving, and keep input when a request fails. Loading failures have a Retry action; failed time saves retain the duration for retry.

See [the LLD](docs/lld.md) for the file structure, adapter contract, and integration steps.
