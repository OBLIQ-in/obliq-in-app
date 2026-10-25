import type {
  RevenueRowValues,
  RowValidationOptions,
  SpreadsheetError,
  SpreadsheetErrorCode,
} from "./types.ts";

export type AmountParseResult =
  | { ok: true; minor: number }
  | {
      ok: false;
      code: "invalid_amount" | "negative_amount" | "amount_too_large";
      message: string;
    };

const amountPattern =
  /^-?(?:\d+|\d{1,3}(?:,\d{3})+|\d{1,2}(?:,\d{2})*,\d{3})(?:\.\d{1,2})?$/;

export function parseAmountToMinor(value: string): AmountParseResult {
  const trimmed = value.trim();
  if (!trimmed) {
    return {
      ok: false,
      code: "invalid_amount",
      message: "Amount is required.",
    };
  }
  if (!amountPattern.test(trimmed)) {
    return {
      ok: false,
      code: "invalid_amount",
      message: "Amount must be numeric with at most two decimal places.",
    };
  }

  const negative = trimmed.startsWith("-");
  const unsigned = negative ? trimmed.slice(1) : trimmed;
  const [wholePart, fractionPart = ""] = unsigned.split(".");
  const whole = Number(wholePart.replace(/,/g, ""));
  const minor = whole * 100 + Number(fractionPart.padEnd(2, "0"));

  if (negative) {
    return {
      ok: false,
      code: "negative_amount",
      message: "Amount cannot be negative.",
    };
  }
  if (!Number.isSafeInteger(minor)) {
    return {
      ok: false,
      code: "amount_too_large",
      message: "Amount is too large to process safely.",
    };
  }
  return { ok: true, minor };
}

function pad(value: number) {
  return String(value).padStart(2, "0");
}

function toIsoDate(year: number, month: number, day: number) {
  if (year < 1900 || year > 9999 || month < 1 || month > 12) return null;
  if (day < 1 || day > 31) return null;
  const date = new Date(Date.UTC(year, month - 1, day));
  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month - 1 ||
    date.getUTCDate() !== day
  ) {
    return null;
  }
  return `${year}-${pad(month)}-${pad(day)}`;
}

export function parseSpreadsheetDate(value: string) {
  const trimmed = value.trim();
  const iso = /^(\d{4})-(\d{2})-(\d{2})$/.exec(trimmed);
  if (iso) {
    return toIsoDate(Number(iso[1]), Number(iso[2]), Number(iso[3]));
  }
  const dayFirst = /^(\d{1,2})[-\/](\d{1,2})[-\/](\d{4})$/.exec(trimmed);
  if (dayFirst) {
    return toIsoDate(
      Number(dayFirst[3]),
      Number(dayFirst[2]),
      Number(dayFirst[1]),
    );
  }
  return null;
}

function todayIso(value?: Date | string) {
  if (typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return value;
  }
  const date = value === undefined ? new Date() : new Date(value);
  if (Number.isNaN(date.getTime()))
    return new Date().toISOString().slice(0, 10);
  return date.toISOString().slice(0, 10);
}

function addDays(value: string, days: number) {
  const date = new Date(`${value}T00:00:00.000Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

function requiredError(
  rowIndex: number,
  rowId: string | undefined,
  field: string,
  code: SpreadsheetErrorCode,
  message: string,
): SpreadsheetError {
  return { rowIndex, rowId, field, code, message, severity: "required" };
}

export type NormalizedRow = {
  rowId: string;
  invoiceDate: string;
  customer: string;
  documentRef: string;
  amount: number;
  amountMinor: number;
  errors: SpreadsheetError[];
};

export function normalizeRow(
  row: RevenueRowValues,
  rowIndex: number,
  options: RowValidationOptions = {},
): NormalizedRow {
  const rowId = row.rowId.trim();
  const customer = row.customer.trim();
  const documentRef = row.documentRef.trim();
  const errors: SpreadsheetError[] = [];

  if (!rowId) {
    errors.push(
      requiredError(
        rowIndex,
        undefined,
        "rowId",
        "row_identifier_required",
        "Row identifier is required.",
      ),
    );
  }
  if (!customer) {
    errors.push(
      requiredError(
        rowIndex,
        rowId,
        "customer",
        "required_value_missing",
        "Customer is required.",
      ),
    );
  }
  if (!documentRef) {
    errors.push(
      requiredError(
        rowIndex,
        rowId,
        "documentRef",
        "required_value_missing",
        "Document reference is required.",
      ),
    );
  }

  const invoiceDate = parseSpreadsheetDate(row.invoiceDate);
  if (!invoiceDate) {
    errors.push(
      requiredError(
        rowIndex,
        rowId,
        "invoiceDate",
        "invalid_date",
        "Invoice date must be a valid ISO or DD/MM/YYYY date.",
      ),
    );
  } else {
    const futureLimit = options.maxFutureDays;
    const limit = Number.isFinite(futureLimit)
      ? Math.max(0, Math.trunc(futureLimit ?? 0))
      : 0;
    if (invoiceDate > addDays(todayIso(options.today), limit)) {
      errors.push(
        requiredError(
          rowIndex,
          rowId,
          "invoiceDate",
          "date_in_future",
          `Invoice date cannot be later than ${limit} day(s) from today.`,
        ),
      );
    }
  }

  const amount = parseAmountToMinor(row.amount);
  if (!amount.ok) {
    errors.push(
      requiredError(rowIndex, rowId, "amount", amount.code, amount.message),
    );
  }

  return {
    rowId,
    invoiceDate: invoiceDate ?? "",
    customer,
    documentRef,
    amount: amount.ok ? amount.minor / 100 : 0,
    amountMinor: amount.ok ? amount.minor : 0,
    errors,
  };
}

export function validateRow(
  row: RevenueRowValues,
  rowIndex: number,
  options: RowValidationOptions = {},
) {
  return normalizeRow(row, rowIndex, options).errors;
}

export function canCompleteImport(errors: SpreadsheetError[]) {
  return !errors.some((error) => error.severity === "required");
}
