-- Index-only scan optimization for common query patterns
-- These covering indexes allow PostgreSQL to serve queries from the index alone

-- Covering index for clients queries (status filtering with name lookup)
CREATE UNIQUE INDEX "clients_firm_name_status_idx" ON "clients" USING btree ("firm_id", lower("name"), "status") INCLUDE ("contact", "email");

-- Covering index for projects queries (status filtering with name lookup)
CREATE UNIQUE INDEX "projects_firm_status_name_idx" ON "projects" USING btree ("firm_id", "status", lower("name")) INCLUDE ("client_id", "due", "progress");
