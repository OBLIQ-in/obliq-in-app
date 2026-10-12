"use client";

import { useEffect, useRef, useState } from "react";
import {
  elapsedSeconds,
  emptyTimer,
  readTimer,
  startSession,
  writeTimer,
} from "./timer-state";
import type { TimerProject, TimerState } from "./timer-state";

function browserStorage() {
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

export function useTimer() {
  const [state, setState] = useState(emptyTimer);
  const current = useRef(state);
  const [now, setNow] = useState(0);
  const [ready, setReady] = useState(false);
  const [storageError, setStorageError] = useState(false);
  const running = !!state.session && state.session.stoppedAt === null;

  useEffect(() => {
    const storage = browserStorage();
    current.current = readTimer(storage);
    setState(current.current);
    setNow(Date.now());
    setStorageError(!storage);
    setReady(true);
  }, []);

  useEffect(() => {
    if (!running) return;
    const interval = window.setInterval(() => setNow(Date.now()), 250);
    return () => window.clearInterval(interval);
  }, [running]);

  function update(next: TimerState) {
    current.current = next;
    setState(next);
    setStorageError(!writeTimer(browserStorage(), next));
  }

  function selectProject(project: TimerProject) {
    if (current.current.session) return;
    update({ project: { id: project.id, name: project.name }, session: null });
  }

  function start(project: TimerProject) {
    if (!ready || current.current.session) return;
    const startedAt = Date.now();
    const session = startSession(project, startedAt);
    update({ project: session.project, session });
    setNow(startedAt);
  }

  function stop() {
    const session = current.current.session;
    if (!session) return null;
    const stopped = {
      ...session,
      stoppedAt: session.stoppedAt ?? Math.max(session.startedAt, Date.now()),
    };
    update({ project: stopped.project, session: stopped });
    return {
      project: stopped.project,
      seconds: elapsedSeconds(stopped, stopped.stoppedAt),
    };
  }

  function reset() {
    update({ project: current.current.project, session: null });
  }

  return {
    project: state.session?.project || state.project,
    hasSession: !!state.session,
    seconds: elapsedSeconds(state.session, now),
    running,
    ready,
    storageError,
    selectProject,
    start,
    stop,
    reset,
  };
}
