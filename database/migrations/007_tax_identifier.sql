-- 007_tax_identifier.sql — 客户主体类型 + 身份证号
-- 税号 = 统一社会信用代码（公司）/ 身份证号码（个人），预申报需客户身份标识号
-- entity_type: 'company'(公司) | 'individual'(个人)；id_number 仅个人填写
-- ALTER TABLE ADD COLUMN 幂等（列已存在时被 db.js 静默跳过）

ALTER TABLE clients ADD COLUMN entity_type TEXT NOT NULL DEFAULT 'company';

ALTER TABLE clients ADD COLUMN id_number TEXT;
