import { dashboard } from "../data/dashboard.ts";
import { todayISO } from "./format.ts";
import {
  validProjects,
  validClients,
  validInvoices,
  validDocuments,
  validReviews,
  validActivity,
  validTimeEntries,
} from "./storage-validation.ts";
import {
  evidenceReviewStatuses,
  type DocumentReview,
  type WorkspaceData,
  type WorkspaceSource,
} from "../types/workspace.ts";

type Storage = {
  getItem: (key: string) => string | null;
  setItem: (key: string, value: string) => void;
};

const REVIEWER = "Demo reviewer";

function defaultReviews(
  documents: WorkspaceData["documents"],
): DocumentReview[] {
  return documents.map((document) => ({
    documentId: document.id,
    status: "Received",
    history: [],
  }));
}

function normalizeReview(review: DocumentReview): DocumentReview {
  return {
    ...review,
    ...(review.status === "Rejected"
      ? { rejectionReason: review.rejectionReason }
      : { rejectionReason: undefined }),
    ...(review.status === "More information required"
      ? { clientMessage: review.clientMessage }
      : { clientMessage: undefined }),
    history: review.history.map((event) => ({
      ...event,
      ...(event.status === "Rejected"
        ? { rejectionReason: event.rejectionReason }
        : { rejectionReason: undefined }),
      ...(event.status === "More information required"
        ? { clientMessage: event.clientMessage }
        : { clientMessage: undefined }),
    })),
  };
}

export function createLocalWorkspace(
  getStorage: () => Storage | null,
): WorkspaceSource {
  let data: WorkspaceData = {
    projects: dashboard.projects,
    clients: dashboard.clients,
    invoices: dashboard.invoices,
    documents: dashboard.documents,
    reviews: defaultReviews(dashboard.documents),
    activity: dashboard.activity,
    entries: [],
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
      const documents = read("documents", data.documents, validDocuments);
      const reviews = read("reviews", defaultReviews(documents), validReviews)
        .filter((review) =>
          documents.some((document) => document.id === review.documentId),
        )
        .map(normalizeReview);
      data = {
        projects: read("projects", data.projects, validProjects),
        clients: read("clients", data.clients, validClients),
        invoices: read("invoices", data.invoices, validInvoices),
        documents,
        reviews,
        activity: read("activity", data.activity, validActivity),
        entries: read("time", data.entries, validTimeEntries),
      };
      return data;
    },
    async create(kind, values) {
      const id = crypto.randomUUID().slice(0, 8);
      if (kind === "project") {
        data = {
          ...data,
          projects: [
            {
              id: `PRJ-${id}`,
              name: values.title,
              client: values.client,
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
              client: values.client,
              amount: values.amount,
              due: values.due,
              status: "Draft",
            },
            ...data.invoices,
          ],
        };
        write("invoices", data.invoices);
        addActivity("saved an invoice draft for", values.client);
      } else {
        data = {
          ...data,
          documents: [
            {
              id: `DOC-${id}`,
              title: values.title,
              client: values.client,
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
        addActivity(`created a ${kind} for`, values.client);
      }
      return data;
    },
    async reviewDocument(documentId, status, details) {
      if (!evidenceReviewStatuses.includes(status)) {
        throw new Error("Unsupported evidence review status.");
      }
      const document = data.documents.find((item) => item.id === documentId);
      if (!document) throw new Error("Document not found.");
      const rejectionReason = details.rejectionReason?.trim();
      const clientMessage = details.clientMessage?.trim();
      const internalNote = details.internalNote?.trim();
      if (status === "Rejected" && !rejectionReason) {
        throw new Error("A rejection reason is required.");
      }
      if (status === "More information required" && !clientMessage) {
        throw new Error("A client-facing message is required.");
      }

      const current = data.reviews.find(
        (review) => review.documentId === documentId,
      ) || {
        documentId,
        status: "Received" as const,
        history: [],
      };
      const sameDetails =
        current.status === status &&
        current.rejectionReason === rejectionReason &&
        current.clientMessage === clientMessage &&
        current.internalNote === internalNote;
      if (sameDetails) return data;

      const timestamp = new Date().toISOString();
      const event = {
        id: `REV-${crypto.randomUUID()}`,
        documentId,
        previousStatus: current.status,
        status,
        actor: REVIEWER,
        timestamp,
        ...(status === "Rejected" && rejectionReason
          ? { rejectionReason }
          : {}),
        ...(status === "More information required" && clientMessage
          ? { clientMessage }
          : {}),
        ...(internalNote ? { internalNote } : {}),
      };
      const nextReview: DocumentReview = {
        documentId,
        status,
        history: [...current.history, event],
        ...(status === "Accepted"
          ? { reviewer: REVIEWER, acceptedAt: timestamp }
          : current.reviewer
            ? { reviewer: current.reviewer }
            : {}),
        ...(status === "Accepted"
          ? { acceptedAt: timestamp }
          : current.acceptedAt
            ? { acceptedAt: current.acceptedAt }
            : {}),
        ...(status === "Rejected" ? { rejectionReason } : {}),
        ...(status === "More information required" ? { clientMessage } : {}),
        ...(internalNote ? { internalNote } : {}),
      };
      data = {
        ...data,
        reviews: [
          nextReview,
          ...data.reviews.filter((review) => review.documentId !== documentId),
        ],
      };
      write("reviews", data.reviews);
      addActivity(`updated evidence status to ${status}`, document.title);
      return data;
    },
    async saveTime(project, seconds) {
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

// Storage is accessed only when a client effect or user action calls the source.
export const workspaceSource = createLocalWorkspace(() => window.localStorage);
