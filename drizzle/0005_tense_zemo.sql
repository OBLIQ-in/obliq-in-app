ALTER TABLE "firms" ADD COLUMN "is_synthetic" boolean DEFAULT false NOT NULL;
UPDATE "firms"
SET "is_synthetic" = true
FROM "user_identities"
WHERE "firms"."created_by" = "user_identities"."user_id"
  AND "user_identities"."provider" = 'dev'
  AND "firms"."name" = 'OBLIQ Demo Firm';