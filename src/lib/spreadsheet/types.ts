export type SpreadsheetColumnMap = {
  rowId: string;
  invoiceDate: string;
  customer: string;
  documentRef: string;
  amount: string;
};

export type SpreadsheetColumn = keyof SpreadsheetColumnMap;

export type SpreadsheetErrorSeverity = "required" | "warning";

export type SpreadsheetErrorCode =
  | "missing_required_column"
  | "duplicate_column"
  | "blank_row"
  | "row_identifier_required"
  | "duplicate_row_identifier"
  | "invalid_date"
  | "date_in_future"
  | "invalid_amount"
  | "negative_amount"
  | "amount_too_large"
  | "required_value_missing"
  | "invalid_declared_total"
  | "total_mismatch"
  | "metadata_required"
  | "empty_spreadsheet"
  | "no_data_rows"
  | "invalid_encoding"
  | "file_too_large"
  | "csv_syntax";

export type SpreadsheetError = {
  rowIndex: number;
  rowId?: string;
  field: string;
  code: SpreadsheetErrorCode;
  message: string;
  severity: SpreadsheetErrorSeverity;
};

export type RevenueRowValues = {
  rowId: string;
  invoiceDate: string;
  customer: string;
  documentRef: string;
  amount: string;
};

export type ParsedRevenueRow = {
  rowIndex: number;
  rowId: string;
  invoiceDate: string;
  customer: string;
  documentRef: string;
  amount: number;
  amountMinor: number;
  _valid: boolean;
  _errors: SpreadsheetError[];
  _raw: Record<string, string>;
};

export type SpreadsheetMeta = {
  sheetName: string;
  version: string;
  importedAt: string;
  rowCount: number;
  validRowCount: number;
  invalidRowCount: number;
  blankRowCount: number;
  totalDeclared?: number;
  totalComputed: number;
  totalDelta?: number;
  totalMatch?: boolean;
  totalDeclaredMinor?: number;
  totalComputedMinor: number;
  totalDeltaMinor?: number;
};

export type SpreadsheetParseResult = {
  meta: SpreadsheetMeta;
  rows: ParsedRevenueRow[];
  errors: SpreadsheetError[];
};

export type RowValidationOptions = {
  today?: Date | string;
  maxFutureDays?: number;
};

export type SpreadsheetParseOptions = RowValidationOptions & {
  sheetName: string;
  version: string;
  importedAt?: Date | string;
  declaredTotal?: string | number;
  columns?: Partial<SpreadsheetColumnMap>;
  maxBytes?: number;
};

export type TotalsCheck =
  | {
      match: true | false;
      computed: number;
      declared: number;
      delta: number;
      computedMinor: number;
      declaredMinor: number;
      deltaMinor: number;
    }
  | { match: false; error: string };
