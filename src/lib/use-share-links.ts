"use client";

import { useCallback, useEffect, useState } from "react";
import type { NewShareLink, ShareLink } from "@/types/share";

export function useShareLinks(engagementId: string) {
  const [links, setLinks] = useState<ShareLink[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const reload = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`/api/engagements/${engagementId}/share-links`);
      if (!res.ok) throw new Error();
      setLinks(await res.json());
    } catch {
      setError("Unable to load share links.");
    } finally {
      setLoading(false);
    }
  }, [engagementId]);

  useEffect(() => {
    void reload();
  }, [reload]);

  async function create(expiresInDays: number): Promise<NewShareLink> {
    const res = await fetch(`/api/engagements/${engagementId}/share-links`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ expiresInDays }),
    });
    if (!res.ok)
      throw new Error((await res.json()).error ?? "Failed to create link");
    const link: NewShareLink = await res.json();
    setLinks((prev) => [link, ...prev]);
    return link;
  }

  async function revoke(linkId: string) {
    const res = await fetch(
      `/api/engagements/${engagementId}/share-links/${linkId}`,
      { method: "DELETE" },
    );
    if (!res.ok)
      throw new Error((await res.json()).error ?? "Failed to revoke link");
    const updated: ShareLink[] = await res.json();
    setLinks(updated);
  }

  return { links, loading, error, reload, create, revoke };
}
