-- 008_lucid_rep_accepted.sql — LIVANTO 在 LUCID 中对客户「Annehmen（接受）」的状态
-- 客户在 LUCID 选择 LIVANTO 为授权代表后，LIVANTO 需在自己的 LUCID 账号下接受该客户，
-- 授权代表关系才在 LUCID 侧完成。LUCID 无开放 API，需管理员手动同步此状态。
-- lucid_rep_accepted: 0 未接受 / 1 已接受；lucid_rep_accepted_at: 标记时间
-- ALTER TABLE ADD COLUMN 幂等（列已存在时被 db.js 静默跳过）

ALTER TABLE contracts ADD COLUMN lucid_rep_accepted INTEGER DEFAULT 0;

ALTER TABLE contracts ADD COLUMN lucid_rep_accepted_at TIMESTAMP;
