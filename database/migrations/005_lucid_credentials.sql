-- 005_lucid_credentials.sql — LUCID 账号密码存储
-- 授权代表将来代替客户登录 LUCID 申报包装种类和数量，需存客户 LUCID 登录账号 + 密码
-- lucid_login 明文存（登录名不敏感）；lucid_password_enc 存 AES-256-GCM 密文（可逆加密，用于代登录）
-- ALTER TABLE ADD COLUMN 幂等（列已存在时被 db.js 静默跳过）

ALTER TABLE clients ADD COLUMN lucid_login TEXT;

ALTER TABLE clients ADD COLUMN lucid_password_enc TEXT;
