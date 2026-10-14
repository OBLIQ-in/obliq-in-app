import DashboardApp from "@/components/dashboard-app";

// The dashboard stays mounted across its routes. Pages outside this group,
// such as /login, render without the sidebar.
export default function DashboardLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return <DashboardApp>{children}</DashboardApp>;
}
