"use client";

import { useCallback, useEffect, useState } from "react";
import {
  FilterTabs,
  PageHeading,
  SectionHeader,
  Status,
} from "@/components/dashboard/ui";
import { ShareLinksPanel } from "@/components/dashboard/share-links-panel";
import type { Engagement } from "@/types/engagement";

export function EngagementsPage({ query }: { query: string }) {
  const [engagements, setEngagements] = useState<Engagement[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [filter, setFilter] = useState("All");
  const [selected, setSelected] = useState<Engagement | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/engagements");
      if (!res.ok) throw new Error();
      setEngagements(await res.json());
    } catch {
      setError("Unable to load engagements.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const visible = engagements.filter(
    (e) =>
      (filter === "All" || e.status === filter) &&
      `${e.title} ${e.client} ${e.financialYear}`
        .toLowerCase()
        .includes(query.toLowerCase()),
  );

  return (
    <>
      <PageHeading eyebrow="WORKSPACE / ENGAGEMENTS" title="Engagements" />

      {loading && <p role="status">Loading…</p>}
      {error && (
        <p role="alert" style={{ color: "#b24554", fontSize: 11 }}>
          {error}{" "}
          <button className="share-inline-btn" onClick={load}>
            Retry
          </button>
        </p>
      )}

      {!loading && !error && (
        <section className="panel page-panel">
          <div className="panel-toolbar">
            <SectionHeader
              title="All engagements"
              description={`${visible.length} in this view`}
            />
            <FilterTabs
              values={[
                "All",
                "Draft",
                "Active",
                "Review",
                "Complete",
                "Archived",
              ]}
              active={filter}
              setActive={setFilter}
            />
          </div>
          <div className="table-scroll">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Title</th>
                  <th>Client</th>
                  <th>Year</th>
                  <th>Type</th>
                  <th>Reviewer</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {visible.length ? (
                  visible.map((e) => (
                    <tr
                      key={e.id}
                      className="row-clickable"
                      onClick={() => setSelected(e)}
                      aria-selected={selected?.id === e.id}
                    >
                      <td>
                        <button className="row-link">{e.title}</button>
                      </td>
                      <td>{e.client}</td>
                      <td>{e.financialYear}</td>
                      <td>{e.type}</td>
                      <td>{e.reviewer}</td>
                      <td>
                        <Status value={e.status} />
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={6} className="empty-row">
                      No engagements match your search.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {selected && (
        <div style={{ marginTop: 16 }}>
          <ShareLinksPanel engagementId={selected.id} />
        </div>
      )}
    </>
  );
}
