"use client";

import { useCallback, useEffect, useState } from "react";
import { workspaceSource } from "./workspace-source";
import type {
  FormValues,
  ModalKind,
  WorkspaceData,
  WorkspaceSource,
} from "@/types/workspace";

const emptyWorkspace: WorkspaceData = {
  projects: [],
  clients: [],
  invoices: [],
  documents: [],
  activity: [],
  entries: [],
};

export function useWorkspace(source: WorkspaceSource = workspaceSource) {
  const [data, setData] = useState(emptyWorkspace);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const reload = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      setData(await source.load());
    } catch {
      setError("Unable to load the workspace. Try again.");
    } finally {
      setLoading(false);
    }
  }, [source]);

  useEffect(() => {
    void reload();
  }, [reload]);

  async function create(kind: ModalKind, values: FormValues) {
    setData(await source.create(kind, values));
  }

  async function saveTime(project: string, seconds: number) {
    setData(await source.saveTime(project, seconds));
  }

  return { ...data, loading, error, reload, create, saveTime };
}
