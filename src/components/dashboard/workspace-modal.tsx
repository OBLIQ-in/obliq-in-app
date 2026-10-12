import { useDialog } from "@/lib/use-dialog";
import { useState } from "react";
import type React from "react";
import { Check, X } from "lucide-react";
import { parseDate } from "@/lib/format";
import type { Client, FormValues, ModalKind } from "@/types/workspace";

export function WorkspaceModal({
  kind,
  close,
  create,
  clients,
}: {
  kind: ModalKind;
  close: () => void;
  create: (kind: ModalKind, values: FormValues) => Promise<void>;
  clients: Client[];
}) {
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const heading = {
    invoice: "New invoice draft",
    proposal: "Draft a proposal",
    contract: "Create a contract",
    form: "Add a form",
    project: "New project",
    client: "Add a client",
  }[kind];
  const dialogRef = useDialog(close);
  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (saving) return;
    const form = new FormData(event.currentTarget);
    const values = {
      title: String(form.get("title") || "").trim(),
      client: String(form.get("client") || ""),
      amount: Number(form.get("amount")),
      due: String(form.get("due") || ""),
      contact: String(form.get("contact") || "").trim(),
      email: String(form.get("email") || "").trim(),
    };
    if (
      !values.title ||
      ((kind === "invoice" || kind === "project") && !parseDate(values.due))
    ) {
      setError("Enter a title and a valid due date.");
      return;
    }
    setError("");
    setSaving(true);
    try {
      await create(kind, values);
    } catch {
      setError("Unable to save. Your form is still here. Try again.");
    } finally {
      setSaving(false);
    }
  }
  return (
    <div
      className="modal-backdrop"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) close();
      }}
    >
      <div
        ref={dialogRef}
        className="modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-title"
      >
        <div className="modal-head">
          <div>
            <span>LOCAL WORKSPACE</span>
            <h2 id="modal-title">{heading}</h2>
          </div>
          <button
            className="icon-button"
            aria-label="Close dialog"
            onClick={close}
          >
            <X size={17} />
          </button>
        </div>
        <form onSubmit={submit}>
          <label>
            {kind === "client"
              ? "Client name"
              : kind === "invoice"
                ? "Invoice description"
                : kind === "project"
                  ? "Project name"
                  : "Document title"}
            <input
              name="title"
              required
              placeholder={
                kind === "project"
                  ? "e.g. Annual audit 2027"
                  : kind === "client"
                    ? "e.g. Acme Studio"
                    : "Enter a title"
              }
            />
          </label>
          {kind === "client" ? (
            <>
              <label>
                Primary contact
                <input name="contact" required placeholder="Contact name" />
              </label>
              <label>
                Email
                <input
                  name="email"
                  required
                  type="email"
                  placeholder="name@example.com"
                />
              </label>
            </>
          ) : (
            <label>
              Client
              <select
                name="client"
                required
                defaultValue={clients[0]?.name || ""}
              >
                {clients.map((item) => (
                  <option key={item.id} value={item.name}>
                    {item.name}
                  </option>
                ))}
              </select>
            </label>
          )}
          {kind === "invoice" && (
            <label>
              Amount (INR)
              <input
                name="amount"
                required
                type="number"
                min="1"
                step="1"
                placeholder="0"
              />
            </label>
          )}
          {(kind === "invoice" || kind === "project") && (
            <label>
              Due date
              <input name="due" required type="date" />
            </label>
          )}
          {error && (
            <p className="form-error" role="alert">
              {error}
            </p>
          )}
          <p className="modal-note">Saved in this browser. No email is sent.</p>
          <div className="modal-actions">
            <button type="button" className="secondary-button" onClick={close}>
              Cancel
            </button>
            <button type="submit" className="primary-button" disabled={saving}>
              <Check size={16} />
              {saving
                ? "Saving..."
                : `Save ${kind === "invoice" ? "draft" : kind}`}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
