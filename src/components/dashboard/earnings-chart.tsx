import type { Dispatch, SetStateAction } from "react";
import { ArrowDownToLine, ChevronDown } from "lucide-react";
import type { TrackedHoursPoint } from "@/types/workspace";

type PeriodProps = {
  period: string;
  setPeriod: Dispatch<SetStateAction<string>>;
  monthlyHours: TrackedHoursPoint[];
  yearlyHours: TrackedHoursPoint[];
};

export function EarningsChart({
  period,
  setPeriod,
  monthlyHours,
  yearlyHours,
}: PeriodProps) {
  const hours = period === "Month" ? monthlyHours : yearlyHours;
  const maximum = Math.max(...hours.map((item) => item.hours), 1);
  function download() {
    const csv = [
      `${period},Tracked hours`,
      ...hours.map((row) => `${row.label},${row.hours}`),
    ].join("\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = "obliq-tracked-hours.csv";
    link.click();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  return (
    <section className="chart-card" aria-label="Tracked hours over time">
      <div className="chart-top">
        <div>
          <h2>Tracked hours</h2>
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
            aria-label="Download tracked hours report"
            onClick={download}
          >
            <ArrowDownToLine size={16} />
          </button>
        </div>
      </div>
      <div className="chart-legend">
        <span>
          <i className="dot billable-dot" />
          Hours
        </span>
      </div>
      <div className="chart-area">
        <div className="grid-lines">
          <i />
          <i />
          <i />
        </div>
        <div className={`bars ${period === "Year" ? "year-bars" : ""}`}>
          {hours.map((item) => (
            <div
              className="bar-slot"
              key={item.label}
              title={`${item.label}: ${item.hours} tracked hours`}
            >
              <div
                className="bar"
                style={{ height: `${(item.hours / maximum) * 100}%` }}
              />
              <span>{item.label}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
