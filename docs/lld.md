# Dashboard v1 LLD

## File responsibilities

```text
src/
  app/
    layout.tsx              Persistent dashboard instance and page metadata
    page.tsx                Home route
    [section]/page.tsx      Section validation and 404 handling
    globals.css             Stylesheet imports
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
    workspace-source.ts    Async data source and local browser implementation
    use-workspace.ts        Workspace state, loading, and request results
    timer-state.ts          Timer snapshot validation, persistence, and duration
    use-timer.ts            Selected project and running or stopped session
    use-dialog.ts           Focus trap, Escape, and focus restoration
  styles/                   Base, shell, home, shared UI, pages, dialogs, breakpoints
tests/
  storage-validation.test.mjs
  workspace-source.test.mjs
```

The root layout keeps the dashboard mounted across routes. Route pages validate the URL; the dashboard selects the corresponding screen from the pathname. Unknown sections render Next.js's 404 page. This lets the v1 timer continue during navigation without a context provider or state library.

## Data flow

`useWorkspace` loads records through `WorkspaceSource`. The local implementation reads each browser collection only after its record validator passes. Invalid storage falls back to the design fixtures. Writes update memory before storage, so the preview still works when the browser denies storage access.

Screens receive records and callbacks through props. Forms collect input, then await `useWorkspace.create`. The source owns persistence and returns the updated workspace. `DashboardApp` closes the form and navigates after success. Failed submissions retain the form and show an error.

The timer stores its selected project and session in `obliq-preview-timer-v1`. A session captures the project's ID and name when started, plus a Unix timestamp in milliseconds. Elapsed time is calculated from that timestamp, including time while the page was closed. Selection stays fixed until the session is saved. A stopped session stores its stop time before the save request, so a failed save can be retried after reload. Successful saves clear only the session and retain the project for next time. Invalid timer storage falls back to an empty selection; unavailable storage shows a warning.

## Adding a screen

Add its route in `routes.ts`, its icon in `sidebar.tsx`, and its component under `dashboard/pages`. Add its render branch in `dashboard-app.tsx`. Keep screen-specific state in that screen. Put a shared component in `ui.tsx` only when more than one screen needs it.

## Backend integration

The source contract is defined in `src/types/workspace.ts`:

```ts
type WorkspaceSource = {
  load: () => Promise<WorkspaceData>;
  create: (kind: ModalKind, values: FormValues) => Promise<WorkspaceData>;
  saveTime: (project: string, seconds: number) => Promise<WorkspaceData>;
};
```

To connect an API, implement these methods and export that implementation as `workspaceSource`. The hook also accepts a source argument for testing. The screens and forms use the same callbacks.

- `load` fetches and validates the workspace collections. Map backend field names and status values to the frontend record types.
- `create` sends the relevant fields for the selected kind and returns the updated workspace. Use server-issued IDs and server validation; local IDs belong only to the browser implementation.
- `saveTime` sends the project and duration, then returns the updated records. Throw on a failed request so the duration remains available for retry.
- Authentication must follow the backend's contract. Keep credentials on the server and never put secrets in `NEXT_PUBLIC_*` variables.

The current `main` branch has no endpoints or authentication contract. This PR does not assume endpoint paths, a database, or a session mechanism. For v1 the source returns a workspace snapshot. When collections become large, fetch and paginate them by screen rather than loading every record.

When records come from the server, fetch initial data in route pages and move the corresponding screen rendering there. Keep timer and navigation state in the shared layout. Do not import credentials or server modules into a client hook.

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
