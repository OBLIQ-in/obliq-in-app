import { PageHeading } from "@/components/dashboard/ui";
import { dashboard } from "@/data/dashboard";

// Read-only for now. The name, firm and role come from sample data until
// login and the firm profile exist.
export function SettingsPage() {
  const owner = dashboard.team[0];
  return (
    <>
      <PageHeading eyebrow="ACCOUNT" title="Profile & settings" />
      <section className="panel page-panel profile-card">
        <dl>
          <div>
            <dt>Name</dt>
            <dd>{owner.name}</dd>
          </div>
          <div>
            <dt>Role</dt>
            <dd>{owner.role}</dd>
          </div>
          <div>
            <dt>Workspace</dt>
            <dd>OBLIQ workspace</dd>
          </div>
        </dl>
        <p className="modal-note">
          Editing your profile will be available after login is added.
        </p>
      </section>
    </>
  );
}
