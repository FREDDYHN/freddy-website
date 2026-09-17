-- 012_client_soft_delete.sql — 7 天到期软删除 + 3 个月后硬删除
-- deleted_at: 软删除时间戳（NULL=正常；非 NULL=已软删，管理员页隐藏）
-- deleted_email / deleted_phone: 软删时保留的原联系方式（供恢复查阅）
-- ALTER TABLE ADD COLUMN 幂等（列已存在时被 db.js 静默跳过）

ALTER TABLE clients ADD COLUMN deleted_at TIMESTAMP;
ALTER TABLE clients ADD COLUMN deleted_email TEXT;
ALTER TABLE clients ADD COLUMN deleted_phone TEXT;
