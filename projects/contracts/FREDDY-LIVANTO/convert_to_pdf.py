# -*- coding: utf-8 -*-
"""将需签字盖章的 docx 转成 PDF，输出到「待签署文件」文件夹。"""
import os
import win32com.client

SRC_DIR = os.path.dirname(os.path.abspath(__file__))
OUT_DIR = os.path.join(SRC_DIR, '待签署文件')
os.makedirs(OUT_DIR, exist_ok=True)

FILES = [
    'Kooperationsvereinbarung_FREDDY-LIVANTO.docx',
    '个人信息出境标准合同_PIPL.docx',
]

for f in FILES:
    src = os.path.abspath(os.path.join(SRC_DIR, f))
    if not os.path.exists(src):
        print('SKIP (not found):', f)
        continue
    dst = os.path.join(OUT_DIR, os.path.splitext(f)[0] + '.pdf')
    word = win32com.client.Dispatch('Word.Application')
    word.Visible = False
    word.DisplayAlerts = 0
    try:
        doc = word.Documents.Open(src, ReadOnly=True)
        doc.SaveAs(dst, FileFormat=17)  # 17 = wdFormatPDF
        doc.Close(False)
        print('OK ->', f)
    except Exception as e:
        print('FAIL:', f, '|', repr(e))
    finally:
        try:
            word.Quit()
        except Exception:
            pass
print('DONE')
