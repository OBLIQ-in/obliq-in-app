import { dashboard } from "../data/dashboard.ts";
import { todayISO } from "./format.ts";
import {
  clientTaken,
  projectTaken,
  WorkspaceConflict,
} from "./workspace-error.ts";
import {
  validProjects,
  validClients,
  validInvoices,
  validDocuments,
  validActivity,
  validTimeEntries,
} from "./storage-validation.ts";
import type { WorkspaceData, WorkspaceSource } from "@/types/workspace";

type Storage = {
  getItem: (key: string) => string | null;
  setItem: (key: string, value: string) => void;
};

export function createLocalWorkspace(
  getStorage: () => Storage | null,
): WorkspaceSource {
  let data: WorkspaceData = {
    projects: dashboard.projects,
    clients: dashboard.clients,
    invoices: dashboard.invoices,
    documents: dashboard.documents,
    activity: dashboard.activity,
    team: dashboard.team,
    entries: [],
    monthlyTrackedHours: dashboard.earnings.map((item) => ({
      label: item.label,
      hours: item.billable + item.nonBillable,
    })),
    yearlyTrackedHours: dashboard.yearlyEarnings.map((item) => ({
      label: item.label,
      hours: item.billable + item.nonBillable,
    })),
    syntheticData: true,
  };

  function read<T>(
    name: string,
    fallback: T,
    validate: (value: unknown) => value is T,
  ): T {
    try {
      const saved = getStorage()?.getItem(`obliq-preview-${name}-v1`);
      const parsed: unknown = saved ? JSON.parse(saved) : null;
      return validate(parsed) ? parsed : fallback;
    } catch {
      return fallback;
    }
  }

  function write(name: string, value: unknown) {
    try {
      getStorage()?.setItem(`obliq-preview-${name}-v1`, JSON.stringify(value));
    } catch {
      /* Keep the in-memory update when browser storage is unavailable. */
    }
  }

  function addActivity(action: string, subject: string) {
    data = {
      ...data,
      activity: [
        {
          id: `ACT-${crypto.randomUUID()}`,
          person: "You",
          action,
          subject,
          time: "",
          createdAt: new Date().toISOString(),
          type: "new",
        },
        ...data.activity,
      ],
    };
    write("activity", data.activity);
  }

  return {
    async load() {
      data = {
        projects: read("projects", data.projects, validProjects),
        clients: read("clients", data.clients, validClients),
        invoices: read("invoices", data.invoices, validInvoices),
        documents: read("documents", data.documents, validDocuments),
        activity: read("activity", data.activity, validActivity),
        team: data.team,
        entries: read("time", data.entries, validTimeEntries),
        monthlyTrackedHours: data.monthlyTrackedHours,
        yearlyTrackedHours: data.yearlyTrackedHours,
        syntheticData: true,
      };
      return data;
    },
    async create(kind, values) {
      const id = crypto.randomUUID().slice(0, 8);
      const same = (a: string, b: string) =>
        a.trim().toLowerCase() === b.trim().toLowerCase();
      if (
        kind === "client" &&
        data.clients.some((item) => same(item.name, values.title))
      ) {
        throw new WorkspaceConflict(clientTaken(values.title));
      }
      const client =
        kind === "client"
          ? ""
          : data.clients.find((item) => item.id === values.clientId)?.name;
      if (client === undefined) throw new Error("Unknown client");
      if (kind === "project") {
        if (
          data.projects.some(
            (item) => item.client === client && same(item.name, values.title),
          )
        ) {
          throw new WorkspaceConflict(projectTaken(values.title, client));
        }
        data = {
          ...data,
          projects: [
            {
              id: `PRJ-${id}`,
              name: values.title,
              client,
              status: "Planning",
              progress: 0,
              due: values.due,
              lead: "You",
              category: "General",
            },
            ...data.projects,
          ],
        };
        write("projects", data.projects);
        addActivity("created a project", values.title);
      } else if (kind === "client") {
        data = {
          ...data,
          clients: [
            {
              id: `CL-${id}`,
              name: values.title,
              contact: values.contact,
              email: values.email,
              projects: 0,
              status: "Active",
            },
            ...data.clients,
          ],
        };
        write("clients", data.clients);
        addActivity("added a client", values.title);
      } else if (kind === "invoice") {
        data = {
          ...data,
          invoices: [
            {
              id: `INV-${id}`,
              description: values.title,
              client,
              amount: values.amount,
              due: values.due,
              status: "Draft",
            },
            ...data.invoices,
          ],
        };
        write("invoices", data.invoices);
        addActivity("saved an invoice draft for", client);
      } else {
        data = {
          ...data,
          documents: [
            {
              id: `DOC-${id}`,
              title: values.title,
              client,
              type: {
                proposal: "Proposal",
                contract: "Contract",
                form: "Form",
              }[kind],
              updated: todayISO(),
              status: "Draft",
            },
            ...data.documents,
          ],
        };
        write("documents", data.documents);
        addActivity(`created a ${kind} for`, client);
      }
      return data;
    },
    async saveTime(projectId, seconds) {
      const project = data.projects.find((item) => item.id === projectId)?.name;
      if (project === undefined) throw new Error("Unknown project");
      data = {
        ...data,
        entries: [
          {
            id: crypto.randomUUID(),
            date: todayISO(),
            project,
            seconds,
          },
          ...data.entries,
        ],
      };
      write("time", data.entries);
      addActivity("recorded time on", project);
      return data;
    },
  };
}
