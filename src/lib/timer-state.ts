export type TimerProject = { id: string; name: string };
export type TimerSession = {
  project: TimerProject;
  startedAt: number;
  stoppedAt: number | null;
};
export type TimerState = {
  project: TimerProject | null;
  session: TimerSession | null;
};
type TimerStorage = Pick<Storage, "getItem" | "setItem">;

export const emptyTimer: TimerState = { project: null, session: null };
const storageKey = "obliq-preview-timer-v1";

function isProject(value: unknown): value is TimerProject {
  return (
    !!value &&
    typeof value === "object" &&
    "id" in value &&
    typeof value.id === "string" &&
    value.id.length > 0 &&
    "name" in value &&
    typeof value.name === "string" &&
    value.name.length > 0
  );
}

function isSession(value: unknown): value is TimerSession {
  return (
    !!value &&
    typeof value === "object" &&
    "project" in value &&
    isProject(value.project) &&
    "startedAt" in value &&
    typeof value.startedAt === "number" &&
    Number.isSafeInteger(value.startedAt) &&
    value.startedAt > 0 &&
    "stoppedAt" in value &&
    (value.stoppedAt === null ||
      (typeof value.stoppedAt === "number" &&
        Number.isSafeInteger(value.stoppedAt) &&
        value.stoppedAt >= value.startedAt))
  );
}

export function readTimer(storage: TimerStorage | null): TimerState {
  try {
    const saved = storage?.getItem(storageKey);
    const value: unknown = saved ? JSON.parse(saved) : null;
    if (
      value &&
      typeof value === "object" &&
      "project" in value &&
      (value.project === null || isProject(value.project)) &&
      "session" in value &&
      (value.session === null || isSession(value.session))
    ) {
      return {
        project: value.session?.project || value.project,
        session: value.session,
      };
    }
  } catch {
    /* Invalid or unavailable storage starts with no selected project. */
  }
  return emptyTimer;
}

export function writeTimer(storage: TimerStorage | null, state: TimerState) {
  try {
    if (!storage) return false;
    storage.setItem(storageKey, JSON.stringify(state));
    return true;
  } catch {
    return false;
  }
}

export function elapsedSeconds(session: TimerSession | null, now: number) {
  return session
    ? Math.max(
        0,
        Math.floor(((session.stoppedAt ?? now) - session.startedAt) / 1000),
      )
    : 0;
}

export function startSession(project: TimerProject, now: number): TimerSession {
  return {
    project: { id: project.id, name: project.name },
    startedAt: now,
    stoppedAt: null,
  };
}
