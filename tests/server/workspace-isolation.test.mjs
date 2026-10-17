import assert from "node:assert/strict";
import { register } from "node:module";
import { test } from "node:test";

register(new URL("./helpers/loader.mjs", import.meta.url));

const skip = process.env.DATABASE_URL
  ? false
  : "set DATABASE_URL to run workspace isolation tests";

test(
  "one firm cannot read or write another firm's data",
  { skip },
  async (t) => {
    const { eq, inArray } = await import("drizzle-orm");
    const { getDb } = await import("../../src/server/db/client.ts");
    const schema = await import("../../src/server/db/schema.ts");
    const { InputError, createRecord, loadWorkspace, saveTime } =
      await import("../../src/server/workspace/service.ts");

    const db = getDb();
    const emails = ["iso-owner-a@example.test", "iso-owner-b@example.test"];
    const firmNames = ["Isolation Firm A", "Isolation Firm B"];

    async function purge() {
      const staleUsers = await db
        .select({ id: schema.users.id })
        .from(schema.users)
        .where(inArray(schema.users.email, emails));
      const userIds = staleUsers.map((row) => row.id);
      const staleFirms = await db
        .select({ id: schema.firms.id })
        .from(schema.firms)
        .where(inArray(schema.firms.name, firmNames));
      const firmIds = staleFirms.map((row) => row.id);
      if (firmIds.length > 0) {
        await db
          .delete(schema.timeEntries)
          .where(inArray(schema.timeEntries.firmId, firmIds));
        await db
          .delete(schema.documents)
          .where(inArray(schema.documents.firmId, firmIds));
        await db
          .delete(schema.invoices)
          .where(inArray(schema.invoices.firmId, firmIds));
        await db
          .delete(schema.projects)
          .where(inArray(schema.projects.firmId, firmIds));
        await db
          .delete(schema.clients)
          .where(inArray(schema.clients.firmId, firmIds));
        await db
          .delete(schema.activity)
          .where(inArray(schema.activity.firmId, firmIds));
        await db
          .delete(schema.firmMembers)
          .where(inArray(schema.firmMembers.firmId, firmIds));
        await db.delete(schema.firms).where(inArray(schema.firms.id, firmIds));
      }
      if (userIds.length > 0) {
        await db.delete(schema.users).where(inArray(schema.users.id, userIds));
      }
    }

    try {
      await purge();

      const [userA, userB] = await db
        .insert(schema.users)
        .values([
          { email: emails[0], name: "Owner A" },
          { email: emails[1], name: "Owner B" },
        ])
        .returning({ id: schema.users.id });

      const [firmA, firmB] = await db
        .insert(schema.firms)
        .values([
          { name: firmNames[0], createdBy: userA.id },
          { name: firmNames[1], createdBy: userB.id },
        ])
        .returning({ id: schema.firms.id });

      await db.insert(schema.firmMembers).values([
        { firmId: firmA.id, userId: userA.id, role: "owner" },
        { firmId: firmB.id, userId: userB.id, role: "owner" },
      ]);

      await db.insert(schema.clients).values([
        { firmId: firmA.id, name: "Shared Name Client" },
        { firmId: firmA.id, name: "Alpha Only Client" },
        { firmId: firmB.id, name: "Shared Name Client" },
        { firmId: firmB.id, name: "Beta Only Client" },
      ]);
      const seededClients = await db
        .select({
          id: schema.clients.id,
          firmId: schema.clients.firmId,
          name: schema.clients.name,
        })
        .from(schema.clients)
        .where(inArray(schema.clients.firmId, [firmA.id, firmB.id]));
      const fixtureId = (rows, firmId, name) => {
        const match = rows.find(
          (row) => row.firmId === firmId && row.name === name,
        );
        assert.ok(match, `missing fixture ${name}`);
        return match.id;
      };
      const sharedAId = fixtureId(
        seededClients,
        firmA.id,
        "Shared Name Client",
      );
      const sharedBId = fixtureId(
        seededClients,
        firmB.id,
        "Shared Name Client",
      );

      await db.insert(schema.projects).values([
        {
          firmId: firmA.id,
          clientId: sharedAId,
          name: "Alpha Project",
          due: "2026-12-01",
          lead: "OA",
        },
        {
          firmId: firmB.id,
          clientId: sharedBId,
          name: "Beta Project",
          due: "2026-12-01",
          lead: "OB",
        },
      ]);
      const seededProjects = await db
        .select({
          id: schema.projects.id,
          firmId: schema.projects.firmId,
          name: schema.projects.name,
        })
        .from(schema.projects)
        .where(inArray(schema.projects.firmId, [firmA.id, firmB.id]));
      const projectAId = fixtureId(seededProjects, firmA.id, "Alpha Project");
      const projectBId = fixtureId(seededProjects, firmB.id, "Beta Project");

      await db.insert(schema.invoices).values([
        {
          firmId: firmA.id,
          clientId: sharedAId,
          description: "Alpha Invoice",
          amount: 1000,
          due: "2026-12-01",
        },
        {
          firmId: firmB.id,
          clientId: sharedBId,
          description: "Beta Invoice",
          amount: 2000,
          due: "2026-12-01",
        },
      ]);
      await db.insert(schema.documents).values([
        {
          firmId: firmA.id,
          clientId: sharedAId,
          title: "Alpha Doc",
          type: "Proposal",
        },
        {
          firmId: firmB.id,
          clientId: sharedBId,
          title: "Beta Doc",
          type: "Proposal",
        },
      ]);
      await db.insert(schema.timeEntries).values([
        {
          firmId: firmA.id,
          projectId: projectAId,
          userId: userA.id,
          date: "2026-10-18",
          seconds: 3600,
        },
        {
          firmId: firmB.id,
          projectId: projectBId,
          userId: userB.id,
          date: "2026-10-18",
          seconds: 1800,
        },
      ]);
      await db.insert(schema.activity).values([
        {
          firmId: firmA.id,
          userId: userA.id,
          action: "created a project",
          subject: "Alpha Project",
        },
        {
          firmId: firmB.id,
          userId: userB.id,
          action: "created a project",
          subject: "Beta Project",
        },
      ]);

      const sessionA = {
        userId: userA.id,
        name: "Owner A",
        firmId: firmA.id,
        role: "owner",
      };
      const sessionB = {
        userId: userB.id,
        name: "Owner B",
        firmId: firmB.id,
        role: "owner",
      };

      await t.test("each firm reads only its own records", async () => {
        const [wsA, wsB] = await Promise.all([
          loadWorkspace(sessionA),
          loadWorkspace(sessionB),
        ]);
        assert.deepEqual(wsA.clients.map((client) => client.name).sort(), [
          "Alpha Only Client",
          "Shared Name Client",
        ]);
        assert.deepEqual(wsB.clients.map((client) => client.name).sort(), [
          "Beta Only Client",
          "Shared Name Client",
        ]);

        const ids = (rows) => new Set(rows.map((row) => row.id));
        for (const key of [
          "clients",
          "projects",
          "invoices",
          "documents",
          "entries",
          "activity",
        ]) {
          assert.ok(wsA[key].length > 0, `${key} fixtures for firm A`);
          const overlap = [...ids(wsA[key])].filter((id) =>
            ids(wsB[key]).has(id),
          );
          assert.deepEqual(overlap, [], `${key} leaked across firms`);
        }

        const projectNames = (ws) => ws.projects.map((project) => project.name);
        assert.ok(projectNames(wsA).includes("Alpha Project"));
        assert.ok(projectNames(wsB).includes("Beta Project"));
        assert.equal(projectNames(wsA).includes("Beta Project"), false);
        assert.equal(projectNames(wsB).includes("Alpha Project"), false);
        assert.ok(
          wsA.activity.some((item) => item.subject === "Alpha Project"),
        );
        assert.ok(wsB.activity.some((item) => item.subject === "Beta Project"));
        assert.ok(
          wsA.entries.some((entry) => entry.project === "Alpha Project"),
        );
        assert.ok(
          wsB.entries.some((entry) => entry.project === "Beta Project"),
        );
      });

      await t.test(
        "a firm cannot create against another firm's client or project",
        async () => {
          const counts = (ws) => ({
            clients: ws.clients.length,
            projects: ws.projects.length,
            invoices: ws.invoices.length,
            documents: ws.documents.length,
            entries: ws.entries.length,
            activity: ws.activity.length,
          });
          const beforeA = await loadWorkspace(sessionA);
          const beforeB = await loadWorkspace(sessionB);
          const rejectsInput = (promise, message) =>
            assert.rejects(promise, (error) => {
              assert.ok(
                error instanceof InputError,
                `expected InputError, got ${error}`,
              );
              assert.equal(error.message, message);
              return true;
            });

          await rejectsInput(
            createRecord(sessionB, {
              kind: "project",
              values: {
                title: "Sneaky Project",
                client: "Alpha Only Client",
                due: "2026-12-01",
              },
            }),
            "Unknown client",
          );
          await rejectsInput(
            createRecord(sessionB, {
              kind: "invoice",
              values: {
                title: "Sneaky Invoice",
                client: "Alpha Only Client",
                amount: 100,
                due: "2026-12-01",
              },
            }),
            "Unknown client",
          );
          await rejectsInput(
            createRecord(sessionB, {
              kind: "contract",
              values: {
                title: "Sneaky Contract",
                client: "Alpha Only Client",
              },
            }),
            "Unknown client",
          );
          await rejectsInput(
            saveTime(sessionB, { project: "Alpha Project", seconds: 60 }),
            "Unknown project",
          );

          const afterA = await loadWorkspace(sessionA);
          const afterB = await loadWorkspace(sessionB);
          assert.deepEqual(counts(afterA), counts(beforeA));
          assert.deepEqual(counts(afterB), counts(beforeB));
          for (const ws of [afterA, afterB]) {
            assert.equal(
              ws.projects.some((project) => project.name === "Sneaky Project"),
              false,
            );
            assert.equal(
              ws.invoices.some(
                (invoice) => invoice.description === "Sneaky Invoice",
              ),
              false,
            );
            assert.equal(
              ws.documents.some(
                (document) => document.title === "Sneaky Contract",
              ),
              false,
            );
          }
        },
      );

      await t.test(
        "a firm can create against its own same-named client",
        async () => {
          const ws = await createRecord(sessionA, {
            kind: "project",
            values: {
              title: "Alpha New Project",
              client: "Shared Name Client",
              due: "2026-12-01",
            },
          });
          assert.ok(
            ws.projects.some((project) => project.name === "Alpha New Project"),
          );

          const [created] = await db
            .select({
              firmId: schema.projects.firmId,
              clientId: schema.projects.clientId,
            })
            .from(schema.projects)
            .where(eq(schema.projects.name, "Alpha New Project"));
          assert.equal(created.firmId, firmA.id);
          assert.equal(created.clientId, sharedAId);

          const wsB = await loadWorkspace(sessionB);
          assert.equal(
            wsB.projects.some(
              (project) => project.name === "Alpha New Project",
            ),
            false,
          );
        },
      );
    } finally {
      await purge();
      await db.$client.end();
    }
  },
);
