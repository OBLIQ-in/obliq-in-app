import { useDialog } from "@/lib/use-dialog";
import { X } from "lucide-react";
import { Status } from "@/components/dashboard/ui";
import { formatDate } from "@/lib/format";
import type { Project } from "@/types/workspace";

export function ProjectDrawer({
  project,
  close,
}: {
  project: Project;
  close: () => void;
}) {
  const dialogRef = useDialog(close);
  return (
    <div
      className="drawer-backdrop"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) close();
      }}
    >
      <div
        ref={dialogRef}
        className="detail-drawer"
        role="dialog"
        aria-modal="true"
        aria-labelledby="project-drawer-title"
      >
        <div className="drawer-top">
          <span>PROJECT DETAILS</span>
          <button
            className="icon-button"
            aria-label="Close project details"
            onClick={close}
          >
            <X size={17} />
          </button>
        </div>
        <h2 id="project-drawer-title">{project.name}</h2>
        <p>
          {project.id} · {project.category}
        </p>
        <div className="drawer-facts">
          <div>
            <small>Client</small>
            <strong>{project.client}</strong>
          </div>
          <div>
            <small>Status</small>
            <Status value={project.status} />
          </div>
          <div>
            <small>Due date</small>
            <strong>{formatDate(project.due)}</strong>
          </div>
          <div>
            <small>Lead</small>
            <strong>{project.lead}</strong>
          </div>
        </div>
        <div className="drawer-progress">
          <div>
            <strong>Progress</strong>
            <span>{project.progress}%</span>
          </div>
          <span className="progress-track">
            <span style={{ width: `${project.progress}%` }} />
          </span>
        </div>
      </div>
    </div>
  );
}
