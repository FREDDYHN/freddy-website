-- Migration 001: Add payment confirmation timestamps for contract lifecycle tracking
-- Run: sqlite3 data.db < migrations/001_add_paid_confirmed_at.sql

ALTER TABLE contracts ADD COLUMN paid_confirmed_at TIMESTAMP;
ALTER TABLE contracts ADD COLUMN activated_at TIMESTAMP;

-- Backfill for existing active contracts: assume activated when status became 'active'
UPDATE contracts SET paid_confirmed_at = created_at WHERE status = 'active' AND paid_confirmed_at IS NULL;
UPDATE contracts SET activated_at = created_at WHERE status = 'active' AND activated_at IS NULL;
