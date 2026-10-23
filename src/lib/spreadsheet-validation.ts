export function validateRevenueRows(
  rows: Array<{
    id: string;
    date: string;
    amount: number;
    client: string;
    description?: string;
  }>,
): { valid: boolean; errors: { field: string; error: string }[] }[] {
  const results: {
    valid: boolean;
    errors: { field: string; error: string }[];
  }[] = [];

  rows.forEach((row) => {
    const errors: { field: string; error: string }[] = [];

    if (!row.date) {
      errors.push({ field: "date", error: "Date is required" });
    } else if (isNaN(Date.parse(row.date))) {
      errors.push({ field: "date", error: "Invalid date format" });
    }

    if (isNaN(row.amount) || row.amount <= 0) {
      errors.push({
        field: "amount",
        error: "Amount must be a positive number",
      });
    }

    if (!row.client) {
      errors.push({ field: "client", error: "Client is required" });
    }

    results.push({ valid: errors.length === 0, errors });
  });

  return results;
}

export function formatValidationErrors(
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
    const rowId = row.id ?? `row-${i}`;
    const fieldChecks: { field: string; error: string }[] = [];

    if (!row.date) {
      fieldChecks.push({ field: "date", error: "Date is required" });
    } else if (isNaN(Date.parse(row.date))) {
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
