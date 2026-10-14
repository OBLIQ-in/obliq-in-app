import type {
  ActivityItem,
  Client,
  Document,
  DocumentReview,
  EvidenceReviewEvent,
  Invoice,
  Project,
  TimeEntry,
} from "../types/workspace.ts";
import { evidenceReviewStatuses } from "../types/workspace.ts";

type FieldType =
  | "string"
  | "number"
  | "optional-string"
  | "optional-priority"
  | "optional-string-list";
type RecordShape<T> = { [Key in keyof T]-?: FieldType };

// localStorage is user-controlled. Check every field before rendering a record.
function records<T>(shape: RecordShape<T>) {
  return (value: unknown): value is T[] =>
    Array.isArray(value) &&
    value.every(
      (item) =>
        item !== null &&
        typeof item === "object" &&
        Object.entries(shape).every(([key, type]) => {
          const field = item[key];
          if (type === "optional-string")
            return field === undefined || typeof field === "string";
          if (type === "optional-priority")
            return (
              field === undefined || ["High", "Medium", "Low"].includes(field)
            );
          if (type === "optional-string-list")
            return (
              field === undefined ||
              (Array.isArray(field) &&
                field.every((entry) => typeof entry === "string"))
            );
          return (
            typeof field === type &&
            (type !== "number" || Number.isFinite(field))
          );
        }),
    );
}

export const validProjects = records<Project>({
  id: "string",
  name: "string",
  client: "string",
  status: "string",
  progress: "number",
  due: "string",
  lead: "string",
  category: "string",
  priority: "optional-priority",
  team: "optional-string-list",
});
export const validClients = records<Client>({
  id: "string",
  name: "string",
  contact: "string",
  email: "string",
  projects: "number",
  status: "string",
});
export const validInvoices = records<Invoice>({
  id: "string",
  client: "string",
  amount: "number",
  due: "string",
  status: "string",
  description: "optional-string",
});
export const validDocuments = records<Document>({
  id: "string",
  title: "string",
  client: "string",
  type: "string",
  updated: "string",
  status: "string",
});

const isStatus = (value: unknown) =>
  typeof value === "string" &&
  evidenceReviewStatuses.includes(
    value as (typeof evidenceReviewStatuses)[number],
  );

const isOptionalString = (value: unknown) =>
  value === undefined || typeof value === "string";

const validReviewEvent = (value: unknown): value is EvidenceReviewEvent => {
  if (!value || typeof value !== "object") return false;
  const event = value as Record<string, unknown>;
  return (
    typeof event.id === "string" &&
    event.id.trim().length > 0 &&
    typeof event.documentId === "string" &&
    event.documentId.trim().length > 0 &&
    isStatus(event.previousStatus) &&
    isStatus(event.status) &&
    typeof event.actor === "string" &&
    event.actor.trim().length > 0 &&
    typeof event.timestamp === "string" &&
    !Number.isNaN(Date.parse(event.timestamp)) &&
    isOptionalString(event.rejectionReason) &&
    isOptionalString(event.clientMessage) &&
    isOptionalString(event.internalNote) &&
    (event.status !== "Rejected" ||
      (typeof event.rejectionReason === "string" &&
        event.rejectionReason.trim().length > 0)) &&
    (event.status !== "More information required" ||
      (typeof event.clientMessage === "string" &&
        event.clientMessage.trim().length > 0))
  );
};

export const validReviews = (value: unknown): value is DocumentReview[] =>
  Array.isArray(value) &&
  value.every((item) => {
    if (!item || typeof item !== "object") return false;
    const review = item as Record<string, unknown>;
    return (
      typeof review.documentId === "string" &&
      review.documentId.trim().length > 0 &&
      isStatus(review.status) &&
      isOptionalString(review.reviewer) &&
      isOptionalString(review.acceptedAt) &&
      (review.acceptedAt === undefined ||
        !Number.isNaN(Date.parse(review.acceptedAt as string))) &&
      isOptionalString(review.rejectionReason) &&
      isOptionalString(review.clientMessage) &&
      isOptionalString(review.internalNote) &&
      Array.isArray(review.history) &&
      review.history.every(validReviewEvent)
    );
  });
export const validActivity = records<ActivityItem>({
  id: "string",
  person: "string",
  action: "string",
  subject: "string",
  time: "string",
  createdAt: "optional-string",
  type: "string",
});
export const validTimeEntries = records<TimeEntry>({
  id: "string",
  date: "string",
  project: "string",
  seconds: "number",
});
