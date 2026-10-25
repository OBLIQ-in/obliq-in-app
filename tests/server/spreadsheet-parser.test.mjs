import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { test } from "node:test";
import {
  canCompleteImport,
  checkTotals,
  parseSpreadsheet,
} from "../../src/lib/spreadsheet/index.ts";

const fixture = (name) =>
  readFile(
    new URL(`../../src/lib/spreadsheet/__fixtures__/${name}`, import.meta.url),
  );

const options = (declaredTotal = "2504069.39") => ({
  sheetName: "Revenue Q4 FY26",
  version: "1",
  importedAt: "2026-10-01T09:30:00.000Z",
  today: "2026-10-25",
  declaredTotal,
});

test("valid synthetic fixture passes with zero required errors", async () => {
  const result = parseSpreadsheet(
    await fixture("revenue-valid.csv"),
    options(),
  );

  assert.equal(result.meta.sheetName, "Revenue Q4 FY26");
  assert.equal(result.meta.version, "1");
  assert.equal(result.meta.rowCount, 13);
  assert.equal(result.meta.validRowCount, 13);
  assert.equal(result.meta.invalidRowCount, 0);
  assert.equal(result.meta.totalDeclared, 2504069.39);
  assert.equal(result.meta.totalComputed, 2504069.39);
  assert.equal(result.meta.totalComputedMinor, 250406939);
  assert.equal(result.meta.totalMatch, true);
  assert.equal(
    result.errors.filter((error) => error.severity === "required").length,
    0,
  );
  assert.equal(result.rows[2].invoiceDate, "2026-09-05");
  assert.equal(canCompleteImport(result.errors), true);
});

test("invalid rows are flagged and kept in the output", async () => {
  const result = parseSpreadsheet(
    await fixture("revenue-sample.csv"),
    options(),
  );

  assert.equal(result.rows.length, 13);
  assert.equal(result.meta.validRowCount, 10);
  assert.equal(result.meta.invalidRowCount, 3);

  const invalidRows = result.rows.filter((row) => !row._valid);
  assert.deepEqual(
    invalidRows.map((row) => row.rowId),
    ["REV-0011", "REV-0012", "REV-0013"],
  );

  const codes = invalidRows.flatMap((row) =>
    row._errors.map((error) => error.code),
  );
  assert.ok(codes.includes("required_value_missing"));
  assert.ok(codes.includes("invalid_date"));
  assert.ok(codes.includes("invalid_amount"));
  assert.equal(canCompleteImport(result.errors), false);
});

test("totals match or report a clear mismatch", async () => {
  const matching = parseSpreadsheet(
    await fixture("revenue-valid.csv"),
    options(),
  );
  const match = checkTotals(matching.rows, "2504069.39");
  assert.deepEqual(
    {
      match: match.match,
      computed: match.computed,
      declared: match.declared,
      delta: match.delta,
    },
    {
      match: true,
      computed: 2504069.39,
      declared: 2504069.39,
      delta: 0,
    },
  );

  const mismatch = parseSpreadsheet(
    await fixture("revenue-valid.csv"),
    options("2504067.89"),
  );
  assert.equal(mismatch.meta.totalMatch, false);
  assert.equal(mismatch.meta.totalDelta, 1.5);
  assert.ok(
    mismatch.errors.some(
      (error) =>
        error.code === "total_mismatch" && error.severity === "warning",
    ),
  );
  assert.equal(canCompleteImport(mismatch.errors), true);
});

test("duplicate row identifiers are caught on every affected row", () => {
  const csv = [
    "Row ID,Invoice Date,Customer,Document Ref,Amount",
    "REV-1001,2026-09-01,Example Traders,INV-2001,100.00",
    "REV-1001,2026-09-02,Sunrise Textiles,INV-2002,200.00",
  ].join("\n");
  const result = parseSpreadsheet(csv, {
    sheetName: "Revenue Q4 FY26",
    version: "1",
    today: "2026-10-25",
  });

  assert.equal(result.rows.length, 2);
  assert.ok(result.rows.every((row) => row._valid === false));
  assert.ok(
    result.rows.every((row) =>
      row._errors.some((error) => error.code === "duplicate_row_identifier"),
    ),
  );
  assert.equal(canCompleteImport(result.errors), false);
});

test("missing required columns are reported without dropping rows", () => {
  const csv = [
    "Row ID,Invoice Date,Customer,Document Ref",
    "REV-1001,2026-09-01,Example Traders,INV-2001",
  ].join("\n");
  const result = parseSpreadsheet(csv, {
    sheetName: "Revenue Q4 FY26",
    version: "1",
    today: "2026-10-25",
  });

  assert.equal(result.rows.length, 1);
  assert.ok(
    result.errors.some(
      (error) =>
        error.code === "missing_required_column" && error.field === "amount",
    ),
  );
  assert.equal(canCompleteImport(result.errors), false);
});

test("future invoice dates beyond the configured limit are rejected", () => {
  const csv = [
    "Row ID,Invoice Date,Customer,Document Ref,Amount",
    "REV-1001,2026-10-30,Example Traders,INV-2001,100.00",
  ].join("\n");
  const result = parseSpreadsheet(csv, {
    sheetName: "Revenue Q4 FY26",
    version: "1",
    today: "2026-10-25",
    maxFutureDays: 1,
  });

  assert.equal(result.rows[0]._valid, false);
  assert.ok(
    result.rows[0]._errors.some((error) => error.code === "date_in_future"),
  );
});

test("Indian comma-formatted amounts and hyphenated dates are accepted", () => {
  const csv = [
    "Row ID,Invoice Date,Customer,Document Ref,Amount",
    'REV-2001,15-09-2026,Example Traders,INV-2001,"1,50,000.00"',
    'REV-2002,2026-09-16,Example Traders,INV-2002,"12,34,567.89"',
  ].join("\n");
  const result = parseSpreadsheet(csv, {
    sheetName: "Revenue Q4 FY26",
    version: "1",
    today: "2026-10-25",
  });
  assert.equal(
    result.rows.every((row) => row._valid),
    true,
  );
  assert.equal(result.rows[0].invoiceDate, "2026-09-15");
});

test("negative amounts are rejected with negative_amount", () => {
  const csv = [
    "Row ID,Invoice Date,Customer,Document Ref,Amount",
    "REV-3001,2026-09-16,Example Traders,INV-3001,-10.00",
  ].join("\n");
  const result = parseSpreadsheet(csv, {
    sheetName: "Revenue Q4 FY26",
    version: "1",
    today: "2026-10-25",
  });
  assert.ok(
    result.rows[0]._errors.some((error) => error.code === "negative_amount"),
  );
});

test("files exceeding maxBytes are rejected", () => {
  const result = parseSpreadsheet(
    "Row ID,Invoice Date,Customer,Document Ref,Amount\n",
    {
      sheetName: "Revenue Q4 FY26",
      version: "1",
      maxBytes: 10,
    },
  );
  assert.ok(result.errors.some((error) => error.code === "file_too_large"));
});

test("unclosed CSV quotes produce a syntax error", () => {
  const csv = [
    "Row ID,Invoice Date,Customer,Document Ref,Amount",
    'REV-4001,2026-09-16,"Example Traders,INV-4001,100.00',
    "REV-4002,2026-09-17,Other,INV-4002,200.00",
  ].join("\n");
  const result = parseSpreadsheet(csv, {
    sheetName: "Revenue Q4 FY26",
    version: "1",
    today: "2026-10-25",
  });
  assert.ok(result.errors.some((error) => error.code === "csv_syntax"));
});
