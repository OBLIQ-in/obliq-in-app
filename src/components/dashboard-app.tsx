"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import {
  BadgeDollarSign,
  Folder,
  Menu,
  Play,
  Search,
  Square,
  Tags,
  X,
} from "lucide-react";
import { dashboard } from "@/data/dashboard";
import { useWorkspace } from "@/lib/use-workspace";
import { useTimer } from "@/lib/use-timer";
import type { ReactNode } from "react";
import { pages, routeHref } from "@/lib/routes";
import type { Route } from "@/lib/routes";
import { SearchResults } from "@/components/dashboard/search";
import { Sidebar } from "@/components/dashboard/sidebar";
import { formatTime } from "@/lib/format";
import type { SearchResult } from "@/components/dashboard/search";
import { HomePage } from "@/components/dashboard/home";
import { AccountingPage } from "@/components/dashboard/pages/accounting";
import { BalancePage } from "@/components/dashboard/pages/balance";
import { ClientsPage } from "@/components/dashboard/pages/clients";
import { DocumentsPage } from "@/components/dashboard/pages/documents";
import { InvoicesPage } from "@/components/dashboard/pages/invoices";
import { ProjectsPage } from "@/components/dashboard/pages/projects";
import { SettingsPage } from "@/components/dashboard/pages/settings";
import { TaxesPage } from "@/components/dashboard/pages/taxes";
import { TimePage } from "@/components/dashboard/pages/time";
import { ProjectDrawer } from "@/components/dashboard/project-drawer";
import { WorkspaceModal } from "@/components/dashboard/workspace-modal";
import type { FormValues, ModalKind, Project } from "@/types/workspace";

export default function DashboardApp({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const requestedRoute = pathname.replace(/^\//, "") || "home";
  const currentPage = pages.find((page) => page.slug === requestedRoute);
  const route = currentPage?.slug;
  const [mobileOpen, setMobileOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const workspace = useWorkspace();
  const { projects, clients, invoices, documents, activity, entries } =
    workspace;
  const ready = !workspace.loading && !workspace.error;
  const timer = useTimer();
  const { running, seconds } = timer;
  const [savingTime, setSavingTime] = useState(false);
  const [period, setPeriod] = useState("Month");
  const [query, setQuery] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);
  const [modal, setModal] = useState<ModalKind | null>(null);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [toast, setToast] = useState("");
  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(""), 3000);
    return () => window.clearTimeout(timer);
  }, [toast]);
  function navigate(slug: Route) {
    router.push(routeHref(slug));
    setMobileOpen(false);
    setQuery("");
    setSearchOpen(false);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }
  function selectSearchResult(item: SearchResult) {
    navigate(item.route);
    setQuery(item.title);
    if (item.type === "Project" && item.record) setSelectedProject(item.record);
  }
  async function create(kind: ModalKind, values: FormValues) {
    await workspace.create(kind, values);
    navigate(
      kind === "project"
        ? "projects"
        : kind === "client"
          ? "clients"
          : kind === "invoice"
            ? "invoices"
            : "contracts",
    );
    setModal(null);
    setToast("Saved");
  }
  async function toggleTimer() {
    if (savingTime || !ready || !timer.ready) return;
    if (timer.hasSession) {
      const session = timer.stop();
      if (session && session.seconds > 0) {
        setSavingTime(true);
        try {
          await workspace.saveTime(session.project.name, session.seconds);
          timer.reset();
          setToast("Time session saved");
        } catch {
          setToast("Unable to save the time session. Please try again.");
        } finally {
          setSavingTime(false);
        }
      } else timer.reset();
    } else {
      const project = projects.find((item) => item.id === timer.project?.id);
      if (!project) {
        navigate("time-tracking");
        setToast("Select a project before starting the timer");
        return;
      }
      timer.start(project);
    }
  }

  function selectTimerProject(id: string) {
    const project = projects.find((item) => item.id === id);
    if (project) timer.selectProject(project);
  }
  if (!currentPage || !route) return children;
  return (
    <div className={`app-shell ${collapsed ? "sidebar-collapsed" : ""}`}>
      <a className="skip-link" href="#main-content">
        Skip to content
      </a>
      <Sidebar
        route={route}
        navigate={navigate}
        mobileOpen={mobileOpen}
        closeMobile={() => setMobileOpen(false)}
        toggleCollapse={() => setCollapsed((value) => !value)}
        userName={dashboard.user.firstName}
      />
      <main id="main-content" className="main-content">
        <header className="topbar">
          <button
            className="mobile-menu"
            aria-label="Open menu"
            onClick={() => {
              if (collapsed && window.innerWidth > 900) setCollapsed(false);
              else setMobileOpen(true);
            }}
          >
            <Menu size={21} />
          </button>
          <div className="greeting">
            {route === "home" ? (
              <h1>Hello, {dashboard.user.firstName}</h1>
            ) : (
              <strong>{currentPage.label}</strong>
            )}
            <p>
              {route === "home"
                ? "What are you working on?"
                : "OBLIQ workspace"}
            </p>
          </div>
          <div className="search-wrap">
            <label className="search-box">
              <Search size={16} strokeWidth={1.5} />
              <input
                aria-label="Search workspace"
                placeholder="Search workspace"
                value={query}
                onFocus={() => setSearchOpen(true)}
                onKeyDown={(event) => {
                  if (event.key === "Escape") setSearchOpen(false);
                }}
                onChange={(event) => {
                  setQuery(event.target.value);
                  setSearchOpen(true);
                }}
              />
              {query && (
                <button
                  aria-label="Clear search"
                  onClick={() => {
                    setQuery("");
                    setSearchOpen(false);
                  }}
                >
                  <X size={14} />
                </button>
              )}
            </label>
            <SearchResults
              query={query}
              open={searchOpen}
              projects={projects}
              clients={clients}
              invoices={invoices}
              select={selectSearchResult}
            />
          </div>
          <div className="top-actions">
            <button
              className="top-icon"
              aria-label="Projects"
              onClick={() => navigate("projects")}
            >
              <Tags size={17} />
            </button>
            <button
              className="top-icon"
              aria-label="Documents"
              onClick={() => navigate("contracts")}
            >
              <Folder size={17} />
            </button>
            <button
              className="top-icon"
              aria-label="Balance"
              onClick={() => navigate("balance")}
            >
              <BadgeDollarSign size={17} />
            </button>
            <span className="top-separator" />
            <span className="timer">{formatTime(seconds)}</span>
            <button
              className="play-button"
              aria-label={
                running
                  ? "Stop timer"
                  : timer.hasSession
                    ? "Retry saving timer"
                    : "Start timer"
              }
              disabled={savingTime || !ready || !timer.ready}
              onClick={toggleTimer}
            >
              {running ? (
                <Square size={13} fill="currentColor" />
              ) : (
                <Play size={13} fill="currentColor" />
              )}
            </button>
          </div>
        </header>
        {workspace.loading && <p role="status">Loading workspace...</p>}
        {timer.storageError && (
          <p role="alert">
            Browser storage is unavailable. Keep this page open to avoid losing
            the timer.
          </p>
        )}
        {workspace.error && (
          <div role="alert">
            <p>{workspace.error}</p>
            <button className="secondary-button" onClick={workspace.reload}>
              Retry
            </button>
          </div>
        )}
        {ready && route === "home" && (
          <HomePage
            projects={projects}
            invoices={invoices}
            activity={activity}
            period={period}
            setPeriod={setPeriod}
            openModal={setModal}
            navigate={navigate}
            selectProject={setSelectedProject}
          />
        )}
        {ready && route === "projects" && (
          <ProjectsPage
            projects={projects}
            openModal={setModal}
            selectProject={setSelectedProject}
            query={query}
          />
        )}
        {ready && route === "clients" && (
          <ClientsPage clients={clients} openModal={setModal} query={query} />
        )}
        {ready && route === "time-tracking" && (
          <TimePage
            seconds={seconds}
            running={running}
            saving={savingTime}
            hasSession={timer.hasSession}
            toggleTimer={toggleTimer}
            entries={entries}
            projects={projects}
            timerProject={timer.project}
            setTimerProject={selectTimerProject}
          />
        )}
        {ready && route === "invoices" && (
          <InvoicesPage
            invoices={invoices}
            openModal={setModal}
            query={query}
          />
        )}
        {ready && route === "contracts" && (
          <DocumentsPage
            documents={documents}
            openModal={setModal}
            query={query}
          />
        )}
        {ready && route === "balance" && (
          <BalancePage invoices={invoices} navigate={navigate} />
        )}
        {ready && route === "accounting" && (
          <AccountingPage
            invoices={invoices}
            period={period}
            setPeriod={setPeriod}
          />
        )}
        {ready && route === "taxes" && <TaxesPage navigate={navigate} />}
        {ready && route === "settings" && <SettingsPage />}
        {children}
      </main>
      {modal && (
        <WorkspaceModal
          key={modal}
          kind={modal}
          close={() => setModal(null)}
          create={create}
          clients={clients}
        />
      )}
      {selectedProject && (
        <ProjectDrawer
          project={selectedProject}
          close={() => setSelectedProject(null)}
        />
      )}
      {toast && (
        <div role="status" className="toast">
          {toast}
        </div>
      )}
    </div>
  );
}
