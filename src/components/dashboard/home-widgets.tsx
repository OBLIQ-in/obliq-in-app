import {
  Activity,
  BriefcaseBusiness,
  CalendarCheck2,
  ClipboardList,
  Clock3,
  FilePenLine,
  FileText,
  FolderPlus,
  Landmark,
  ReceiptText,
  Send,
} from "lucide-react";
import { initials } from "@/lib/format";
import { formatRelativeTime } from "@/lib/format";
import type { Route } from "@/lib/routes";
import type {
  ActivityItem,
  Metric,
  ModalKind,
  TeamMember,
} from "@/types/workspace";

export const homeMetrics: Metric[] = [
  { id: "total", label: "Total projects", icon: "briefcase" },
  { id: "active", label: "Active projects", icon: "edit" },
  { id: "completed", label: "Completed projects", icon: "calendar" },
  { id: "hours", label: "Total hours worked", icon: "clock" },
];

// A quick action either opens a form or goes to a page, never neither.
export type QuickAction = {
  label: string;
  icon: typeof ReceiptText;
  action: { type: "modal"; modal: ModalKind } | { type: "route"; route: Route };
};

export const quickActions: QuickAction[] = [
  {
    label: "Send an invoice",
    icon: ReceiptText,
    action: { type: "modal", modal: "invoice" },
  },
  {
    label: "Draft a proposal",
    icon: Send,
    action: { type: "modal", modal: "proposal" },
  },
  {
    label: "Create a contract",
    icon: ClipboardList,
    action: { type: "modal", modal: "contract" },
  },
  {
    label: "Add a form",
    icon: FileText,
    action: { type: "modal", modal: "form" },
  },
  {
    label: "Create a project",
    icon: FolderPlus,
    action: { type: "modal", modal: "project" },
  },
  {
    label: "File Tax",
    icon: Landmark,
    action: { type: "route", route: "taxes" },
  },
];

const metricIcons = {
  briefcase: BriefcaseBusiness,
  edit: FilePenLine,
  calendar: CalendarCheck2,
  clock: Clock3,
};

export function MetricCard({
  metric,
  value,
}: {
  metric: Metric;
  value: string;
}) {
  const Icon = metricIcons[metric.icon];
  return (
    <article className="metric-card">
      <div className="metric-label">
        <span className="round-icon">
          <Icon size={17} strokeWidth={1.7} />
        </span>
        <span>{metric.label}</span>
      </div>
      <div className="metric-bottom">
        <strong>{value}</strong>
      </div>
    </article>
  );
}

export function ActivityList({ activity }: { activity: ActivityItem[] }) {
  return (
    <div className="activity-list">
      {activity.slice(0, 5).map((item) => (
        <div className="activity-item" key={item.id}>
          <span className="activity-mark">
            <Activity size={15} />
          </span>
          <div>
            <p>
              <strong>{item.person}</strong> {item.action} <b>{item.subject}</b>
            </p>
            <small>
              {item.createdAt ? formatRelativeTime(item.createdAt) : item.time}
            </small>
          </div>
        </div>
      ))}
    </div>
  );
}

export function Avatar({ name }: { name: string }) {
  return (
    <span className="avatar" title={name}>
      {/^[A-Z]{1,3}$/.test(name) ? name : initials(name)}
    </span>
  );
}

export function TeamList({ members }: { members: TeamMember[] }) {
  return (
    <ul className="team-list">
      {members.map((member) => (
        <li key={member.id}>
          <Avatar name={member.name} />
          <span>
            <strong>{member.name}</strong>
            <small>{member.role}</small>
          </span>
        </li>
      ))}
    </ul>
  );
}
