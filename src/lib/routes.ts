// `group` decides where the sidebar lists a page. Pages in the "account" group
// are reached from the Administration area, not from the main navigation.
export const pages = [
  { label: "Home", slug: "home", group: "features" },
  { label: "Clients", slug: "clients", group: "features" },
  { label: "Projects", slug: "projects", group: "features" },
  { label: "Time tracking", slug: "time-tracking", group: "features" },
  { label: "Invoices", slug: "invoices", group: "tools" },
  { label: "Contracts", slug: "contracts", group: "tools" },
  { label: "Balance", slug: "balance", group: "tools" },
  { label: "Accounting", slug: "accounting", group: "tools" },
  { label: "Taxes", slug: "taxes", group: "tools" },
  { label: "Profile & settings", slug: "settings", group: "account" },
] as const;

export type Route = (typeof pages)[number]["slug"];

export function routeHref(route: Route) {
  return route === "home" ? "/" : `/${route}`;
}
