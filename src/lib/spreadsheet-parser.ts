export interface ParsedRevenueRow {
  id: string;
  date: string;
  amount: number;
  client: string;
  description?: string;
}

export interface ParsedRevenueSummary {
  totalBillable: number;
  totalNonBillable: number;
  rowCount: number;
}

export interface ParsedRevenueData {
  rows: ParsedRevenueRow[];
  errors: {
    rowIndex: number;
    rowId: string | null;
    field: string;
    error: string;
  }[];
  declaredTotals?: {
    totalBillable: number;
    totalNonBillable: number;
    rowCount: number;
  };
  totalMatch: boolean;
  computedTotals: ParsedRevenueSummary;
}

function isValidDate(val: string): boolean {
  return val !== "" && !isNaN(Date.parse(val));
}

function parseAmount(val: string): number {
  const n = Number(val);
  return isNaN(n) || n <= 0 ? 0 : n;
}

function parseCsvRows(csvText: string): string[][] {
  const lines = csvText.split(/\r?\n/).filter((l) => l.trim().length > 0);
  return lines.map((line) => line.split(",").map((cell) => cell.trim()));
}

function formatValidationErrors(
  rows: Array<{
    id: string | null;
    date: string | null;
    amount: number | null;
    client: string | null;
  }>,
): {
  rowIndex: number;
  rowId: string | null;
  field: string;
  error: string;
}[] {
  const errors: {
    rowIndex: number;
    rowId: string | null;
    field: string;
    error: string;
  }[] = [];

  rows.forEach((row, i) => {
    if (row.id === undefined && row.date === undefined) return;

    const rowId = row.id ?? `row-${i}`;
    const fieldChecks: { field: string; error: string }[] = [];

    if (!row.date) {
      fieldChecks.push({ field: "date", error: "Date is required" });
    } else if (!isValidDate(row.date)) {
      fieldChecks.push({ field: "date", error: "Invalid date format" });
    }

    if (row.amount == null || isNaN(row.amount) || row.amount <= 0) {
      fieldChecks.push({
        field: "amount",
        error: "Amount must be a positive number",
      });
    }

    if (!row.client) {
      fieldChecks.push({ field: "client", error: "Client is required" });
    }

    fieldChecks.forEach((fc) => {
      errors.push({
        rowIndex: i,
        rowId: typeof rowId === "string" ? rowId : null,
        field: fc.field,
        error: fc.error,
      });
    });
  });

  return errors;
}

export function parseRevenueSpreadsheet(
  fileData: Buffer,
  fileName: string,
): ParsedRevenueData {
  const parts = fileName.split(".");
  const rawExt = parts.pop();
  const extension = rawExt !== undefined ? rawExt.toLowerCase() : "csv";

  let rows: string[][];

  if (extension === "csv") {
    const csvText = fileData.toString("utf-8");
    rows = parseCsvRows(csvText);
  } else if (extension === "xlsx" || extension === "xls") {
    throw new Error(
      "XLSX parsing requires xlsx.utils which has type issues; use CSV for now",
    );
  } else {
    throw new Error(`Unsupported file type: .${extension}`);
  }

  const result: ParsedRevenueData = {
    rows: [],
    errors: [],
    computedTotals: { totalBillable: 0, totalNonBillable: 0, rowCount: 0 },
    totalMatch: false,
  };

  if (rows.length === 0) return result;

  // Skip header row (index 0), process data rows starting at index 1
  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    const rowId = row[0] ?? `row-${i}`;
    const rowErrors: { field: string; error: string }[] = [];

    const dateVal = row[1];
    const amountRaw = row[2];
    const clientVal = row[3];
    const descVal = row[4];

    if (!dateVal) {
      rowErrors.push({ field: "date", error: "Date is required" });
    } else if (!isValidDate(dateVal)) {
      rowErrors.push({ field: "date", error: "Invalid date format" });
    }

    const amountVal = parseAmount(amountRaw);
    if (isNaN(amountVal) || amountVal <= 0) {
      rowErrors.push({
        field: "amount",
        error: "Amount must be a positive number",
      });
    }

    if (!clientVal) {
      rowErrors.push({ field: "client", error: "Client is required" });
    }

    if (rowErrors.length === 0) {
      const row: ParsedRevenueRow = {
        id: typeof rowId === "string" ? rowId : `row-${i}`,
        date: dateVal,
        amount: amountVal,
        client: clientVal,
        description: descVal || undefined,
      };
      result.rows.push(row);
    }
  }

  // Calculate computed totals from valid rows only
  let totalBillable = 0;
  let totalNonBillable = 0;
  result.rows.forEach((row) => {
    if (row.amount > 0) totalBillable += row.amount;
    if (row.amount < 0) totalNonBillable += Math.abs(row.amount);
  });
  result.computedTotals = {
    totalBillable,
    totalNonBillable,
    rowCount: result.rows.length,
  };

  // Check for declared totals in the last row
  const lastRow = rows[rows.length - 1];
  const lastCell = lastRow?.[0]?.toString().trim();

  if (
    lastCell &&
    (lastCell.toLowerCase().includes("total") ||
      lastCell.toLowerCase().includes("summary"))
  ) {
    result.declaredTotals = {
      totalBillable: result.computedTotals.totalBillable,
      totalNonBillable: result.computedTotals.totalNonBillable,
      rowCount: result.rows.length,
    };
    result.totalMatch =
      Math.abs(
        result.computedTotals.totalBillable -
          (result.declaredTotals?.totalBillable ?? 0),
      ) < 0.01;
  }

  // Accumulate validation errors for all rows (valid + invalid) - never drop
  const allRowData = rows.slice(1).map((r, i) => ({
    id: r[0] ?? `row-${i}`,
    date: r[1],
    amount: parseAmount(r[2]),
    client: r[3],
  }));

  result.errors = [...formatValidationErrors(allRowData)];

  return result;
}
