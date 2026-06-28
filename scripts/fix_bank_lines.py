"""Split bank info into separate lines for readability"""
import zipfile, shutil, os, re

contract = 'projects/contracts/LIVANTO/包装法_授权代表合同.docx'

with zipfile.ZipFile(contract) as z:
    xml = z.read('word/document.xml').decode('utf-8')

# --- German bank paragraph ---
idx_de = xml.find('Bankverbindung')
p_start_de = xml.rfind('<w:p', 0, idx_de)
p_end_de = xml.find('</w:p>', idx_de) + len('</w:p>')
old_para_de = xml[p_start_de:p_end_de]

# Extract the paragraph properties (font, spacing, etc.)
ppr_match = re.search(r'(<w:pPr>.*?</w:pPr>)', old_para_de, re.DOTALL)
w_ppr = ppr_match.group(1) if ppr_match else '<w:pPr><w:spacing w:before="20" w:after="20"/></w:pPr>'

# Build new multi-line paragraph with same font properties
font_de = '<w:rFonts w:ascii="Times New Roman" w:hAnsi="Times New Roman" w:eastAsia="Times New Roman" w:cs="Times New Roman"/>'
rpr_de = f'<w:rPr>{font_de}<w:b w:val="0"/><w:bCs w:val="0"/><w:sz w:val="21"/><w:szCs w:val="21"/></w:rPr>'

def make_para(ppr, text, rpr):
    return f'<w:p>{ppr}<w:r>{rpr}<w:t xml:space="preserve">{text}</w:t></w:r></w:p>'

new_lines_de = [
    make_para('<w:pPr><w:spacing w:before="20" w:after="0"/></w:pPr>', '(6) Bankverbindung:', rpr_de),
    make_para('<w:pPr><w:spacing w:before="0" w:after="0"/></w:pPr>', '  Kontoinhaber: FREDDY (Shanghai) Information Consulting Ltd. Huainan Branch', rpr_de),
    make_para('<w:pPr><w:spacing w:before="0" w:after="0"/></w:pPr>', '  Bank: Bank of China, Huainan Branch', rpr_de),
    make_para('<w:pPr><w:spacing w:before="0" w:after="0"/></w:pPr>', '  Kontonummer: 181276312093', rpr_de),
    make_para('<w:pPr><w:spacing w:before="0" w:after="0"/></w:pPr>', '  Bankleitzahl: BKCHCNBJ780', rpr_de),
    make_para('<w:pPr><w:spacing w:before="0" w:after="0"/></w:pPr>', '  Bankadresse: No.21 Longhu Road, Huainan, Anhui, China', rpr_de),
    make_para('<w:pPr><w:spacing w:before="0" w:after="20"/></w:pPr>', '  Verwendungszweck: {contract_number}.', rpr_de),
]
new_block_de = ''.join(new_lines_de)
xml = xml[:p_start_de] + new_block_de + xml[p_end_de:]

# --- Chinese bank paragraph ---
# Need to re-find since XML changed
idx_cn = xml.find('银行转账信息')
p_start_cn = xml.rfind('<w:p', 0, idx_cn)
p_end_cn = xml.find('</w:p>', idx_cn) + len('</w:p>')

font_cn = '<w:rFonts w:ascii="宋体" w:hAnsi="宋体" w:eastAsia="宋体" w:cs="宋体"/>'
rpr_cn = f'<w:rPr>{font_cn}<w:b w:val="0"/><w:bCs w:val="0"/><w:sz w:val="21"/><w:szCs w:val="21"/></w:rPr>'

new_lines_cn = [
    make_para('<w:pPr><w:spacing w:before="20" w:after="0"/></w:pPr>', '(6) 银行转账信息：', rpr_cn),
    make_para('<w:pPr><w:spacing w:before="0" w:after="0"/></w:pPr>', '  户名：福瑞笛（上海）信息咨询有限公司淮南分公司', rpr_cn),
    make_para('<w:pPr><w:spacing w:before="0" w:after="0"/></w:pPr>', '  开户行：中国银行股份有限公司淮南分行', rpr_cn),
    make_para('<w:pPr><w:spacing w:before="0" w:after="0"/></w:pPr>', '  账号：181276312093', rpr_cn),
    make_para('<w:pPr><w:spacing w:before="0" w:after="0"/></w:pPr>', '  银行代码：BKCHCNBJ780', rpr_cn),
    make_para('<w:pPr><w:spacing w:before="0" w:after="0"/></w:pPr>', '  开户行地址：安徽省淮南市龙湖路21号', rpr_cn),
    make_para('<w:pPr><w:spacing w:before="0" w:after="20"/></w:pPr>', '  汇款附言：{contract_number}。', rpr_cn),
]
new_block_cn = ''.join(new_lines_cn)
xml = xml[:p_start_cn] + new_block_cn + xml[p_end_cn:]

# Repack
tmp = 'projects/contracts/LIVANTO/_tmp_bank'
if os.path.exists(tmp): shutil.rmtree(tmp)
os.makedirs(tmp, exist_ok=True)
with zipfile.ZipFile(contract) as z: z.extractall(tmp)
with open(tmp + '/word/document.xml', 'w', encoding='utf-8') as f: f.write(xml)
os.remove(contract)
with zipfile.ZipFile(contract, 'w', zipfile.ZIP_DEFLATED) as zout:
    for root, dirs, files in os.walk(tmp):
        for fn in files:
            fp = os.path.join(root, fn)
            zout.write(fp, os.path.relpath(fp, tmp).replace(chr(92), '/'))
shutil.rmtree(tmp)
print('Done - bank info multi-line')
