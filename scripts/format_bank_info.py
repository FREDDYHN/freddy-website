import zipfile, shutil, os

contract = 'projects/contracts/LIVANTO/VerpackG_Bevollmächtigungsvertrag.docx'

with zipfile.ZipFile(contract) as z:
    xml = z.read('word/document.xml').decode('utf-8')

bank_start = xml.find('Bankverbindung')
row_start = xml.rfind('<w:tr', 0, bank_start)
row_end = xml.find('</w:tr>', bank_start) + len('</w:tr>')

new_row = (
    '<w:tr w14:paraId="BANKFMT01"><w:tblPrEx><w:tblBorders>'
    '<w:top w:val="single" w:color="auto" w:sz="4" w:space="0"/>'
    '<w:left w:val="single" w:color="auto" w:sz="4" w:space="0"/>'
    '<w:bottom w:val="single" w:color="auto" w:sz="4" w:space="0"/>'
    '<w:right w:val="single" w:color="auto" w:sz="4" w:space="0"/>'
    '<w:insideH w:val="single" w:color="auto" w:sz="4" w:space="0"/>'
    '<w:insideV w:val="single" w:color="auto" w:sz="4" w:space="0"/>'
    '</w:tblBorders></w:tblPrEx>'
    # German left cell
    '<w:tc><w:tcPr><w:tcW w:w="5018" w:type="dxa"/>'
    '<w:tcBorders><w:top w:val="nil"/><w:left w:val="nil"/><w:bottom w:val="nil"/><w:right w:val="nil"/></w:tcBorders>'
    '<w:tcMar><w:top w:w="10" w:type="dxa"/><w:left w:w="0" w:type="dxa"/><w:bottom w:w="10" w:type="dxa"/><w:right w:w="80" w:type="dxa"/></w:tcMar></w:tcPr>'
    '<w:p w14:paraId="BANKFMT02"><w:pPr><w:spacing w:before="20" w:after="0"/></w:pPr>'
    '<w:r><w:rPr><w:rFonts w:ascii="Times New Roman" w:hAnsi="Times New Roman" w:eastAsia="Times New Roman" w:cs="Times New Roman"/>'
    '<w:b w:val="0"/><w:bCs w:val="0"/><w:sz w:val="21"/><w:szCs w:val="21"/></w:rPr>'
    '<w:t xml:space="preserve">(6) Bankverbindung:</w:t></w:r></w:p>'
    '<w:p w14:paraId="BANKFMT03"><w:pPr><w:spacing w:before="0" w:after="0"/></w:pPr>'
    '<w:r><w:rPr><w:rFonts w:ascii="Times New Roman" w:hAnsi="Times New Roman" w:eastAsia="Times New Roman" w:cs="Times New Roman"/>'
    '<w:b w:val="0"/><w:bCs w:val="0"/><w:sz w:val="21"/><w:szCs w:val="21"/></w:rPr>'
    '<w:t xml:space="preserve">  Kontoinhaber: FREDDY (Shanghai) Information Consulting Ltd. Huainan Branch</w:t></w:r></w:p>'
    '<w:p w14:paraId="BANKFMT04"><w:pPr><w:spacing w:before="0" w:after="0"/></w:pPr>'
    '<w:r><w:rPr><w:rFonts w:ascii="Times New Roman" w:hAnsi="Times New Roman" w:eastAsia="Times New Roman" w:cs="Times New Roman"/>'
    '<w:b w:val="0"/><w:bCs w:val="0"/><w:sz w:val="21"/><w:szCs w:val="21"/></w:rPr>'
    '<w:t xml:space="preserve">  Bank: Bank of China, Huainan Branch</w:t></w:r></w:p>'
    '<w:p w14:paraId="BANKFMT05"><w:pPr><w:spacing w:before="0" w:after="0"/></w:pPr>'
    '<w:r><w:rPr><w:rFonts w:ascii="Times New Roman" w:hAnsi="Times New Roman" w:eastAsia="Times New Roman" w:cs="Times New Roman"/>'
    '<w:b w:val="0"/><w:bCs w:val="0"/><w:sz w:val="21"/><w:szCs w:val="21"/></w:rPr>'
    '<w:t xml:space="preserve">  Kontonummer: 181276312093</w:t></w:r></w:p>'
    '<w:p w14:paraId="BANKFMT06"><w:pPr><w:spacing w:before="0" w:after="0"/></w:pPr>'
    '<w:r><w:rPr><w:rFonts w:ascii="Times New Roman" w:hAnsi="Times New Roman" w:eastAsia="Times New Roman" w:cs="Times New Roman"/>'
    '<w:b w:val="0"/><w:bCs w:val="0"/><w:sz w:val="21"/><w:szCs w:val="21"/></w:rPr>'
    '<w:t xml:space="preserve">  Bankleitzahl: BKCHCNBJ780</w:t></w:r></w:p>'
    '<w:p w14:paraId="BANKFMT07"><w:pPr><w:spacing w:before="0" w:after="0"/></w:pPr>'
    '<w:r><w:rPr><w:rFonts w:ascii="Times New Roman" w:hAnsi="Times New Roman" w:eastAsia="Times New Roman" w:cs="Times New Roman"/>'
    '<w:b w:val="0"/><w:bCs w:val="0"/><w:sz w:val="21"/><w:szCs w:val="21"/></w:rPr>'
    '<w:t xml:space="preserve">  Bankadresse: No.21 Longhu Road, Huainan, Anhui, China</w:t></w:r></w:p>'
    '<w:p w14:paraId="BANKFMT08"><w:pPr><w:spacing w:before="0" w:after="20"/></w:pPr>'
    '<w:r><w:rPr><w:rFonts w:ascii="Times New Roman" w:hAnsi="Times New Roman" w:eastAsia="Times New Roman" w:cs="Times New Roman"/>'
    '<w:b w:val="0"/><w:bCs w:val="0"/><w:sz w:val="21"/><w:szCs w:val="21"/></w:rPr>'
    '<w:t xml:space="preserve">  Verwendungszweck: EPR- + Vertragsnummer</w:t></w:r></w:p>'
    '</w:tc>'
    # Chinese right cell
    '<w:tc><w:tcPr><w:tcW w:w="4687" w:type="dxa"/>'
    '<w:tcBorders><w:top w:val="nil"/><w:left w:val="nil"/><w:bottom w:val="nil"/><w:right w:val="nil"/></w:tcBorders>'
    '<w:tcMar><w:top w:w="10" w:type="dxa"/><w:left w:w="80" w:type="dxa"/><w:bottom w:w="10" w:type="dxa"/><w:right w:w="0" w:type="dxa"/></w:tcMar></w:tcPr>'
    '<w:p w14:paraId="BANKFMT09"><w:pPr><w:spacing w:before="20" w:after="0"/></w:pPr>'
    '<w:r><w:rPr><w:rFonts w:ascii="宋体" w:hAnsi="宋体" w:eastAsia="宋体" w:cs="宋体"/>'
    '<w:b w:val="0"/><w:bCs w:val="0"/><w:sz w:val="21"/><w:szCs w:val="21"/></w:rPr>'
    '<w:t xml:space="preserve">(6) 银行转账信息：</w:t></w:r></w:p>'
    '<w:p w14:paraId="BANKFMT10"><w:pPr><w:spacing w:before="0" w:after="0"/></w:pPr>'
    '<w:r><w:rPr><w:rFonts w:ascii="宋体" w:hAnsi="宋体" w:eastAsia="宋体" w:cs="宋体"/>'
    '<w:b w:val="0"/><w:bCs w:val="0"/><w:sz w:val="21"/><w:szCs w:val="21"/></w:rPr>'
    '<w:t xml:space="preserve">  户名：福瑞笛（上海）信息咨询有限公司淮南分公司</w:t></w:r></w:p>'
    '<w:p w14:paraId="BANKFMT11"><w:pPr><w:spacing w:before="0" w:after="0"/></w:pPr>'
    '<w:r><w:rPr><w:rFonts w:ascii="宋体" w:hAnsi="宋体" w:eastAsia="宋体" w:cs="宋体"/>'
    '<w:b w:val="0"/><w:bCs w:val="0"/><w:sz w:val="21"/><w:szCs w:val="21"/></w:rPr>'
    '<w:t xml:space="preserve">  开户行：中国银行股份有限公司淮南分行</w:t></w:r></w:p>'
    '<w:p w14:paraId="BANKFMT12"><w:pPr><w:spacing w:before="0" w:after="0"/></w:pPr>'
    '<w:r><w:rPr><w:rFonts w:ascii="宋体" w:hAnsi="宋体" w:eastAsia="宋体" w:cs="宋体"/>'
    '<w:b w:val="0"/><w:bCs w:val="0"/><w:sz w:val="21"/><w:szCs w:val="21"/></w:rPr>'
    '<w:t xml:space="preserve">  账号：181276312093</w:t></w:r></w:p>'
    '<w:p w14:paraId="BANKFMT13"><w:pPr><w:spacing w:before="0" w:after="0"/></w:pPr>'
    '<w:r><w:rPr><w:rFonts w:ascii="宋体" w:hAnsi="宋体" w:eastAsia="宋体" w:cs="宋体"/>'
    '<w:b w:val="0"/><w:bCs w:val="0"/><w:sz w:val="21"/><w:szCs w:val="21"/></w:rPr>'
    '<w:t xml:space="preserve">  银行代码：BKCHCNBJ780</w:t></w:r></w:p>'
    '<w:p w14:paraId="BANKFMT14"><w:pPr><w:spacing w:before="0" w:after="0"/></w:pPr>'
    '<w:r><w:rPr><w:rFonts w:ascii="宋体" w:hAnsi="宋体" w:eastAsia="宋体" w:cs="宋体"/>'
    '<w:b w:val="0"/><w:bCs w:val="0"/><w:sz w:val="21"/><w:szCs w:val="21"/></w:rPr>'
    '<w:t xml:space="preserve">  开户行地址：安徽省淮南市龙湖路21号</w:t></w:r></w:p>'
    '<w:p w14:paraId="BANKFMT15"><w:pPr><w:spacing w:before="0" w:after="20"/></w:pPr>'
    '<w:r><w:rPr><w:rFonts w:ascii="宋体" w:hAnsi="宋体" w:eastAsia="宋体" w:cs="宋体"/>'
    '<w:b w:val="0"/><w:bCs w:val="0"/><w:sz w:val="21"/><w:szCs w:val="21"/></w:rPr>'
    '<w:t xml:space="preserve">  汇款附言：EPR-合同编号</w:t></w:r></w:p>'
    '</w:tc></w:tr>'
)

new_xml = xml[:row_start] + new_row + xml[row_end:]

# Repack
tmp = 'projects/contracts/LIVANTO/_tmp_bankfmt'
if os.path.exists(tmp):
    shutil.rmtree(tmp)
os.makedirs(tmp, exist_ok=True)
with zipfile.ZipFile(contract) as z:
    z.extractall(tmp)
with open(tmp + '/word/document.xml', 'w', encoding='utf-8') as f:
    f.write(new_xml)
os.remove(contract)
with zipfile.ZipFile(contract, 'w', zipfile.ZIP_DEFLATED) as zout:
    for root, dirs, files in os.walk(tmp):
        for fn in files:
            fp = os.path.join(root, fn)
            an = os.path.relpath(fp, tmp).replace('\\', '/')
            zout.write(fp, an)
shutil.rmtree(tmp)
print('Done - bank info reformatted to multi-line')
