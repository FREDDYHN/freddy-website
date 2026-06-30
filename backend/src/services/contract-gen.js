/**
 * FREDDY Contract Generation Service
 *
 * Fills .docx templates with customer data using docxtemplater,
 * preserving 100% of the original formatting (required by EAR).
 *
 * Template mapping:
 *   AR (包装法):     projects/contracts/LIVANTO/VerpackG_Bevollmächtigungsvertrag.docx
 *   WEEE (中国主体): projects/中国主体合同/非德国主体_WEEE合同模板_*.docx
 *   WEEE (德国主体): projects/德国主体合同/德国主体_WEEE合同模板_*.docx
 *   Battery (中国):  projects/中国主体合同/非德国主体_WEEE&电池法合同模板_*.docx
 *   Battery (德国):  projects/德国主体合同/德国主体_WEEE&电池法合同模板_*.docx
 */
import { readFile, writeFile, mkdir, access } from 'fs/promises'
import { constants } from 'fs'
import { dirname, join, extname } from 'path'
import { fileURLToPath } from 'url'
import { execFile } from 'child_process'
import { promisify } from 'util'
import Docxtemplater from 'docxtemplater'
import PizZip from 'pizzip'

const execFileP = promisify(execFile)

const __dirname = dirname(fileURLToPath(import.meta.url))
const rootPath = join(__dirname, '..', '..', '..')
const projectsDir = join(rootPath, 'projects')
const outputDir = join(rootPath, 'projects', 'generated')

// Ensure output directory exists (startup guard)
try { await mkdir(outputDir, { recursive: true }) } catch {}

/** Template paths keyed by contract type + client location */
const TEMPLATES = {
  ar: join(projectsDir, 'contracts', 'LIVANTO', '包装法_授权代表合同.docx'),
  weee_cn: join(projectsDir, '中国主体合同', '非德国主体_WEEE合同模板_Bevollmächtigungsvertrag_Kunde mit Sitz außerhalb von Deutschland_WEEE.docx'),
  weee_de: join(projectsDir, '德国主体合同', '德国主体_WEEE合同模板_Leistungsvertrag_Kunde mit Sitz in Deutschland_WEEE.docx'),
  battery_cn: join(projectsDir, '中国主体合同', '非德国主体_WEEE&电池法合同模板_Bevollmächtigungsvertrag_Kunde mit Sitz außerhalb von Deutschland_WEEE & Batterien.docx'),
  battery_de: join(projectsDir, '德国主体合同', '德国主体_WEEE&电池法合同模板_Leistungsvertrag_Kunde mit Sitz in Deutschland_WEEE & Batterien.docx'),
}

/**
 * Generate a filled .docx contract.
 */
export async function generateContract({ type, clientLocation, data }) {
  const key = type === 'ar' ? 'ar' : `${type}_${clientLocation || 'cn'}`
  const templatePath = TEMPLATES[key]
  if (!templatePath) throw new Error(`No template for: ${key}`)

  try { await access(templatePath, constants.R_OK) } catch { throw new Error(`Template not found: ${templatePath}`) }

  const buf = await readFile(templatePath)
  const zip = new PizZip(buf)
  const doc = new Docxtemplater(zip, { paragraphLoop: true, linebreaks: true })

  // Normalize packaging items once (used in both tags and post-processing)
  const pkgItems = Array.isArray(data.packaging_items)
    ? data.packaging_items.map(p => ({ material: p.material_type||p.material||'', category: p.category||'', kg: String(p.estimated_kg||p.kg||''), example: p.example||'' }))
    : []

  const tags = {
    company_name: data.company_name || data.company || '',
    company_name_en: data.company_name_en || '',
    company_address: data.company_address || data.address || '',
    registered_address_en: data.registered_address_en || '',
    uscc: data.uscc || '',
    legal_representative: data.legal_representative || data.legal_rep || '',
    legal_representative_en: data.legal_representative_en || '',
    contact_person: data.contact_person || data.contact_name || data.contact || '',
    contact_person_en: data.contact_person_en || '',
    contact_email: data.contact_email || data.email || '',
    contact_phone: data.contact_phone || data.phone || '',
    wechat_id: data.wechat_id || '',
    contract_number: data.contract_number || '',
    contract_date: data.contract_date || new Date().toISOString().slice(0, 10),
    start_date: data.start_date || '',
    end_date: data.end_date || '',
    annual_fee_eur: data.annual_fee_eur || data.fee_eur || '',
    device_count: data.device_count || '',
    brand_count: data.brand_count || '',
    device_categories: data.device_categories || '',
    packaging_rows: 'PACKAGING_DATA',
    packaging_items: pkgItems,
    signer_name: data.signer_name || '',
    signer_title: data.signer_title || '',
    sign_date: data.sign_date || new Date().toISOString().slice(0, 10),
    livanto_name: 'LIVANTO GmbH',
    livanto_address: data.livanto_address || '',
    livanto_register: data.livanto_register || '',
  }

  const filledTags = Object.keys(tags).filter(k => tags[k])
  console.log(`[contract-gen] Filling template ${key} with ${filledTags.length} tags: ${filledTags.join(', ')}`)

  try {
    doc.render(tags)
  } catch (e) {
    console.error('[contract-gen] Template render error:', e.message)
    throw new Error(`Template render failed: ${e.message}`)
  }

  const outName = `${key}_${data.contract_number || Date.now().toString(36)}.docx`
  const outPath = join(outputDir, outName)
  const outBuf = doc.getZip().generate({ type: 'nodebuffer' })

  // Post-process: fill header/footer tags (docxtemplater only processes document.xml)
  const headerZip = new PizZip(outBuf)
  let headerModified = false
  if (headerZip.files['word/header1.xml']) {
    let hdrXml = headerZip.files['word/header1.xml'].asText()
    hdrXml = hdrXml.replace(/\{contract_number\}/g, data.contract_number || '')
    headerZip.file('word/header1.xml', hdrXml)
    headerModified = true
  }
  if (headerZip.files['word/footer1.xml']) {
    let ftrXml = headerZip.files['word/footer1.xml'].asText()
    ftrXml = ftrXml.replace(/\{contract_number\}/g, data.contract_number || '')
    headerZip.file('word/footer1.xml', ftrXml)
    headerModified = true
  }
  const processedBuf = headerModified ? headerZip.generate({ type: 'nodebuffer' }) : outBuf

  // Post-process: insert contract number at top-right of first page body
  const bodyZip = new PizZip(processedBuf)
  let bodyXml = bodyZip.files['word/document.xml'].asText()
  const contractNo = data.contract_number || ''
  if (contractNo) {
    // Build a right-aligned paragraph: "合同编号：XXX  |  Vertragsnummer: XXX"
    const escXml = (s) => String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;')
    const topRightPara =
      '<w:p>' +
        '<w:pPr>' +
          '<w:jc w:val="right"/>' +
          '<w:spacing w:after="120"/>' +
          '<w:rPr>' +
            '<w:rFonts w:ascii="Times New Roman" w:hAnsi="Times New Roman" w:eastAsia="宋体" w:cs="Times New Roman"/>' +
            '<w:b/>' +
            '<w:sz w:val="20"/>' +
            '<w:szCs w:val="20"/>' +
            '<w:color w:val="1A237E"/>' +
          '</w:rPr>' +
        '</w:pPr>' +
        '<w:r>' +
          '<w:rPr>' +
            '<w:rFonts w:ascii="Times New Roman" w:hAnsi="Times New Roman" w:eastAsia="宋体" w:cs="Times New Roman"/>' +
            '<w:b/>' +
            '<w:sz w:val="20"/>' +
            '<w:szCs w:val="20"/>' +
            '<w:color w:val="1A237E"/>' +
          '</w:rPr>' +
          '<w:t xml:space="preserve">' + escXml(`合同编号：${contractNo}  |  Vertragsnummer: ${contractNo}`) + '</w:t>' +
        '</w:r>' +
      '</w:p>'
    // Insert right after <w:body>
    const bodyTag = '<w:body>'
    const bodyIdx = bodyXml.indexOf(bodyTag)
    if (bodyIdx >= 0) {
      bodyXml = bodyXml.substring(0, bodyIdx + bodyTag.length) + topRightPara + bodyXml.substring(bodyIdx + bodyTag.length)
      bodyZip.file('word/document.xml', bodyXml)
      console.log(`[contract-gen] Inserted contract number at top-right of first page body: ${contractNo}`)
    }
  }

  // Post-process: fill Anlage B table rows from packaging_items array
  if (pkgItems.length > 0) {
    const outZip = new PizZip(bodyZip.generate({ type: 'nodebuffer' }))
    let outXml = outZip.files['word/document.xml'].asText()
    const marker = outXml.indexOf('PACKAGING_DATA')
    if (marker > 0) {
      // The Anlage B template has ONE <w:tr> containing all cells:
      //   cells 0-3: header (blue fill #1A237E, white bold text)
      //   cells 4-7: data (cell 4 has {packaging_rows}→PACKAGING_DATA, 5-7 empty)
      // We split this into header row + N data rows.

      // Find enclosing <w:tr> boundaries
      let trS = outXml.lastIndexOf('<w:tr', marker)
      const endCheck = outXml.indexOf('</w:tr>', trS + 5)
      if (endCheck > 0 && endCheck < marker) {
        trS = outXml.indexOf('<w:tr', endCheck)
        if (trS < 0 || trS > marker) trS = outXml.lastIndexOf('<w:tr', marker)
      }

      let trE = outXml.indexOf('</w:tr>', marker)
      if (trE < 0) trE = outXml.indexOf('</w:tr>', marker + 100)
      trE += '</w:tr>'.length

      const tplRow = outXml.substring(trS, trE)

      // Split into individual <w:tc>...</w:tc> cells
      const cells = []
      const tcRegex = /<w:tc[\s\S]*?<\/w:tc>/g
      let m
      while ((m = tcRegex.exec(tplRow)) !== null) cells.push(m[0])

      // Find the data cell index (contains PACKAGING_DATA)
      const dataCellIdx = cells.findIndex(c => c.includes('PACKAGING_DATA'))

      if (dataCellIdx >= 0) {
        // Header cells: all cells BEFORE dataCellIdx that have blue fill (1A237E)
        const headerCells = cells.slice(0, dataCellIdx).filter(c => c.includes('1A237E'))

        // Confirmation cells: cells AFTER the 4 data cells (dataCellIdx..dataCellIdx+3)
        const confirmCells = cells.slice(dataCellIdx + 4)

        // Extract cell template parts from the data cell
        const dataCellTpl = cells[dataCellIdx]
        const tcPr = (dataCellTpl.match(/<w:tcPr>[\s\S]*?<\/w:tcPr>/) || [''])[0]
        const paraTpl = (dataCellTpl.match(/<w:p[\s\S]*?<\/w:p>/) || [''])[0]

        // Column widths for the 4 data columns
        const colWidths = ['2600', '1000', '2200', '3955']

        function escXml(s) { return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;') }

        function buildCell(val, colW) {
          return '<w:tc>' +
            tcPr.replace(/<w:tcW w:w="[^"]*"/, '<w:tcW w:w="' + colW + '"') +
            paraTpl.replace(
              /<w:t[^>]*>[^<]*<\/w:t>/,
              '<w:t xml:space="preserve">' + escXml(val) + '</w:t>'
            ) +
            '</w:tc>'
        }

        // Build header row (preserve original blue-fill header cells)
        const headerRow = '<w:tr>' + headerCells.join('') + '</w:tr>'

        // Build data rows
        const dataRows = pkgItems.map(item => {
          const vals = [item.material, item.category, item.kg, item.example]
          return '<w:tr>' + vals.map((v, i) => buildCell(v, colWidths[i])).join('') + '</w:tr>'
        }).join('')

        // Confirmation row: add gridSpan so Word doesn't warp the 4-column grid
        // Confirm cells span 2 grid columns each (2600+1000 and 2200+3955)
        const confirmRow = confirmCells.length > 0
          ? '<w:tr>' + confirmCells.map(c => c.replace(/<w:tcPr>/, '<w:tcPr><w:gridSpan w:val="2"/>')).join('') + '</w:tr>'
          : ''

        outXml = outXml.substring(0, trS) + headerRow + dataRows + confirmRow + outXml.substring(trE)
        outZip.file('word/document.xml', outXml)

        console.log(`[contract-gen] Post-processed ${pkgItems.length} Anlage B rows (header + confirm preserved)`)
      }
    }
    await writeFile(outPath, outZip.generate({ type: 'nodebuffer', compression: 'DEFLATE' }))
  } else {
    await writeFile(outPath, bodyZip.generate({ type: 'nodebuffer', compression: 'DEFLATE' }))
  }
  console.log(`[contract-gen] Generated DOCX: ${outPath}`)

  // Convert to PDF (prevents tampering)
  const pdfPath = outPath.replace(/\.docx$/i, '.pdf')
  try {
    await execFileP('libreoffice', [
      '--headless', '--convert-to', 'pdf',
      '--outdir', outputDir, outPath,
    ], { timeout: 30000 })
    // LibreOffice names the output based on the input filename
    const loPdf = join(outputDir, outName.replace(/\.docx$/i, '.pdf'))
    // If LO used a different path, handle it
    try { await access(loPdf) } catch { /* fall through */ }
    console.log(`[contract-gen] Converted to PDF: ${pdfPath}`)
  } catch (e) {
    console.warn(`[contract-gen] PDF conversion skipped (libreoffice unavailable): ${e.message}`)
    // Return DOCX path as fallback
    return outPath
  }

  return pdfPath
}

/**
 * Get the relative URL path for a generated contract file
 */
export function getContractUrl(filePath) {
  const rel = filePath.replace(rootPath, '').replace(/\\/g, '/')
  return rel.startsWith('/') ? rel : '/' + rel
}

export const contractTemplates = TEMPLATES
