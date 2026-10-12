import { ChevronDown } from "lucide-react";
import { Avatar } from "@/components/dashboard/home-widgets";
import type { SelectProject } from "@/components/dashboard/contracts";
import { formatDate } from "@/lib/format";
import type { Project } from "@/types/workspace";

const groups = [
  {
    title: "Ongoing",
    tone: "ongoing",
    statuses: ["Planning", "In progress"],
  },
  { title: "In Review", tone: "review", statuses: ["Review"] },
];

// The home table: open work grouped by stage, like the dashboard design.
// Completed projects stay on the Projects page.
export function OngoingProjects({
  projects,
  onSelect,
}: {
  projects: Project[];
  onSelect: SelectProject;
}) {
  return (
    <div className="ongoing">
      {groups.map((group) => {
        const rows = projects
          .filter((item) => group.statuses.includes(item.status))
          .sort((a, b) => a.due.localeCompare(b.due));
        return (
          <details key={group.title} className="ongoing-group" open>
            <summary className={`ongoing-summary ${group.tone}`}>
              <ChevronDown size={14} aria-hidden="true" />
              <span>{group.title}</span>
              <b>{rows.length}</b>
            </summary>
            <div className="table-scroll">
              <table className="data-table ongoing-table">
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Client</th>
                    <th>Priority</th>
                    <th>Deadline</th>
                    <th>Assigned team</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.length ? (
                    rows.map((item) => {
                      const priority = item.priority ?? "Medium";
                      return (
                        <tr
                          key={item.id}
                          className={`row-clickable row-${group.tone}`}
                          onClick={() => onSelect(item)}
                        >
                          <td>
                            <button type="button" className="row-link">
                              <strong>{item.name}</strong>
                            </button>
                          </td>
                          <td>{item.client}</td>
                          <td>
                            <span
                              className={`priority priority-${priority.toLowerCase()}`}
                            >
                              {priority}
                            </span>
                          </td>
                          <td>{formatDate(item.due)}</td>
                          <td>
                            <span className="avatar-stack">
                              {(item.team?.length
                                ? item.team
                                : [item.lead]
                              ).map((person, index) => (
                                <Avatar
                                  key={`${person}-${index}`}
                                  name={person}
                                />
                              ))}
                            </span>
                          </td>
                        </tr>
                      );
                    })
                  ) : (
                    <tr>
                      <td colSpan={5} className="empty-row">
                        Nothing here right now.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </details>
        );
      })}
    </div>
  );
}
