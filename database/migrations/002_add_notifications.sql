-- Migration 002: Add upload review workflow + notifications table
-- Enables admin-client bidirectional communication

-- Add review status columns to uploads
ALTER TABLE uploads ADD COLUMN status TEXT DEFAULT 'pending';
ALTER TABLE uploads ADD COLUMN review_comment TEXT;

-- Create notifications table for client inbox
CREATE TABLE IF NOT EXISTS notifications (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    client_id INTEGER NOT NULL REFERENCES clients(id),
    contract_id INTEGER REFERENCES contracts(id),
    type TEXT NOT NULL DEFAULT 'admin_message',
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    is_read INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_notifications_client ON notifications(client_id);
CREATE INDEX IF NOT EXISTS idx_notifications_contract ON notifications(contract_id);
CREATE INDEX IF NOT EXISTS idx_notifications_unread ON notifications(client_id) WHERE is_read = 0;

-- Backfill: existing uploads were accepted by default
UPDATE uploads SET status = 'approved' WHERE status IS NULL;
