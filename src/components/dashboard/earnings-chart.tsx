import type { Dispatch, SetStateAction } from "react";
import { ArrowDownToLine, ChevronDown } from "lucide-react";
import { dashboard } from "@/data/dashboard";

type PeriodProps = {
  period: string;
  setPeriod: Dispatch<SetStateAction<string>>;
};

export function EarningsChart({ period, setPeriod }: PeriodProps) {
  const earnings =
    period === "Month" ? dashboard.earnings : dashboard.yearlyEarnings;
  function download() {
    const csv = [
      `${period},Billable,Non billable`,
      ...earnings.map(
        (row) => `${row.label},${row.billable},${row.nonBillable}`,
      ),
    ].join("\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = "obliq-earnings.csv";
    link.click();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  return (
    <section className="chart-card" aria-label="Earning over time">
      <div className="chart-top">
        <div>
          <h2>Earning over time</h2>
        </div>
        <div className="chart-controls">
          <button
            className="period-select"
            onClick={() =>
              setPeriod((value) => (value === "Month" ? "Year" : "Month"))
            }
            aria-label={`Period: ${period}. Switch period`}
          >
            {period}
            <ChevronDown size={14} />
          </button>
          <button
            className="icon-button"
            aria-label="Download earnings report"
            onClick={download}
          >
            <ArrowDownToLine size={16} />
          </button>
        </div>
      </div>
      <div className="chart-legend">
        <span>
          <i className="dot billable-dot" />
          Billable
        </span>
        <span>
          <i className="dot nonbillable-dot" />
          Non billable
        </span>
      </div>
      <div className="chart-area">
        <div className="grid-lines">
          <i />
          <i />
          <i />
        </div>
        <div className={`bars ${period === "Year" ? "year-bars" : ""}`}>
          {earnings.map((item) => (
            <div
              className="bar-slot"
              key={item.label}
              title={`${item.label}: ${item.billable} billable, ${item.nonBillable} non billable`}
            >
              <div className="bar" style={{ height: `${item.billable}%` }} />
              <span>{item.label}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
