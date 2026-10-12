import { Landmark } from "lucide-react";
import { PageHeading } from "@/components/dashboard/ui";
import type { Navigate } from "@/components/dashboard/contracts";

export function TaxesPage({ navigate }: { navigate: Navigate }) {
  return (
    <>
      <PageHeading eyebrow="TOOLS / TAXES" title="Taxes" />
      <section className="panel page-panel coming-soon">
        <span className="round-icon">
          <Landmark size={17} strokeWidth={1.7} />
        </span>
        <h2>Tax tools are not available yet</h2>
        <p>
          Filing and tax tracking will be added in a later version. Until then,
          your invoices and accounting figures are on their own pages.
        </p>
        <button className="secondary-button" onClick={() => navigate("home")}>
          Back to home
        </button>
      </section>
    </>
  );
}
