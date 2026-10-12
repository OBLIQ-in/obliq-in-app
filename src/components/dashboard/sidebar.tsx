import Image from "next/image";
import {
  ArrowLeftCircle,
  BriefcaseBusiness,
  CircleDollarSign,
  ClipboardList,
  Clock3,
  Headset,
  Home,
  Landmark,
  LineChart,
  LogOut,
  ReceiptText,
  UsersRound,
} from "lucide-react";

import Link from "next/link";
import { pages, routeHref } from "@/lib/routes";
import type { Route } from "@/lib/routes";
import { initials } from "@/lib/format";
import type { Navigate } from "./contracts";
const icons: Record<Route, typeof Home> = {
  home: Home,
  clients: UsersRound,
  projects: BriefcaseBusiness,
  "time-tracking": Clock3,
  invoices: ReceiptText,
  contracts: ClipboardList,
  balance: CircleDollarSign,
  accounting: LineChart,
  taxes: Landmark,
  settings: Home,
};
const navigation = (["features", "tools"] as const).map((group) =>
  pages
    .filter((page) => page.group === group)
    .map((page) => ({ ...page, icon: icons[page.slug] })),
);

export function Sidebar({
  route,
  navigate,
  mobileOpen,
  closeMobile,
  toggleCollapse,
  userName,
}: {
  route: string;
  navigate: Navigate;
  mobileOpen: boolean;
  closeMobile: () => void;
  toggleCollapse: () => void;
  userName: string;
}) {
  return (
    <>
      {mobileOpen && (
        <button
          className="scrim"
          aria-label="Close menu"
          onClick={closeMobile}
        />
      )}
      <aside className={`sidebar ${mobileOpen ? "sidebar-open" : ""}`}>
        <div className="brand-row">
          <Image
            className="brand-logo"
            src="/obliq-logo-light.svg"
            alt="OBLIQ"
            width={77}
            height={34}
          />
          <button
            className="collapse-button"
            aria-label="Collapse sidebar"
            onClick={() => {
              if (window.innerWidth <= 900) closeMobile();
              else toggleCollapse();
            }}
          >
            <ArrowLeftCircle size={18} />
          </button>
        </div>
        <nav aria-label="Main navigation">
          {navigation.map((group, index) => (
            <div className="nav-group" key={index}>
              {index === 1 && (
                <>
                  <div className="nav-divider" />
                  <div className="nav-caption">TOOLS</div>
                </>
              )}
              {group.map(({ label, slug, icon: Icon }) => (
                <Link
                  key={slug}
                  href={routeHref(slug)}
                  className={`nav-link ${route === slug ? "active" : ""}`}
                  aria-current={route === slug ? "page" : undefined}
                  onClick={(event) => {
                    if (
                      event.metaKey ||
                      event.ctrlKey ||
                      event.shiftKey ||
                      event.altKey
                    )
                      return;
                    event.preventDefault();
                    navigate(slug);
                    closeMobile();
                  }}
                >
                  <Icon size={18} strokeWidth={1.7} />
                  <span>{label}</span>
                </Link>
              ))}
            </div>
          ))}
        </nav>
        <div className="admin-area">
          <div className="nav-caption">ADMINISTRATION</div>
          <a className="nav-link" href="mailto:support@obliq.in">
            <Headset size={18} strokeWidth={1.7} />
            <span>Support</span>
          </a>
          <Link
            href={routeHref("settings")}
            className={`nav-link user-link ${route === "settings" ? "active" : ""}`}
            aria-current={route === "settings" ? "page" : undefined}
            aria-label={`${userName}, profile and settings`}
            onClick={(event) => {
              if (
                event.metaKey ||
                event.ctrlKey ||
                event.shiftKey ||
                event.altKey
              )
                return;
              event.preventDefault();
              navigate("settings");
              closeMobile();
            }}
          >
            <span className="user-avatar" aria-hidden="true">
              {initials(userName)}
            </span>
            <span>{userName}</span>
          </Link>
          <button
            type="button"
            className="nav-link sign-out"
            disabled
            title="Sign out will work once login is added"
          >
            <LogOut size={18} strokeWidth={1.7} />
            <span>Sign out</span>
          </button>
        </div>
      </aside>
    </>
  );
}
