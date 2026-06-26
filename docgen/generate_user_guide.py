#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Generate FREDDY User Guide PDF (Chinese)
FREDDY 福瑞笛 — 德国跨境合规平台 客户使用说明书
"""

import os
from reportlab.lib.pagesizes import A4
from reportlab.lib.units import mm, cm
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.colors import HexColor, white, black, gray
from reportlab.lib.enums import TA_CENTER, TA_LEFT, TA_JUSTIFY
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, PageBreak, Table, TableStyle,
    KeepTogether, HRFlowable
)
from reportlab.platypus.flowables import Flowable
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.platypus.doctemplate import PageTemplate, BaseDocTemplate, Frame
from reportlab.platypus.frames import Frame
from reportlab.pdfgen import canvas

# ============ CONFIG ============
OUTPUT_DIR = os.path.dirname(os.path.abspath(__file__))
OUTPUT_FILE = os.path.join(OUTPUT_DIR, "FREDDY用户使用说明书.pdf")

# Colors
PRIMARY = HexColor("#1e3a5f")
PRIMARY_LIGHT = HexColor("#2a5a8a")
ACCENT = HexColor("#e67e22")
GREEN = HexColor("#27ae60")
AMBER = HexColor("#d35400")
DARK = HexColor("#1a1a2e")
LIGHT_BG = HexColor("#f8f9fa")
BORDER = HexColor("#e0e0e0")
TEXT = HexColor("#333333")
TEXT_LIGHT = HexColor("#666666")

# ============ FONT SETUP ============
# Register Chinese fonts — try multiple common Windows Chinese fonts
FONT_REGISTERED = False
FONT_NAME = "Helvetica"
FONT_BOLD = "Helvetica-Bold"

for font_candidate in [
    ("C:/Windows/Fonts/msyh.ttc", "Microsoft YaHei"),
    ("C:/Windows/Fonts/msyhbd.ttc", "Microsoft YaHei Bold"),
    ("C:/Windows/Fonts/simhei.ttf", "SimHei"),
    ("C:/Windows/Fonts/simsun.ttc", "SimSun"),
    ("C:/Windows/Fonts/simfang.ttf", "SimFang"),
]:
    if os.path.exists(font_candidate[0]):
        try:
            pdfmetrics.registerFont(TTFont("CJK", font_candidate[0]))
            FONT_NAME = "CJK"
            FONT_BOLD = "CJK"
            FONT_REGISTERED = True
            print(f"[OK] Registered font: {font_candidate[1]}")
            break
        except Exception as e:
            print(f"[WARN] Failed to register {font_candidate[1]}: {e}")

if not FONT_REGISTERED:
    print("[WARN] No Chinese font found, using Helvetica (Chinese chars will not render)")

# ============ STYLES ============
def build_styles():
    styles = {}

    styles['cover_title'] = ParagraphStyle(
        'CoverTitle', fontName=FONT_BOLD, fontSize=28, leading=40,
        textColor=white, alignment=TA_CENTER, spaceAfter=10,
    )
    styles['cover_subtitle'] = ParagraphStyle(
        'CoverSubtitle', fontName=FONT_NAME, fontSize=14, leading=22,
        textColor=HexColor("#bdc3c7"), alignment=TA_CENTER, spaceAfter=6,
    )
    styles['h1'] = ParagraphStyle(
        'H1', fontName=FONT_BOLD, fontSize=22, leading=30,
        textColor=PRIMARY, spaceBefore=20, spaceAfter=12,
    )
    styles['h2'] = ParagraphStyle(
        'H2', fontName=FONT_BOLD, fontSize=16, leading=24,
        textColor=PRIMARY, spaceBefore=16, spaceAfter=8,
    )
    styles['h3'] = ParagraphStyle(
        'H3', fontName=FONT_BOLD, fontSize=13, leading=20,
        textColor=DARK, spaceBefore=12, spaceAfter=6,
    )
    styles['body'] = ParagraphStyle(
        'Body', fontName=FONT_NAME, fontSize=10, leading=18,
        textColor=TEXT, alignment=TA_JUSTIFY, spaceAfter=8,
    )
    styles['body_center'] = ParagraphStyle(
        'BodyCenter', fontName=FONT_NAME, fontSize=10, leading=18,
        textColor=TEXT, alignment=TA_CENTER, spaceAfter=8,
    )
    styles['bullet'] = ParagraphStyle(
        'Bullet', fontName=FONT_NAME, fontSize=10, leading=18,
        textColor=TEXT, leftIndent=20, bulletIndent=8, spaceAfter=4,
    )
    styles['small'] = ParagraphStyle(
        'Small', fontName=FONT_NAME, fontSize=8, leading=13,
        textColor=TEXT_LIGHT, spaceAfter=4,
    )
    styles['note'] = ParagraphStyle(
        'Note', fontName=FONT_NAME, fontSize=9, leading=16,
        textColor=HexColor("#7f8c8d"), leftIndent=12, rightIndent=12,
        spaceBefore=6, spaceAfter=6,
    )
    styles['table_header'] = ParagraphStyle(
        'TableHeader', fontName=FONT_BOLD, fontSize=10, leading=16,
        textColor=white, alignment=TA_CENTER,
    )
    styles['table_cell'] = ParagraphStyle(
        'TableCell', fontName=FONT_NAME, fontSize=9, leading=16,
        textColor=TEXT, alignment=TA_CENTER,
    )
    styles['table_cell_left'] = ParagraphStyle(
        'TableCellLeft', fontName=FONT_NAME, fontSize=9, leading=16,
        textColor=TEXT, alignment=TA_LEFT,
    )
    styles['caption'] = ParagraphStyle(
        'Caption', fontName=FONT_NAME, fontSize=8, leading=12,
        textColor=TEXT_LIGHT, alignment=TA_CENTER, spaceBefore=4, spaceAfter=10,
    )
    styles['toc_entry'] = ParagraphStyle(
        'TOCEntry', fontName=FONT_NAME, fontSize=11, leading=22,
        textColor=TEXT, leftIndent=10,
    )
    styles['toc_sub'] = ParagraphStyle(
        'TOCSub', fontName=FONT_NAME, fontSize=10, leading=20,
        textColor=TEXT_LIGHT, leftIndent=30,
    )
    return styles

S = build_styles()

# ============ HELPER FUNCTIONS ============
def heading1(text):
    return Paragraph(text, S['h1'])

def heading2(text):
    return Paragraph(text, S['h2'])

def heading3(text):
    return Paragraph(text, S['h3'])

def body(text):
    return Paragraph(text, S['body'])

def bullet(text):
    return Paragraph(f"• {text}", S['bullet'])

def note(text):
    return Paragraph(f"💡 {text}", S['note'])

def spacer(h=6):
    return Spacer(1, h)

def hr():
    return HRFlowable(width="100%", thickness=0.5, color=BORDER, spaceBefore=6, spaceAfter=6)

def page_break():
    return PageBreak()

def make_table(headers, rows, col_widths=None):
    """Create a styled table with header and rows."""
    header_cells = [Paragraph(h, S['table_header']) for h in headers]
    data = [header_cells]
    for row in rows:
        data.append([Paragraph(str(c), S['table_cell']) for c in row])

    if col_widths is None:
        col_widths = [460 / len(headers)] * len(headers)

    t = Table(data, colWidths=col_widths, repeatRows=1)
    t.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), PRIMARY),
        ('TEXTCOLOR', (0, 0), (-1, 0), white),
        ('ALIGN', (0, 0), (-1, 0), 'CENTER'),
        ('FONTNAME', (0, 0), (-1, -1), FONT_NAME),
        ('FONTSIZE', (0, 0), (-1, -1), 9),
        ('BOTTOMPADDING', (0, 0), (-1, 0), 10),
        ('TOPPADDING', (0, 0), (-1, 0), 10),
        ('BOTTOMPADDING', (0, 1), (-1, -1), 8),
        ('TOPPADDING', (0, 1), (-1, -1), 8),
        ('GRID', (0, 0), (-1, -1), 0.5, BORDER),
        ('ROWBACKGROUNDS', (0, 1), (-1, -1), [white, LIGHT_BG]),
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
    ]))
    return t

def info_box(title, lines, color=PRIMARY):
    """Create an information box with title and bullet lines."""
    elements = []
    elements.append(Paragraph(f"<b>{title}</b>", ParagraphStyle(
        'BoxTitle', fontName=FONT_BOLD, fontSize=11, leading=18,
        textColor=color, spaceAfter=6,
    )))
    for line in lines:
        elements.append(Paragraph(f"• {line}", ParagraphStyle(
            'BoxBullet', fontName=FONT_NAME, fontSize=9, leading=16,
            textColor=TEXT, leftIndent=8, spaceAfter=2,
        )))
    return elements

# ============ PAGE TEMPLATE ============
class NumberedCanvas(canvas.Canvas):
    """Canvas with automatic page numbering."""
    def __init__(self, *args, **kwargs):
        canvas.Canvas.__init__(self, *args, **kwargs)
        self._saved_page_states = []

    def showPage(self):
        self._saved_page_states.append(dict(self.__dict__))
        self._startPage()

    def save(self):
        num_pages = len(self._saved_page_states)
        for state in self._saved_page_states:
            self.__dict__.update(state)
            self.draw_page_number(num_pages)
            canvas.Canvas.showPage(self)
        canvas.Canvas.save(self)

    def draw_page_number(self, page_count):
        if self._pageNumber > 1:  # Skip cover page
            self.setFont(FONT_NAME, 8)
            self.setFillColor(TEXT_LIGHT)
            text = f"- {self._pageNumber - 1} -"
            self.drawCentredString(A4[0] / 2, 15 * mm, text)

        # Header line
        if self._pageNumber > 1:
            self.setStrokeColor(BORDER)
            self.setLineWidth(0.5)
            self.line(20 * mm, A4[1] - 18 * mm, A4[0] - 20 * mm, A4[1] - 18 * mm)
            self.setFont(FONT_NAME, 7)
            self.setFillColor(TEXT_LIGHT)
            self.drawString(20 * mm, A4[1] - 16 * mm, "FREDDY 福瑞笛 — 德国跨境合规平台 用户使用说明书")

        # Footer line
        if self._pageNumber > 1:
            self.setStrokeColor(BORDER)
            self.line(20 * mm, 18 * mm, A4[0] - 20 * mm, 18 * mm)


# ============ BUILD DOCUMENT ============
def build_pdf():
    doc = SimpleDocTemplate(
        OUTPUT_FILE,
        pagesize=A4,
        leftMargin=20 * mm,
        rightMargin=20 * mm,
        topMargin=22 * mm,
        bottomMargin=22 * mm,
        title="FREDDY 福瑞笛 用户使用说明书",
        author="FREDDY 福瑞笛",
        subject="德国跨境合规平台使用指南",
    )

    story = []
    page_w = A4[0] - 40 * mm  # usable width

    # ======= COVER PAGE =======
    story.append(Spacer(1, 60 * mm))

    # Logo / Brand
    story.append(Paragraph("FREDDY", ParagraphStyle(
        'CoverBrand', fontName=FONT_BOLD, fontSize=42, leading=52,
        textColor=PRIMARY, alignment=TA_CENTER,
    )))
    story.append(Paragraph("福 瑞 笛", ParagraphStyle(
        'CoverBrandCN', fontName=FONT_NAME, fontSize=20, leading=30,
        textColor=PRIMARY_LIGHT, alignment=TA_CENTER, spaceAfter=20,
    )))
    story.append(hr())
    story.append(Spacer(1, 15 * mm))

    story.append(Paragraph("德国跨境合规平台", ParagraphStyle(
        'CoverMainTitle', fontName=FONT_BOLD, fontSize=30, leading=42,
        textColor=DARK, alignment=TA_CENTER,
    )))
    story.append(Paragraph("客 户 使 用 说 明 书", ParagraphStyle(
        'CoverSubMain', fontName=FONT_NAME, fontSize=22, leading=34,
        textColor=PRIMARY, alignment=TA_CENTER, spaceAfter=25,
    )))

    story.append(Spacer(1, 15 * mm))
    story.append(Paragraph(
        "包装法授权代表  |  WEEE电子电气法  |  电池法 BattG<br/>"
        "在线签约  |  合规面板  |  费用计算  |  资料下载",
        ParagraphStyle('CoverServices', fontName=FONT_NAME, fontSize=11, leading=20,
                       textColor=TEXT_LIGHT, alignment=TA_CENTER, spaceAfter=12)
    ))
    story.append(Spacer(1, 20 * mm))
    story.append(Paragraph("2026年6月  ·  V1.0", ParagraphStyle(
        'CoverVersion', fontName=FONT_NAME, fontSize=10, leading=16,
        textColor=TEXT_LIGHT, alignment=TA_CENTER,
    )))

    story.append(page_break())

    # ======= TABLE OF CONTENTS =======
    story.append(heading1("目  录"))
    story.append(spacer(12))

    toc_items = [
        ("第一章", "平台概述", "了解FREDDY平台和服务范围"),
        ("第二章", "快速入门", "三步完成德国合规"),
        ("第三章", "包装法授权代表服务", "VerpackG §35(2) 详细指南"),
        ("第四章", "WEEE电子电气法服务", "ElektroG 六大类别与注册"),
        ("第五章", "电池法 BattG 服务", "电池及含电池产品合规"),
        ("第六章", "费用计算器", "在线实时费用估算"),
        ("第七章", "在线签约流程", "4步向导完成授权代表签约"),
        ("第八章", "用户合规面板", "Dashboard功能使用说明"),
        ("第九章", "常见问题", "FAQ分类解答"),
        ("第十章", "下载中心", "合同模板与注册指南"),
        ("第十一章", "联系方式", "客服与技术支持的获取"),
    ]

    for ch, title, desc in toc_items:
        entry_style = ParagraphStyle(
            'TOC', fontName=FONT_BOLD, fontSize=12, leading=28,
            textColor=DARK, leftIndent=10,
        )
        story.append(Paragraph(f"<b>{ch}</b>  {title}", entry_style))
        story.append(Paragraph(desc, S['toc_sub']))

    story.append(page_break())

    # ======= CHAPTER 1: OVERVIEW =======
    story.append(heading1("第一章  平台概述"))
    story.append(hr())

    story.append(heading2("1.1 关于 FREDDY 福瑞笛"))
    story.append(body(
        "FREDDY（福瑞笛）是专注于德国跨境合规的一站式服务平台，由 LIVANTO GmbH（德国本土授权代表机构）与 "
        "WEEE Return GmbH 联合提供技术支持。平台面向在德国市场销售产品的中国制造商、出口商和跨境电商卖家，"
        "提供从注册到年度申报的完整合规解决方案。"
    ))
    story.append(body(
        "根据欧盟《包装与包装废弃物法规》(PPWR) 2025/40 以及德国《包装法》(VerpackG)、《电子电气设备法》(ElektroG) "
        "和《电池法》(BattG) 的规定，所有在德国无分支机构的厂商必须在德国指定本土授权代表 (Authorised Representative)。"
        "FREDDY 通过 LIVANTO GmbH 为您承担这一法定角色。"
    ))

    story.append(heading2("1.2 服务范围"))
    services_data = [
        ["包装法授权代表", "VerpackG §35(2)", "€89/年起",
         "LUCID注册指导、双元系统对接、数据申报、官方通信处理"],
        ["WEEE 电子电气法", "ElektroG", "€278/年起",
         "EAR注册代办、6大设备类别、破产保障、回收系统参与"],
        ["电池法 BattG", "Batteriegesetz", "€129/年起",
         "EAR注册、回收系统、年度申报、多品牌管理"],
    ]
    t = Table([
        [Paragraph(h, S['table_header']) for h in ["服务项目", "法律依据", "起售价", "核心内容"]],
        *[[Paragraph(c, S['table_cell_left']) for c in row] for row in services_data]
    ], colWidths=[105, 80, 70, page_w - 255], repeatRows=1)
    t.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), PRIMARY),
        ('TEXTCOLOR', (0, 0), (-1, 0), white),
        ('GRID', (0, 0), (-1, -1), 0.5, BORDER),
        ('ROWBACKGROUNDS', (0, 1), (-1, -1), [white, LIGHT_BG]),
        ('FONTNAME', (0, 0), (-1, -1), FONT_NAME),
        ('FONTSIZE', (0, 0), (-1, -1), 9),
        ('TOPPADDING', (0, 0), (-1, -1), 8),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 8),
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
    ]))
    story.append(t)
    story.append(spacer(12))

    story.append(heading2("1.3 平台核心优势"))
    advantages = [
        "<b>德国本土实体：</b>LIVANTO GmbH 是德国注册公司，非第三方代理，直接承担§35(2) VerpackG 法定授权代表义务。",
        "<b>中文全程服务：</b>从注册向导到合同签署、从数据申报到客服支持，全程使用中文，消除语言障碍。",
        "<b>自有签约与支付：</b>直接与 LIVANTO GmbH 签订授权代表合同，支持微信/支付宝支付人民币，按实时汇率结算。",
        "<b>全流程在线化：</b>在线填写信息 → 自动生成合同 → 在线签署 → 支付 → 获取合规编号，无需邮寄纸质文件。",
        "<b>合规时效提醒：</b>系统自动追踪 LUCID 确认状态、合同到期日和年度申报截止日，提前 60 天微信/邮件通知。",
        "<b>法律法规同步：</b>团队持续追踪德国及欧盟法规变动（如 PPWR 2025/40），确保您的合规始终有效。",
    ]
    for adv in advantages:
        story.append(Paragraph(f"✅  {adv}", ParagraphStyle(
            'Adv', fontName=FONT_NAME, fontSize=10, leading=18,
            textColor=TEXT, leftIndent=8, spaceAfter=6,
        )))

    story.append(page_break())

    # ======= CHAPTER 2: QUICK START =======
    story.append(heading1("第二章  快速入门"))
    story.append(hr())

    story.append(heading2("2.1 三步完成德国合规"))
    story.append(body(
        "无论您是首次接触德国合规要求的新卖家，还是已有 LUCID 注册号需要补充授权代表的成熟卖家，"
        "FREDDY 平台都能帮助您快速完成合规流程。以下是标准操作路径："
    ))

    steps_data = [
        ["第一步", "在线填写信息",
         "在签约向导中填写公司基本信息（名称、联系人、邮箱），"
         "选择需要合规的包装材料和预估年用量（公斤）。全程中文界面，约 3 分钟。",
         "公司营业执照、联系人信息"],
        ["第二步", "系统生成合同",
         "平台根据您的公司信息和选择的套餐自动生成中德双语授权代表合同。"
         "您可以在线预览合同内容，确认无误后输入姓名完成电子签署。",
         "签署人姓名（电子签名）"],
        ["第三步", "提交审批",
         "签约支付完成后，LIVANTO 团队将在 LUCID/EAR 系统中确认您的授权代表关系。"
         "您将收到合同 PDF、支付凭证和后续操作指南（如 LUCID 注册指南）。",
         "等待邮件通知（1-3 个工作日）"],
    ]
    t = Table([
        [Paragraph(h, S['table_header']) for h in ["步骤", "操作", "说明", "需要准备"]],
        *[[Paragraph(c, S['table_cell_left']) for c in row] for row in steps_data]
    ], colWidths=[45, 80, 195, 105], repeatRows=1)
    t.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), PRIMARY),
        ('TEXTCOLOR', (0, 0), (-1, 0), white),
        ('GRID', (0, 0), (-1, -1), 0.5, BORDER),
        ('ROWBACKGROUNDS', (0, 1), (-1, -1), [white, LIGHT_BG]),
        ('FONTNAME', (0, 0), (-1, -1), FONT_NAME),
        ('FONTSIZE', (0, 0), (-1, -1), 9),
        ('TOPPADDING', (0, 0), (-1, -1), 8),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 8),
        ('VALIGN', (0, 0), (-1, -1), 'TOP'),
    ]))
    story.append(t)
    story.append(spacer(8))
    story.append(note("建议在计划进入德国市场前至少 2-3 个月开始准备合规注册。WEEE 注册审核周期约 4-8 周，电池法约 2-4 周。"))

    story.append(heading2("2.2 平台导航说明"))
    story.append(body("FREDDY 平台采用响应式设计，支持桌面端和移动端访问。顶部导航栏包含以下主要入口："))
    nav_items = [
        ["<b>首页</b>", "平台总览，服务卡片，三步流程介绍"],
        ["<b>包装法</b>", "包装法授权代表服务详情，套餐对比，双元系统费用参考"],
        ["<b>WEEE</b>", "电子电气法服务详情，六大设备类别说明"],
        ["<b>电池法</b>", "电池法服务详情，费用参考"],
        ["<b>费用计算</b>", "在线费用计算器，支持 WEEE + 电池法 + 包装法三项合并估算"],
        ["<b>常见问题</b>", "按分类筛选的常见问题解答"],
        ["<b>在线签约</b>", "4 步签约向导（高亮按钮，位于导航栏右侧）"],
    ]
    for label, desc in nav_items:
        story.append(Paragraph(f"{label} — {desc}", ParagraphStyle(
            'NavItem', fontName=FONT_NAME, fontSize=10, leading=18,
            textColor=TEXT, leftIndent=12, spaceAfter=3,
        )))

    story.append(page_break())

    # ======= CHAPTER 3: PACKAGING =======
    story.append(heading1("第三章  包装法授权代表服务"))
    story.append(hr())

    story.append(heading2("3.1 服务概述"))
    story.append(body(
        "根据德国《包装法》(Verpackungsgesetz, VerpackG) §35(2)以及欧盟 PPWR 2025/40 的规定，"
        "自 2026 年 8 月 12 日起，所有在德国无分支机构的厂商——包括来自其他欧盟成员国和第三国的厂商——"
        "必须指定一名德国本土授权代表 (Authorised Representative, AR)。"
    ))
    story.append(body(
        "LIVANTO GmbH 作为您根据 §35(2) VerpackG 的授权代表，承担除 LUCID 注册外的全部义务："
        "签订双元系统合同、数据申报、完整性声明（如需要）、运输包装回收组织、官方通信等。"
        "您只需自行在 ZSVR 官网完成 LUCID 注册（我们提供中文图文指南），其余合规工作全部由 LIVANTO 处理。"
    ))

    story.append(heading2("3.2 适用对象"))
    applicable = [
        "在德国以自己的名称/品牌销售包装产品的生产商/制造商",
        "将包装产品首次进口到德国市场的进口商",
        "通过 Amazon、Temu、eBay、OTTO 等平台向德国消费者发货的跨境电商卖家",
        "使用 Amazon FBA（亚马逊物流）将商品发往德国仓库的卖家",
    ]
    for a in applicable:
        story.append(bullet(a))

    story.append(heading2("3.3 服务套餐"))
    tiers_data = [
        ["基础 Basic", "€89/年", "核心AR服务、LUCID数据申报、双元系统合同签订、官方通信处理"],
        ["标准 Standard", "€159/年", "基础全部内容 + 优先响应(48h) + 扩展分类咨询 + 年度合规简报", "★ 推荐"],
        ["高级 Premium", "€249/年", "标准全部内容 + 完整性声明协调 + 专属客户经理 + 24h响应"],
    ]
    t = Table([
        [Paragraph(h, S['table_header']) for h in ["套餐", "年费", "核心内容", "备注"]],
        *[[Paragraph(c, S['table_cell_left']) for c in row] for row in tiers_data]
    ], colWidths=[85, 65, 235, 50], repeatRows=1)
    t.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), PRIMARY),
        ('TEXTCOLOR', (0, 0), (-1, 0), white),
        ('GRID', (0, 0), (-1, -1), 0.5, BORDER),
        ('ROWBACKGROUNDS', (0, 1), (-1, -1), [white, LIGHT_BG, white]),
        ('FONTNAME', (0, 0), (-1, -1), FONT_NAME),
        ('FONTSIZE', (0, 0), (-1, -1), 9),
        ('TOPPADDING', (0, 0), (-1, -1), 8),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 8),
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
    ]))
    story.append(t)
    story.append(spacer(6))
    story.append(note("以上年费为授权代表服务费，不含双元系统许可费（按包装材料重量计费，详见 3.5 节）。"))

    story.append(heading2("3.4 合规操作步骤"))
    steps = [
        "<b>步骤 1 — LUCID 注册：</b>在 ZSVR 官网 (www.verpackungsregister.org) 自行注册，获取 LUCID 注册号。我们提供中文图文指南，全程约 10 分钟。",
        "<b>步骤 2 — 签约授权代表：</b>在 FREDDY 平台填写公司信息 + 包装材料数据，选择服务套餐，在线签署授权代表合同，完成支付。",
        "<b>步骤 3 — LIVANTO 确认授权：</b>LIVANTO 在 LUCID 系统中确认与您的授权代表关系。此后 LIVANTO 作为您的授权代表，与双元系统签订合同并提交数据申报。",
        "<b>步骤 4 — 年度维护：</b>每年 2 月 15 日前，向 LIVANTO 报告上一年度的实际包装用量。系统会在截止日前 60 天自动发送提醒。",
    ]
    for s in steps:
        story.append(Paragraph(s, ParagraphStyle(
            'Step', fontName=FONT_NAME, fontSize=10, leading=18,
            textColor=TEXT, leftIndent=8, spaceAfter=8,
        )))

    story.append(heading2("3.5 双元系统费用参考"))
    story.append(body("以下为双元系统许可费用（按包装材料重量计费），与授权代表年费分开。具体以实际签约的双元系统价格为准："))
    materials = [
        ["玻璃 (Glas)", "€0.02", "€0.05"],
        ["纸/纸板/纸箱 (Papier/Pappe)", "€0.02", "€0.15"],
        ["黑色金属 (Eisenmetalle)", "€0.15", "€0.40"],
        ["铝 (Aluminium)", "€0.15", "€0.40"],
        ["塑料 (Kunststoffe)", "€0.30", "€0.80"],
        ["复合材料 (Verbunde)", "€0.20", "€0.50"],
        ["饮料纸盒 (Getränkekarton)", "€0.15", "€0.35"],
    ]
    t = Table([
        [Paragraph(h, S['table_header']) for h in ["材料类别", "最低价 (€/kg)", "最高价 (€/kg)"]],
        *[[Paragraph(c, S['table_cell_left']) for c in row] for row in materials]
    ], colWidths=[230, 100, 100], repeatRows=1)
    t.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), PRIMARY),
        ('TEXTCOLOR', (0, 0), (-1, 0), white),
        ('GRID', (0, 0), (-1, -1), 0.5, BORDER),
        ('ROWBACKGROUNDS', (0, 1), (-1, -1), [white, LIGHT_BG]),
        ('FONTNAME', (0, 0), (-1, -1), FONT_NAME),
        ('FONTSIZE', (0, 0), (-1, -1), 9),
        ('TOPPADDING', (0, 0), (-1, -1), 6),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 6),
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
    ]))
    story.append(t)

    story.append(page_break())

    # ======= CHAPTER 4: WEEE =======
    story.append(heading1("第四章  WEEE 电子电气法服务"))
    story.append(hr())

    story.append(heading2("4.1 服务概述"))
    story.append(body(
        "WEEE (Waste Electrical and Electronic Equipment) 即电子电气设备废弃物。德国《电子电气设备法》(ElektroG) "
        "要求所有在德国市场上销售电子电气设备的生产商和进口商必须在德国基金会 EAR (Stiftung Elektro-Altgeräte Register) "
        "完成注册，并承担产品废弃后的回收和处理义务。非欧盟生产商必须在德国指定一名授权代表才能完成 EAR 注册。"
    ))
    story.append(body(
        "FREDDY 通过 WEEE Return GmbH 为您提供德国本土授权代表服务，涵盖 EAR 注册、破产保障、回收系统参与等全流程。"
    ))

    story.append(heading2("4.2 六大设备类别"))
    weee_cats = [
        ["1", "热交换器 (Wärmeüberträger)", "冰箱、空调、冷柜、热泵"],
        ["2", "显示屏/屏幕 (Bildschirme)", "电视、显示器、笔记本电脑屏幕 (>100cm²)"],
        ["3", "灯具 (Lampen)", "LED灯、荧光灯、节能灯"],
        ["4", "大型设备 (Großgeräte)", "洗衣机、烤箱、复印机 (>50cm)"],
        ["5", "小型设备 (Kleingeräte)", "手机、相机、吹风机 (<50cm)"],
        ["6", "小型IT设备 (Kleine IT-Geräte)", "路由器、键盘、移动硬盘"],
    ]
    t = Table([
        [Paragraph(h, S['table_header']) for h in ["类别", "名称（中/德）", "典型产品"]],
        *[[Paragraph(c, S['table_cell_left']) for c in row] for row in weee_cats]
    ], colWidths=[40, 190, 200], repeatRows=1)
    t.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), PRIMARY),
        ('TEXTCOLOR', (0, 0), (-1, 0), white),
        ('GRID', (0, 0), (-1, -1), 0.5, BORDER),
        ('ROWBACKGROUNDS', (0, 1), (-1, -1), [white, LIGHT_BG]),
        ('FONTNAME', (0, 0), (-1, -1), FONT_NAME),
        ('FONTSIZE', (0, 0), (-1, -1), 9),
        ('TOPPADDING', (0, 0), (-1, -1), 6),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 6),
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
    ]))
    story.append(t)
    story.append(spacer(6))
    story.append(note("如果您的产品销售涉及多个类别，每个额外类别加收 €99。平台费用计算器可自动估算多类别总费用。"))

    story.append(heading2("4.3 费用说明"))
    weee_fees = [
        ["WEEE Return 基本费", "€129.00"],
        ["破产保障费 (Insolvenzsicherung)", "€149.00"],
        ["每额外类别 (超过1个)", "€99.00"],
        ["每额外品牌 (超过1个)", "€79.95"],
        ["EAR 品牌注册费 (每品牌)", "€9.50"],
        ["EAR 首年一次性授权费", "€50.76"],
        ["EAR 季度费", "€3.80"],
    ]
    t = Table([
        [Paragraph(h, S['table_header']) for h in ["费用项目", "金额"]],
        *[[Paragraph(c, S['table_cell_left']) for c in row] for row in weee_fees]
    ], colWidths=[290, 140], repeatRows=1)
    t.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), PRIMARY),
        ('TEXTCOLOR', (0, 0), (-1, 0), white),
        ('GRID', (0, 0), (-1, -1), 0.5, BORDER),
        ('ROWBACKGROUNDS', (0, 1), (-1, -1), [white, LIGHT_BG]),
        ('FONTNAME', (0, 0), (-1, -1), FONT_NAME),
        ('FONTSIZE', (0, 0), (-1, -1), 9),
        ('TOPPADDING', (0, 0), (-1, -1), 6),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 6),
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
    ]))
    story.append(t)

    story.append(page_break())

    # ======= CHAPTER 5: BATTERY =======
    story.append(heading1("第五章  电池法 BattG 服务"))
    story.append(hr())

    story.append(heading2("5.1 服务概述"))
    story.append(body(
        "德国《电池法》(Batteriegesetz, BattG) 规范了所有类型电池在德国市场上的投放、回收和处置。"
        "自 2021 年起，电池法适用范围扩展至所有类型的电池——包括设备电池、工业电池和汽车电池。"
        "生产商必须在德国联邦环境局 (UBA) 的 EAR 基金会完成注册。"
    ))

    story.append(heading2("5.2 适用对象"))
    bat_applicable = [
        "<b>电池制造商：</b>在德国以自己的品牌销售电池的企业",
        "<b>含电池产品卖家：</b>产品中包含电池（如玩具、电子设备、LED灯、智能手表）的卖家",
        "<b>跨境电商：</b>通过 Amazon、Temu 等平台向德国消费者发货的卖家",
    ]
    for a in bat_applicable:
        story.append(bullet(a))

    story.append(heading2("5.3 费用明细"))
    bat_fees = [
        ["WEEE Return 注册费", "€129.00"],
        ["回收系统参与费", "€129.00"],
        ["EAR 会员年费", "€48.00"],
        ["EAR 季度费", "€3.80"],
        ["EAR 首年一次性授权费", "€50.76"],
        ["额外品牌 (每品牌)", "€49.00"],
        ["EAR 品牌注册费 (每品牌)", "€16.40"],
    ]
    t = Table([
        [Paragraph(h, S['table_header']) for h in ["费用项目", "金额"]],
        *[[Paragraph(c, S['table_cell_left']) for c in row] for row in bat_fees]
    ], colWidths=[290, 140], repeatRows=1)
    t.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), PRIMARY),
        ('TEXTCOLOR', (0, 0), (-1, 0), white),
        ('GRID', (0, 0), (-1, -1), 0.5, BORDER),
        ('ROWBACKGROUNDS', (0, 1), (-1, -1), [white, LIGHT_BG]),
        ('FONTNAME', (0, 0), (-1, -1), FONT_NAME),
        ('FONTSIZE', (0, 0), (-1, -1), 9),
        ('TOPPADDING', (0, 0), (-1, -1), 6),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 6),
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
    ]))
    story.append(t)
    story.append(spacer(8))

    story.append(heading2("5.4 WEEE 与电池法的关系"))
    story.append(body(
        "如果您的产品是电子电气设备且含有电池（如手机、笔记本电脑、电动玩具），则需要<b>同时注册 WEEE 和电池法</b>。"
        "这是两个独立的合规义务，不可互相替代。平台支持通过在线申报表单分别提交 WEEE 和电池法的注册申请。"
    ))

    story.append(page_break())

    # ======= CHAPTER 6: CALCULATOR =======
    story.append(heading1("第六章  费用计算器"))
    story.append(hr())

    story.append(heading2("6.1 功能介绍"))
    story.append(body(
        "费用计算器是 FREDDY 平台提供的在线实时估算工具，帮助您在签约前了解各项服务的预估年费。"
        "计算器涵盖三大服务：包装法授权代表、WEEE 电子电气法和电池法 BattG。"
    ))

    story.append(heading2("6.2 使用步骤"))
    calc_steps = [
        "<b>WEEE 区域：</b>选择设备类别数量（1-5）、品牌数量（1-5）、年份类型（首年/续年），系统自动计算 WEEE 年费合计。",
        "<b>电池法区域：</b>选择品牌数量（1-5）、年份类型（首年/续年），系统自动计算电池法年费合计。",
        "<b>包装法 AR 区域：</b>选择授权代表服务套餐（基础/标准/高级），系统显示对应年费。",
        "<b>查看合计：</b>页面底部自动展示三项服务合并后的年费总额（以包装法基础套餐计）。",
    ]
    for s in calc_steps:
        story.append(Paragraph(s, ParagraphStyle(
            'CalcStep', fontName=FONT_NAME, fontSize=10, leading=18,
            textColor=TEXT, leftIndent=14, spaceAfter=8,
        )))

    story.append(spacer(6))
    story.append(note("费用计算器仅提供估算，实际费用以签约时系统生成的确认为准。双元系统许可费另计，不包含在计算器结果中。"))

    story.append(page_break())

    # ======= CHAPTER 7: SIGNUP FLOW =======
    story.append(heading1("第七章  在线签约流程"))
    story.append(hr())

    story.append(heading2("7.1 概述"))
    story.append(body(
        "FREDDY 平台的在线签约功能采用 4 步向导式设计，全程中文引导，约 5 分钟即可完成授权代表合同的签署。"
        "签约过程无需纸质文件邮寄，所有步骤在线完成。"
    ))

    story.append(heading2("7.2 详细步骤"))

    story.append(heading3("第 1 步：填写公司信息"))
    story.append(body("在此步骤中，您需要提供以下信息："))
    company_fields = [
        "<b>公司名称</b>（必填）：您的公司全称，将用于合同生成。",
        "<b>联系人</b>（必填）：主要对接人的姓名。",
        "<b>电子邮箱</b>（必填）：用于接收合同 PDF 和后续通知。",
        "<b>手机号</b>（选填）：用于微信/短信通知。",
        "<b>微信号</b>（选填）：方便客服添加您进行一对一服务。",
    ]
    for f in company_fields:
        story.append(bullet(f))

    story.append(heading3("第 2 步：填写包装申报"))
    story.append(body("在此步骤中，您需要添加在德国市场使用的包装类型。每项包装需要指定："))
    pkg_fields = [
        "<b>材料类型：</b>从 8 种材料中选择（玻璃、纸/纸板、黑色金属、铝、塑料、复合材料、饮料纸盒、其他）。",
        "<b>销售类型：</b>B2C（面向消费者）或 B2B（面向企业）。",
        "<b>预估重量：</b>以公斤/年为单位填写预估用量。如不确定，可先填入大致数值，后续可更新。",
    ]
    for f in pkg_fields:
        story.append(bullet(f))
    story.append(body("您可以添加多种包装材料，每种材料单独添加。已添加的项目会显示在列表中，支持删除操作。"))

    story.append(heading3("第 3 步：选择服务套餐"))
    story.append(body("系统展示三个套餐选项供您选择："))
    tier_choices = [
        "<b>基础 Basic (€89/年)：</b>核心 AR 服务，适合包装量较小的卖家。",
        "<b>标准 Standard (€159/年) [推荐]：</b>增加优先响应和扩展咨询，适合有稳定出货量的卖家。",
        "<b>高级 Premium (€249/年)：</b>增加完整性声明协调和专属客户经理，适合大型卖家。",
    ]
    for t in tier_choices:
        story.append(bullet(t))

    story.append(heading3("第 4 步：预览并签署"))
    story.append(body("最后一步是信息确认和电子签署："))
    sign_items = [
        "核对公司信息、套餐选择和包装申报内容。",
        "阅读并同意授权代表合同条款（可点击链接预览合同全文）。",
        '输入签署人姓名作为电子签名（需与第 1 步填写的公司名/联系人一致）。',
        '点击"签署并进入支付"完成提交。',
    ]
    for item in sign_items:
        story.append(bullet(item))

    story.append(spacer(6))
    story.append(note("签署成功后系统会自动跳转到支付页面（微信/支付宝），支付完成后合同即激活。合同 PDF 和后续指南将发送至您提供的邮箱。"))

    story.append(page_break())

    # ======= CHAPTER 8: DASHBOARD =======
    story.append(heading1("第八章  用户合规面板"))
    story.append(hr())

    story.append(heading2("8.1 功能介绍"))
    story.append(body(
        "合规面板 (Dashboard) 是签约用户专属的管理中心，提供合同状态、截止日提醒、包装数据、支付记录、"
        "发票下载和 LUCID 确认状态的一站式查看。"
    ))

    story.append(heading2("8.2 面板布局"))

    story.append(heading3("统计卡片区"))
    story.append(body("顶部展示 4 个关键指标卡片："))
    dash_cards = [
        "<b>合同编号：</b>系统生成的唯一合同编号 (格式: LTO-AR-YYYY-NNNN)。",
        "<b>年费：</b>当前合同年费金额（欧元）。",
        "<b>合同剩余天数：</b>距合同到期的剩余天数，少于 60 天时标红提醒。",
        "<b>距申报截止天数：</b>距下一年度申报截止日（每年 2 月 15 日）的剩余天数，少于 45 天时标红提醒。",
    ]
    for c in dash_cards:
        story.append(bullet(c))

    story.append(heading3("LUCID 状态区"))
    story.append(body(
        "显示 LUCID 授权确认状态。如果 LUCID 尚未确认，系统会显示警告图标并提供操作指引。"
        "确认完成后，显示绿色对勾和【LUCID 已确认】状态。"
    ))

    story.append(heading3("包装申报数据区"))
    story.append(body(
        "列出您提交的包装材料清单，包括材料类型、销售类型（B2C/B2B）和预估重量。"
        "支持在线更新申报数据（点击【更新申报数据】按钮）。"
    ))

    story.append(heading3("支付记录区"))
    story.append(body(
        "显示所有支付记录，包括金额（人民币/欧元）、支付方式（微信/支付宝）、支付状态（已付/待付）和支付日期。"
        "已开具的发票显示发票编号和金额。"
    ))

    story.append(heading3("快速下载区"))
    story.append(body(
        "提供常用文档的快速下载入口：授权代表合同模板、LUCID 注册指南、费用计算器等。"
    ))

    story.append(heading2("8.3 年度申报提醒"))
    story.append(body(
        "系统自动追踪以下关键截止日期，并通过邮件/微信提前发送提醒："
    ))
    reminders = [
        "<b>数据申报截止：</b>每年 2 月 15 日（提前 60 天提醒）",
        "<b>合同续期提醒：</b>合同到期前 45 天",
        "<b>LUCID 确认提醒：</b>签约后 7 天未确认则提醒",
    ]
    for r in reminders:
        story.append(bullet(r))

    story.append(page_break())

    # ======= CHAPTER 9: FAQ =======
    story.append(heading1("第九章  常见问题"))
    story.append(hr())

    story.append(heading2("9.1 包装法相关"))
    faq_pkg = [
        ("谁需要注册德国包装法？",
         "任何在德国市场上首次投放包装产品的生产商、进口商和跨境电商卖家。2026 年 8 月 12 日起，所有无德国分支机构的厂商必须通过授权代表完成合规。"),
        ("LIVANTO 授权代表和 EASY-LIZE 有什么区别？",
         "EASY-LIZE 是 EKO-PUNKT 旗下的双元系统平台，主要功能是购买包装许可。LIVANTO 是德国本土授权代表 (Authorised Representative)，根据 §35(2) VerpackG 承担您作为生产商的全部法律义务——包括双元系统合同签订、LUCID 数据申报、官方通信等。LIVANTO 的服务范围远超 EASY-LIZE。"),
        ("我已经有 LUCID 注册号了，还需要 LIVANTO 吗？",
         "需要。LUCID 注册是生产商的个人义务（不能委托）。但除此之外的所有义务——系统参与、数据申报、完整性声明——都需要授权代表来完成。2026 年 8 月起这是强制性的。"),
    ]
    for q, a in faq_pkg:
        story.append(Paragraph(f"<b>Q: {q}</b>", ParagraphStyle(
            'FAQ_Q', fontName=FONT_BOLD, fontSize=10, leading=18,
            textColor=PRIMARY, spaceBefore=10, spaceAfter=2,
        )))
        story.append(Paragraph(f"A: {a}", ParagraphStyle(
            'FAQ_A', fontName=FONT_NAME, fontSize=10, leading=17,
            textColor=TEXT, leftIndent=12, spaceAfter=8,
        )))

    story.append(heading2("9.2 电池法相关"))
    faq_bat = [
        ("什么产品需要注册电池法？",
         "任何含有电池或蓄电池的产品（包括不可拆卸电池），以及单独销售的电池和蓄电池。典型产品包括：带电池的玩具、电子温度计、无线耳机、LED 灯带电池等。"),
        ("WEEE 和电池法需要同时注册吗？",
         "如果您的产品是电子电气设备且含有电池，则需要同时注册 WEEE 和电池法。这是两个独立的合规义务。"),
    ]
    for q, a in faq_bat:
        story.append(Paragraph(f"<b>Q: {q}</b>", ParagraphStyle(
            'FAQ_Q', fontName=FONT_BOLD, fontSize=10, leading=18,
            textColor=PRIMARY, spaceBefore=10, spaceAfter=2,
        )))
        story.append(Paragraph(f"A: {a}", ParagraphStyle(
            'FAQ_A', fontName=FONT_NAME, fontSize=10, leading=17,
            textColor=TEXT, leftIndent=12, spaceAfter=8,
        )))

    story.append(heading2("9.3 WEEE 相关"))
    faq_weee = [
        ("哪些产品属于 WEEE 范围？",
         "几乎所有使用电力的产品都属于 WEEE 范围——从大型家电（冰箱、洗衣机）到小型电子产品（手机、耳机）。WEEE 分为 6 大类别，具体可参考第四章的类别表。"),
    ]
    for q, a in faq_weee:
        story.append(Paragraph(f"<b>Q: {q}</b>", ParagraphStyle(
            'FAQ_Q', fontName=FONT_BOLD, fontSize=10, leading=18,
            textColor=PRIMARY, spaceBefore=10, spaceAfter=2,
        )))
        story.append(Paragraph(f"A: {a}", ParagraphStyle(
            'FAQ_A', fontName=FONT_NAME, fontSize=10, leading=17,
            textColor=TEXT, leftIndent=12, spaceAfter=8,
        )))

    story.append(heading2("9.4 通用问题"))
    faq_general = [
        ("注册需要多长时间？",
         "包装法 LUCID 注册：约 1-3 个工作日。电池法 EAR 注册：约 2-4 周。WEEE EAR 注册：约 4-8 周（含破产保障审核）。建议提前至少 2 个月开始准备。"),
        ("不注册会有什么后果？",
         "罚款最高 €200,000；销售禁令（产品被海关扣留/销毁）；亚马逊等平台下架商品、冻结账户、暂停付款；竞争对手发出律师函索赔。"),
    ]
    for q, a in faq_general:
        story.append(Paragraph(f"<b>Q: {q}</b>", ParagraphStyle(
            'FAQ_Q', fontName=FONT_BOLD, fontSize=10, leading=18,
            textColor=PRIMARY, spaceBefore=10, spaceAfter=2,
        )))
        story.append(Paragraph(f"A: {a}", ParagraphStyle(
            'FAQ_A', fontName=FONT_NAME, fontSize=10, leading=17,
            textColor=TEXT, leftIndent=12, spaceAfter=8,
        )))

    story.append(page_break())

    # ======= CHAPTER 10: DOWNLOADS =======
    story.append(heading1("第十章  下载中心"))
    story.append(hr())

    story.append(heading2("10.1 可用资源"))
    story.append(body("下载中心提供以下法律文件和注册模板供免费下载："))

    dl_items = [
        ["LIVANTO 授权代表合同模板 (V2)", "§35(2) VerpackG 授权代表合同 — 德中双语", "可用"],
        ["LUCID 中文注册指南", "逐步截图指导在 ZSVR 完成 LUCID 注册（即将上线）", "即将推出"],
        ["包装材料申报表", "按材料类别填写年度包装量（即将上线）", "即将推出"],
        ["WEEE 注册表模板", "德国 WEEE EAR 注册所需信息", "可用"],
        ["电池法注册表模板", "德国电池法 EAR 注册所需信息", "可用"],
    ]
    t = Table([
        [Paragraph(h, S['table_header']) for h in ["文件名称", "说明", "状态"]],
        *[[Paragraph(c, S['table_cell_left']) for c in row] for row in dl_items]
    ], colWidths=[180, 200, 55], repeatRows=1)
    t.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), PRIMARY),
        ('TEXTCOLOR', (0, 0), (-1, 0), white),
        ('GRID', (0, 0), (-1, -1), 0.5, BORDER),
        ('ROWBACKGROUNDS', (0, 1), (-1, -1), [white, LIGHT_BG]),
        ('FONTNAME', (0, 0), (-1, -1), FONT_NAME),
        ('FONTSIZE', (0, 0), (-1, -1), 9),
        ('TOPPADDING', (0, 0), (-1, -1), 8),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 8),
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
    ]))
    story.append(t)

    story.append(page_break())

    # ======= CHAPTER 11: CONTACT =======
    story.append(heading1("第十一章  联系方式"))
    story.append(hr())

    story.append(heading2("11.1 平台信息"))
    contact_items = [
        ["<b>平台名称</b>", "FREDDY 福瑞笛 — 德国跨境合规平台"],
        ["<b>德国授权代表</b>", "LIVANTO GmbH"],
        ["<b>WEEE/电池法合作伙伴</b>", "WEEE Return GmbH"],
        ["<b>监管机构</b>", "德国 ZSVR (Zentrale Stelle Verpackungsregister)"],
        ["<b>监管机构</b>", "德国 Stiftung EAR (Stiftung Elektro-Altgeräte Register)"],
        ["<b>网站访问</b>", "通过浏览器访问平台网址"],
        ["<b>ICP备案</b>", "皖ICP备2025099866号-1"],
    ]
    for item in contact_items:
        story.append(Paragraph(f"{item[0]}：{item[1]}", ParagraphStyle(
            'Contact', fontName=FONT_NAME, fontSize=10, leading=20,
            textColor=TEXT, leftIndent=12, spaceAfter=3,
        )))

    story.append(spacer(20))

    story.append(heading2("11.2 客服支持"))
    story.append(body(
        "签约用户可通过以下渠道获取客服支持："
    ))
    support_items = [
        "<b>邮箱：</b>使用签约时提供的邮箱发送咨询至平台客服邮箱，我们将在工作时间内回复。",
        "<b>微信：</b>签约时如提供了微信号，客服将主动添加您，提供一对一专属服务。",
        "<b>在线表单：</b>通过网站【在线申报】页面提交 WEEE/电池法注册申请，我们将在 48 小时内处理。",
        "<b>Dashboard 消息：</b>平台将通过合规面板展示提醒和通知。",
    ]
    for s in support_items:
        story.append(bullet(s))

    story.append(spacer(20))

    story.append(heading2("11.3 法律法规参考"))
    law_refs = [
        "欧盟《包装与包装废弃物法规》(PPWR) 2025/40 — 2026年8月12日全面生效",
        "德国《包装法》(Verpackungsgesetz, VerpackG) — 最新修订版",
        "德国《电子电气设备法》(Elektro- und Elektronikgerätegesetz, ElektroG)",
        "德国《电池法》(Batteriegesetz, BattG)",
        "德国 LUCID 包装品登记处: www.verpackungsregister.org",
        "德国 EAR 基金会: www.stiftung-ear.de",
    ]
    for ref in law_refs:
        story.append(bullet(ref))

    story.append(spacer(30))
    story.append(hr())

    # Closing
    story.append(Paragraph(
        "— 本文档由 FREDDY 福瑞笛团队编制，版本 V1.0（2026年6月）—",
        ParagraphStyle('Closing', fontName=FONT_NAME, fontSize=9, leading=16,
                       textColor=TEXT_LIGHT, alignment=TA_CENTER, spaceBefore=12)
    ))
    story.append(Paragraph(
        "如有疑问，请通过签约时获得的客服渠道联系我们。法规信息仅供参考，不构成法律意见。",
        ParagraphStyle('Disclaimer', fontName=FONT_NAME, fontSize=8, leading=13,
                       textColor=TEXT_LIGHT, alignment=TA_CENTER, spaceAfter=6)
    ))

    # ======= BUILD =======
    doc.build(story, canvasmaker=NumberedCanvas)
    return OUTPUT_FILE


if __name__ == "__main__":
    path = build_pdf()
    print(f"\n[SUCCESS] PDF generated: {path}")
    print(f"[SIZE] {os.path.getsize(path) / 1024:.1f} KB")
