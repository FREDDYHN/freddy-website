import sqlite3, bcrypt

conn = sqlite3.connect('data.db')
cur = conn.cursor()

# ============================================================
# Client 1: 待付款 — 刚签约，没上传凭证
# ============================================================
cur.execute("INSERT INTO clients (company_name, company_name_en, contact_name, contact_email, contact_phone, uscc, registered_address, legal_representative, wechat_id) VALUES (?,?,?,?,?,?,?,?,?)",
    ('深圳绿源电子科技有限公司', 'Shenzhen GreenSource Electronics', '李工', 'lv@greensource.cn', '13800138000', '91440300MA5XXXXX', '深圳市宝安区', '李明', 'greensource_epr'))
c1 = cur.lastrowid
hash1 = bcrypt.hashpw('client123'.encode(), bcrypt.gensalt()).decode()
cur.execute('INSERT INTO users (email, password_hash, role, client_id) VALUES (?,?,?,?)', ('lv@greensource.cn', hash1, 'client', c1))
cur.execute('INSERT INTO contracts (client_id, contract_number, tier, annual_fee_eur, start_date, end_date, status) VALUES (?,?,?,?,?,?,?)',
    (c1, 'LTO-AR-2026-0101', 'basic', 89, '2026-07-01', '2027-06-30', 'pending_payment'))

# ============================================================
# Client 2: 已激活 — 已付款，合同生效
# ============================================================
cur.execute("INSERT INTO clients (company_name, company_name_en, contact_name, contact_email, contact_phone, uscc, registered_address, legal_representative, wechat_id) VALUES (?,?,?,?,?,?,?,?,?)",
    ('特斯拉（上海）有限公司', 'Tesla (Shanghai) Co., Ltd.', '马斯克', 'msk@tesla.com', '13900001111', '91310000MA1XXXXX', '上海市浦东新区', 'Elon Musk', 'tesla_epr'))
c2 = cur.lastrowid
hash2 = bcrypt.hashpw('client123'.encode(), bcrypt.gensalt()).decode()
cur.execute('INSERT INTO users (email, password_hash, role, client_id) VALUES (?,?,?,?)', ('msk@tesla.com', hash2, 'client', c2))
cur.execute('INSERT INTO contracts (client_id, contract_number, tier, annual_fee_eur, start_date, end_date, status, paid_confirmed_at, activated_at) VALUES (?,?,?,?,?,?,?,?,?)',
    (c2, 'LTO-AR-2026-0102', 'standard', 159, '2026-06-15', '2027-06-14', 'active', '2026-06-15 10:00:00', '2026-06-15 10:00:00'))
ct2 = cur.lastrowid
cur.execute("INSERT INTO payments (client_id, contract_id, payment_type, amount_cny, amount_eur, payment_method, out_trade_no, status, paid_at) VALUES (?,?,?,?,?,?,?,?,?)",
    (c2, ct2, 'contract_fee', 1240, 159, 'bank', 'EPR-TESLA-001', 'paid', '2026-06-15 10:00:00'))
cur.execute("INSERT INTO invoices (client_id, contract_id, payment_id, invoice_number, amount_eur, status) VALUES (?,?,?,?,?,?)",
    (c2, ct2, cur.lastrowid, 'INV-2026-0001', 159, 'issued'))

# ============================================================
# Client 3: 待审核 — 签了约，上传了凭证等管理员确认
# ============================================================
cur.execute("INSERT INTO clients (company_name, company_name_en, contact_name, contact_email, contact_phone, uscc, registered_address, legal_representative, wechat_id) VALUES (?,?,?,?,?,?,?,?,?)",
    ('利安通有限责任公司', 'LIVANTO GmbH', '桂程程', 'zifeng.qian@outlook.com', '+86 13927799235', 'HRB12345', '多特蒙德', '钱子风', 'freddy_epr'))
c3 = cur.lastrowid
hash3 = bcrypt.hashpw('client123'.encode(), bcrypt.gensalt()).decode()
cur.execute('INSERT INTO users (email, password_hash, role, client_id) VALUES (?,?,?,?)', ('zifeng.qian@outlook.com', hash3, 'client', c3))
cur.execute('INSERT INTO contracts (client_id, contract_number, tier, annual_fee_eur, start_date, end_date, status) VALUES (?,?,?,?,?,?,?)',
    (c3, 'LTO-AR-2026-0077', 'basic', 89, '2026-07-01', '2027-06-30', 'pending_payment'))
ct3 = cur.lastrowid
cur.execute("INSERT INTO uploads (client_id, contract_id, file_type, original_name, stored_path, file_size, mime_type, status) VALUES (?,?,?,?,?,?,?,?)",
    (c3, ct3, 'bank_proof', '银行转账凭证_89EUR.png', 'demo-bank-001.png', 245760, 'image/png', 'pending'))
cur.execute("INSERT INTO uploads (client_id, contract_id, file_type, original_name, stored_path, file_size, mime_type, status) VALUES (?,?,?,?,?,?,?,?)",
    (c3, ct3, 'proof_annual_fee', '年费付款回执.pdf', 'demo-fee-001.pdf', 102400, 'application/pdf', 'pending'))

# ============================================================
# Client 4: 完整合规 — 已激活 + LUCID已确认 + 回收费已缴
# ============================================================
cur.execute("INSERT INTO clients (company_name, company_name_en, contact_name, contact_email, contact_phone, uscc, registered_address, legal_representative, wechat_id) VALUES (?,?,?,?,?,?,?,?,?)",
    ('浙江华正新材料股份有限公司', 'Zhejiang Huazheng New Materials', '王经理', 'wang@huazheng.cn', '13700009999', '91330000MA2XXXXX', '浙江省杭州市', '王华', 'huazheng_epr'))
c4 = cur.lastrowid
hash4 = bcrypt.hashpw('client123'.encode(), bcrypt.gensalt()).decode()
cur.execute('INSERT INTO users (email, password_hash, role, client_id) VALUES (?,?,?,?)', ('wang@huazheng.cn', hash4, 'client', c4))
cur.execute('INSERT INTO contracts (client_id, contract_number, tier, annual_fee_eur, start_date, end_date, status, paid_confirmed_at, activated_at, lucid_confirmed) VALUES (?,?,?,?,?,?,?,?,?,?)',
    (c4, 'LTO-AR-2026-0103', 'premium', 249, '2026-05-01', '2027-04-30', 'active', '2026-05-01 09:00:00', '2026-05-01 09:00:00', 1))
ct4 = cur.lastrowid
cur.execute("INSERT INTO payments (client_id, contract_id, payment_type, amount_cny, amount_eur, payment_method, out_trade_no, status, paid_at) VALUES (?,?,?,?,?,?,?,?,?)",
    (c4, ct4, 'contract_fee', 1942, 249, 'wechat', 'EPR-HZ-001', 'paid', '2026-05-01 09:00:00'))
cur.execute("INSERT INTO invoices (client_id, contract_id, payment_id, invoice_number, amount_eur, status) VALUES (?,?,?,?,?,?)",
    (c4, ct4, cur.lastrowid, 'INV-2026-0002', 249, 'issued'))

conn.commit()
conn.close()
print('Done - 4 test clients created')
