import { useState } from "react";
import { Check, Eye, FileText, Lock, Save, ShieldCheck } from "lucide-react";
import {
  FilterTabs,
  PageHeading,
  SectionHeader,
  Status,
} from "@/components/dashboard/ui";
import { formatDate } from "@/lib/format";
import type { OpenModal } from "@/components/dashboard/contracts";
import type { ClientInstructions, Document } from "@/types/workspace";
import type { Route } from "@/lib/routes";

export function DocumentsPage({
  documents,
  openModal,
  query,
  instructions,
  saveInstructions,
  navigate,
}: {
  documents: Document[];
  openModal: OpenModal;
  query: string;
  instructions: ClientInstructions;
  saveInstructions: (
    instructions: string,
    internalNotes: string,
  ) => Promise<void>;
  navigate: (slug: Route) => void;
}) {
  const [activeTab, setActiveTab] = useState<"library" | "instructions">(
    "library",
  );
  const [filter, setFilter] = useState("All");

  // Instructions form state
  const [instructionsText, setInstructionsText] = useState(
    instructions.instructions,
  );
  const [internalNotesText, setInternalNotesText] = useState(
    instructions.internalNotes,
  );
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [saveError, setSaveError] = useState("");

  const visible = documents.filter(
    (item) =>
      (filter === "All" || item.type === filter) &&
      `${item.title} ${item.client}`
        .toLowerCase()
        .includes(query.toLowerCase()),
  );

  async function handleSaveInstructions(event: React.FormEvent) {
    event.preventDefault();
    setSaving(true);
    setSaveError("");
    setSaveSuccess(false);

    try {
      await saveInstructions(instructionsText, internalNotesText);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch {
      setSaveError("Failed to save instructions. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <PageHeading
        eyebrow="TOOLS / DOCUMENTS"
        title="Contracts & documents"
        action="New document"
        onAction={() => openModal("contract")}
      />

      <div className="tab-nav-bar">
        <button
          type="button"
          className={`tab-nav-btn ${activeTab === "library" ? "active" : ""}`}
          onClick={() => setActiveTab("library")}
        >
          Document library
        </button>
        <button
          type="button"
          className={`tab-nav-btn ${activeTab === "instructions" ? "active" : ""}`}
          onClick={() => setActiveTab("instructions")}
        >
          Client instructions editor
        </button>
      </div>

      {activeTab === "library" ? (
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
      ) : (
        <section className="panel page-panel instructions-editor-panel">
          <div className="panel-toolbar">
            <SectionHeader
              title="Client instructions & internal notes"
              description="Configure public client guidance and private firm review notes"
            />
            <button
              type="button"
              className="secondary-button"
              onClick={() => navigate("client-portal")}
            >
              <Eye size={14} />
              Preview client view
            </button>
          </div>

          <form onSubmit={handleSaveInstructions} className="instructions-form">
            <div className="form-section">
              <div className="form-section-header">
                <FileText size={16} />
                <div>
                  <label htmlFor="client-instructions-input">
                    <strong>Client-facing instructions</strong>
                  </label>
                  <p className="field-hint">
                    Visible to the client on their submission page before they
                    upload files.
                  </p>
                </div>
              </div>
              <textarea
                id="client-instructions-input"
                name="clientInstructions"
                rows={6}
                value={instructionsText}
                onChange={(e) => setInstructionsText(e.target.value)}
                required
                className="instructions-textarea"
                placeholder="Enter document submission guidelines for clients..."
              />
            </div>

            <div className="form-section private-section">
              <div className="form-section-header">
                <Lock size={16} className="lock-icon" />
                <div>
                  <div className="private-badge-row">
                    <label htmlFor="internal-notes-input">
                      <strong>Firm internal notes</strong>
                    </label>
                    <span className="private-badge">
                      <ShieldCheck size={12} />
                      Private — Firm staff only
                    </span>
                  </div>
                  <p className="field-hint">
                    Never shown or serialized to the client. Use for audit
                    checklists, risk flags, and verification notes.
                  </p>
                </div>
              </div>
              <textarea
                id="internal-notes-input"
                name="internalNotes"
                rows={4}
                value={internalNotesText}
                onChange={(e) => setInternalNotesText(e.target.value)}
                className="instructions-textarea private-textarea"
                placeholder="Internal audit checklist, reviewer notes, or cross-check instructions..."
              />
            </div>

            {saveError && (
              <p className="form-error" role="alert">
                {saveError}
              </p>
            )}

            {saveSuccess && (
              <p className="form-success" role="status">
                <Check size={14} />
                Instructions saved successfully.
              </p>
            )}

            <div className="form-actions">
              <button
                type="submit"
                className="primary-button"
                disabled={saving}
              >
                <Save size={14} />
                {saving ? "Saving..." : "Save changes"}
              </button>
              <small className="last-saved">
                Last updated: {formatDate(instructions.updatedAt)}
              </small>
            </div>
          </form>
        </section>
      )}
    </>
  );
}
