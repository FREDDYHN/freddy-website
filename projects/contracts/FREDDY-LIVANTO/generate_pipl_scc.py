# -*- coding: utf-8 -*-
"""
Generate 个人信息出境标准合同 (PIPL) — FREDDY → LIVANTO.
德中双语（左德右中）。标准条款依据国家网信办《个人信息出境标准合同》官方附件拟定，
正式签署/备案前请对照官方文本核对。中文版本为准。
"""
import os
from docx import Document
from docx.shared import Pt, Mm
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.oxml.ns import qn

# 复用 generate_kooperation 的渲染 helper 与常量
from generate_kooperation import (
    _add_bilingual_table, _add_para, _h, _brow,
    _set_run_font, _fill_cell, _set_cell_border_none, _set_cell_bottom_border,
    OUT_DIR, FONT_DE, FONT_CN, BODY_SIZE, TITLE_SIZE, SUBTITLE_SIZE,
)

OUT_PATH = os.path.join(OUT_DIR, '个人信息出境标准合同_PIPL.docx')
OUT_HTML = os.path.join(OUT_DIR, '个人信息出境标准合同_PIPL.html')

TITLE_DE = 'Standardvertrag für die Übermittlung personenbezogener Informationen ins Ausland'
TITLE_ZH = '个人信息出境标准合同'
SUBTITLE_DE = '(gemäß Artikel 38 des Gesetzes der Volksrepublik China zum Schutz personenbezogener Informationen, PIPL)'
SUBTITLE_ZH = '（依据《中华人民共和国个人信息保护法》第38条）'

PARTIES = [
    ('zwischen', '由'),
    ('(1) FREDDY (SHANGHAI) INFORMATION CONSULTING LTD. HN, Zhonghuan International Plaza, Finanzzentrum 158, 4. Etage, Raum 418, Huainan, Anhui, Volksrepublik China, als Verarbeiter personenbezogener Informationen (Exporteur),',
     '(1) FREDDY (SHANGHAI) INFORMATION CONSULTING LTD. HN（福瑞笛（上海）信息咨询有限公司淮南分公司），地址：中华人民共和国安徽省淮南市中环国际广场158金融中心四层418室，作为个人信息处理者（出境方），'),
    ('und', '与'),
    ('(2) LIVANTO GmbH, Luisenhoffnung 3C, 44225 Dortmund, Deutschland, als Empfänger im Ausland,',
     '(2) LIVANTO 有限责任公司，地址：德国多特蒙德 Luisenhoffnung 3C（邮编 44225），作为境外接收方，'),
    ('– nachfolgend gemeinsam „die Parteien“ genannt –', '—— 以下合称“双方”——'),
]

PREAMBLE = [
    ('Um sicherzustellen, dass die Verarbeitung personenbezogener Informationen durch den Empfänger im Ausland den nach den einschlägigen Gesetzen und Vorschriften der Volksrepublik China geltenden Datenschutzstandards entspricht, und um die Rechte und Pflichten des Verarbeiters personenbezogener Informationen und des Empfängers im Ausland festzulegen, schließen die Parteien nach einvernehmlicher Vereinbarung diesen Vertrag.',
     '为了确保境外接收方处理个人信息的活动达到中华人民共和国相关法律法规规定的个人信息保护标准，明确个人信息处理者和境外接收方个人信息保护的权利和义务，经双方协商一致，订立本合同。'),
]

SECTIONS = [
    {
        'title': ('Artikel 1  Begriffsbestimmungen', '第一条  定义'),
        'rows': [
            ('„Personenbezogene Informationen“ bezeichnet Informationen, die sich auf identifizierte oder identifizierbare natürliche Personen beziehen und in elektronischer oder sonstiger Form aufgezeichnet sind, mit Ausnahme anonymisierter Informationen.',
             '“个人信息”指以电子或者其他方式记录的与已识别或者可识别的自然人有关的各种信息，不包括匿名化处理后的信息。'),
            ('„Sensible personenbezogene Informationen“ bezeichnet personenbezogene Informationen, deren Durchsickern oder unrechtmäßige Nutzung geeignet ist, die persönliche Würde zu verletzen oder die Sicherheit von Person oder Vermögen zu gefährden, einschließlich biometrischer, religiöser, gesundheitlicher und Finanzkonten betreffender Informationen sowie Standortdaten.',
             '“敏感个人信息”指一旦泄露或者非法使用，容易导致自然人的人格尊严受到侵害或者人身、财产安全受到危害的个人信息，包括生物识别、宗教信仰、特定身份、医疗健康、金融账户、行踪轨迹等信息，以及不满十四周岁未成年人的个人信息。'),
            ('„Verarbeiter personenbezogener Informationen“ bezeichnet die Organisation oder Person, die in der Verarbeitungstätigkeit die Verarbeitungszwecke und -methoden selbstständig bestimmt und personenbezogene Informationen ins Ausland übermittelt.',
             '“个人信息处理者”指在个人信息处理活动中自主决定处理目的、处理方式的，向中华人民共和国境外提供个人信息的组织、个人。'),
            ('„Empfänger im Ausland“ bezeichnet die Organisation oder Person, die außerhalb der Volksrepublik China personenbezogene Informationen vom Verarbeiter personenbezogener Informationen entgegennimmt.',
             '“境外接收方”指在中华人民共和国境外自个人信息处理者处接收个人信息的组织、个人。'),
            ('„Betroffene Person“ bezeichnet die natürliche Person, auf die sich die personenbezogenen Informationen beziehen.',
             '“个人信息主体”指个人信息所识别或者关联的自然人。'),
            ('„Aufsichtsbehörde“ bezeichnet die Cyberspace-Verwaltungsbehörden der Volksrepublik China auf Provinzebene oder darüber.',
             '“监管机构”指中华人民共和国省级以上网信部门。'),
        ],
    },
    {
        'title': ('Artikel 2  Pflichten des Verarbeiters personenbezogener Informationen', '第二条  个人信息处理者的义务'),
        'rows': [
            ('(1) Der Verarbeiter verarbeitet personenbezogene Informationen rechtmäßig und beschränkt die ins Ausland übermittelten Informationen auf das für den Verarbeitungszweck erforderliche Minimum.',
             '(1) 个人信息处理者按照相关法律法规规定处理个人信息，向境外提供的个人信息仅限于实现处理目的所需的最小范围。'),
            ('(2) Der Verarbeiter informiert die betroffene Person über Name, Kontaktdaten des Empfängers im Ausland sowie Verarbeitungszweck, -methode, Kategorien und Aufbewahrungsdauer gemäß Anlage I; bei sensiblen Informationen zusätzlich über die Notwendigkeit und die Auswirkungen auf die Rechte.',
             '(2) 个人信息处理者向个人信息主体告知境外接收方的名称或者姓名、联系方式，以及附录一中的处理目的、处理方式、个人信息的种类、保存期限等事项；涉及敏感个人信息的，还应当告知其必要性以及对个人权益的影响。'),
            ('(3) Beruht die Übermittlung auf Einwilligung, holt der Verarbeiter die gesonderte Einwilligung der betroffenen Person ein; bei Minderjährigen unter 14 Jahren die gesonderte Einwilligung der Eltern oder des Vormunds.',
             '(3) 基于个人同意向境外提供个人信息的，应当取得个人信息主体的单独同意；涉及不满十四周岁未成年人个人信息的，应当取得其父母或者其他监护人的单独同意。'),
            ('(4) Der Verarbeiter informiert die betroffene Person darüber, dass sie durch diesen Vertrag als Drittbegünstigte Rechte genießt, sofern sie nicht binnen 30 Tagen widerspricht.',
             '(4) 个人信息处理者向个人信息主体告知其与境外接收方通过本合同约定个人信息主体为第三方受益人，如个人信息主体未在30日内明确拒绝，则可依据本合同享有第三方受益人的权利。'),
            ('(5) Der Verarbeiter unternimmt angemessene Anstrengungen, um sicherzustellen, dass der Empfänger im Ausland technische und organisatorische Maßnahmen ergreift.',
             '(5) 个人信息处理者尽合理努力确保境外接收方采取技术和管理措施，以履行合同义务。'),
            ('(6) Der Verarbeiter führt vor der Übermittlung eine Datenschutz-Folgenabschätzung (Personal Information Protection Impact Assessment) durch und bewahrt den Bericht mindestens drei Jahre auf.',
             '(6) 个人信息处理者按照相关法律法规对拟向境外提供个人信息的活动开展个人信息保护影响评估，并保存评估报告至少三年。'),
            ('(7) Der Verarbeiter beantwortet Anfragen der Aufsichtsbehörde und stellt der betroffenen Person auf Verlangen eine Kopie dieses Vertrages zur Verfügung.',
             '(7) 个人信息处理者答复监管机构关于境外接收方个人信息处理活动的询问，并根据个人信息主体的要求向其提供本合同副本。'),
        ],
    },
    {
        'title': ('Artikel 3  Pflichten des Empfängers im Ausland', '第三条  境外接收方的义务'),
        'rows': [
            ('(1) Der Empfänger verarbeitet die personenbezogenen Informationen ausschließlich gemäß der in Anlage I festgelegten Zwecke, Methoden und Kategorien; eine darüber hinausgehende Verarbeitung bedarf der gesonderten Einwilligung der betroffenen Person.',
             '(1) 境外接收方按照附录一“个人信息出境说明”所列约定处理个人信息；超出约定目的、方式、种类的，应当事先取得个人信息主体的单独同意。'),
            ('(2) Der Empfänger wendet die die Rechte der betroffenen Person am wenigsten beeinträchtigende Verarbeitungsweise an und löscht die Informationen nach Ablauf der Aufbewahrungsdauer einschließlich aller Sicherungskopien.',
             '(2) 境外接收方采取对个人权益影响最小的方式处理个人信息，保存期限届满后删除个人信息（包括所有备份）。'),
            ('(3) Der Empfänger ergreift technische und organisatorische Maßnahmen (z. B. Verschlüsselung, Anonymisierung, Zugriffskontrolle) und stellt ein Berechtigungskonzept nach dem Prinzip der geringsten Rechte sicher.',
             '(3) 境外接收方采取技术和管理措施（如加密、匿名化、去标识化、访问控制等），并建立最小授权的访问控制权限。'),
            ('(4) Bei einer Sicherheitsverletzung ergreift der Empfänger unverzüglich Abhilfemaßnahmen, benachrichtigt den Verarbeiter und meldet den Vorfall nach den geltenden Vorschriften.',
             '(4) 发生或者可能发生个人信息安全事件时，境外接收方应当及时采取补救措施，立即通知个人信息处理者，并依法报告监管机构、按要求通知个人信息主体、记录并留存相关情况。'),
            ('(5) Gibt der Empfänger Informationen an Dritte im Ausland weiter, bedarf dies einer Geschäftsnotwendigkeit, der Information der betroffenen Person, der gesonderten Einwilligung und einer schriftlichen Vereinbarung mit dem Dritten.',
             '(5) 境外接收方向境外第三方提供个人信息的，需同时满足确有业务需要、已告知个人信息主体、取得单独同意、与第三方达成书面协议确保保护标准等条件。'),
            ('(6) Eine weitere Unterbeauftragung der Verarbeitung bedarf der vorherigen Zustimmung des Verarbeiters und der Überwachung des Unterauftragnehmers.',
             '(6) 境外接收方转委托第三方处理的，须事先征得个人信息处理者同意，并对第三方进行监督。'),
            ('(7) Der Empfänger benennt einen Kontakt zur Beantwortung von Anfragen und Beschwerden betroffener Personen und teilt dessen Kontaktdaten dem Verarbeiter und den betroffenen Personen mit.',
             '(7) 境外接收方确定一名联系人，授权其答复个人信息处理的询问或投诉，并将联系人信息告知个人信息处理者和个人信息主体。'),
        ],
    },
    {
        'title': ('Artikel 4  Auswirkungen ausländischer Rechtsvorschriften', '第四条  境外接收方所在国家或地区的个人信息保护政策和法规对标准合同履行的影响'),
        'rows': [
            ('(1) Die Parteien versichern, dass ihnen bei Vertragsschluss keine Rechtsvorschriften des Sitzlandes des Empfängers bekannt sind, die die Erfüllung dieses Vertrages beeinträchtigen.',
             '(1) 双方保证在合同订立时已尽合理注意义务，未发现境外接收方所在国家或地区的个人信息保护政策和法规影响境外接收方履行本合同义务。'),
            ('(2) Der Empfänger informiert den Verarbeiter unverzüglich, wenn sich die Rechtslage seines Sitzlandes ändert oder Behörden Zugang zu den übermittelten Informationen verlangen.',
             '(2) 境外接收方所在国家或地区的政策法规发生变化导致其无法履行合同的，或接到所在国政府部门、司法机构关于提供合同项下个人信息要求的，应立即通知个人信息处理者。'),
            ('(3) Die Parteien dokumentieren die Bewertung der Rechtslage und deren Ergebnis.',
             '(3) 双方应记录评估过程和结果。'),
        ],
    },
    {
        'title': ('Artikel 5  Rechte der betroffenen Person', '第五条  个人信息主体的权利'),
        'rows': [
            ('(1) Die betroffene Person hat das Recht auf Auskunft, Berichtigung, Ergänzung, Löschung und Erläuterung der Verarbeitungsregeln sowie das Recht, die Verarbeitung einzuschränken oder abzulehnen.',
             '(1) 个人信息主体对其个人信息的处理享有知情权、决定权，有权限制或者拒绝他人处理其个人信息，有权要求查阅、复制、更正、补充、删除其个人信息，有权要求对其个人信息处理规则进行解释说明。'),
            ('(2) Die betroffene Person kann ihre Rechte gegenüber dem Verarbeiter oder unmittelbar gegenüber dem Empfänger geltend machen.',
             '(2) 个人信息主体可以请求个人信息处理者采取适当措施实现，或直接向境外接收方提出请求。'),
            ('(3) Der Empfänger setzt die Rechte der betroffenen Person in angemessener Frist um und informiert diese klar und verständlich; bei Ablehnung nennt er die Gründe und die Beschwerdewege.',
             '(3) 境外接收方应在合理期限内实现个人信息主体依法享有的权利；拒绝请求的，应告知拒绝原因及向监管机构投诉和寻求司法救济的途径。'),
            ('(4) Die betroffene Person ist Drittbegünstigte dieses Vertrages und kann die ihr zustehenden Rechte gegenüber beiden Parteien geltend machen.',
             '(4) 个人信息主体作为本合同的第三方受益人，有权向个人信息处理者和境外接收方的一方或双方主张并履行本合同中与其权利相关的条款。'),
        ],
    },
    {
        'title': ('Artikel 6  Rechtsbehelfe', '第六条  救济'),
        'rows': [
            ('(1) Der Empfänger benennt eine Kontaktperson und teilt deren Kontaktdaten dem Verarbeiter und den betroffenen Personen mit.',
             '(1) 境外接收方确定一名联系人，并将联系人信息告知个人信息处理者和个人信息主体。'),
            ('(2) Bei Streitigkeiten mit betroffenen Personen arbeiten die Parteien zusammen, um die Streitigkeit zu lösen.',
             '(2) 一方因履行本合同与个人信息主体发生争议的，应当通知另一方，双方应合作解决争议。'),
            ('(3) Die betroffene Person kann Beschwerde bei der Aufsichtsbehörde einlegen oder nach Maßgabe des chinesischen Zivilprozessrechts Klage vor dem zuständigen Gericht erheben.',
             '(3) 个人信息主体可以依据本合同向监管机构投诉，或向有管辖权的法院提起诉讼。'),
        ],
    },
    {
        'title': ('Artikel 7  Vertragsbeendigung', '第七条  合同解除'),
        'rows': [
            ('(1) Verletzt der Empfänger seine Pflichten oder kann er den Vertrag wegen Rechtsänderungen nicht erfüllen, kann der Verarbeiter die Übermittlung aussetzen, bis der Verstoß behoben oder der Vertrag beendet ist.',
             '(1) 境外接收方违反合同义务或所在国家或地区的政策法规发生变化导致其无法履行合同的，个人信息处理者可以暂停向境外接收方提供个人信息，直至违约行为改正或合同解除。'),
            ('(2) Der Verarbeiter kann den Vertrag insbesondere beenden, wenn die Aussetzung länger als einen Monat andauert oder der Empfänger schwerwiegend oder wiederholt vertragsbrüchig ist.',
             '(2) 暂停提供个人信息超过一个月、境外接收方严重或持续违约等情形下，个人信息处理者有权解除合同。'),
            ('(3) Nach Beendigung des Vertrages gibt der Empfänger die empfangenen personenbezogenen Informationen einschließlich aller Kopien zurück oder löscht sie.',
             '(3) 合同解除后，境外接收方应当返还或者删除根据本合同接收的个人信息（包括备份）。'),
        ],
    },
    {
        'title': ('Artikel 8  Haftung', '第八条  违约责任'),
        'rows': [
            ('(1) Jede Partei haftet der anderen für Schäden, die durch eine Vertragsverletzung entstehen.',
             '(1) 双方应就其违反本合同给对方造成的损失承担责任。'),
            ('(2) Verletzt eine Partei durch einen Vertragsverstoß die Rechte betroffener Personen, haftet sie diesen gegenüber zivilrechtlich; gesetzliche verwaltungs- und strafrechtliche Folgen bleiben unberührt.',
             '(2) 任何一方因违约侵害个人信息主体权利的，应对个人信息主体承担民事法律责任，不影响相关法律法规规定的行政、刑事等法律责任。'),
        ],
    },
    {
        'title': ('Artikel 9  Sonstiges', '第九条  其他'),
        'rows': [
            ('(1) Bei Widersprüchen zwischen diesem Vertrag und anderen zwischen den Parteien geschlossenen Vereinbarungen gehen die Bestimmungen dieses Vertrages vor.',
             '(1) 如本合同与双方订立的任何其他法律文件发生冲突，本合同条款优先适用。'),
            ('(2) Auf die Begründung, Wirksamkeit, Erfüllung und Auslegung dieses Vertrages sowie auf Streitigkeiten aus diesem Vertrag findet das Recht der Volksrepublik China Anwendung.',
             '(2) 本合同的成立、效力、履行、解释及因本合同引起的双方争议，适用中华人民共和国相关法律法规。'),
            ('(3) Dieser Vertrag tritt mit Unterzeichnung durch beide Parteien in Kraft.',
             '(3) 本合同自双方签署之日起生效。'),
        ],
    },
]

# 附录一：个人信息出境说明
ANLAGE1_TITLE = ('Anlage I: Beschreibung der Übermittlung personenbezogener Informationen ins Ausland', '附录一：个人信息出境说明')
ANLAGE1_ROWS = [
    ('Verarbeiter personenbezogener Informationen (Exporteur): FREDDY (SHANGHAI) INFORMATION CONSULTING LTD. HN, Zhonghuan International Plaza, Finanzzentrum 158, 4. Etage, Raum 418, Huainan, Anhui, Volksrepublik China.',
     '个人信息处理者（出境方）：FREDDY (SHANGHAI) INFORMATION CONSULTING LTD. HN（福瑞笛（上海）信息咨询有限公司淮南分公司），地址：中华人民共和国安徽省淮南市中环国际广场158金融中心四层418室。'),
    ('Empfänger im Ausland: LIVANTO GmbH, Luisenhoffnung 3C, 44225 Dortmund, Deutschland.',
     '境外接收方：LIVANTO 有限责任公司，地址：德国多特蒙德 Luisenhoffnung 3C（邮编 44225）。'),
    ('Kategorien betroffener Personen: Kontaktpersonen und gesetzliche Vertreter der Kunden (chinesische Hersteller).',
     '个人信息主体类别：客户（中国制造商）的联系人及法定代表人。'),
    ('Kategorien personenbezogener Informationen: Name, Firma, Anschrift, E-Mail-Adresse, Telefonnummer, WeChat-ID, Steuernummer, Verpackungsdaten.',
     '个人信息种类：姓名、公司名称、地址、电子邮箱、电话号码、微信号、税号、包装数据。'),
    ('Zweck der Verarbeitung: Erbringung von Bevollmächtigungsleistungen nach dem deutschen Verpackungsgesetz (LUCID-Registrierung, Beteiligung am dualen System, Datenmeldung, Vollständigkeitserklärung).',
     '处理目的：履行德国《包装法》授权代表服务（LUCID 注册、双元系统参与、数据申报、完整性声明）。'),
    ('Methode der Verarbeitung: elektronische Erfassung, Speicherung und Übermittlung der Daten.',
     '处理方式：个人信息的电子化记录、存储与传输。'),
    ('Aufbewahrungsdauer: für die Dauer des Bevollmächtigungsvertrages mit dem jeweiligen Kunden zuzüglich der gesetzlichen Aufbewahrungspflichten.',
     '保存期限：客户授权代表合同存续期间及法定保存义务期间。'),
    ('Ort der Speicherung: Deutschland.',
     '保存地点：德国。'),
    ('Sensible personenbezogene Informationen: keine.',
     '敏感个人信息：无。'),
]

# 附录二：其他约定（可留空/补充）
ANLAGE2_TITLE = ('Anlage II: Weitere Vereinbarungen der Parteien', '附录二：双方约定的其他条款')
ANLAGE2_ROWS = [
    ('Die Parteien treffen über die vorstehenden Bestimmungen hinaus keine weiteren, diesem Vertrag widersprechenden Vereinbarungen.',
     '除上述条款外，双方未作出其他与本合同相冲突的约定。'),
]

SIGN_TITLE = ('Unterzeichnung', '签署')
SIGN_ROWS = [
    ('Verarbeiter personenbezogener Informationen (Exporteur)\nFREDDY (SHANGHAI) INFORMATION CONSULTING LTD. HN\n\nOrt / Datum: ____________________\n\nUnterschrift / Stempel:', '个人信息处理者（出境方）\nFREDDY (SHANGHAI) INFORMATION CONSULTING LTD. HN\n（福瑞笛（上海）信息咨询有限公司淮南分公司）\n\n地点 / 日期：____________________\n\n签字 / 盖章：'),
    ('Empfänger im Ausland\nLIVANTO GmbH\nDortmund\n\nOrt / Datum: ____________________\n\nUnterschrift / Stempel:', '境外接收方\nLIVANTO 有限责任公司\n多特蒙德\n\n地点 / 日期：____________________\n\n签字 / 盖章：'),
]


def _build_sections(doc):
    for s in SECTIONS:
        t = _add_bilingual_table(doc, [(s['title'][0], s['title'][1])], bold_rows=True)
        for c in t.rows[0].cells:
            _set_cell_bottom_border(c)
        _add_bilingual_table(doc, s['rows'])
        sp = doc.add_paragraph()
        sp.paragraph_format.space_after = Pt(2)


def build():
    doc = Document()
    sec = doc.sections[0]
    sec.page_width = Mm(210)
    sec.page_height = Mm(297)
    sec.left_margin = Mm(19.4)
    sec.right_margin = Mm(19.4)
    sec.top_margin = Mm(22.9)
    sec.bottom_margin = Mm(22.9)
    style = doc.styles['Normal']
    style.font.name = FONT_DE
    style.font.size = BODY_SIZE
    style.element.rPr.rFonts.set(qn('w:eastAsia'), FONT_CN)

    _add_para(doc, TITLE_DE, size=TITLE_SIZE, bold=True, align=WD_ALIGN_PARAGRAPH.CENTER, space_after=2)
    _add_para(doc, TITLE_ZH, size=TITLE_SIZE, bold=True, align=WD_ALIGN_PARAGRAPH.CENTER, space_after=8)
    _add_para(doc, SUBTITLE_DE, size=SUBTITLE_SIZE, align=WD_ALIGN_PARAGRAPH.CENTER, space_after=2)
    _add_para(doc, SUBTITLE_ZH, size=SUBTITLE_SIZE, align=WD_ALIGN_PARAGRAPH.CENTER, space_after=12)

    _add_bilingual_table(doc, PARTIES)
    _add_para(doc, '', space_after=2)
    _add_bilingual_table(doc, PREAMBLE)
    _add_para(doc, '', space_after=2)

    _build_sections(doc)

    # 附录一
    t = _add_bilingual_table(doc, [ANLAGE1_TITLE], bold_rows=True)
    for c in t.rows[0].cells:
        _set_cell_bottom_border(c)
    _add_bilingual_table(doc, ANLAGE1_ROWS)
    _add_para(doc, '', space_after=2)

    # 附录二
    t = _add_bilingual_table(doc, [ANLAGE2_TITLE], bold_rows=True)
    for c in t.rows[0].cells:
        _set_cell_bottom_border(c)
    _add_bilingual_table(doc, ANLAGE2_ROWS)
    _add_para(doc, '', space_after=2)

    # 签署
    _add_bilingual_table(doc, [SIGN_TITLE], bold_rows=True)
    _add_bilingual_table(doc, SIGN_ROWS)

    doc.save(OUT_PATH)
    print('Generated:', OUT_PATH)


def build_html():
    css = """
    :root { --ink:#1a1a2e; --muted:#6b7280; --line:#cbd5e1; }
    * { box-sizing: border-box; }
    body { margin:0; background:#eef0f3; font-family:"Times New Roman","SimSun","宋体",serif; color:var(--ink); line-height:1.65; }
    .contract { max-width:960px; margin:24px auto; background:#fff; padding:56px 64px; box-shadow:0 2px 24px rgba(0,0,0,.12); }
    .title-de { text-align:center; font-size:22px; font-weight:700; margin:0 0 4px; }
    .title-zh { text-align:center; font-size:21px; font-weight:700; margin:0 0 14px; }
    .subtitle { text-align:center; font-size:13px; color:var(--muted); margin:0 0 30px; }
    .brow { display:grid; grid-template-columns:1fr 1fr; gap:36px; padding:6px 0; font-size:13.5px; }
    .brow.title { grid-template-columns:1fr 1fr; gap:36px; padding:16px 0 8px; margin-top:12px; border-bottom:1.5px solid var(--line); font-weight:700; font-size:14.5px; }
    .brow.title .de, .brow.title .zh { font-weight:700; }
    .sign-wrap { margin-top:36px; }
    .sign-grid { display:grid; grid-template-columns:1fr 1fr; gap:36px; }
    .sign-box { border-top:1px solid var(--line); padding-top:14px; font-size:13.5px; }
    .sign-box .de, .sign-box .zh { white-space:pre-line; }
    @media print {
      body { background:#fff; }
      .contract { box-shadow:none; margin:0; max-width:none; padding:0 12mm; }
    }
    """
    parts = []
    parts.append('<!DOCTYPE html><html lang="zh"><head><meta charset="UTF-8">')
    parts.append('<meta name="viewport" content="width=device-width, initial-scale=1.0">')
    parts.append(f'<title>{_h(TITLE_ZH)}</title>')
    parts.append(f'<style>{css}</style></head><body><div class="contract">')
    parts.append(f'<div class="title-de">{_h(TITLE_DE)}</div>')
    parts.append(f'<div class="title-zh">{_h(TITLE_ZH)}</div>')
    parts.append(f'<div class="subtitle">{_h(SUBTITLE_DE)}<br>{_h(SUBTITLE_ZH)}</div>')
    for de, zh in PARTIES:
        parts.append(_brow(de, zh))
    for de, zh in PREAMBLE:
        parts.append(_brow(de, zh))
    for s in SECTIONS:
        parts.append(_brow(s['title'][0], s['title'][1], title=True))
        for de, zh in s['rows']:
            parts.append(_brow(de, zh))
    parts.append(_brow(*ANLAGE1_TITLE, title=True))
    for de, zh in ANLAGE1_ROWS:
        parts.append(_brow(de, zh))
    parts.append(_brow(*ANLAGE2_TITLE, title=True))
    for de, zh in ANLAGE2_ROWS:
        parts.append(_brow(de, zh))
    parts.append(_brow(*SIGN_TITLE, title=True))
    parts.append('<div class="sign-wrap"><div class="sign-grid">')
    for de, zh in SIGN_ROWS:
        parts.append(f'<div class="sign-box"><div class="de">{_h(de)}</div><div class="zh">{_h(zh)}</div></div>')
    parts.append('</div></div>')
    parts.append('</div></body></html>')
    with open(OUT_HTML, 'w', encoding='utf-8') as f:
        f.write('\n'.join(parts))
    print('Generated:', OUT_HTML)


if __name__ == '__main__':
    build()
    build_html()
