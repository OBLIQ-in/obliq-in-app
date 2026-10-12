import type { Dispatch, SetStateAction } from "react";
import { ArrowRight, Plus } from "lucide-react";

export function Status({ value }: { value: string }) {
  return (
    <span
      className={`status status-${value.toLowerCase().replace(/[^a-z]+/g, "-")}`}
    >
      {value}
    </span>
  );
}

export function SectionHeader({
  title,
  description,
  action,
  onAction,
}: {
  title: string;
  description?: string;
  action?: string;
  onAction?: () => void;
}) {
  return (
    <div className="section-heading">
      <div>
        <h2>{title}</h2>
        {description && <p>{description}</p>}
      </div>
      {action && (
        <button className="text-action" onClick={onAction}>
          {action}
          <ArrowRight size={15} />
        </button>
      )}
    </div>
  );
}

export function PageHeading({
  eyebrow,
  title,
  description,
  action,
  onAction,
}: {
  eyebrow: string;
  title: string;
  description?: string;
  action?: string;
  onAction?: () => void;
}) {
  return (
    <div className="page-heading">
      <div>
        <span>{eyebrow}</span>
        <h1>{title}</h1>
        {description && <p>{description}</p>}
      </div>
      {action && (
        <button className="primary-button" onClick={onAction}>
          <Plus size={16} />
          {action}
        </button>
      )}
    </div>
  );
}

export function FilterTabs({
  values,
  active,
  setActive,
}: {
  values: string[];
  active: string;
  setActive: Dispatch<SetStateAction<string>>;
}) {
  return (
    <div className="filter-tabs" role="group" aria-label="Filter list">
      {values.map((value) => (
        <button
          key={value}
          className={active === value ? "selected" : ""}
          aria-pressed={active === value}
          onClick={() => setActive(value)}
        >
          {value}
        </button>
      ))}
    </div>
  );
}
