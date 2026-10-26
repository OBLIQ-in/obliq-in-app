"use client";

import { useState } from "react";
import { Check, Copy, Link, RotateCcw, X } from "lucide-react";
import { useShareLinks } from "@/lib/use-share-links";
import { SectionHeader, Status } from "@/components/dashboard/ui";
import type { NewShareLink } from "@/types/share";

function fmt(iso: string) {
  return new Date(iso).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  async function copy() {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }
  return (
    <button className="icon-button" onClick={copy} aria-label="Copy link">
      {copied ? <Check size={14} /> : <Copy size={14} />}
    </button>
  );
}

function NewLinkBanner({
  link,
  onDismiss,
}: {
  link: NewShareLink;
  onDismiss: () => void;
}) {
  const url = `${window.location.origin}${link.path}`;
  return (
    <div className="share-new-banner" role="alert">
      <div className="share-new-banner-row">
        <Link size={14} />
        <span>Link created — copy it now. It won&apos;t be shown again.</span>
        <button
          className="icon-button"
          onClick={onDismiss}
          aria-label="Dismiss"
        >
          <X size={14} />
        </button>
      </div>
      <div className="share-new-banner-url">
        <code>{url}</code>
        <CopyButton text={url} />
      </div>
    </div>
  );
}

function RevokeConfirm({
  onConfirm,
  onCancel,
  busy,
}: {
  onConfirm: () => void;
  onCancel: () => void;
  busy: boolean;
}) {
  return (
    <span className="share-revoke-confirm">
      Revoke this link?{" "}
      <button
        className="share-inline-btn share-inline-btn--danger"
        onClick={onConfirm}
        disabled={busy}
      >
        {busy ? "Revoking…" : "Yes, revoke"}
      </button>{" "}
      <button className="share-inline-btn" onClick={onCancel}>
        Cancel
      </button>
    </span>
  );
}

export function ShareLinksPanel({ engagementId }: { engagementId: string }) {
  const { links, loading, error, reload, create, revoke } =
    useShareLinks(engagementId);
  const [creating, setCreating] = useState(false);
  const [expiresInDays, setExpiresInDays] = useState(7);
  const [createError, setCreateError] = useState("");
  const [newLink, setNewLink] = useState<NewShareLink | null>(null);
  const [confirmId, setConfirmId] = useState<string | null>(null);
  const [revoking, setRevoking] = useState(false);
  const [revokeError, setRevokeError] = useState("");

  async function handleCreate() {
    setCreating(true);
    setCreateError("");
    setNewLink(null);
    try {
      setNewLink(await create(expiresInDays));
    } catch (err) {
      setCreateError(
        err instanceof Error ? err.message : "Failed to create link.",
      );
    } finally {
      setCreating(false);
    }
  }

  async function handleRevoke(linkId: string) {
    setRevoking(true);
    setRevokeError("");
    try {
      await revoke(linkId);
      setConfirmId(null);
    } catch (err) {
      setRevokeError(
        err instanceof Error ? err.message : "Failed to revoke link.",
      );
    } finally {
      setRevoking(false);
    }
  }

  return (
    <section className="panel page-panel">
      <SectionHeader
        title="Client share links"
        description="Links let clients access this engagement's workspace."
      />

      <div className="share-create-row">
        <label className="share-expiry-label">
          Expires in
          <select
            value={expiresInDays}
            onChange={(e) => setExpiresInDays(Number(e.target.value))}
            className="share-expiry-select"
          >
            {[1, 3, 7, 14, 30].map((d) => (
              <option key={d} value={d}>
                {d} {d === 1 ? "day" : "days"}
              </option>
            ))}
          </select>
        </label>
        <button
          className="primary-button"
          onClick={handleCreate}
          disabled={creating}
        >
          <RotateCcw size={14} />
          {creating ? "Generating…" : "Generate link"}
        </button>
      </div>

      {createError && (
        <p className="share-error" role="alert">
          {createError}
        </p>
      )}

      {newLink && (
        <NewLinkBanner link={newLink} onDismiss={() => setNewLink(null)} />
      )}

      {revokeError && (
        <p className="share-error" role="alert">
          {revokeError}
        </p>
      )}

      {loading ? (
        <p className="share-empty">Loading…</p>
      ) : error ? (
        <p className="share-error" role="alert">
          {error}{" "}
          <button className="share-inline-btn" onClick={reload}>
            Retry
          </button>
        </p>
      ) : links.length === 0 ? (
        <p className="share-empty">No links yet.</p>
      ) : (
        <div className="table-scroll">
          <table className="data-table">
            <thead>
              <tr>
                <th>Status</th>
                <th>Created by</th>
                <th>Created</th>
                <th>Expires</th>
                <th>Last accessed</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {links.map((link) => (
                <tr key={link.id}>
                  <td>
                    <Status value={link.state} />
                  </td>
                  <td>{link.createdBy}</td>
                  <td>{fmt(link.createdAt)}</td>
                  <td>{fmt(link.expiresAt)}</td>
                  <td>{link.lastUsedAt ? fmt(link.lastUsedAt) : "—"}</td>
                  <td>
                    {link.state === "active" &&
                      (confirmId === link.id ? (
                        <RevokeConfirm
                          onConfirm={() => handleRevoke(link.id)}
                          onCancel={() => setConfirmId(null)}
                          busy={revoking}
                        />
                      ) : (
                        <button
                          className="share-inline-btn share-inline-btn--danger"
                          onClick={() => setConfirmId(link.id)}
                        >
                          Revoke
                        </button>
                      ))}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
