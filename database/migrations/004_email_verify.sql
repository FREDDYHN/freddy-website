-- 004_email_verify.sql — Email verification + spam management
-- Add email_verified to users, is_spam + admin_notes to contracts/applications
-- Uses ALTER TABLE ADD COLUMN which is idempotent on SQLite (ignored if column exists)

ALTER TABLE users ADD COLUMN email_verified INTEGER DEFAULT 0;

ALTER TABLE contracts ADD COLUMN is_spam INTEGER DEFAULT 0;

ALTER TABLE contracts ADD COLUMN admin_notes TEXT;

ALTER TABLE applications ADD COLUMN is_spam INTEGER DEFAULT 0;
