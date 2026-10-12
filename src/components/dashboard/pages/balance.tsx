import { PageHeading, SectionHeader, Status } from "@/components/dashboard/ui";
import { formatDate, formatMoney } from "@/lib/format";
import type { Navigate } from "@/components/dashboard/contracts";
import type { Invoice } from "@/types/workspace";

export function BalancePage({
  invoices,
  navigate,
}: {
  invoices: Invoice[];
  navigate: Navigate;
}) {
  const open = invoices.filter(
    (item) => item.status !== "Paid" && item.status !== "Draft",
  );
  const outstanding = open.reduce((total, item) => total + item.amount, 0);
  return (
    <>
      <PageHeading eyebrow="TOOLS / BALANCE" title="Balance" />
      <div className="finance-cards">
        <div className="finance-card">
          <small>Outstanding</small>
          <strong>{formatMoney(outstanding)}</strong>
          <span>{open.length} invoices to follow up</span>
        </div>
        <div className="finance-card">
          <small>Collected</small>
          <strong>
            {formatMoney(
              invoices
                .filter((item) => item.status === "Paid")
                .reduce((total, item) => total + item.amount, 0),
            )}
          </strong>
          <span>Paid invoices in this preview</span>
        </div>
        <div className="finance-card">
          <small>Overdue</small>
          <strong>
            {formatMoney(
              invoices
                .filter((item) => item.status === "Overdue")
                .reduce((total, item) => total + item.amount, 0),
            )}
          </strong>
          <span>Requires attention</span>
        </div>
      </div>
      <section className="panel page-panel">
        <SectionHeader
          title="Balances requiring attention"
          action="All invoices"
          onAction={() => navigate("invoices")}
        />
        <div className="table-scroll">
          <table className="data-table">
            <thead>
              <tr>
                <th>Invoice</th>
                <th>Client</th>
                <th>Due</th>
                <th>Amount</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {open.map((item) => (
                <tr key={item.id}>
                  <td>
                    <strong>{item.id}</strong>
                  </td>
                  <td>{item.client}</td>
                  <td>{formatDate(item.due)}</td>
                  <td className="money-cell">{formatMoney(item.amount)}</td>
                  <td>
                    <Status value={item.status} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </>
  );
}
