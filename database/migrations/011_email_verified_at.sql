-- 011_email_verified_at.sql — 记录邮箱验证完成时间，供废弃账号自动清理用
ALTER TABLE users ADD COLUMN email_verified_at TIMESTAMP;
-- 回填历史已验证用户：用申请时间近似验证时间（「立即清理历史欠账」的依据）
UPDATE users SET email_verified_at = created_at WHERE email_verified = 1 AND email_verified_at IS NULL;
