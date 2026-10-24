"use client";

import { useState } from "react";
import {
  AlertCircle,
  ArrowLeft,
  CheckCircle2,
  FileCheck2,
  FileText,
  FileUp,
  FolderArchive,
  Info,
  ShieldCheck,
  UploadCloud,
  X,
} from "lucide-react";
import { formatDate } from "@/lib/format";
import { isAcceptedFileType } from "@/lib/file-validation";
import type { PublicClientInstructions } from "@/types/workspace";

type SelectedFile = {
  id: string;
  name: string;
  size: number;
  type: string;
};

export function ClientPortalPage({
  instructions,
  onBackToFirm,
}: {
  instructions: PublicClientInstructions;
  onBackToFirm?: () => void;
}) {
  const [selectedFiles, setSelectedFiles] = useState<SelectedFile[]>([]);
  const [submitted, setSubmitted] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [error, setError] = useState("");

  function validateAndAddFiles(files: FileList | File[]) {
    setError("");
    const newFiles: SelectedFile[] = [];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const isAccepted = isAcceptedFileType(file.name, file.type);

      if (!isAccepted) {
        setError(
          `"${file.name}" is not a supported format. Please upload PDF, JPEG, or PNG files only.`,
        );
        return;
      }

      const extension = file.name.split(".").pop()?.toUpperCase() || "DOC";
      newFiles.push({
        id: `${file.name}-${file.size}-${Date.now()}-${Math.random()}`,
        name: file.name,
        size: file.size,
        type: file.type || extension,
      });
    }

    setSelectedFiles((prev) => [...prev, ...newFiles]);
    setSubmitted(false);
  }

  function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    if (event.target.files && event.target.files.length > 0) {
      validateAndAddFiles(event.target.files);
    }
  }

  function handleDrop(event: React.DragEvent<HTMLDivElement>) {
    event.preventDefault();
    setDragOver(false);
    if (event.dataTransfer.files && event.dataTransfer.files.length > 0) {
      validateAndAddFiles(event.dataTransfer.files);
    }
  }

  function removeFile(id: string) {
    setSelectedFiles((prev) => prev.filter((item) => item.id !== id));
  }

  function formatBytes(bytes: number) {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
  }

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (selectedFiles.length === 0) {
      setError("Please select at least one document before submitting.");
      return;
    }
    setSubmitted(true);
    setError("");
  }

  return (
    <div className="client-portal-layout">
      {onBackToFirm && (
        <div className="portal-top-bar">
          <button
            type="button"
            className="secondary-button portal-back-button"
            onClick={onBackToFirm}
          >
            <ArrowLeft size={14} />
            Back to firm workspace
          </button>
          <span className="preview-badge">
            <Info size={13} />
            Client view preview
          </span>
        </div>
      )}

      <header className="client-portal-header">
        <div className="portal-eyebrow">
          <ShieldCheck size={14} />
          <span>CLIENT DOCUMENT PORTAL</span>
        </div>
        <h1>{instructions.title}</h1>
        <p>
          Last updated by your audit and advisory firm on{" "}
          <strong>{formatDate(instructions.updatedAt)}</strong>
        </p>
      </header>

      {/* Acceptance Criteria 2: Instructions visible before upload */}
      <section
        className="panel instructions-panel"
        aria-labelledby="instructions-heading"
      >
        <div className="panel-header">
          <FileText size={18} />
          <h2 id="instructions-heading">Submission instructions</h2>
        </div>

        <div className="instructions-body">
          <p className="instructions-text">{instructions.instructions}</p>
        </div>

        {/* Acceptance Criteria 3 & 4: Guidance cards */}
        <div className="guidance-grid">
          <div className="guidance-card">
            <div className="guidance-card-header">
              <FileCheck2 size={16} />
              <strong>Arbitrary filenames</strong>
            </div>
            <p>
              Filenames can be arbitrary. You do not need to rename your files
              before submitting. Original filenames (e.g. scan_001.pdf,
              invoice.jpg) are fully supported.
            </p>
          </div>

          <div className="guidance-card">
            <div className="guidance-card-header">
              <FolderArchive size={16} />
              <strong>Individual or compiled PDF</strong>
            </div>
            <p>
              You may submit your evidence as individual documents or as a
              single compiled PDF containing multiple records.
            </p>
          </div>

          <div className="guidance-card">
            <div className="guidance-card-header">
              <FileUp size={16} />
              <strong>Supported formats</strong>
            </div>
            <p>
              PDF (<code>.pdf</code>), JPEG (<code>.jpg</code>,{" "}
              <code>.jpeg</code>
              ), and PNG (<code>.png</code>). Scanned copies, bills, challans,
              and invoices are accepted.
            </p>
          </div>
        </div>
      </section>

      {/* Document submission area situated after instructions */}
      <section
        className="panel submission-panel"
        aria-labelledby="submission-heading"
      >
        <div className="panel-header">
          <UploadCloud size={18} />
          <h2 id="submission-heading">Submit documents</h2>
        </div>

        <form onSubmit={handleSubmit}>
          <div
            className={`dropzone ${dragOver ? "dropzone-active" : ""}`}
            onDragOver={(e) => {
              e.preventDefault();
              setDragOver(true);
            }}
            onDragLeave={() => setDragOver(false)}
            onDrop={handleDrop}
          >
            <UploadCloud size={36} className="dropzone-icon" />
            <p className="dropzone-primary-text">
              Drag and drop your documents here, or browse
            </p>
            <p className="dropzone-secondary-text">
              Select individual files or a compiled PDF (PDF, JPEG, or PNG)
            </p>
            <label className="primary-button dropzone-browse-button">
              Browse files
              <input
                type="file"
                multiple
                accept=".pdf,.jpg,.jpeg,.png,application/pdf,image/jpeg,image/png"
                onChange={handleFileChange}
                style={{ display: "none" }}
              />
            </label>
          </div>

          {error && (
            <div className="portal-alert portal-alert-error" role="alert">
              <AlertCircle size={16} />
              <span>{error}</span>
            </div>
          )}

          {selectedFiles.length > 0 && (
            <div className="file-list-wrap">
              <div className="file-list-header">
                <strong>{selectedFiles.length} document(s) selected</strong>
                <span>Filenames are preserved as submitted</span>
              </div>
              <ul className="file-list">
                {selectedFiles.map((file) => (
                  <li key={file.id} className="file-item">
                    <div className="file-info">
                      <FileText size={16} />
                      <span className="file-name">{file.name}</span>
                      <span className="file-size">
                        {formatBytes(file.size)}
                      </span>
                      <span className="file-badge">{file.type}</span>
                    </div>
                    <button
                      type="button"
                      className="icon-button"
                      aria-label={`Remove ${file.name}`}
                      onClick={() => removeFile(file.id)}
                    >
                      <X size={15} />
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {submitted && (
            <div className="portal-alert portal-alert-success" role="status">
              <CheckCircle2 size={16} />
              <div>
                <strong>Submission ready</strong>
                <p>
                  {selectedFiles.length} document(s) have been prepared for
                  review according to the firm instructions. In production,
                  these link to your engagement workspace.
                </p>
              </div>
            </div>
          )}

          <div className="portal-actions">
            <button
              type="submit"
              className="primary-button"
              disabled={selectedFiles.length === 0}
            >
              <FileUp size={15} />
              Submit{" "}
              {selectedFiles.length > 0
                ? `${selectedFiles.length} document(s)`
                : "documents"}
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}
