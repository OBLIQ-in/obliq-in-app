import { ArrowRight } from "lucide-react";
import type { Client, Invoice, Project } from "@/types/workspace";
import type { Route } from "@/lib/routes";

export type SearchResult = {
  type: string;
  title: string;
  detail: string;
  route: Route;
  record?: Project;
};

export function SearchResults({
  query,
  open,
  projects,
  clients,
  invoices,
  select,
}: {
  query: string;
  open: boolean;
  projects: Project[];
  clients: Client[];
  invoices: Invoice[];
  select: (item: SearchResult) => void;
}) {
  const text = query.trim().toLowerCase();
  if (!text || !open) return null;
  const results = [
    ...projects
      .filter((item) =>
        `${item.name} ${item.client} ${item.id}`.toLowerCase().includes(text),
      )
      .map((item) => ({
        type: "Project",
        title: item.name,
        detail: item.client,
        route: "projects" as const,
        record: item,
      })),
    ...clients
      .filter((item) =>
        `${item.name} ${item.contact}`.toLowerCase().includes(text),
      )
      .map((item) => ({
        type: "Client",
        title: item.name,
        detail: item.contact,
        route: "clients" as const,
      })),
    ...invoices
      .filter((item) =>
        `${item.id} ${item.client}`.toLowerCase().includes(text),
      )
      .map((item) => ({
        type: "Invoice",
        title: item.id,
        detail: item.client,
        route: "invoices" as const,
      })),
  ].slice(0, 6);
  return (
    <div className="search-results" role="region" aria-label="Search results">
      {results.length ? (
        results.map((item, index) => (
          <button key={`${item.type}-${index}`} onClick={() => select(item)}>
            <span className="result-type">{item.type}</span>
            <span>
              <strong>{item.title}</strong>
              <small>{item.detail}</small>
            </span>
            <ArrowRight size={15} />
          </button>
        ))
      ) : (
        <p>No matching projects, clients, or invoices.</p>
      )}
    </div>
  );
}
