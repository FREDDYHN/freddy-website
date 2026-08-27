# -*- coding: utf-8 -*-
"""在授权代表合同模板 §10 数据保护加一条 §10(3) PIPL 单独同意条款。

通过直接操作 document.xml（复制 §10(2) 所在行、改文本、插入其后），
避免 python-docx 整体重排破坏模板格式。修改前自动备份。
"""
import zipfile
import shutil
from lxml import etree

SRC = 'projects/contracts/LIVANTO/包装法_授权代表合同.docx'
BAK = 'projects/contracts/LIVANTO/包装法_授权代表合同.docx.bak-pipl'

DE_TEXT = ("(3) Der Kunde wird darauf hingewiesen, dass FREDDY (SHANGHAI) INFORMATION CONSULTING LTD. HN "
           "mit Sitz in der Volksrepublik China die personenbezogenen Daten des Kunden verarbeitet und zur "
           "Durchführung der Bevollmächtigung an die LIVANTO GmbH in Deutschland übermittelt. Der Kunde willigt "
           "hiermit ausdrücklich und gesondert in die Übermittlung seiner personenbezogenen Daten (Name, Firma, "
           "Anschrift, Kontaktdaten, Steuernummer, Verpackungsdaten) von FREDDY an LIVANTO ein. Diese Einwilligung "
           "erfolgt gemäß Artikel 39 des chinesischen Gesetzes zum Schutz personenbezogener Informationen (PIPL).")

ZH_TEXT = ("(3) 客户被告知：位于中华人民共和国的 FREDDY (SHANGHAI) INFORMATION CONSULTING LTD. HN（福瑞笛淮南分公司）"
           "处理客户的个人数据，并将其传输至德国的 LIVANTO 有限责任公司用于履行授权代表服务。客户在此明确且单独地同意"
           "福瑞笛将其个人数据（姓名、公司名称、地址、联系方式、税号、包装数据）传输至 LIVANTO。该同意依据中国"
           "《个人信息保护法》（PIPL）第39条作出。")

W = 'http://schemas.openxmlformats.org/wordprocessingml/2006/main'

# 1. 备份
shutil.copy2(SRC, BAK)
print('备份 ->', BAK)

# 2. 读 docx
zin = zipfile.ZipFile(SRC, 'r')
items = {n: zin.read(n) for n in zin.namelist()}
zin.close()

root = etree.fromstring(items['word/document.xml'])

# 3. 定位 §10(2) 德文所在 <w:t>
target_t = None
for t in root.iter('{%s}t' % W):
    if t.text and '(2) Die Übermittlung zahlungsbezogener' in t.text:
        target_t = t
        break
assert target_t is not None, '未找到 §10(2) 德文'

# 4. 向上找所在 <w:tr>
tr = target_t
while tr is not None and tr.tag != '{%s}tr' % W:
    tr = tr.getparent()
assert tr is not None, '未找到所在 <w:tr>'

# 5. 深拷贝该行并替换文本
new_tr = etree.fromstring(etree.tostring(tr))
t_elems = [t for t in new_tr.iter('{%s}t' % W) if t.text]
assert len(t_elems) == 2, f'预期 2 个 <w:t>，实际 {len(t_elems)}'
t_elems[0].text = DE_TEXT
t_elems[1].text = ZH_TEXT

# 6. 插入到原行之后（表格末尾）
tr.addnext(new_tr)

# 7. 写回 document.xml
items['word/document.xml'] = etree.tostring(root, xml_declaration=True, encoding='UTF-8', standalone=True)

zout = zipfile.ZipFile(SRC, 'w', zipfile.ZIP_DEFLATED)
for name, data in items.items():
    zout.writestr(name, data)
zout.close()

print('OK: 已加 §10(3) PIPL 条款')
