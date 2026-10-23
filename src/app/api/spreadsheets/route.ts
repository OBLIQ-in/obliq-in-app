import { parseRevenueSpreadsheet } from "@/lib/spreadsheet-parser.ts";
import { validateRevenueRows } from "@/lib/spreadsheet-validation.ts";
import type { ParsedRevenueData } from "@/lib/spreadsheet-parser.ts";

export const config = {
  api: {
    bodyParser: {
      sizeLimit: "10mb",
    },
  },
};

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return new Response(
        JSON.stringify({
          status: { canComplete: false, errorCount: 0 },
          errors: [],
          metadata: { filename: "", sheet: "", importId: "" },
          rows: [],
          totals: {
            computedTotals: {
              totalBillable: 0,
              totalNonBillable: 0,
              rowCount: 0,
            },
            declaredTotals: {
              totalBillable: 0,
              totalNonBillable: 0,
              rowCount: 0,
            },
            totalMatch: false,
          },
        }),
        { status: 400, headers: { "Content-Type": "application/json" } },
      );
    }

    const fileData = await file.arrayBuffer();
    const fileName = file.name;

    const parsed: ParsedRevenueData = parseRevenueSpreadsheet(
      Buffer.from(fileData),
      fileName,
    );

    // Additional validation: check if any rows have unreconciled errors
    const allRowsData = parsed.rows.map((row) => ({
      id: row.id,
      date: row.date,
      amount: row.amount,
      client: row.client,
      description: row.description,
    }));

    const validationResult = validateRevenueRows(allRowsData);

    // Build error list combining parser errors and validation errors
    const allErrors: {
      rowIndex: number;
      rowId: string | null;
      field: string;
      error: string;
    }[] = [...parsed.errors];

    // Add validation errors for rows that passed parser but may have issues
    validationResult.forEach((result, i) => {
      if (!result.valid) {
        result.errors.forEach((fe) => {
          allErrors.push({
            rowIndex: i,
            rowId: allRowsData[i].id ?? `row-${i}`,
            field: fe.field,
            error: fe.error,
          });
        });
      }
    });

    // Determine if import can complete
    const canComplete = allErrors.length === 0 || parsed.totalMatch;

    const responsePayload = {
      metadata: {
        filename: fileName,
        sheet: parsed.rows.length > 0 ? "Sheet1" : "",
        totalRowCount: parsed.rows.length + parsed.errors.length,
        importTimestamp: new Date().toISOString(),
        importId: crypto.randomUUID().slice(0, 8),
      },
      rows: parsed.rows.map((row) => ({
        id: row.id,
        date: row.date,
        amount: row.amount,
        client: row.client,
        description: row.description,
      })),
      errors: allErrors,
      totals: {
        computedTotals: parsed.computedTotals,
        declaredTotals: parsed.declaredTotals,
        totalMatch: parsed.totalMatch,
      },
      status: {
        canComplete,
        errorCount: allErrors.length,
      },
    };

    return new Response(JSON.stringify(responsePayload), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Spreadsheet import error:", error);
    return new Response(
      JSON.stringify({
        status: { canComplete: false, errorCount: 0 },
        errors: [
          {
            rowIndex: 0,
            rowId: null,
            field: "file",
            error: "Failed to parse spreadsheet",
          },
        ],
        metadata: { filename: "", sheet: "", importId: "" },
        rows: [],
        totals: {
          computedTotals: {
            totalBillable: 0,
            totalNonBillable: 0,
            rowCount: 0,
          },
          declaredTotals: {
            totalBillable: 0,
            totalNonBillable: 0,
            rowCount: 0,
          },
          totalMatch: false,
        },
      }),
      { status: 500, headers: { "Content-Type": "application/json" } },
    );
  }
}
