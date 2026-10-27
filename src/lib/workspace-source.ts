import { createApiWorkspace } from "./api-workspace-source.ts";
import { getWorkspaceMode } from "./workspace-mode.ts";
import type { WorkspaceSource } from "@/types/workspace";

function createLocalWorkspaceLoader(): WorkspaceSource {
  let source: Promise<WorkspaceSource> | undefined;
  const getSource = () =>
    (source ??= import("./local-workspace-source.ts").then(
      ({ createLocalWorkspace }) =>
        createLocalWorkspace(() => window.localStorage),
    ));

  return {
    async load() {
      return (await getSource()).load();
    },
    async create(kind, values) {
      return (await getSource()).create(kind, values);
    },
    async saveTime(project, seconds) {
      return (await getSource()).saveTime(project, seconds);
    },
  };
}

// Deployed environments must use the API; fixtures load only in development.
export const workspaceSource =
  getWorkspaceMode({
    nodeEnv: process.env.NODE_ENV,
    appEnv: process.env.NEXT_PUBLIC_APP_ENV,
    configuredSource: process.env.NEXT_PUBLIC_WORKSPACE_SOURCE,
  }) === "api"
    ? createApiWorkspace()
    : createLocalWorkspaceLoader();
