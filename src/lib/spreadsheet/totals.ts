import type { ParsedRevenueRow, TotalsCheck } from "./types.ts";
import { parseAmountToMinor } from "./validator.ts";

export function checkTotals(
  rows: ParsedRevenueRow[],
  declaredTotal: string | number,
): TotalsCheck {
  const declared = parseAmountToMinor(String(declaredTotal));
  if (!declared.ok) {
    return {
      match: false,
      error: `Invalid declared total: ${declared.message}`,
    };
  }

  const computedMinor = rows.reduce(
    (sum, row) => (row._valid ? sum + row.amountMinor : sum),
    0,
  );
  const deltaMinor = computedMinor - declared.minor;

  return {
    match: deltaMinor === 0,
    computed: computedMinor / 100,
    declared: declared.minor / 100,
    delta: deltaMinor / 100,
    computedMinor,
    declaredMinor: declared.minor,
    deltaMinor,
  };
}
