import { PageHeading, SectionHeader, Status } from "@/components/dashboard/ui";
import type { OpenModal } from "@/components/dashboard/contracts";
import type { Client } from "@/types/workspace";

export function ClientsPage({
  clients,
  openModal,
  query,
}: {
  clients: Client[];
  openModal: OpenModal;
  query: string;
}) {
  const visible = clients.filter((item) =>
    `${item.name} ${item.contact}`.toLowerCase().includes(query.toLowerCase()),
  );
  return (
    <>
      <PageHeading
        eyebrow="WORKSPACE / CLIENTS"
        title="Clients"
        action="Add client"
        onAction={() => openModal("client")}
      />
      <section className="panel page-panel">
        <SectionHeader
          title="Client directory"
          description={`${visible.length} clients`}
        />
        <div className="table-scroll">
          <table className="data-table">
            <thead>
              <tr>
                <th>Client</th>
                <th>Primary contact</th>
                <th>Email</th>
                <th>Projects</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {visible.length ? (
                visible.map((item) => (
                  <tr key={item.id}>
                    <td>
                      <strong>{item.name}</strong>
                      <small>{item.id}</small>
                    </td>
                    <td>{item.contact}</td>
                    <td>
                      <a className="table-link" href={`mailto:${item.email}`}>
                        {item.email}
                      </a>
                    </td>
                    <td>{item.projects}</td>
                    <td>
                      <Status value={item.status} />
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={5} className="empty-row">
                    No clients match your search.
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
