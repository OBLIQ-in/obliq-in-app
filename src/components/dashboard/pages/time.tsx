import { Play, Square } from "lucide-react";
import { PageHeading, SectionHeader } from "@/components/dashboard/ui";
import { formatDate, formatTime } from "@/lib/format";
import type { Project, TimeEntry } from "@/types/workspace";
import type { TimerProject } from "@/lib/timer-state";

export function TimePage({
  seconds,
  running,
  saving,
  hasSession,
  toggleTimer,
  entries,
  projects,
  timerProject,
  setTimerProject,
}: {
  seconds: number;
  running: boolean;
  saving: boolean;
  hasSession: boolean;
  toggleTimer: () => void;
  entries: TimeEntry[];
  projects: Project[];
  timerProject: TimerProject | null;
  setTimerProject: (id: string) => void;
}) {
  return (
    <>
      <PageHeading eyebrow="WORKSPACE / TIME" title="Time tracking" />
      <div className="time-layout">
        <section className="panel timer-panel">
          <span className="timer-kicker">CURRENT SESSION</span>
          <strong>{formatTime(seconds)}</strong>
          <label>
            Project
            <select
              disabled={hasSession || saving}
              value={timerProject?.id || ""}
              onChange={(event) => setTimerProject(event.target.value)}
            >
              <option value="">Select a project</option>
              {timerProject &&
                !projects.some((item) => item.id === timerProject.id) && (
                  <option value={timerProject.id} disabled>
                    {timerProject.name} (unavailable)
                  </option>
                )}
              {projects.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name}
                </option>
              ))}
            </select>
          </label>
          <button
            className="primary-button"
            onClick={toggleTimer}
            disabled={
              saving ||
              (!hasSession &&
                !projects.some((item) => item.id === timerProject?.id))
            }
          >
            {running ? (
              <Square size={15} fill="currentColor" />
            ) : (
              <Play size={15} fill="currentColor" />
            )}
            {saving
              ? "Saving..."
              : running
                ? "Stop and save session"
                : hasSession
                  ? "Retry saving session"
                  : "Start timer"}
          </button>
          <p>Sessions are saved in this browser for this preview.</p>
        </section>
        <section className="panel page-panel">
          <SectionHeader
            title="Recent sessions"
            description={`${entries.length} recorded`}
          />
          <div className="table-scroll">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Project</th>
                  <th>Duration</th>
                </tr>
              </thead>
              <tbody>
                {entries.length ? (
                  entries.map((item) => (
                    <tr key={item.id}>
                      <td>{formatDate(item.date)}</td>
                      <td>{item.project}</td>
                      <td>{formatTime(item.seconds)}</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={3} className="empty-row">
                      Start the timer to record your first session.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </>
  );
}
