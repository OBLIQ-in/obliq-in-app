import { useState } from "react";
import {
  FilterTabs,
  PageHeading,
  SectionHeader,
  Status,
} from "@/components/dashboard/ui";
import { formatDate } from "@/lib/format";
import type { OpenModal } from "@/components/dashboard/contracts";
import type { Document } from "@/types/workspace";

export function DocumentsPage({
  documents,
  openModal,
  query,
}: {
  documents: Document[];
  openModal: OpenModal;
  query: string;
}) {
  const [filter, setFilter] = useState("All");
  const visible = documents.filter(
    (item) =>
      (filter === "All" || item.type === filter) &&
      `${item.title} ${item.client}`
        .toLowerCase()
        .includes(query.toLowerCase()),
  );
  return (
    <>
      <PageHeading
        eyebrow="TOOLS / DOCUMENTS"
        title="Contracts & documents"
        action="New document"
        onAction={() => openModal("contract")}
      />
      <section className="panel page-panel">
        <div className="panel-toolbar">
          <SectionHeader
            title="Document library"
            description={`${visible.length} documents`}
          />
          <FilterTabs
            values={["All", "Contract", "Proposal", "Form"]}
            active={filter}
            setActive={setFilter}
          />
        </div>
        <div className="table-scroll">
          <table className="data-table">
            <thead>
              <tr>
                <th>Document</th>
                <th>Client</th>
                <th>Type</th>
                <th>Updated</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {visible.length ? (
                visible.map((item) => (
                  <tr key={item.id}>
                    <td>
                      <strong>{item.title}</strong>
                      <small>{item.id}</small>
                    </td>
                    <td>{item.client}</td>
                    <td>{item.type}</td>
                    <td>{formatDate(item.updated)}</td>
                    <td>
                      <Status value={item.status} />
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={5} className="empty-row">
                    No documents match this view.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </>
  );
}
