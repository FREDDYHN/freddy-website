-- Migration 003: Phone uniqueness for login
ALTER TABLE clients ADD COLUMN contact_phone_unique TEXT;
UPDATE clients SET contact_phone_unique = contact_phone WHERE contact_phone IS NOT NULL AND contact_phone != '';
CREATE UNIQUE INDEX IF NOT EXISTS idx_clients_phone ON clients(contact_phone) WHERE contact_phone IS NOT NULL AND contact_phone != '';
