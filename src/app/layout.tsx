import type { Metadata } from "next";
import DashboardApp from "@/components/dashboard-app";
import "./globals.css";

export const metadata: Metadata = {
  title: "Home | OBLIQ",
  description: "OBLIQ dashboard frontend preview",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>
        <DashboardApp>{children}</DashboardApp>
      </body>
    </html>
  );
}
