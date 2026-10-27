import { sql } from "drizzle-orm";
import {
  check,
  date,
  boolean,
  foreignKey,
  index,
  integer,
  jsonb,
  numeric,
  pgEnum,
  pgTable,
  primaryKey,
  text,
  timestamp,
  unique,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

// Enum values match the strings the screens filter on, so rows map to the
// frontend types without translation.
export const userType = pgEnum("user_type", ["client", "firm"]);
// Roles and what each can do are defined in #29.
export const memberRole = pgEnum("member_role", [
  "owner",
  "article_assistant",
  "reviewer",
]);
export const clientStatus = pgEnum("client_status", ["Active", "Inactive"]);
export const projectStatus = pgEnum("project_status", [
  "Planning",
  "In progress",
  "Review",
  "Completed",
]);
export const invoiceStatus = pgEnum("invoice_status", [
  "Draft",
  "Awaiting payment",
  "Overdue",
  "Paid",
]);
export const documentType = pgEnum("document_type", [
  "Proposal",
  "Contract",
  "Form",
]);
export const documentStatus = pgEnum("document_status", [
  "Draft",
  "In review",
  "Ready",
]);
// Draft until work starts; Archived engagements are read-only.
export const engagementStatus = pgEnum("engagement_status", [
  "Draft",
  "Active",
  "Review",
  "Complete",
  "Archived",
]);
export const engagementType = pgEnum("engagement_type", [
  "Statutory audit",
  "Tax audit",
  "Internal audit",
  "Other",
]);
// The firm's own workspace, and later the client-share one (#33).
export const workspaceKind = pgEnum("workspace_kind", [
  "internal",
  "client_share",
]);
export const activityType = pgEnum("activity_type", [
  "new",
  "review",
  "file",
  "invoice",
]);

const id = () => uuid("id").primaryKey().defaultRandom();
const createdAt = () =>
  timestamp("created_at", { withTimezone: true }).notNull().defaultNow();
const firmId = () =>
  uuid("firm_id")
    .notNull()
    .references(() => firms.id, { onDelete: "cascade" });

export const users = pgTable(
  "users",
  {
    id: id(),
    email: text("email").notNull(),
    name: text("name").notNull(),
    // Null until onboarding asks whether the user is a client or a firm (#11).
    type: userType("type"),
    onboardedAt: timestamp("onboarded_at", { withTimezone: true }),
    createdAt: createdAt(),
  },
  // One account per email, however it is capitalised.
  (table) => [uniqueIndex("users_email_idx").on(sql`lower(${table.email})`)],
);

// How a user signs in, kept apart from `users` so the login provider can
// change without touching accounts: Auth0 now (#10), passwords later.
export const userIdentities = pgTable(
  "user_identities",
  {
    provider: text("provider").notNull(),
    // The provider's ID for the user, e.g. the Auth0 `sub` claim.
    providerUserId: text("provider_user_id").notNull(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    createdAt: createdAt(),
  },
  (table) => [
    primaryKey({ columns: [table.provider, table.providerUserId] }),
    index("user_identities_user_idx").on(table.userId),
  ],
);

export const firms = pgTable("firms", {
  id: id(),
  name: text("name").notNull(),
  isSynthetic: boolean("is_synthetic").notNull().default(false),
  createdBy: uuid("created_by")
    .notNull()
    .references(() => users.id),
  createdAt: createdAt(),
});

export const firmMembers = pgTable(
  "firm_members",
  {
    firmId: firmId(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    role: memberRole("role").notNull(),
    joinedAt: timestamp("joined_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    primaryKey({ columns: [table.firmId, table.userId] }),
    // getSession() looks members up by user on every request.
    index("firm_members_user_idx").on(table.userId),
  ],
);

// Codes an owner gives article assistants to join the firm (#12).
export const firmInvites = pgTable(
  "firm_invites",
  {
    id: id(),
    firmId: firmId(),
    code: text("code").notNull().unique(),
    role: memberRole("role").notNull().default("article_assistant"),
    createdBy: uuid("created_by")
      .notNull()
      .references(() => users.id),
    expiresAt: timestamp("expires_at", { withTimezone: true }),
    revokedAt: timestamp("revoked_at", { withTimezone: true }),
    acceptedAt: timestamp("accepted_at", { withTimezone: true }),
    acceptedBy: uuid("accepted_by").references(() => users.id),
    createdAt: createdAt(),
  },
  (table) => [
    check(
      "firm_invites_acceptance_pair",
      sql`(${table.acceptedAt} IS NULL) = (${table.acceptedBy} IS NULL)`,
    ),
  ],
);

export const clients = pgTable(
  "clients",
  {
    id: id(),
    firmId: firmId(),
    name: text("name").notNull(),
    contact: text("contact").notNull().default(""),
    email: text("email").notNull().default(""),
    status: clientStatus("status").notNull().default("Active"),
    createdAt: createdAt(),
  },
  (table) => [
    index("clients_firm_idx").on(table.firmId),
    // Client names are how people tell clients apart in lists and forms.
    uniqueIndex("clients_firm_name_idx").on(
      table.firmId,
      sql`lower(${table.name})`,
    ),
    // Lets other tables require that their client is in the same firm.
    unique("clients_firm_id_key").on(table.firmId, table.id),
  ],
);

export const projects = pgTable(
  "projects",
  {
    id: id(),
    firmId: firmId(),
    clientId: uuid("client_id")
      .notNull()
      .references(() => clients.id),
    name: text("name").notNull(),
    status: projectStatus("status").notNull().default("Planning"),
    progress: integer("progress").notNull().default(0),
    due: date("due").notNull(),
    lead: text("lead").notNull().default(""),
    category: text("category").notNull().default("General"),
    createdAt: createdAt(),
  },
  (table) => [
    index("projects_firm_idx").on(table.firmId),
    // Two clients may each have an "Annual audit"; one client may not.
    uniqueIndex("projects_client_name_idx").on(
      table.clientId,
      sql`lower(${table.name})`,
    ),
  ],
);

export const invoices = pgTable(
  "invoices",
  {
    id: id(),
    firmId: firmId(),
    clientId: uuid("client_id")
      .notNull()
      .references(() => clients.id),
    description: text("description"),
    amount: numeric("amount", { precision: 12, scale: 2, mode: "number" })
      .notNull()
      .default(0),
    due: date("due").notNull(),
    status: invoiceStatus("status").notNull().default("Draft"),
    createdAt: createdAt(),
  },
  (table) => [index("invoices_firm_idx").on(table.firmId)],
);

export const documents = pgTable(
  "documents",
  {
    id: id(),
    firmId: firmId(),
    clientId: uuid("client_id")
      .notNull()
      .references(() => clients.id),
    title: text("title").notNull(),
    type: documentType("type").notNull(),
    status: documentStatus("status").notNull().default("Draft"),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    createdAt: createdAt(),
  },
  (table) => [index("documents_firm_idx").on(table.firmId)],
);

export const timeEntries = pgTable(
  "time_entries",
  {
    id: id(),
    firmId: firmId(),
    projectId: uuid("project_id")
      .notNull()
      .references(() => projects.id, { onDelete: "cascade" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id),
    date: date("date").notNull(),
    seconds: integer("seconds").notNull(),
    createdAt: createdAt(),
  },
  (table) => [index("time_entries_firm_idx").on(table.firmId)],
);

export const activity = pgTable(
  "activity",
  {
    id: id(),
    firmId: firmId(),
    userId: uuid("user_id").references(() => users.id, {
      onDelete: "set null",
    }),
    action: text("action").notNull(),
    subject: text("subject").notNull(),
    type: activityType("type").notNull().default("new"),
    createdAt: createdAt(),
  },
  (table) => [index("activity_firm_idx").on(table.firmId, table.createdAt)],
);

// An audit engagement for one client and financial year (#30). Working papers,
// evidence and client-share links all belong to an engagement.
export const engagements = pgTable(
  "engagements",
  {
    id: id(),
    firmId: firmId(),
    clientId: uuid("client_id").notNull(),
    title: text("title").notNull(),
    // Indian financial year, e.g. "2025-26".
    financialYear: text("financial_year").notNull(),
    type: engagementType("type").notNull(),
    status: engagementStatus("status").notNull().default("Draft"),
    reviewerId: uuid("reviewer_id").notNull(),
    createdBy: uuid("created_by")
      .notNull()
      .references(() => users.id),
    createdAt: createdAt(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("engagements_firm_idx").on(table.firmId),
    index("engagements_reviewer_idx").on(table.reviewerId),
    uniqueIndex("engagements_client_year_title_idx").on(
      table.clientId,
      table.financialYear,
      sql`lower(${table.title})`,
    ),
    unique("engagements_firm_id_key").on(table.firmId, table.id),
    // The client and the reviewer must be in the engagement's firm. The
    // database rejects anything else, not only the code.
    foreignKey({
      name: "engagements_client_fk",
      columns: [table.firmId, table.clientId],
      foreignColumns: [clients.firmId, clients.id],
    }),
    foreignKey({
      name: "engagements_reviewer_fk",
      columns: [table.firmId, table.reviewerId],
      foreignColumns: [firmMembers.firmId, firmMembers.userId],
    }),
  ],
);

export const engagementWorkspaces = pgTable(
  "engagement_workspaces",
  {
    id: id(),
    firmId: firmId(),
    engagementId: uuid("engagement_id").notNull(),
    kind: workspaceKind("kind").notNull(),
    createdAt: createdAt(),
  },
  (table) => [
    foreignKey({
      name: "engagement_workspaces_engagement_fk",
      columns: [table.firmId, table.engagementId],
      foreignColumns: [engagements.firmId, engagements.id],
    }).onDelete("cascade"),
    // Exactly one internal workspace per engagement.
    uniqueIndex("engagement_workspaces_internal_idx")
      .on(table.engagementId)
      .where(sql`${table.kind} = 'internal'`),
  ],
);

// Who did what, for the audit trail. Append-only: a trigger in the migration
// rejects UPDATE and DELETE, so rows can't be changed after the fact. Unlike
// `activity`, this is not a feed and is never trimmed.
export const auditEvents = pgTable(
  "audit_events",
  {
    id: id(),
    // No cascade: a firm with audit history can't be deleted by accident.
    firmId: uuid("firm_id")
      .notNull()
      .references(() => firms.id),
    engagementId: uuid("engagement_id"),
    actorUserId: uuid("actor_user_id")
      .notNull()
      .references(() => users.id),
    // Dotted names such as `engagement.created`, as in #49.
    action: text("action").notNull(),
    entityType: text("entity_type").notNull(),
    entityId: uuid("entity_id").notNull(),
    details: jsonb("details").$type<Record<string, unknown>>(),
    createdAt: createdAt(),
  },
  (table) => [
    index("audit_events_firm_idx").on(table.firmId, table.createdAt),
    index("audit_events_engagement_idx").on(
      table.engagementId,
      table.createdAt,
    ),
    foreignKey({
      name: "audit_events_engagement_fk",
      columns: [table.firmId, table.engagementId],
      foreignColumns: [engagements.firmId, engagements.id],
    }),
  ],
);
