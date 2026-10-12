import type { Dispatch, SetStateAction } from "react";
import { ArrowRight, ReceiptText } from "lucide-react";
import { dashboard } from "@/data/dashboard";
import {
  ActivityList,
  MetricCard,
  TeamList,
  quickActions,
} from "@/components/dashboard/home-widgets";
import { EarningsChart } from "@/components/dashboard/earnings-chart";
import { OngoingProjects } from "@/components/dashboard/ongoing-projects";
import { SectionHeader } from "@/components/dashboard/ui";
import type {
  Navigate,
  OpenModal,
  SelectProject,
} from "@/components/dashboard/contracts";
import type { ActivityItem, Invoice, Project } from "@/types/workspace";

export function HomePage({
  projects,
  invoices,
  activity,
  period,
  setPeriod,
  openModal,
  navigate,
  selectProject,
}: {
  projects: Project[];
  invoices: Invoice[];
  activity: ActivityItem[];
  period: string;
  setPeriod: Dispatch<SetStateAction<string>>;
  openModal: OpenModal;
  navigate: Navigate;
  selectProject: SelectProject;
}) {
  const metrics = dashboard.metrics.map((metric) =>
    metric.id === "total"
      ? {
          ...metric,
          value: String(456 + projects.length - dashboard.projects.length),
        }
      : metric,
  );
  return (
    <div className="dashboard-content">
      <section className="metrics" aria-label="Project summary">
        {metrics.map((metric) => (
          <MetricCard key={metric.id} metric={metric} />
        ))}
      </section>
      <div className="lower-grid">
        <div className="home-main">
          <EarningsChart period={period} setPeriod={setPeriod} />
          <section className="panel ongoing-panel">
            <SectionHeader
              title="Open projects"
              action="All projects"
              onAction={() => navigate("projects")}
            />
            <OngoingProjects projects={projects} onSelect={selectProject} />
          </section>
        </div>
        <div className="home-side">
          <section className="quick-actions" aria-label="Quick actions">
            {quickActions.map(({ label, action, icon: Icon }) => (
              <button
                className="action-card"
                key={label}
                onClick={() =>
                  action.type === "modal"
                    ? openModal(action.modal)
                    : navigate(action.route)
                }
              >
                <span className="round-icon action-icon">
                  <Icon size={17} strokeWidth={1.7} />
                </span>
                <span>{label}</span>
                <ArrowRight className="action-arrow" size={15} />
              </button>
            ))}
          </section>
          <section className="panel team-panel">
            <SectionHeader title="My team" />
            <TeamList members={dashboard.team} />
          </section>
        </div>
      </div>
      <div className="detail-grid detail-grid-single">
        <section className="panel activity-panel">
          <SectionHeader title="Recent activity" />
          <ActivityList activity={activity} />
        </section>
      </div>
      <div className="summary-strip">
        <div>
          <span className="summary-symbol">
            <ReceiptText size={19} />
          </span>
          <span>
            <strong>
              {
                invoices.filter((item) => item.status === "Awaiting payment")
                  .length
              }{" "}
              invoices awaiting payment
            </strong>
          </span>
        </div>
        <button onClick={() => navigate("invoices")}>
          Open invoices <ArrowRight size={15} />
        </button>
      </div>
    </div>
  );
}
