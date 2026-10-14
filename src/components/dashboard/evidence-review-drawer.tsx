import { useState } from "react";
import type React from "react";
import { Check, X } from "lucide-react";
import { useDialog } from "@/lib/use-dialog";
import { formatDate } from "@/lib/format";
import { ReviewStatus } from "@/components/dashboard/ui";
import {
  evidenceReviewStatuses,
  type Document,
  type DocumentReview,
  type EvidenceReviewStatus,
} from "@/types/workspace";

export function EvidenceReviewDrawer({
  document,
  review,
  close,
  save,
}: {
  document: Document;
  review: DocumentReview;
  close: () => void;
  save: (
    documentId: string,
    status: EvidenceReviewStatus,
    details: {
      rejectionReason?: string;
      clientMessage?: string;
      internalNote?: string;
    },
  ) => Promise<void>;
}) {
  const dialogRef = useDialog(close);
  const [status, setStatus] = useState<EvidenceReviewStatus>(review.status);
  const [rejectionReason, setRejectionReason] = useState(
    review.rejectionReason || "",
  );
  const [clientMessage, setClientMessage] = useState(
    review.clientMessage || "",
  );
  const [internalNote, setInternalNote] = useState(review.internalNote || "");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (saving) return;
    const trimmedReason = rejectionReason.trim();
    const trimmedMessage = clientMessage.trim();
    if (status === "Rejected" && !trimmedReason) {
      setError("A rejection reason is required.");
      return;
    }
    if (status === "More information required" && !trimmedMessage) {
      setError("Add a message the client can see.");
      return;
    }
    setError("");
    setSaving(true);
    try {
      await save(document.id, status, {
        rejectionReason: trimmedReason,
        clientMessage: trimmedMessage,
        internalNote: internalNote.trim(),
      });
      close();
    } catch (saveError) {
      setError(
        saveError instanceof Error
          ? saveError.message
          : "Unable to save this review.",
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <div
      className="drawer-backdrop"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) close();
      }}
    >
      <div
        ref={dialogRef}
        className="detail-drawer evidence-review-drawer"
        role="dialog"
        aria-modal="true"
        aria-labelledby="evidence-review-title"
      >
        <div className="drawer-top">
          <span>EVIDENCE REVIEW</span>
          <button
            className="icon-button"
            aria-label="Close review"
            onClick={close}
          >
            <X size={17} />
          </button>
        </div>
        <h2 id="evidence-review-title">{document.title}</h2>
        <p>
          {document.id} · {document.client}
        </p>
        <form className="review-form" onSubmit={submit}>
          <label className="review-field review-status-field">
            Review status
            <select
              value={status}
              onChange={(event) =>
                setStatus(event.target.value as EvidenceReviewStatus)
              }
            >
              {evidenceReviewStatuses.map((value) => (
                <option key={value} value={value}>
                  {value}
                </option>
              ))}
            </select>
          </label>
          {status === "Rejected" && (
            <label className="review-field">
              Rejection reason
              <textarea
                value={rejectionReason}
                onChange={(event) => setRejectionReason(event.target.value)}
                required
              />
            </label>
          )}
          {status === "More information required" && (
            <label className="review-field">
              Client-facing message
              <textarea
                value={clientMessage}
                onChange={(event) => setClientMessage(event.target.value)}
                required
              />
            </label>
          )}
          <label className="review-field">
            Internal reviewer note
            <textarea
              value={internalNote}
              onChange={(event) => setInternalNote(event.target.value)}
            />
          </label>
          {review.status === "Accepted" &&
            review.reviewer &&
            review.acceptedAt && (
              <p className="review-meta">
                Accepted by <strong>{review.reviewer}</strong> on{" "}
                {formatDate(review.acceptedAt)}
              </p>
            )}
          {review.clientMessage && (
            <div className="client-message">
              <small>Client-visible request</small>
              <p>{review.clientMessage}</p>
            </div>
          )}
          {error && (
            <p className="form-error" role="alert">
              {error}
            </p>
          )}
          <div className="modal-actions review-actions">
            <button type="button" className="secondary-button" onClick={close}>
              Cancel
            </button>
            <button type="submit" className="primary-button" disabled={saving}>
              <Check size={16} />
              {saving ? "Saving..." : "Save review"}
            </button>
          </div>
        </form>
        <section className="review-history">
          <h3>Review history</h3>
          {review.history.length ? (
            <ol>
              {review.history.map((event) => (
                <li className="review-history-item" key={event.id}>
                  <div className="review-history-head">
                    <ReviewStatus value={event.status} />
                    <span>
                      {event.actor} · {formatDate(event.timestamp)}
                    </span>
                  </div>
                  {event.rejectionReason && (
                    <p>
                      <strong>Reason</strong>
                      {event.rejectionReason}
                    </p>
                  )}
                  {event.clientMessage && (
                    <p>
                      <strong>Client message</strong>
                      {event.clientMessage}
                    </p>
                  )}
                  {event.internalNote && (
                    <p>
                      <strong>Internal note</strong>
                      {event.internalNote}
                    </p>
                  )}
                </li>
              ))}
            </ol>
          ) : (
            <p>No review changes yet.</p>
          )}
        </section>
      </div>
    </div>
  );
}
