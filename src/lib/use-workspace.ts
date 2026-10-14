"use client";

import { useCallback, useEffect, useState } from "react";
import { workspaceSource } from "./workspace-source";
import type {
  FormValues,
  ModalKind,
  EvidenceReviewStatus,
  WorkspaceData,
  WorkspaceSource,
} from "@/types/workspace";

const emptyWorkspace: WorkspaceData = {
  projects: [],
  clients: [],
  invoices: [],
  documents: [],
  reviews: [],
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
    let cancelled = false;

    async function loadInitialWorkspace() {
      try {
        const result = await source.load();

        if (!cancelled) {
          setData(result);
          setError("");
        }
      } catch {
        if (!cancelled) {
          setError("Unable to load the workspace. Try again.");
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void loadInitialWorkspace();

    return () => {
      cancelled = true;
    };
  }, [source]);

  async function create(kind: ModalKind, values: FormValues) {
    setData(await source.create(kind, values));
  }

  async function saveTime(project: string, seconds: number) {
    setData(await source.saveTime(project, seconds));
  }

  async function reviewDocument(
    documentId: string,
    status: EvidenceReviewStatus,
    details: {
      rejectionReason?: string;
      clientMessage?: string;
      internalNote?: string;
    },
  ) {
    setData(await source.reviewDocument(documentId, status, details));
  }

  return {
    ...data,
    loading,
    error,
    reload,
    create,
    reviewDocument,
    saveTime,
  };
}
