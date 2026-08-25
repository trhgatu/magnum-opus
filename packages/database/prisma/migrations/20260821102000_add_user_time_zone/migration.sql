-- User timezone is an identity preference shared by calendar-based contexts.
-- UTC is a safe migration default for existing rows; the profile flow can
-- replace it with the user's IANA timezone before Forge becomes available.
ALTER TABLE "users"
ADD COLUMN "time_zone" VARCHAR(64) NOT NULL DEFAULT 'UTC';
