-- Freddy-Website EPR Platform Database Schema

CREATE TABLE IF NOT EXISTS clients (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    company_name TEXT NOT NULL,
    company_name_en TEXT,
    uscc TEXT,
    registered_address TEXT,
    legal_representative TEXT,
    contact_name TEXT NOT NULL,
    contact_email TEXT NOT NULL UNIQUE,
    contact_phone TEXT,
    wechat_id TEXT,
    lucid_registration_number TEXT,
    status TEXT DEFAULT 'active',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS contracts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    client_id INTEGER NOT NULL REFERENCES clients(id),
    contract_number TEXT NOT NULL UNIQUE,
    tier TEXT NOT NULL DEFAULT 'basic',
    annual_fee_eur DECIMAL(10,2) NOT NULL,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    status TEXT DEFAULT 'pending_payment',
    signed_at TIMESTAMP,
    signed_ip TEXT,
    contract_pdf_path TEXT,
    lucid_confirmed INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS packaging_data (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    contract_id INTEGER NOT NULL REFERENCES contracts(id),
    declaration_year INTEGER NOT NULL,
    declaration_type TEXT NOT NULL DEFAULT 'initial',
    material_type TEXT NOT NULL,
    packaging_category TEXT NOT NULL,
    estimated_quantity_kg DECIMAL(12,3),
    actual_quantity_kg DECIMAL(12,3),
    submitted_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    role TEXT DEFAULT 'client',
    client_id INTEGER REFERENCES clients(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS payments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    client_id INTEGER REFERENCES clients(id),
    contract_id INTEGER REFERENCES contracts(id),
    payment_type TEXT NOT NULL,
    amount_cny DECIMAL(12,2),
    amount_eur DECIMAL(10,2),
    payment_method TEXT,
    out_trade_no TEXT UNIQUE,
    transaction_id TEXT,
    qr_code_url TEXT,
    pay_url TEXT,
    status TEXT DEFAULT 'pending',
    paid_at TIMESTAMP,
    client_notified_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS invoices (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    client_id INTEGER REFERENCES clients(id),
    contract_id INTEGER REFERENCES contracts(id),
    payment_id INTEGER UNIQUE REFERENCES payments(id),
    invoice_number TEXT UNIQUE,
    invoice_date DATE DEFAULT (date('now')),
    amount_eur DECIMAL(10,2),
    status TEXT DEFAULT 'issued',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS reminders (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    contract_id INTEGER NOT NULL REFERENCES contracts(id),
    reminder_type TEXT NOT NULL,
    due_date DATE NOT NULL,
    sent_at TIMESTAMP,
    status TEXT DEFAULT 'pending'
);

CREATE TABLE IF NOT EXISTS applications (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    client_id INTEGER REFERENCES clients(id),
    type TEXT NOT NULL,
    data_json TEXT,
    status TEXT DEFAULT 'pending',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS uploads (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    client_id INTEGER REFERENCES clients(id),
    contract_id INTEGER REFERENCES contracts(id),
    file_type TEXT DEFAULT 'other',
    original_name TEXT NOT NULL,
    stored_path TEXT NOT NULL,
    file_size INTEGER,
    mime_type TEXT,
    status TEXT DEFAULT 'pending',
    review_comment TEXT,
    uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

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

CREATE INDEX IF NOT EXISTS idx_contracts_client ON contracts(client_id);
CREATE INDEX IF NOT EXISTS idx_packaging_contract ON packaging_data(contract_id);
CREATE INDEX IF NOT EXISTS idx_payments_contract ON payments(contract_id);
CREATE INDEX IF NOT EXISTS idx_reminders_due ON reminders(due_date) WHERE status = 'pending';
CREATE INDEX IF NOT EXISTS idx_uploads_client ON uploads(client_id);
CREATE INDEX IF NOT EXISTS idx_uploads_contract ON uploads(contract_id);
CREATE INDEX IF NOT EXISTS idx_clients_email ON clients(contact_email);
CREATE INDEX IF NOT EXISTS idx_clients_name ON clients(company_name);
CREATE INDEX IF NOT EXISTS idx_notifications_client ON notifications(client_id);
CREATE INDEX IF NOT EXISTS idx_notifications_unread ON notifications(client_id) WHERE is_read = 0;
