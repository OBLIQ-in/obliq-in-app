import type { Metadata } from "next";
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
      <body>{children}</body>
    </html>
  );
}
