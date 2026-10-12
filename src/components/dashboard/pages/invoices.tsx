import { useState } from "react";
import {
  FilterTabs,
  PageHeading,
  SectionHeader,
  Status,
} from "@/components/dashboard/ui";
import { formatDate, formatMoney } from "@/lib/format";
import type { OpenModal } from "@/components/dashboard/contracts";
import type { Invoice } from "@/types/workspace";

export function InvoicesPage({
  invoices,
  openModal,
  query,
}: {
  invoices: Invoice[];
  openModal: OpenModal;
  query: string;
}) {
  const [filter, setFilter] = useState("All");
  const visible = invoices.filter(
    (item) =>
      (filter === "All" || item.status === filter) &&
      `${item.id} ${item.client} ${item.description || ""}`
        .toLowerCase()
        .includes(query.toLowerCase()),
  );
  return (
    <>
      <PageHeading
        eyebrow="TOOLS / INVOICES"
        title="Invoices"
        action="New invoice"
        onAction={() => openModal("invoice")}
      />
      <section className="panel page-panel">
        <div className="panel-toolbar">
          <SectionHeader
            title="Invoice register"
            description={`${visible.length} invoices`}
          />
          <FilterTabs
            values={["All", "Draft", "Awaiting payment", "Overdue", "Paid"]}
            active={filter}
            setActive={setFilter}
          />
        </div>
        <div className="table-scroll">
          <table className="data-table">
            <thead>
              <tr>
                <th>Invoice</th>
                <th>Client</th>
                <th>Amount</th>
                <th>Due date</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {visible.length ? (
                visible.map((item) => (
                  <tr key={item.id}>
                    <td>
                      <strong>{item.id}</strong>
                      {item.description && <small>{item.description}</small>}
                    </td>
                    <td>{item.client}</td>
                    <td className="money-cell">{formatMoney(item.amount)}</td>
                    <td>{formatDate(item.due)}</td>
                    <td>
                      <Status value={item.status} />
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={5} className="empty-row">
                    No invoices match this view.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </>
  );
}
