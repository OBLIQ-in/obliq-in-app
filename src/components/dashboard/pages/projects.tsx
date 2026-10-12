import { useState } from "react";
import {
  FilterTabs,
  PageHeading,
  SectionHeader,
} from "@/components/dashboard/ui";
import { ProjectTable } from "@/components/dashboard/project-table";
import type {
  OpenModal,
  SelectProject,
} from "@/components/dashboard/contracts";
import type { Project } from "@/types/workspace";

export function ProjectsPage({
  projects,
  openModal,
  selectProject,
  query,
}: {
  projects: Project[];
  openModal: OpenModal;
  selectProject: SelectProject;
  query: string;
}) {
  const [filter, setFilter] = useState("All");
  const visible = projects.filter(
    (item) =>
      (filter === "All" || item.status === filter) &&
      `${item.name} ${item.client} ${item.id}`
        .toLowerCase()
        .includes(query.toLowerCase()),
  );
  return (
    <>
      <PageHeading
        eyebrow="WORKSPACE / PROJECTS"
        title="Projects"
        action="New project"
        onAction={() => openModal("project")}
      />
      <section className="panel page-panel">
        <div className="panel-toolbar">
          <SectionHeader
            title="All projects"
            description={`${visible.length} in this view`}
          />
          <FilterTabs
            values={["All", "In progress", "Review", "Planning", "Completed"]}
            active={filter}
            setActive={setFilter}
          />
        </div>
        <ProjectTable projects={visible} onSelect={selectProject} />
      </section>
    </>
  );
}
