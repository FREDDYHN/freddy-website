-- 009_inbound_documents.sql — 统一收发邮件·收件归档表
-- EKO-PUNKT 等外部合作方把客户材料发到 info@freddy-epr.com，IMAP 轮询抓到后归档到本表，
-- 进入后台「待人工」队列，管理员审阅、匹配客户、转发后标记 forwarded。
-- message_id 唯一用于去重（IMAP 每次轮询只处理未归档的新邮件）。
-- status: pending 待人工 / forwarded 已转发 / skipped 跳过(垃圾/无关)

CREATE TABLE IF NOT EXISTS inbound_documents (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    message_id TEXT NOT NULL UNIQUE,
    sender_email TEXT,
    sender_name TEXT,
    subject TEXT,
    body_text TEXT,
    received_at TIMESTAMP,
    client_id INTEGER REFERENCES clients(id),
    match_hint TEXT,
    status TEXT DEFAULT 'pending',
    attachments_json TEXT,
    forwarded_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_inbound_status ON inbound_documents(status);
CREATE INDEX IF NOT EXISTS idx_inbound_client ON inbound_documents(client_id);
