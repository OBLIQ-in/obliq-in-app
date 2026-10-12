import type { Dispatch, SetStateAction } from "react";
import { EarningsChart } from "@/components/dashboard/earnings-chart";
import { PageHeading } from "@/components/dashboard/ui";
import { formatMoney } from "@/lib/format";
import type { Invoice } from "@/types/workspace";

export function AccountingPage({
  invoices,
  period,
  setPeriod,
}: {
  invoices: Invoice[];
  period: string;
  setPeriod: Dispatch<SetStateAction<string>>;
}) {
  const paid = invoices
    .filter((item) => item.status === "Paid")
    .reduce((sum, item) => sum + item.amount, 0);
  return (
    <>
      <PageHeading eyebrow="TOOLS / ACCOUNTING" title="Accounting" />
      <div className="finance-cards">
        <div className="finance-card">
          <small>Invoiced</small>
          <strong>
            {formatMoney(invoices.reduce((sum, item) => sum + item.amount, 0))}
          </strong>
          <span>Across all invoices</span>
        </div>
        <div className="finance-card">
          <small>Received</small>
          <strong>{formatMoney(paid)}</strong>
          <span>Marked paid</span>
        </div>
        <div className="finance-card">
          <small>Pending</small>
          <strong>
            {formatMoney(
              invoices
                .filter((item) => item.status === "Awaiting payment")
                .reduce((sum, item) => sum + item.amount, 0),
            )}
          </strong>
          <span>Awaiting client payment</span>
        </div>
      </div>
      <div className="accounting-chart">
        <EarningsChart period={period} setPeriod={setPeriod} />
      </div>
    </>
  );
}
