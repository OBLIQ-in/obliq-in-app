CREATE INDEX "activity_user_idx" ON "activity" USING btree ("user_id","created_at");--> statement-breakpoint
CREATE INDEX "activity_type_idx" ON "activity" USING btree ("type");--> statement-breakpoint
CREATE INDEX "audit_events_actor_idx" ON "audit_events" USING btree ("actor_user_id","created_at");--> statement-breakpoint
CREATE INDEX "audit_events_entity_idx" ON "audit_events" USING btree ("entity_type","entity_id");--> statement-breakpoint
CREATE INDEX "clients_status_idx" ON "clients" USING btree ("status");--> statement-breakpoint
CREATE INDEX "documents_status_idx" ON "documents" USING btree ("status");--> statement-breakpoint
CREATE INDEX "documents_updated_idx" ON "documents" USING btree ("updated_at");--> statement-breakpoint
CREATE INDEX "engagement_workspaces_engagement_idx" ON "engagement_workspaces" USING btree ("engagement_id");--> statement-breakpoint
CREATE INDEX "engagement_workspaces_firm_idx" ON "engagement_workspaces" USING btree ("firm_id");--> statement-breakpoint
CREATE INDEX "engagements_client_idx" ON "engagements" USING btree ("client_id");--> statement-breakpoint
CREATE INDEX "engagements_client_year_idx" ON "engagements" USING btree ("client_id","financial_year");--> statement-breakpoint
CREATE INDEX "engagements_status_idx" ON "engagements" USING btree ("status");--> statement-breakpoint
CREATE INDEX "engagements_reviewer_active_idx" ON "engagements" USING btree ("reviewer_id") WHERE "engagements"."status" != 'Archived';--> statement-breakpoint
CREATE INDEX "firm_invites_code_idx" ON "firm_invites" USING btree ("code");--> statement-breakpoint
CREATE INDEX "firm_invites_firm_status_idx" ON "firm_invites" USING btree ("firm_id","accepted_at","revoked_at");--> statement-breakpoint
CREATE INDEX "firm_members_user_joined_idx" ON "firm_members" USING btree ("user_id","joined_at");--> statement-breakpoint
CREATE INDEX "firm_members_firm_role_idx" ON "firm_members" USING btree ("firm_id","role");--> statement-breakpoint
CREATE INDEX "firms_created_by_idx" ON "firms" USING btree ("created_by");--> statement-breakpoint
CREATE INDEX "firms_created_at_idx" ON "firms" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "invoices_status_idx" ON "invoices" USING btree ("status");--> statement-breakpoint
CREATE INDEX "invoices_due_idx" ON "invoices" USING btree ("due");--> statement-breakpoint
CREATE INDEX "projects_status_idx" ON "projects" USING btree ("status");--> statement-breakpoint
CREATE INDEX "projects_due_idx" ON "projects" USING btree ("due");--> statement-breakpoint
CREATE INDEX "projects_lead_idx" ON "projects" USING btree ("lead");--> statement-breakpoint
CREATE INDEX "time_entries_user_date_idx" ON "time_entries" USING btree ("user_id","date");--> statement-breakpoint
CREATE INDEX "time_entries_project_date_idx" ON "time_entries" USING btree ("project_id","date");--> statement-breakpoint
CREATE INDEX "time_entries_user_project_idx" ON "time_entries" USING btree ("user_id","project_id");--> statement-breakpoint
CREATE INDEX "users_type_idx" ON "users" USING btree ("type");--> statement-breakpoint
CREATE INDEX "users_onboarded_idx" ON "users" USING btree ("onboarded_at");
--> statement-breakpoint
CREATE UNIQUE INDEX "clients_firm_name_status_idx" ON "clients" USING btree ("firm_id", lower("name"), "status") INCLUDE ("contact", "email");--> statement-breakpoint
CREATE UNIQUE INDEX "projects_firm_status_name_idx" ON "projects" USING btree ("firm_id", "status", lower("name")) INCLUDE ("client_id", "due", "progress");
