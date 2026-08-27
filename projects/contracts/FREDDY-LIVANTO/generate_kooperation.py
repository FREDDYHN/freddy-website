# -*- coding: utf-8 -*-
"""
Generate Kooperationsvereinbarung FREDDY–LIVANTO (DE/CN bilingual, left DE / right CN).

Reusable: re-run to regenerate the .docx. Edit the SECTIONS data below to adjust content.
"""
from docx import Document
from docx.shared import Pt, Mm, RGBColor
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.enum.table import WD_TABLE_ALIGNMENT
from docx.oxml.ns import qn
from docx.oxml import OxmlElement
import os

OUT_DIR = os.path.dirname(os.path.abspath(__file__))
OUT_PATH = os.path.join(OUT_DIR, 'Kooperationsvereinbarung_FREDDY-LIVANTO.docx')
OUT_HTML = os.path.join(OUT_DIR, 'Kooperationsvereinbarung_FREDDY-LIVANTO.html')

# ══════════════════════════════════════════════
#  CONTENT
# ══════════════════════════════════════════════

TITLE_DE = 'Kooperationsvereinbarung'
TITLE_ZH = '合作协议'
SUBTITLE_DE = 'über die Zusammenarbeit im Bereich der Bevollmächtigung nach dem Verpackungsgesetz (VerpackG) / Verpackungsrecht-Durchführungsgesetz (VerpackDG)'
SUBTITLE_ZH = '关于《德国包装法》（VerpackG）/《包装法实施法》（VerpackDG）授权代表业务的合作'

# 抬头双方（zwischen ... und ...）
PARTIES = [
    ('zwischen', '由'),
    ('(1) LIVANTO GmbH, Luisenhoffnung 3C, 44225 Dortmund, Deutschland, eingetragen im Handelsregister des Amtsgerichts Dortmund unter HRB 38628, Umsatzsteuer-Identifikationsnummer DE 464031041, vertreten durch ihren Geschäftsführer Zifeng Qian, – als Auftraggeberin –',
     '(1) LIVANTO 有限责任公司，地址：德国多特蒙德 Luisenhoffnung 3C（邮编 44225），于多特蒙德地方法院商业登记处登记（登记号 HRB 38628），增值税识别号 DE 464031041，由总经理钱子风代表 —— 作为委托方 ——'),
    ('– nachfolgend „LIVANTO“ genannt –,', '—— 以下称“LIVANTO”——，'),
    ('und', '与'),
    ('(2) FREDDY (SHANGHAI) INFORMATION CONSULTING LTD. HN, Zweigniederlassung Huainan, Nr. 21, Longhu Road, Huainan, Anhui, Volksrepublik China, handelnd durch ihre Hauptniederlassung FREDDY (SHANGHAI) INFORMATION CONSULTING LTD., – als Auftragnehmerin –',
     '(2) FREDDY (SHANGHAI) INFORMATION CONSULTING LTD. HN（福瑞笛（上海）信息咨询有限公司淮南分公司），地址：中华人民共和国安徽省淮南市龙湖路21号，由其总公司福瑞笛（上海）信息咨询有限公司授权行事 —— 作为受托方 ——'),
    ('– nachfolgend „FREDDY“ genannt –,', '—— 以下称“福瑞笛”——，'),
    ('– LIVANTO und FREDDY gemeinsam nachfolgend auch „Parteien“ genannt –', '—— LIVANTO 与福瑞笛以下合称“双方”——'),
]

# 序言
PREAMBLE_TITLE = ('Präambel', '序言')
PREAMBLE = [
    ('(1) LIVANTO ist berechtigt, als Bevollmächtigter gemäß § 35 Absatz 2 VerpackG (ab dem 12. August 2026 nach Maßgabe des Verpackungsrecht-Durchführungsgesetzes, VerpackDG) die verpackungsrechtlichen Pflichten für Hersteller ohne Niederlassung in Deutschland zu übernehmen.',
     '(1) LIVANTO 有权依据《德国包装法》第35条第2款（自2026年8月12日起按《包装法实施法》VerpackDG 的规定）为在德国无分支机构的制造商承担包装法义务，担任授权代表。'),
    ('(2) FREDDY ist im chinesischsprachigen Raum in der Markterschließung, Kundenbetreuung und Zahlungsabwicklung tätig und verfügt über ein Online-Portal sowie ein Netzwerk chinesischer Hersteller.',
     '(2) 福瑞笛在中文地区从事市场拓展、客户维护和支付处理，拥有在线门户及中国制造商网络。'),
    ('(3) Die Parteien beabsichtigen, im Bereich der Verpackungsgesetz-Bevollmächtigung zusammenzuarbeiten, wobei FREDDY die markt- und kundenseitigen Leistungen und LIVANTO die rechtlichen und regulatorischen Leistungen in Deutschland erbringt. Die Parteien vereinbaren hierzu die nachfolgende Aufteilung der Aufgaben und der Umsätze.',
     '(3) 双方拟在包装法授权代表领域开展合作：由福瑞笛提供市场及客户侧服务，由 LIVANTO 提供德国境内法律及监管服务。为此，双方就职责与营收的划分达成如下约定。'),
]

# 各章节（title 左德右中 + rows 正文）
SECTIONS = [
    {
        'title': ('§ 1  Vertragsparteien', '§ 1  合同双方'),
        'rows': [
            ('(1) LIVANTO verfügt über eine eingerichtete Niederlassung im Sinne des § 4 Absatz 3 GewO in Deutschland und ist als Bevollmächtigter im Verpackungsregister LUCID registriert (Bevollmächtigten-ID: DE8514687609035).',
             '(1) LIVANTO 在德国设有符合《营业条例》（GewO）第4条第3款规定的经营机构，并已在包装品登记处 LUCID 注册为授权代表（授权代表ID：DE8514687609035）。'),
            ('(2) FREDDY handelt als Zweigniederlassung Huainan der FREDDY (SHANGHAI) INFORMATION CONSULTING LTD. („FREDDY (SHANGHAI) INFORMATION CONSULTING LTD. HN“) und ist von ihrer Hauptniederlassung zur Unterzeichnung und Durchführung dieser Vereinbarung ermächtigt.',
             '(2) 福瑞笛作为福瑞笛（上海）信息咨询有限公司的淮南分公司（FREDDY (SHANGHAI) INFORMATION CONSULTING LTD. HN）行事，并获其总公司授权签署和履行本合同。'),
        ],
    },
    {
        'title': ('§ 2  Vertragsgegenstand und Zweck', '§ 2  合同标的与目的'),
        'rows': [
            ('(1) Gegenstand dieser Vereinbarung ist die Zusammenarbeit der Parteien bei der Erbringung von Bevollmächtigungsleistungen nach dem VerpackG/VerpackDG gegenüber Kunden mit Sitz außerhalb von Deutschland.',
             '(1) 本合同标的为双方在向德国境外的客户提供《包装法》/《包装法实施法》授权代表服务方面的合作。'),
            ('(2) Zweck der Zusammenarbeit ist es, die von den Parteien jeweils erbrachten Leistungen zu bündeln: FREDDY erbringt die markt- und kundenseitigen Leistungen (Marketing, Vertrieb, Kundenbetreuung, Zahlungsabwicklung), LIVANTO erbringt die rechtlichen und regulatorischen Leistungen (Bevollmächtigung, Systembeteiligung, Datenmeldung, Behördenkorrespondenz).',
             '(2) 合作目的是整合双方各自提供的服务：福瑞笛提供市场及客户侧服务（市场推广、销售、客户维护、支付处理），LIVANTO 提供法律及监管服务（授权代表、系统参与、数据申报、官方通信）。'),
            ('(3) Diese Vereinbarung begründet keine Gesellschaft bürgerlichen Rechts (§ 705 BGB) und kein gemeinsames Handeln als Gesamtschuldner; jede Partei handelt im eigenen Namen und auf eigene Rechnung.',
             '(3) 本合同不构成《德国民法典》第705条意义上的民事合伙，也不构成连带责任共同经营；双方均以自身名义、自负盈亏行事。'),
        ],
    },
    {
        'title': ('§ 3  Aufgabenverteilung', '§ 3  职责划分'),
        'rows': [
            ('(1) LIVANTO übernimmt insbesondere folgende Aufgaben:\na) Übernahme sämtlicher verpackungsrechtlicher Pflichten als Bevollmächtigter nach § 35 Absatz 2 VerpackG/VerpackDG;\nb) Abschluss und Aufrechterhaltung der Systembeteiligungsverträge mit dualen Systemen;\nc) Datenmeldung an die ZSVR und, soweit erforderlich, Abgabe von Vollständigkeitserklärungen;\nd) Entgegennahme behördlicher Mitteilungen und Bescheide;\ne) Beobachtung und Kommunikation wesentlicher Änderungen der gesetzlichen Rahmenbedingungen.',
             '(1) LIVANTO 特别承担以下任务：\na) 作为授权代表依据《包装法》/《包装法实施法》第35条第2款承担全部包装法义务；\nb) 与双元系统签订并维持系统参与合同；\nc) 向 ZSVR 进行数据申报，并在必要时提交完整性声明；\nd) 接收主管部门的通知和决定；\ne) 跟踪并传达法律框架的重大变更。'),
            ('(2) FREDDY übernimmt insbesondere folgende Aufgaben:\na) Markterschließung und Kundenakquise im chinesischsprachigen Raum;\nb) Kundenbetreuung, Kundenservice und laufende Kommunikation mit den Kunden;\nc) Betrieb und Pflege des Online-Portals sowie der Vertrags- und Zahlungsabwicklung;\nd) Einziehung sämtlicher von den Kunden zu leistenden Zahlungen und Weiterleitung gemäß § 4.',
             '(2) 福瑞笛特别承担以下任务：\na) 中文地区的市场拓展与客户开发；\nb) 客户维护、客户服务及与客户的日常沟通；\nc) 在线门户的运营与维护，以及合同与支付处理；\nd) 代收客户应付的全部款项，并按第4条转付。'),
        ],
    },
    {
        'title': ('§ 4  Umsatzbeteiligung', '§ 4  营收分成'),
        'rows': [
            ('(1) Die Parteien teilen die Umsätze aus den Jahresgrundgebühren der Bevollmächtigungsverträge (Servicestufen Basis EUR 29,00, Standard EUR 49,00, Premium EUR 79,00 pro Jahr) im Verhältnis von 50 % zu 50 %.',
             '(1) 双方按 50%:50% 的比例分享授权代表合同的年度基本费用收入（服务等级：基础 29.00欧元/年、标准 49.00欧元/年、高级 79.00欧元/年）。'),
            ('(2) Die an die dualen Systeme zu entrichtenden Lizenzentgelte (Systembeteiligungsgebühren) sind durchlaufende Posten. Sie werden nicht geteilt und von LIVANTO in tatsächlicher Höhe ohne Aufschlag an die jeweiligen dualen Systeme weitergeleitet.',
             '(2) 应向双元系统支付的许可费用（系统参与费）为代收代付项目，不参与分成，由 LIVANTO 按实际金额、不加价转付给相应双元系统。'),
            ('(3) Zusätzliche Servicegebühren (z. B. ZSVR-Klassifizierungsantrag, Bearbeitungsgebühr Vollständigkeitserklärung, Mahngebühren) werden ebenfalls im Verhältnis 50 % zu 50 % geteilt.',
             '(3) 附加服务费（如 ZSVR 分类申请、完整性声明手续费、催款费等）同样按 50%:50% 的比例分成。'),
        ],
    },
    {
        'title': ('§ 5  Abrechnung und Zahlung', '§ 5  结算与支付'),
        'rows': [
            ('(1) FREDDY zieht sämtliche von den Kunden zu leistenden Zahlungen ein.',
             '(1) 福瑞笛代收客户应付的全部款项。'),
            ('(2) Die Abrechnung erfolgt kalenderquartalsweise. FREDDY erstellt jeweils nach Ablauf eines Kalenderquartals eine Abrechnung über die im Quartal vereinnahmten Jahresgrundgebühren und übermittelt diese LIVANTO.',
             '(2) 结算按自然季度进行。福瑞笛于每个自然季度结束后编制该季度实收年度基本费用的结算单，并提交给 LIVANTO。'),
            ('(3) FREDDY überweist LIVANTO 50 % der im Quartal vereinnahmten Jahresgrundgebühren. FREDDY stellt sicher, dass LIVANTO den Betrag in Euro gutgeschrieben erhält. Bei der Servicestufe Basis (EUR 29,00/Jahr) entspricht dies EUR 14,50 pro Kunde und Jahr.',
             '(3) 福瑞笛将季度内实收年度基本费用的 50% 转账给 LIVANTO。福瑞笛应确保 LIVANTO 以欧元到账。就基础服务等级（29.00欧元/年）而言，相当于每个客户每年 14.50 欧元。'),
            ('(4) Für die Umrechnung von CNY in EUR gilt der Wechselkurs am Tag der Überweisung, mindestens jedoch der Devisenmittelkurs der Bank of China an diesem Tag.',
             '(4) 人民币兑换欧元的汇率按转账当日的汇率计算，且不低于当日中国银行外汇中间价。'),
            ('(5) LIVANTO ist berechtigt, die Abrechnung von FREDDY zu prüfen. FREDDY stellt LIVANTO hierzu auf Anforderung die erforderlichen Belege zur Verfügung.',
             '(5) LIVANTO 有权审核福瑞笛的结算单。福瑞笛应根据要求向 LIVANTO 提供所需凭证。'),
        ],
    },
    {
        'title': ('§ 6  Pflichten der LIVANTO', '§ 6  LIVANTO 的义务'),
        'rows': [
            ('(1) LIVANTO erbringt die in § 3 Absatz 1 genannten Leistungen fachgerecht und im Einklang mit dem jeweils geltenden Verpackungsrecht.',
             '(1) LIVANTO 专业、合规地履行第3条第1款所述服务，并符合现行包装法规定。'),
            ('(2) LIVANTO hält ihre Registrierung als Bevollmächtigter im Verpackungsregister LUCID während der gesamten Laufzeit aufrecht.',
             '(2) LIVANTO 在整个合同期内维持其在包装品登记处 LUCID 的授权代表注册。'),
            ('(3) LIVANTO informiert FREDDY über wesentliche Änderungen der gesetzlichen Rahmenbedingungen, die die Kunden betreffen.',
             '(3) LIVANTO 就涉及客户的重大法律框架变更通知福瑞笛。'),
        ],
    },
    {
        'title': ('§ 7  Pflichten des FREDDY', '§ 7  福瑞笛的义务'),
        'rows': [
            ('(1) FREDDY erbringt die in § 3 Absatz 2 genannten Leistungen mit der Sorgfalt eines ordentlichen Kaufmanns.',
             '(1) 福瑞笛以诚实商人的审慎履行第3条第2款所述服务。'),
            ('(2) FREDDY zieht die Kundenbeträge rechtzeitig ein und führt die Abrechnung gemäß § 5 durch.',
             '(2) 福瑞笛及时代收客户款项，并按第5条进行结算。'),
            ('(3) FREDDY informiert LIVANTO unverzüglich über für die Bevollmächtigung erhebliche Kundenangaben und über Änderungen im Kundenbestand.',
             '(3) 福瑞笛应立即将影响授权的重要客户信息及客户变动情况告知 LIVANTO。'),
        ],
    },
    {
        'title': ('§ 8  Haftung', '§ 8  责任'),
        'rows': [
            ('(1) Jede Partei haftet für die von ihr erbrachten Leistungen nach den gesetzlichen Vorschriften.',
             '(1) 双方各自就其提供的服务依法承担责任。'),
            ('(2) Die Haftung einer Partei ist – außer bei Vorsatz, grober Fahrlässigkeit sowie bei der Verletzung von Leben, Körper oder Gesundheit – auf den typischen, vorhersehbaren Schaden begrenzt.',
             '(2) 除故意、重大过失以及侵害生命、身体或健康的情形外，一方的责任限于典型的、可预见的损害。'),
            ('(3) Eine Partei haftet nicht für Pflichtverletzungen der jeweils anderen Partei gegenüber Dritten. Die Parteien stellen einander von Ansprüchen Dritter frei, soweit diese aus dem Verantwortungsbereich der jeweils anderen Partei stammen.',
             '(3) 一方不对另一方对第三方的违约承担责任。对于源于对方责任范围的第三方索赔，双方相互使对方免责。'),
        ],
    },
    {
        'title': ('§ 9  Geheimhaltung', '§ 9  保密'),
        'rows': [
            ('(1) Die Parteien verpflichten sich, alle im Rahmen der Zusammenarbeit erlangten vertraulichen Informationen, insbesondere Kundendaten und Geschäftsgeheimnisse, vertraulich zu behandeln und nur zur Durchführung dieser Vereinbarung zu verwenden.',
             '(1) 双方承诺对合作过程中获知的所有保密信息，特别是客户数据和商业秘密，予以保密，并仅用于履行本合同。'),
            ('(2) Die Geheimhaltungspflicht gilt nicht für Informationen, die offenkundig sind oder deren Offenlegung gesetzlich vorgeschrieben ist.',
             '(2) 保密义务不适用于已公开的信息或法律要求披露的信息。'),
            ('(3) Die Geheimhaltungspflicht besteht über die Beendigung dieser Vereinbarung hinaus fort.',
             '(3) 保密义务在本合同终止后继续有效。'),
        ],
    },
    {
        'title': ('§ 10  Datenschutz', '§ 10  数据保护'),
        'rows': [
            ('(1) Die Parteien verarbeiten personenbezogene Daten ausschließlich zur Durchführung dieser Vereinbarung und im Einklang mit der Datenschutz-Grundverordnung (DSGVO).',
             '(1) 双方仅为本合同履行之目的，并依据《通用数据保护条例》（GDPR）处理个人数据。'),
            ('(2) Soweit personenbezogene Daten zwischen der Volksrepublik China und Deutschland übermittelt werden, erfolgt dies auf Grundlage der EU-Standardvertragsklauseln gemäß Durchführungsbeschluss (EU) 2021/914 der Europäischen Kommission (SCC) sowie ergänzend der geltenden chinesischen Datenschutzbestimmungen (PIPL).',
             '(2) 凡个人数据在中华人民共和国与德国之间传输，基于欧盟委员会执行决定 (EU) 2021/914 项下的欧盟标准合同条款（SCC），并补充适用中国《个人信息保护法》（PIPL）的相关规定。'),
            ('(3) Die Parteien treffen geeignete technische und organisatorische Maßnahmen zum Schutz personenbezogener Daten gemäß Art. 32 DSGVO.',
             '(3) 双方依据 GDPR 第32条采取适当的技术和组织措施保护个人数据。'),
        ],
    },
    {
        'title': ('§ 11  Geistiges Eigentum', '§ 11  知识产权'),
        'rows': [
            ('(1) Sämtliche Rechte an den von einer Partei vor Abschluss dieser Vereinbarung geschaffenen Werken, Marken, Logos und sonstigen Schutzgegenständen verbleiben bei der jeweiligen Partei.',
             '(1) 一方在本合同签订前已拥有的作品、商标、标识及其他受保护客体的全部权利，归该方所有。'),
            ('(2) Neu geschaffene Schutzrechte stehen der Partei zu, die sie geschaffen hat. Eine gemeinsame Nutzung bedarf einer gesonderten schriftlichen Vereinbarung.',
             '(2) 新产生的知识产权归创造该知识产权的一方所有。共同使用需另行书面约定。'),
        ],
    },
    {
        'title': ('§ 12  Laufzeit und Kündigung', '§ 12  期限与终止'),
        'rows': [
            ('(1) Diese Vereinbarung tritt mit Unterzeichnung und Stempelung durch beide Parteien in Kraft und wird zunächst für die Dauer von einem Jahr geschlossen.',
             '(1) 本合同自双方签字盖章之日起生效，初始期限为一年。'),
            ('(2) Die Vereinbarung verlängert sich jeweils automatisch um ein weiteres Jahr, sofern sie nicht von einer Partei mit einer Frist von drei Monaten vor Ablauf der jeweiligen Laufzeit schriftlich gekündigt wird.',
             '(2) 本合同自动续期一年，除非一方在相应期限届满前三个月书面通知终止。'),
            ('(3) Das Recht zur außerordentlichen Kündigung aus wichtigem Grund bleibt unberührt.',
             '(3) 因重大事由特别终止的权利不受影响。'),
            ('(4) Mit Beendigung der Vereinbarung sind bereits abgeschlossene und begonnene Kundenverträge durch LIVANTO bis zum jeweiligen Vertragsende ordnungsgemäß fortzuführen; die Umsatzbeteiligung nach § 4 gilt für diese Kundenverträge fort, bis diese enden.',
             '(4) 合同终止后，已签订及已开始的客户合同由 LIVANTO 正常履行至各客户合同期满；就这些客户合同，第4条的营收分成继续适用至其终止。'),
        ],
    },
    {
        'title': ('§ 13  Schlussbestimmungen', '§ 13  最终条款'),
        'rows': [
            ('(1) Änderungen und Ergänzungen dieser Vereinbarung bedürfen der Schriftform (§ 126 BGB). Dies gilt auch für die Aufhebung des Schriftformerfordernisses.',
             '(1) 本合同的修改和补充需采用书面形式（《德国民法典》第126条），书面形式的取消亦需书面形式。'),
            ('(2) Sollte eine Bestimmung dieser Vereinbarung unwirksam sein oder werden, bleibt die Wirksamkeit der übrigen Bestimmungen unberührt. Die unwirksame Bestimmung ist durch eine wirksame Bestimmung zu ersetzen, die dem wirtschaftlichen Zweck der unwirksamen Bestimmung am nächsten kommt.',
             '(2) 本合同的任何条款如无效或失效，不影响其余条款的效力。无效条款应以最接近其经济目的的有效条款替代。'),
            ('(3) Es gilt ausschließlich das Recht der Bundesrepublik Deutschland unter Ausschluss des UN-Kaufrechts (CISG) und der Kollisionsnormen des internationalen Privatrechts.',
             '(3) 适用法律仅为德意志联邦共和国法律，排除联合国国际货物销售合同公约（CISG）和国际私法的冲突规范。'),
            ('(4) Gerichtsstand für alle Streitigkeiten aus oder im Zusammenhang mit dieser Vereinbarung ist der Sitz von LIVANTO (Dortmund), soweit gesetzlich zulässig.',
             '(4) 因本合同产生或与本合同相关的全部争议，在法律允许的范围内由 LIVANTO 所在地（多特蒙德）法院管辖。'),
            ('(5) Diese Vereinbarung ist in deutscher und chinesischer Sprache abgefasst. Bei Auslegungszweifeln oder Widersprüchen zwischen den Sprachfassungen ist die deutsche Fassung maßgeblich. Die chinesische Übersetzung dient ausschließlich dem besseren Verständnis.',
             '(5) 本合同以德文和中文两种语言起草。如语言版本之间存在解释疑问或矛盾，以德文版本为准。中文翻译仅供参考。'),
        ],
    },
]

SIGN_TITLE = ('Unterzeichnung', '签署')
SIGN_ROWS = [
    ('LIVANTO GmbH\nDortmund\n\nOrt / Datum: ____________________\n\nUnterschrift / Stempel:', 'LIVANTO 有限责任公司\n多特蒙德\n\n地点 / 日期：____________________\n\n签字 / 盖章：'),
    ('FREDDY (SHANGHAI) INFORMATION CONSULTING LTD. HN\nZweigniederlassung Huainan\n\nOrt / Datum: ____________________\n\nUnterschrift / Stempel:', 'FREDDY (SHANGHAI) INFORMATION CONSULTING LTD. HN\n（福瑞笛（上海）信息咨询有限公司淮南分公司）\n\n地点 / 日期：____________________\n\n签字 / 盖章：'),
]


# ══════════════════════════════════════════════
#  RENDER HELPERS
# ══════════════════════════════════════════════

FONT_DE = 'Times New Roman'
FONT_CN = '宋体'
BODY_SIZE = Pt(10.5)
TITLE_SIZE = Pt(15)
SUBTITLE_SIZE = Pt(11)
SECTION_TITLE_SIZE = Pt(11)


def _set_run_font(run, size=BODY_SIZE, bold=False, color=None):
    run.font.name = FONT_DE
    run.font.size = size
    run.font.bold = bold
    if color:
        run.font.color.rgb = RGBColor(*color)
    rpr = run._element.get_or_add_rPr()
    rfonts = rpr.get_or_add_rFonts()
    rfonts.set(qn('w:ascii'), FONT_DE)
    rfonts.set(qn('w:hAnsi'), FONT_DE)
    rfonts.set(qn('w:eastAsia'), FONT_CN)
    rfonts.set(qn('w:cs'), FONT_DE)


def _add_para(doc, text, size=BODY_SIZE, bold=False, align=WD_ALIGN_PARAGRAPH.LEFT, space_after=4, space_before=0, color=None):
    p = doc.add_paragraph()
    p.alignment = align
    p.paragraph_format.space_after = Pt(space_after)
    p.paragraph_format.space_before = Pt(space_before)
    run = p.add_run(text)
    _set_run_font(run, size=size, bold=bold, color=color)
    return p


def _set_cell_border_none(cell):
    """Remove all borders on a cell (used to make tables look borderless)."""
    tcPr = cell._tc.get_or_add_tcPr()
    borders = tcPr.find(qn('w:tcBorders'))
    if borders is None:
        borders = OxmlElement('w:tcBorders')
        tcPr.append(borders)
    for edge in ('top', 'left', 'bottom', 'right', 'insideH', 'insideV'):
        el = OxmlElement('w:' + edge)
        el.set(qn('w:val'), 'nil')
        borders.append(el)


def _set_cell_bottom_border(cell, color='999999', sz='4'):
    """Set a thin bottom border (for section-title separator)."""
    tcPr = cell._tc.get_or_add_tcPr()
    borders = tcPr.find(qn('w:tcBorders'))
    if borders is None:
        borders = OxmlElement('w:tcBorders')
        tcPr.append(borders)
    for edge in ('top', 'left', 'right', 'insideH', 'insideV'):
        el = OxmlElement('w:' + edge)
        el.set(qn('w:val'), 'nil')
        borders.append(el)
    el = OxmlElement('w:bottom')
    el.set(qn('w:val'), 'single')
    el.set(qn('w:sz'), sz)
    el.set(qn('w:color'), color)
    borders.append(el)


def _fill_cell(cell, text, bold=False, size=BODY_SIZE):
    lines = text.split('\n')
    # use the first paragraph for line 0, drop any stray empty runs
    p = cell.paragraphs[0]
    for r in list(p.runs):
        r._element.getparent().remove(r._element)
    for extra in cell.paragraphs[1:]:
        extra._element.getparent().remove(extra._element)
    p.paragraph_format.space_after = Pt(2)
    p.paragraph_format.space_before = Pt(0)
    run = p.add_run(lines[0])
    _set_run_font(run, size=size, bold=bold)
    for line in lines[1:]:
        np = cell.add_paragraph()
        np.paragraph_format.space_after = Pt(2)
        np.paragraph_format.space_before = Pt(0)
        run = np.add_run(line)
        _set_run_font(run, size=size, bold=bold)


def _add_bilingual_table(doc, rows, bold_rows=False):
    """rows: list of (de, zh). Two-column table, left DE / right CN."""
    table = doc.add_table(rows=len(rows), cols=2)
    table.alignment = WD_TABLE_ALIGNMENT.CENTER
    table.autofit = False
    for ri, (de, zh) in enumerate(rows):
        c_de, c_zh = table.rows[ri].cells
        _fill_cell(c_de, de, bold=bold_rows)
        _fill_cell(c_zh, zh, bold=bold_rows)
        c_de.width = Mm(85)
        c_zh.width = Mm(85)
        _set_cell_border_none(c_de)
        _set_cell_border_none(c_zh)
    # set table width
    tbl = table._tbl
    tblPr = tbl.tblPr
    tblW = tblPr.find(qn('w:tblW'))
    if tblW is None:
        tblW = OxmlElement('w:tblW')
        tblPr.append(tblW)
    tblW.set(qn('w:type'), 'dxa')
    tblW.set(qn('w:w'), str(int(171.2 / 2.54 * 1440)))  # ~ full content width in twips
    return table


def _add_section(doc, title_de, title_zh, rows):
    # section title row (bold, with bottom border)
    t = _add_bilingual_table(doc, [(title_de, title_zh)], bold_rows=True)
    for c in t.rows[0].cells:
        _set_cell_bottom_border(c)
    # body rows
    _add_bilingual_table(doc, rows)
    # spacer
    sp = doc.add_paragraph()
    sp.paragraph_format.space_after = Pt(2)


# ══════════════════════════════════════════════
#  BUILD DOCUMENT
# ══════════════════════════════════════════════

def build():
    doc = Document()
    # page setup A4 + margins matching reference contract
    sec = doc.sections[0]
    sec.page_width = Mm(210)
    sec.page_height = Mm(297)
    sec.left_margin = Mm(19.4)
    sec.right_margin = Mm(19.4)
    sec.top_margin = Mm(22.9)
    sec.bottom_margin = Mm(22.9)

    # default style font
    style = doc.styles['Normal']
    style.font.name = FONT_DE
    style.font.size = BODY_SIZE
    style.element.rPr.rFonts.set(qn('w:eastAsia'), FONT_CN)

    # title
    _add_para(doc, TITLE_DE, size=TITLE_SIZE, bold=True, align=WD_ALIGN_PARAGRAPH.CENTER, space_after=2)
    _add_para(doc, TITLE_ZH, size=TITLE_SIZE, bold=True, align=WD_ALIGN_PARAGRAPH.CENTER, space_after=8)
    _add_para(doc, SUBTITLE_DE, size=SUBTITLE_SIZE, align=WD_ALIGN_PARAGRAPH.CENTER, space_after=2)
    _add_para(doc, SUBTITLE_ZH, size=SUBTITLE_SIZE, align=WD_ALIGN_PARAGRAPH.CENTER, space_after=12)

    # parties
    _add_bilingual_table(doc, PARTIES)
    _add_para(doc, '', space_after=2)

    # preamble
    _add_bilingual_table(doc, [PREAMBLE_TITLE], bold_rows=True)
    _add_bilingual_table(doc, PREAMBLE)
    _add_para(doc, '', space_after=2)

    # sections
    for s in SECTIONS:
        _add_section(doc, s['title'][0], s['title'][1], s['rows'])

    # signature
    _add_bilingual_table(doc, [SIGN_TITLE], bold_rows=True)
    _add_bilingual_table(doc, SIGN_ROWS)

    doc.save(OUT_PATH)
    print('Generated:', OUT_PATH)


# ══════════════════════════════════════════════
#  HTML RENDER (browser preview)
# ══════════════════════════════════════════════

def _h(s):
    return (s.replace('&', '&amp;').replace('<', '&lt;').replace('>', '&gt;').replace('"', '&quot;')).replace('\n', '<br>')


def _brow(de, zh, title=False):
    cls = 'brow title' if title else 'brow'
    return f'<div class="{cls}"><div class="de">{_h(de)}</div><div class="zh">{_h(zh)}</div></div>'


def build_html():
    css = """
    :root { --ink:#1a1a2e; --muted:#6b7280; --line:#cbd5e1; }
    * { box-sizing: border-box; }
    body { margin:0; background:#eef0f3; font-family:"Times New Roman","SimSun","宋体",serif; color:var(--ink); line-height:1.65; }
    .contract { max-width:960px; margin:24px auto; background:#fff; padding:56px 64px; box-shadow:0 2px 24px rgba(0,0,0,.12); }
    .title-de { text-align:center; font-size:24px; font-weight:700; margin:0 0 4px; }
    .title-zh { text-align:center; font-size:22px; font-weight:700; margin:0 0 14px; }
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
    parts.append('<!DOCTYPE html><html lang="de"><head><meta charset="UTF-8">')
    parts.append('<meta name="viewport" content="width=device-width, initial-scale=1.0">')
    parts.append(f'<title>{_h(TITLE_DE)} / {_h(TITLE_ZH)}</title>')
    parts.append(f'<style>{css}</style></head><body><div class="contract">')
    parts.append(f'<div class="title-de">{_h(TITLE_DE)}</div>')
    parts.append(f'<div class="title-zh">{_h(TITLE_ZH)}</div>')
    parts.append(f'<div class="subtitle">{_h(SUBTITLE_DE)}<br>{_h(SUBTITLE_ZH)}</div>')
    # parties
    for de, zh in PARTIES:
        parts.append(_brow(de, zh))
    # preamble
    parts.append(_brow(*PREAMBLE_TITLE, title=True))
    for de, zh in PREAMBLE:
        parts.append(_brow(de, zh))
    # sections
    for s in SECTIONS:
        parts.append(_brow(s['title'][0], s['title'][1], title=True))
        for de, zh in s['rows']:
            parts.append(_brow(de, zh))
    # signature
    parts.append(_brow(*SIGN_TITLE, title=True))
    parts.append('<div class="sign-wrap"><div class="sign-grid">')
    for de, zh in SIGN_ROWS:
        parts.append(f'<div class="sign-box"><div class="de">{_h(de)}</div><div class="zh">{_h(zh)}</div></div>')
    parts.append('</div></div>')
    parts.append('</div></body></html>')
    html = '\n'.join(parts)
    with open(OUT_HTML, 'w', encoding='utf-8') as f:
        f.write(html)
    print('Generated:', OUT_HTML)


if __name__ == '__main__':
    build()
    build_html()
