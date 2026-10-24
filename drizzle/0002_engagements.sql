CREATE TYPE "public"."engagement_status" AS ENUM('Draft', 'Active', 'Review', 'Complete', 'Archived');--> statement-breakpoint
CREATE TYPE "public"."engagement_type" AS ENUM('Statutory audit', 'Tax audit', 'Internal audit', 'Other');--> statement-breakpoint
CREATE TYPE "public"."workspace_kind" AS ENUM('internal', 'client_share');--> statement-breakpoint
ALTER TYPE "public"."member_role" ADD VALUE 'reviewer';--> statement-breakpoint
CREATE TABLE "audit_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"firm_id" uuid NOT NULL,
	"engagement_id" uuid,
	"actor_user_id" uuid NOT NULL,
	"action" text NOT NULL,
	"entity_type" text NOT NULL,
	"entity_id" uuid NOT NULL,
	"details" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "engagement_workspaces" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"firm_id" uuid NOT NULL,
	"engagement_id" uuid NOT NULL,
	"kind" "workspace_kind" NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "engagements" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"firm_id" uuid NOT NULL,
	"client_id" uuid NOT NULL,
	"title" text NOT NULL,
	"financial_year" text NOT NULL,
	"type" "engagement_type" NOT NULL,
	"status" "engagement_status" DEFAULT 'Draft' NOT NULL,
	"reviewer_id" uuid NOT NULL,
	"created_by" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "engagements_firm_id_key" UNIQUE("firm_id","id")
);
--> statement-breakpoint
ALTER TABLE "clients" ADD CONSTRAINT "clients_firm_id_key" UNIQUE("firm_id","id");--> statement-breakpoint
ALTER TABLE "audit_events" ADD CONSTRAINT "audit_events_firm_id_firms_id_fk" FOREIGN KEY ("firm_id") REFERENCES "public"."firms"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "audit_events" ADD CONSTRAINT "audit_events_actor_user_id_users_id_fk" FOREIGN KEY ("actor_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "audit_events" ADD CONSTRAINT "audit_events_engagement_fk" FOREIGN KEY ("firm_id","engagement_id") REFERENCES "public"."engagements"("firm_id","id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "engagement_workspaces" ADD CONSTRAINT "engagement_workspaces_firm_id_firms_id_fk" FOREIGN KEY ("firm_id") REFERENCES "public"."firms"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "engagement_workspaces" ADD CONSTRAINT "engagement_workspaces_engagement_fk" FOREIGN KEY ("firm_id","engagement_id") REFERENCES "public"."engagements"("firm_id","id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "engagements" ADD CONSTRAINT "engagements_firm_id_firms_id_fk" FOREIGN KEY ("firm_id") REFERENCES "public"."firms"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "engagements" ADD CONSTRAINT "engagements_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "engagements" ADD CONSTRAINT "engagements_client_fk" FOREIGN KEY ("firm_id","client_id") REFERENCES "public"."clients"("firm_id","id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "engagements" ADD CONSTRAINT "engagements_reviewer_fk" FOREIGN KEY ("firm_id","reviewer_id") REFERENCES "public"."firm_members"("firm_id","user_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "audit_events_firm_idx" ON "audit_events" USING btree ("firm_id","created_at");--> statement-breakpoint
CREATE INDEX "audit_events_engagement_idx" ON "audit_events" USING btree ("engagement_id","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "engagement_workspaces_internal_idx" ON "engagement_workspaces" USING btree ("engagement_id") WHERE "engagement_workspaces"."kind" = 'internal';--> statement-breakpoint
CREATE INDEX "engagements_firm_idx" ON "engagements" USING btree ("firm_id");--> statement-breakpoint
CREATE INDEX "engagements_reviewer_idx" ON "engagements" USING btree ("reviewer_id");--> statement-breakpoint
CREATE UNIQUE INDEX "engagements_client_year_title_idx" ON "engagements" USING btree ("client_id","financial_year",lower("title"));