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

## Document data flow and evidence review

The current document flow is local-preview based. Documents start as fixtures, can
be loaded from browser storage, and are passed through the workspace hook to the
documents screen.

### File-by-file reference

#### `src/components/dashboard/pages/documents.tsx`

- **Where data comes from:** Receives a `documents: Document[]` prop from
  `DashboardApp`.
- **How the UI displays and updates it:** Filters by document type and the
  global search query, then renders each record in a table with title, client,
  type, updated date, and status. The page can open the creation modal through
  `openModal`, but it does not currently edit existing rows.
- **Where evidence review fits:** Keep this page as the document library and
  entry point. Add review status/action columns or open a dedicated document
  review panel/page from a selected row.

#### `src/components/dashboard/ui.tsx`

- **Where data comes from:** This file has no data source; its components receive
  display values and callbacks through props.
- **How the UI displays and updates it:** `PageHeading`, `SectionHeader`,
  `FilterTabs`, and `Status` render headings, filters, and status styles.
  `FilterTabs` sends a selected value back through `setActive`.
- **Where evidence review fits:** Add reusable presentation components such as
  `ReviewStatus`, `EvidenceBadge`, or `ReviewProgress` here. Keep review
  mutations and business rules outside this shared UI layer.

#### `src/types/workspace.ts`

- **Where data comes from:** This file does not fetch data. It defines the
  contracts used by data sources and screens, including `Document`,
  `WorkspaceData`, and `WorkspaceSource`.
- **How the UI displays and updates it:** Screens consume the typed records,
  while `WorkspaceSource` currently exposes `load`, `create`, and `saveTime`.
- **Where evidence review fits:** Extend `Document` with review metadata and
  add a typed source operation, for example
  `reviewDocument(documentId, status, notes)`.

#### `src/lib/workspace-source.ts`

- **Where data comes from:** Initial documents come from
  `src/data/dashboard.ts`. The local adapter then reads and writes validated
  records in `localStorage` under `obliq-preview-documents-v1`.
- **How the UI displays and updates it:** `load()` returns the workspace data;
  `create()` prepends a document, persists it, and records an activity item.
  The adapter returns the updated `WorkspaceData` after mutations.
- **Where evidence review fits:** Implement the review mutation here. It should
  update the matching document, persist the result, and add a review activity
  item. A separate `obliq-preview-evidence-v1` store is appropriate if evidence
  becomes a first-class collection.

#### `src/lib/use-workspace.ts`

- **Where data comes from:** The hook calls the injected `WorkspaceSource`
  (the local adapter by default) and starts with an empty workspace while
  loading.
- **How the UI displays and updates it:** It owns loading/error state, exposes
  `reload`, and replaces React state with the `WorkspaceData` returned by
  `load`, `create`, or `saveTime`.
- **Where evidence review fits:** Add a `reviewDocument` wrapper that calls the
  source operation and stores its returned workspace state. Pages should use
  this hook rather than accessing storage directly.

#### `src/components/dashboard-app.tsx`

- **Where data comes from:** Calls `useWorkspace()` and destructures
  `documents` along with the other workspace collections. The current route
  comes from the pathname and is resolved through `src/lib/routes.ts`.
- **How the UI displays and updates it:** When the route is `contracts`, it
  renders `DocumentsPage` and passes documents, search text, and modal
  callbacks. Creation is coordinated here, including navigation and the
  success toast.
- **Where evidence review fits:** Pass `reviewDocument` from `useWorkspace`
  into the document page or a dedicated review component. If review needs its
  own screen, add an `evidence-review` route and keep selection/navigation
  orchestration here.

### End-to-end flow

```text
dashboard.documents / localStorage
             |
             v
workspace-source.load()
             |
             v
useWorkspace()
             |
             v
DashboardApp
             |
             v
DocumentsPage
             |
             v
document table + filters + review entry point
             |
             v
useWorkspace.reviewDocument()
             |
             v
workspace-source.reviewDocument()
             |
             v
localStorage + activity update
```

The recommended boundary is: domain types and source mutations in
`workspace.ts`/`workspace-source.ts`, state orchestration in `use-workspace.ts`
and `dashboard-app.tsx`, and display-only review components in the dashboard UI
layer. This preserves the existing adapter boundary and allows the local source
to be replaced by an API implementation later.
