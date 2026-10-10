ALTER TYPE "public"."member_role" ADD VALUE 'reviewer';--> statement-breakpoint
ALTER TABLE "firm_invites" ADD COLUMN "accepted_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "firm_invites" ADD COLUMN "accepted_by" uuid;--> statement-breakpoint
ALTER TABLE "firm_invites" ADD CONSTRAINT "firm_invites_accepted_by_users_id_fk" FOREIGN KEY ("accepted_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "firm_invites" ADD CONSTRAINT "firm_invites_acceptance_pair" CHECK (("firm_invites"."accepted_at" IS NULL) = ("firm_invites"."accepted_by" IS NULL));
--> statement-breakpoint
UPDATE firm_invites SET revoked_at = COALESCE(revoked_at, now()) WHERE accepted_at IS NULL;
