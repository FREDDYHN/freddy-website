-- Add exchange rate tracking to payments table
ALTER TABLE payments ADD COLUMN rate_used REAL;
ALTER TABLE payments ADD COLUMN rate_locked_at TEXT;
