import type { ModalKind, Project } from "@/types/workspace";
import type { Route } from "@/lib/routes";

export type Navigate = (slug: Route) => void;

export type OpenModal = (kind: ModalKind) => void;

export type SelectProject = (project: Project) => void;
