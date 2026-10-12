import type { Project } from "@/types/workspace";
import type { SelectProject } from "./contracts";
import { Status } from "./ui";
import { formatDate } from "@/lib/format";

export function ProjectTable({
  projects,
  onSelect,
  compact = false,
}: {
  projects: Project[];
  onSelect: SelectProject;
  compact?: boolean;
}) {
  return (
    <div className="table-scroll">
      <table className="data-table">
        <thead>
          <tr>
            <th>Project</th>
            <th>Client</th>
            <th>Status</th>
            <th>Progress</th>
            <th>Due date</th>
          </tr>
        </thead>
        <tbody>
          {projects.length ? (
            projects.map((item) => (
              <tr
                key={item.id}
                className="row-clickable"
                onClick={() => onSelect(item)}
              >
                <td>
                  <button type="button" className="row-link">
                    <strong>{item.name}</strong>
                  </button>
                  <small>
                    {item.id} · {item.category}
                  </small>
                </td>
                <td>{item.client}</td>
                <td>
                  <Status value={item.status} />
                </td>
                <td>
                  <div className="progress-cell">
                    <span className="progress-track">
                      <span style={{ width: `${item.progress}%` }} />
                    </span>
                    <small>{item.progress}%</small>
                  </div>
                </td>
                <td>{formatDate(item.due)}</td>
              </tr>
            ))
          ) : (
            <tr>
              <td colSpan={5} className="empty-row">
                No projects match this view.
              </td>
            </tr>
          )}
        </tbody>
      </table>
      {compact && (
        <div className="table-bottom-note">
          Select a project to see its details.
        </div>
      )}
    </div>
  );
}
