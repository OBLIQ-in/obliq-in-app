import assert from "node:assert/strict";
import { test } from "node:test";
import { toPublicClientInstructions } from "../../src/lib/workspace-source.ts";
import { isAcceptedFileType } from "../../src/lib/file-validation.ts";

test("toPublicClientInstructions strictly omits internalNotes from public projection", () => {
  const canarySecret = "CONFIDENTIAL_CANARY_INTERNAL_AUDIT_RISK_NOTE_XYZ_999";
  const firmInstructions = {
    id: "INST-TEST-1",
    title: "Quarterly Audit Evidence Submission",
    instructions:
      "Please upload all purchase invoices and bank statements. Filenames can be arbitrary.",
    internalNotes: `CA Private Checklist: ${canarySecret}`,
    updatedAt: "2026-10-23",
  };

  const publicData = toPublicClientInstructions(firmInstructions);

  // 1. Property existence check
  assert.equal("internalNotes" in publicData, false);
  assert.equal(publicData.internalNotes, undefined);

  // 2. Exact keys check
  const keys = Object.keys(publicData);
  assert.deepEqual(
    keys.sort(),
    ["id", "instructions", "title", "updatedAt"].sort(),
  );

  // 3. Serialized JSON checks (ensuring no transmission over network/props)
  const serialized = JSON.stringify(publicData);
  assert.equal(serialized.includes("internalNotes"), false);
  assert.equal(serialized.includes(canarySecret), false);

  // 4. Preserved public fields check
  assert.equal(publicData.id, firmInstructions.id);
  assert.equal(publicData.title, firmInstructions.title);
  assert.equal(publicData.instructions, firmInstructions.instructions);
  assert.equal(publicData.updatedAt, firmInstructions.updatedAt);
});

test("toPublicClientInstructions handles empty strings and multi-line notes safely", () => {
  const privateMultilineCanary = "SECRET_LINE_1\nSECRET_LINE_2\nSECRET_LINE_3";
  const record = {
    id: "INST-2",
    title: "Client Intake",
    instructions: "Individual or compiled PDF accepted.",
    internalNotes: privateMultilineCanary,
    updatedAt: "2026-10-23",
  };

  const publicData = toPublicClientInstructions(record);
  assert.equal("internalNotes" in publicData, false);
  assert.equal(
    JSON.stringify(publicData).includes(privateMultilineCanary),
    false,
  );
  assert.equal(JSON.stringify(publicData).includes("SECRET_LINE"), false);
});

test("isAcceptedFileType accepts PDF, JPEG, PNG and rejects unaccepted formats", () => {
  // Valid PDF, JPEG, PNG
  assert.equal(isAcceptedFileType("statement.pdf", "application/pdf"), true);
  assert.equal(isAcceptedFileType("invoice.jpg", "image/jpeg"), true);
  assert.equal(isAcceptedFileType("receipt.jpeg", "image/jpeg"), true);
  assert.equal(isAcceptedFileType("scan.png", "image/png"), true);
  assert.equal(isAcceptedFileType("arbitrary_filename_no_mime.pdf", ""), true);
  assert.equal(
    isAcceptedFileType("compiled_audit_docs.pdf", "application/pdf"),
    true,
  );

  // Invalid formats
  assert.equal(
    isAcceptedFileType("malware.exe", "application/x-msdownload"),
    false,
  );
  assert.equal(isAcceptedFileType("archive.zip", "application/zip"), false);
  assert.equal(isAcceptedFileType("data.csv", "text/csv"), false);
  assert.equal(isAcceptedFileType("script.js", "text/javascript"), false);
  assert.equal(isAcceptedFileType("notes.txt", "text/plain"), false);
});
