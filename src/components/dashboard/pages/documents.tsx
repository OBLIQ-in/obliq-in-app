import { useState } from "react";
import {
  FilterTabs,
  PageHeading,
  SectionHeader,
  Status,
} from "@/components/dashboard/ui";
import { formatDate } from "@/lib/format";
import type { OpenModal } from "@/components/dashboard/contracts";
import type { Document, DocumentReview } from "@/types/workspace";
import { ReviewStatus } from "@/components/dashboard/ui";

export function DocumentsPage({
  documents,
  openModal,
  query,
  reviews,
  selectDocument,
}: {
  documents: Document[];
  openModal: OpenModal;
  query: string;
  reviews: DocumentReview[];
  selectDocument: (document: Document) => void;
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
                <th>Review</th>
                <th>Action</th>
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
                    <td>
                      <ReviewStatus
                        value={
                          reviews.find(
                            (review) => review.documentId === item.id,
                          )?.status || "Received"
                        }
                      />
                    </td>
                    <td>
                      <button
                        className="text-action"
                        onClick={() => selectDocument(item)}
                      >
                        Review
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={7} className="empty-row">
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
