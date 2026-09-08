-- 010_client_country_vat.sql — 客户国家 + 欧盟增值税号
-- country: 注册国家 ISO 码（默认 CN，存量客户自动落 CN）
-- vat_id:  Umsatzsteuer ID Nummer（欧盟除德国卖家必填，用于 EKO-PUNKT 导出第 23 列 Ust-IdNr.）
-- ALTER TABLE ADD COLUMN 幂等（列已存在时被 db.js 静默跳过）

ALTER TABLE clients ADD COLUMN country TEXT NOT NULL DEFAULT 'CN';

ALTER TABLE clients ADD COLUMN vat_id TEXT;
