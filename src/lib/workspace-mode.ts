export type WorkspaceMode = "local" | "api";

export function getWorkspaceMode(env: {
  nodeEnv?: string;
  appEnv?: string;
  configuredSource?: string;
}): WorkspaceMode {
  const { nodeEnv, appEnv, configuredSource } = env;
  if (
    appEnv !== undefined &&
    !["development", "staging", "production"].includes(appEnv)
  ) {
    throw new Error(
      `APP_ENV must be development, staging, or production; received "${appEnv}".`,
    );
  }
  if (
    configuredSource !== undefined &&
    configuredSource !== "api" &&
    configuredSource !== "local"
  ) {
    throw new Error(
      `NEXT_PUBLIC_WORKSPACE_SOURCE must be api or local; received "${configuredSource}".`,
    );
  }

  const deployed =
    nodeEnv === "production" || appEnv === "staging" || appEnv === "production";
  if (deployed && configuredSource === "local") {
    throw new Error(
      "Browser fixture workspaces are only available in development; configure NEXT_PUBLIC_WORKSPACE_SOURCE=api.",
    );
  }

  return deployed || configuredSource === "api" ? "api" : "local";
}
