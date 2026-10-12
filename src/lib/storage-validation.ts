import type {
  ActivityItem,
  Client,
  Document,
  Invoice,
  Project,
  TimeEntry,
} from "@/types/workspace";

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
export const validActivity = records<ActivityItem>({
  id: "string",
  person: "string",
  action: "string",
  subject: "string",
  time: "string",
  type: "string",
});
export const validTimeEntries = records<TimeEntry>({
  id: "string",
  date: "string",
  project: "string",
  seconds: "number",
});
