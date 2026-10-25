import type {
  ParsedRevenueRow,
  SpreadsheetColumn,
  SpreadsheetColumnMap,
  SpreadsheetError,
  SpreadsheetErrorCode,
  SpreadsheetMeta,
  SpreadsheetParseOptions,
  SpreadsheetParseResult,
} from "./types.ts";
import { checkTotals } from "./totals.ts";
import { normalizeRow, parseAmountToMinor } from "./validator.ts";

const DEFAULT_MAX_BYTES = 5_000_000;

export const DEFAULT_COLUMNS: SpreadsheetColumnMap = {
  rowId: "row_id",
  invoiceDate: "invoice_date",
  customer: "customer",
  documentRef: "document_ref",
  amount: "amount",
};

const columnKeys: SpreadsheetColumn[] = [
  "rowId",
  "invoiceDate",
  "customer",
  "documentRef",
  "amount",
];

type CsvRow = {
  rowNumber: number;
  values: string[];
};

function error(
  rowIndex: number,
  field: string,
  code: SpreadsheetErrorCode,
  message: string,
  severity: "required" | "warning" = "required",
  rowId?: string,
): SpreadsheetError {
  return { rowIndex, rowId, field, code, message, severity };
}

function importedAt(value?: Date | string) {
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return value.toISOString();
  }
  if (typeof value === "string") {
    const date = new Date(value);
    if (!Number.isNaN(date.getTime())) return date.toISOString();
  }
  return new Date().toISOString();
}

function baseMeta(
  options: SpreadsheetParseOptions,
  rows: ParsedRevenueRow[],
  blankRowCount: number,
): SpreadsheetMeta {
  const totalComputedMinor = rows.reduce(
    (sum, row) => (row._valid ? sum + row.amountMinor : sum),
    0,
  );
  const validRowCount = rows.filter((row) => row._valid).length;
  return {
    sheetName:
      typeof options.sheetName === "string" ? options.sheetName.trim() : "",
    version: typeof options.version === "string" ? options.version.trim() : "",
    importedAt: importedAt(options.importedAt),
    rowCount: rows.length,
    validRowCount,
    invalidRowCount: rows.length - validRowCount,
    blankRowCount,
    totalComputed: totalComputedMinor / 100,
    totalComputedMinor,
  };
}

function metadataErrors(options: SpreadsheetParseOptions) {
  const errors: SpreadsheetError[] = [];
  const sheetName =
    typeof options.sheetName === "string" ? options.sheetName.trim() : "";
  const version =
    typeof options.version === "string" ? options.version.trim() : "";
  if (!sheetName) {
    errors.push(
      error(0, "sheetName", "metadata_required", "Sheet name is required."),
    );
  }
  if (!version) {
    errors.push(
      error(0, "version", "metadata_required", "Version is required."),
    );
  }
  return errors;
}

function parseCsvRows(text: string): {
  rows: CsvRow[];
  errors: SpreadsheetError[];
} {
  const rows: CsvRow[] = [];
  const errors: SpreadsheetError[] = [];
  let values: string[] = [];
  let field = "";
  let inQuotes = false;
  let rowNumber = 1;

  for (let index = 0; index < text.length; index++) {
    const character = text[index];
    if (inQuotes) {
      if (character === '"') {
        if (text[index + 1] === '"') {
          field += '"';
          index++;
        } else {
          inQuotes = false;
        }
      } else {
        field += character;
      }
      continue;
    }

    if (character === '"') {
      if (field.length > 0) {
        errors.push(
          error(
            rowNumber,
            "csv",
            "csv_syntax",
            "Stray quote in unquoted CSV cell.",
          ),
        );
        field += character;
        continue;
      }
      inQuotes = true;
      continue;
    }
    if (character === ",") {
      values.push(field);
      field = "";
      continue;
    }
    if (character === "\n" || character === "\r") {
      if (character === "\r" && text[index + 1] === "\n") index++;
      values.push(field);
      rows.push({ rowNumber, values });
      rowNumber++;
      values = [];
      field = "";
      continue;
    }
    field += character;
  }

  if (inQuotes) {
    errors.push(
      error(rowNumber, "csv", "csv_syntax", "Unclosed quote in CSV."),
    );
  }

  if (field.length > 0 || values.length > 0) {
    values.push(field);
    rows.push({ rowNumber, values });
  }
  return { rows, errors };
}

function normalizeHeader(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

function cell(values: string[], index: number | undefined) {
  if (index === undefined) return "";
  return (values[index] ?? "").trim();
}

function rawRow(headers: string[], values: string[]) {
  const raw: Record<string, string> = {};
  headers.forEach((header, index) => {
    if (header) raw[header] = values[index] ?? "";
  });
  return raw;
}

function markDuplicateRowIds(rows: ParsedRevenueRow[]) {
  const groups = new Map<string, ParsedRevenueRow[]>();
  for (const row of rows) {
    if (!row.rowId) continue;
    const group = groups.get(row.rowId) ?? [];
    group.push(row);
    groups.set(row.rowId, group);
  }

  for (const [rowId, group] of groups) {
    if (group.length < 2) continue;
    for (const row of group) {
      row._errors.push(
        error(
          row.rowIndex,
          "rowId",
          "duplicate_row_identifier",
          `Row identifier "${rowId}" appears more than once in this sheet.`,
          "required",
          rowId,
        ),
      );
      row._valid = false;
    }
  }
}

export function parseSpreadsheet(
  input: string | Uint8Array | ArrayBuffer,
  options: SpreadsheetParseOptions,
): SpreadsheetParseResult {
  const configured = options.columns ?? {};
  const columns: SpreadsheetColumnMap = {
    rowId: configured.rowId ?? DEFAULT_COLUMNS.rowId,
    invoiceDate: configured.invoiceDate ?? DEFAULT_COLUMNS.invoiceDate,
    customer: configured.customer ?? DEFAULT_COLUMNS.customer,
    documentRef: configured.documentRef ?? DEFAULT_COLUMNS.documentRef,
    amount: configured.amount ?? DEFAULT_COLUMNS.amount,
  };

  const initialErrors = metadataErrors(options);
  const bytes =
    typeof input === "string"
      ? new TextEncoder().encode(input)
      : input instanceof Uint8Array
        ? input
        : new Uint8Array(input);
  const maxBytes = Number.isFinite(options.maxBytes)
    ? Math.max(1, options.maxBytes ?? DEFAULT_MAX_BYTES)
    : DEFAULT_MAX_BYTES;

  if (bytes.byteLength > maxBytes) {
    initialErrors.push(
      error(
        0,
        "file",
        "file_too_large",
        `Spreadsheet exceeds the ${maxBytes} byte limit.`,
      ),
    );
    return {
      meta: baseMeta(options, [], 0),
      rows: [],
      errors: initialErrors,
    };
  }

  let text: string;
  try {
    text =
      typeof input === "string"
        ? input
        : new TextDecoder("utf-8", { fatal: true }).decode(bytes);
  } catch {
    initialErrors.push(
      error(0, "file", "invalid_encoding", "Spreadsheet must be UTF-8 text."),
    );
    return {
      meta: baseMeta(options, [], 0),
      rows: [],
      errors: initialErrors,
    };
  }

  const parsedCsv = parseCsvRows(text.replace(/^\uFEFF/, ""));
  const csvRows = parsedCsv.rows;
  initialErrors.push(...parsedCsv.errors);
  const headerRow = csvRows.find((row) =>
    row.values.some((value) => value.trim().length > 0),
  );

  if (!headerRow) {
    initialErrors.push(
      error(0, "sheet", "empty_spreadsheet", "Spreadsheet has no header row."),
    );
    return {
      meta: baseMeta(options, [], 0),
      rows: [],
      errors: initialErrors,
    };
  }

  const headers = headerRow.values.map(normalizeHeader);
  const headerIndexes = new Map<string, number>();
  headers.forEach((header, index) => {
    if (!header) return;
    if (headerIndexes.has(header)) {
      initialErrors.push(
        error(
          headerRow.rowNumber,
          header,
          "duplicate_column",
          `Column "${header}" appears more than once.`,
        ),
      );
      return;
    }
    headerIndexes.set(header, index);
  });

  const columnIndexes = new Map<SpreadsheetColumn, number>();
  for (const key of columnKeys) {
    const header = normalizeHeader(columns[key]);
    const index = headerIndexes.get(header);
    if (index === undefined) {
      initialErrors.push(
        error(
          headerRow.rowNumber,
          key,
          "missing_required_column",
          `Required column "${columns[key]}" is missing.`,
        ),
      );
      continue;
    }
    columnIndexes.set(key, index);
  }

  const rows: ParsedRevenueRow[] = [];
  const blankErrors: SpreadsheetError[] = [];
  let blankRowCount = 0;

  for (const source of csvRows.slice(csvRows.indexOf(headerRow) + 1)) {
    if (source.values.every((value) => value.trim().length === 0)) {
      blankRowCount++;
      blankErrors.push(
        error(
          source.rowNumber,
          "row",
          "blank_row",
          "Blank row was ignored.",
          "warning",
        ),
      );
      continue;
    }

    const values = {
      rowId: cell(source.values, columnIndexes.get("rowId")),
      invoiceDate: cell(source.values, columnIndexes.get("invoiceDate")),
      customer: cell(source.values, columnIndexes.get("customer")),
      documentRef: cell(source.values, columnIndexes.get("documentRef")),
      amount: cell(source.values, columnIndexes.get("amount")),
    };
    const normalized = normalizeRow(values, source.rowNumber, options);
    rows.push({
      rowIndex: source.rowNumber,
      ...normalized,
      _valid: normalized.errors.length === 0,
      _errors: [...normalized.errors],
      _raw: rawRow(headers, source.values),
    });
  }

  markDuplicateRowIds(rows);

  if (rows.length === 0) {
    initialErrors.push(
      error(0, "sheet", "no_data_rows", "Spreadsheet has no data rows."),
    );
  }

  const meta = baseMeta(options, rows, blankRowCount);
  const totalErrors: SpreadsheetError[] = [];
  if (options.declaredTotal !== undefined) {
    const declared = parseAmountToMinor(String(options.declaredTotal));
    if (!declared.ok) {
      totalErrors.push(
        error(0, "declaredTotal", "invalid_declared_total", declared.message),
      );
    } else {
      const totals = checkTotals(rows, options.declaredTotal);
      if (!totals.match && "error" in totals) {
        totalErrors.push(
          error(0, "declaredTotal", "invalid_declared_total", totals.error),
        );
        return {
          meta,
          rows,
          errors: [
            ...initialErrors,
            ...blankErrors,
            ...rows.flatMap((row) => row._errors),
            ...totalErrors,
          ],
        };
      }
      meta.totalDeclared = totals.declared;
      meta.totalDeclaredMinor = totals.declaredMinor;
      meta.totalDelta = totals.delta;
      meta.totalDeltaMinor = totals.deltaMinor;
      meta.totalMatch = totals.match;
      if (!totals.match) {
        totalErrors.push(
          error(
            0,
            "total",
            "total_mismatch",
            `Declared total ${totals.declared.toFixed(2)} does not match computed total ${totals.computed.toFixed(2)}.`,
            "warning",
          ),
        );
      }
    }
  }

  return {
    meta,
    rows,
    errors: [
      ...initialErrors,
      ...blankErrors,
      ...rows.flatMap((row) => row._errors),
      ...totalErrors,
    ],
  };
}
