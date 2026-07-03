#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""
Generate 福瑞笛招聘简章 PDF - Single page compact layout
Brand colors: primary #4a5d50, accent #6b8a75, bg #f4f2ef
"""

import os
from reportlab.lib.pagesizes import A4
from reportlab.lib.units import mm
from reportlab.lib.colors import HexColor, white
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.enums import TA_CENTER, TA_LEFT
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, Image
)
from reportlab.platypus.flowables import HRFlowable
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont

# ── Paths ──────────────────────────────────────────────
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
LOGO_PATH = os.path.join(BASE_DIR, "frontend", "public", "freddy-logo.png")
OUTPUT_DIR = os.path.join(BASE_DIR, "outputs")
OUTPUT_PATH = os.path.join(OUTPUT_DIR, "福瑞笛招聘简章.pdf")
os.makedirs(OUTPUT_DIR, exist_ok=True)

# ── Brand Colors ────────────────────────────────────────
PRIMARY = HexColor("#4a5d50")
ACCENT = HexColor("#6b8a75")
BG_HIGHLIGHT = HexColor("#edf2ee")
DARK_TEXT = HexColor("#1a1a1a")
GRAY_TEXT = HexColor("#666666")
LIGHT_LINE = HexColor("#d5d9d6")
WHITE = white

# ── Register Chinese Font ───────────────────────────────
FONT_NAME = None
FONT_BOLD = None

for font_path, font_name in [
    ("C:/Windows/Fonts/msyh.ttc", "MicrosoftYaHei"),
    ("C:/Windows/Fonts/simhei.ttf", "SimHei"),
    ("C:/Windows/Fonts/simsun.ttc", "SimSun"),
]:
    if os.path.exists(font_path):
        try:
            pdfmetrics.registerFont(TTFont(font_name, font_path))
            if FONT_NAME is None:
                FONT_NAME = font_name
                print(f"Using font: {font_name}")
        except Exception as e:
            print(f"Failed to register {font_path}: {e}")

yahei_bold_path = "C:/Windows/Fonts/msyhbd.ttc"
if os.path.exists(yahei_bold_path) and FONT_NAME == "MicrosoftYaHei":
    try:
        pdfmetrics.registerFont(TTFont("MicrosoftYaHeiBold", yahei_bold_path))
        FONT_BOLD = "MicrosoftYaHeiBold"
    except:
        pass

if FONT_NAME is None:
    raise RuntimeError("No Chinese font found!")

BOLD_FONT = FONT_BOLD or FONT_NAME

# ── Style Helper ─────────────────────────────────────────
def mk(name, fontSize=10, leading=16, color=DARK_TEXT, alignment=TA_LEFT,
       spaceBefore=0, spaceAfter=0, bold=False):
    fn = BOLD_FONT if bold else FONT_NAME
    return ParagraphStyle(name, fontName=fn, fontSize=fontSize, leading=leading,
                          textColor=color, alignment=alignment,
                          spaceBefore=spaceBefore, spaceAfter=spaceAfter)

# ── Style Definitions ────────────────────────────────────
s_title = mk("Title", 24, 30, WHITE, TA_CENTER, bold=True)
s_subtitle = mk("Subtitle", 10, 14, HexColor("#c5d5ca"), TA_CENTER)
s_section = mk("Section", 12, 16, PRIMARY, TA_LEFT, spaceBefore=6, spaceAfter=2, bold=True)
s_body = mk("Body", 8.5, 14, DARK_TEXT, spaceAfter=0.5)
s_bullet = mk("Bullet", 8.5, 14, DARK_TEXT, spaceAfter=0.5, bold=False)
s_salary_label = mk("SLabel", 8, 12, GRAY_TEXT, TA_CENTER)
s_salary_num = mk("SNum", 20, 26, PRIMARY, TA_CENTER, bold=True)
s_salary_num_big = mk("SNumBig", 28, 34, WHITE, TA_CENTER, bold=True)
s_salary_label_w = mk("SLabelW", 8, 12, WHITE, TA_CENTER)
s_benefit_title = mk("BenTitle", 9, 13, DARK_TEXT, TA_CENTER, bold=True)
s_benefit_desc = mk("BenDesc", 7.5, 10, GRAY_TEXT, TA_CENTER)
s_benefit_icon = mk("BenIcon", 12, 16, PRIMARY, TA_CENTER, bold=True)
s_contact_title = mk("ContactTitle", 11, 16, WHITE, TA_CENTER, bold=True)
s_contact = mk("Contact", 8, 13, HexColor("#d5e0d8"), TA_CENTER)
s_note = mk("Note", 8, 11, GRAY_TEXT, TA_CENTER)

# ── Helpers ──────────────────────────────────────────────
def hr():
    return HRFlowable(width="100%", thickness=0.4, color=LIGHT_LINE, spaceBefore=2, spaceAfter=3)

def section(title):
    return Paragraph(title, s_section)

def body(text):
    return Paragraph(text, s_body)

def bul(text):
    return Paragraph(f"- {text}", s_bullet)

# ── Build ────────────────────────────────────────────────
doc = SimpleDocTemplate(
    OUTPUT_PATH, pagesize=A4,
    leftMargin=16*mm, rightMargin=16*mm,
    topMargin=0, bottomMargin=0,
    title="福瑞笛招聘简章",
    author="福瑞笛（上海）信息咨询有限公司",
)

story = []

# ══════════════════════════════════════════════════════════
# HEADER BANNER
# ══════════════════════════════════════════════════════════
header_parts = []

# Logo (smaller for single page)
if os.path.exists(LOGO_PATH):
    logo = Image(LOGO_PATH, width=32*mm, height=32*mm)
    logo.hAlign = 'CENTER'
    header_parts.append(logo)
    header_parts.append(Spacer(1, 2*mm))

header_parts.append(Paragraph("诚 聘 英 才", s_title))
header_parts.append(Spacer(1, 1.5*mm))
header_parts.append(Paragraph("中欧跨境合规服务商 | 快速成长赛道 | 社交媒体获客方向", s_subtitle))

header_inner = [[item] for item in header_parts]
header_table = Table(header_inner, colWidths=[doc.width])
header_table.setStyle(TableStyle([
    ('BACKGROUND', (0, 0), (-1, -1), PRIMARY),
    ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
    ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
    ('TOPPADDING', (0, 0), (-1, -1), 0),
    ('BOTTOMPADDING', (0, 0), (-1, -1), 0),
    ('LEFTPADDING', (0, 0), (-1, -1), 0),
    ('RIGHTPADDING', (0, 0), (-1, -1), 0),
]))

header_wrapper = Table([[header_table]], colWidths=[doc.width], rowHeights=[42*mm])
header_wrapper.setStyle(TableStyle([
    ('BACKGROUND', (0, 0), (-1, -1), PRIMARY),
    ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
    ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
    ('LEFTPADDING', (0, 0), (-1, -1), 0),
    ('RIGHTPADDING', (0, 0), (-1, -1), 0),
    ('TOPPADDING', (0, 0), (-1, -1), 0),
    ('BOTTOMPADDING', (0, 0), (-1, -1), 0),
]))
story.append(header_wrapper)
story.append(Spacer(1, 3*mm))

# ══════════════════════════════════════════════════════════
# ABOUT + POSITION
# ══════════════════════════════════════════════════════════
about_text = (
    "福瑞笛（FREDDY）专注中欧跨境合规服务，总部位于上海，淮南设分公司，"
    "德国关联公司LIVANTO GmbH位于多特蒙德。我们帮助中国出口企业应对"
    "德国包装法（VerpackG）、WEEE（ElektroG）及电池法（BattG）合规要求，"
    "年服务客户数百家，业务持续高速增长。"
)
story.append(section("关于福瑞笛"))
story.append(hr())
story.append(body(about_text))
story.append(Spacer(1, 2*mm))

# Position
story.append(section("招聘岗位"))
story.append(hr())
pos_row = Table([
    [Paragraph("市场推广专员", mk("PosTitle", 14, 20, PRIMARY, bold=True)),
     Paragraph("2 - 3 名", mk("PosCount", 14, 20, ACCENT, TA_CENTER, bold=True))],
], colWidths=[130*mm, 48*mm])
pos_row.setStyle(TableStyle([
    ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
    ('TOPPADDING', (0, 0), (-1, -1), 2),
    ('BOTTOMPADDING', (0, 0), (-1, -1), 2),
]))
story.append(pos_row)
story.append(body("工作内容："))
story.append(bul("负责社交媒体平台（微信、抖音、小红书等）内容策划与日常运营"))
story.append(bul("通过发帖、评论互动等方式引流获客，搭建品牌私域社群"))
story.append(bul("解答潜在客户关于德国包装法、电池法、WEEE的法规咨询"))
story.append(bul("维护客户关系，推动潜在客户转化为签约客户"))
story.append(Spacer(1, 3*mm))

# ══════════════════════════════════════════════════════════
# SALARY HIGHLIGHTS
# ══════════════════════════════════════════════════════════
story.append(section("薪资待遇"))
story.append(hr())

def make_salary_card(label, number, unit, bg=BG_HIGHLIGHT, num_style=s_salary_num,
                     label_style=s_salary_label):
    return Table([
        [Paragraph(label, label_style)],
        [Paragraph(number, num_style)],
        [Paragraph(unit, label_style)],
    ], colWidths=[52*mm], rowHeights=[5*mm, 11*mm, 5*mm])

# Card 1: Base salary
c1 = make_salary_card("基本工资", "3,200", "元 / 月")
c1.setStyle(TableStyle([
    ('BACKGROUND', (0, 0), (-1, -1), BG_HIGHLIGHT),
    ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
    ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
    ('ROUNDEDCORNERS', [3*mm, 3*mm, 3*mm, 3*mm]),
    ('TOPPADDING', (0, 0), (-1, -1), 2),
    ('BOTTOMPADDING', (0, 0), (-1, -1), 2),
]))

# Card 2: Commission
c2 = make_salary_card("营收提成", "高比例", "行业领先水平")
c2.setStyle(TableStyle([
    ('BACKGROUND', (0, 0), (-1, -1), BG_HIGHLIGHT),
    ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
    ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
    ('ROUNDEDCORNERS', [3*mm, 3*mm, 3*mm, 3*mm]),
    ('TOPPADDING', (0, 0), (-1, -1), 2),
    ('BOTTOMPADDING', (0, 0), (-1, -1), 2),
]))

# Card 3: Total (highlighted)
c3 = make_salary_card("参考月收入", "5,200+", "元（税前）",
                       bg=PRIMARY, num_style=s_salary_num_big, label_style=s_salary_label_w)
c3.setStyle(TableStyle([
    ('BACKGROUND', (0, 0), (-1, -1), PRIMARY),
    ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
    ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
    ('ROUNDEDCORNERS', [3*mm, 3*mm, 3*mm, 3*mm]),
    ('TOPPADDING', (0, 0), (-1, -1), 2),
    ('BOTTOMPADDING', (0, 0), (-1, -1), 2),
]))

salary_row = Table([[c1, c2, c3]], colWidths=[55*mm, 55*mm, 55*mm])
salary_row.setStyle(TableStyle([
    ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
    ('VALIGN', (0, 0), (-1, -1), 'TOP'),
    ('LEFTPADDING', (0, 0), (-1, -1), 2*mm),
    ('RIGHTPADDING', (0, 0), (-1, -1), 2*mm),
]))
story.append(salary_row)
story.append(Spacer(1, 2*mm))
story.append(Paragraph("公司业务稳定增长，提成空间充裕，收入上不封顶，多劳多得", s_note))
story.append(Spacer(1, 3*mm))

# ══════════════════════════════════════════════════════════
# BENEFITS + REQUIREMENTS (side-by-side 2-column layout)
# ══════════════════════════════════════════════════════════
story.append(section("福利待遇"))
story.append(hr())

# Benefits as compact 2x3 grid with simple label icons
benefits = [
    ("[工]", "40小时/周", "标准工时"),
    ("[休]", "周末双休", "工作生活平衡"),
    ("[保]", "五险一金", "全面保障"),
    ("[薪]", "13薪", "年终双薪"),
    ("[假]", "带薪年假", "3天起，工龄递增"),
    ("[晋]", "晋升空间", "业务扩张期机会多"),
]

benefit_rows = []
row_data = []
for icon, title, desc in benefits:
    cell = Table([
        [Paragraph(icon, s_benefit_icon)],
        [Paragraph(title, s_benefit_title)],
        [Paragraph(desc, s_benefit_desc)],
    ], colWidths=[52*mm], rowHeights=[6*mm, 5*mm, 4*mm])
    cell.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, -1), BG_HIGHLIGHT),
        ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ('ROUNDEDCORNERS', [2*mm, 2*mm, 2*mm, 2*mm]),
        ('TOPPADDING', (0, 0), (-1, -1), 1),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 1),
    ]))
    row_data.append(cell)
    if len(row_data) == 3:
        benefit_rows.append(row_data)
        row_data = []

for row in benefit_rows:
    bt = Table([row], colWidths=[55*mm, 55*mm, 55*mm])
    bt.setStyle(TableStyle([
        ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
        ('VALIGN', (0, 0), (-1, -1), 'TOP'),
        ('LEFTPADDING', (0, 0), (-1, -1), 1.5*mm),
        ('RIGHTPADDING', (0, 0), (-1, -1), 1.5*mm),
        ('TOPPADDING', (0, 0), (-1, -1), 1),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 1),
    ]))
    story.append(bt)

story.append(Spacer(1, 3*mm))

# ══════════════════════════════════════════════════════════
# REQUIREMENTS
# ══════════════════════════════════════════════════════════
story.append(section("任职要求"))
story.append(hr())
story.append(bul("熟悉社交媒体平台（微信、抖音、小红书等）运营规则与玩法"))
story.append(bul("具备良好的沟通表达能力和文案撰写能力"))
story.append(bul("有销售、市场推广或客户服务经验者优先"))
story.append(bul("对跨境电商、中欧贸易或环保合规行业有兴趣和学习意愿"))
story.append(bul("工作积极主动，具备团队合作精神和目标导向意识"))

story.append(Spacer(1, 4*mm))

# ══════════════════════════════════════════════════════════
# CONTACT BAR
# ══════════════════════════════════════════════════════════
contact_inner = []
contact_inner.append(Paragraph("加 入 我 们", s_contact_title))
contact_inner.append(Spacer(1, 2*mm))

contact_line = (
    "邮箱: info@freddy-epr.com&nbsp;&nbsp;|&nbsp;&nbsp;"
    "电话: +86 152 2138 0610&nbsp;&nbsp;|&nbsp;&nbsp;"
    "地址: 安徽省淮南市龙湖路21号&nbsp;&nbsp;|&nbsp;&nbsp;"
    "官网: www.freddy-epr.com"
)
contact_inner.append(Paragraph(contact_line, s_contact))
contact_inner.append(Spacer(1, 1.5*mm))
contact_inner.append(Paragraph("福瑞笛（上海）信息咨询有限公司淮南分公司", s_contact))

contact_table = Table([[item] for item in contact_inner], colWidths=[doc.width])
contact_table.setStyle(TableStyle([
    ('BACKGROUND', (0, 0), (-1, -1), PRIMARY),
    ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
    ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
    ('TOPPADDING', (0, 0), (-1, -1), 3),
    ('BOTTOMPADDING', (0, 0), (-1, -1), 3),
    ('LEFTPADDING', (0, 0), (-1, -1), 0),
    ('RIGHTPADDING', (0, 0), (-1, -1), 0),
]))

contact_wrapper = Table([[contact_table]], colWidths=[doc.width], rowHeights=[22*mm])
contact_wrapper.setStyle(TableStyle([
    ('BACKGROUND', (0, 0), (-1, -1), PRIMARY),
    ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
    ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
    ('LEFTPADDING', (0, 0), (-1, -1), 0),
    ('RIGHTPADDING', (0, 0), (-1, -1), 0),
    ('TOPPADDING', (0, 0), (-1, -1), 0),
    ('BOTTOMPADDING', (0, 0), (-1, -1), 0),
]))
story.append(contact_wrapper)

# ══════════════════════════════════════════════════════════
# BUILD
# ══════════════════════════════════════════════════════════
doc.build(story)
print(f"PDF generated: {OUTPUT_PATH}")
print(f"Size: {os.path.getsize(OUTPUT_PATH):,} bytes")
