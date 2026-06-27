/**
 * FREDDY Contract Generation Service
 *
 * Fills .docx templates with customer data using docxtemplater,
 * preserving 100% of the original formatting (required by EAR).
 *
 * Template mapping:
 *   AR (包装法):     projects/contracts/LIVANTO/Bevollmächtigungsvertrag_03.docx
 *   WEEE (中国主体): projects/中国主体合同/非德国主体_WEEE合同模板_*.docx
 *   WEEE (德国主体): projects/德国主体合同/德国主体_WEEE合同模板_*.docx
 *   Battery (中国):  projects/中国主体合同/非德国主体_WEEE&电池法合同模板_*.docx
 *   Battery (德国):  projects/德国主体合同/德国主体_WEEE&电池法合同模板_*.docx
 */
import { readFile, writeFile, mkdir, access } from 'fs/promises'
import { constants } from 'fs'
import { dirname, join } from 'path'
import { fileURLToPath } from 'url'
import Docxtemplater from 'docxtemplater'
import PizZip from 'pizzip'

const __dirname = dirname(fileURLToPath(import.meta.url))
const rootPath = join(__dirname, '..', '..', '..')
const projectsDir = join(rootPath, 'projects')
const outputDir = join(rootPath, 'projects', 'generated')

// Ensure output directory exists (startup guard)
try { await mkdir(outputDir, { recursive: true }) } catch {}

/** Template paths keyed by contract type + client location */
const TEMPLATES = {
  ar: join(projectsDir, 'contracts', 'LIVANTO', 'VerpackG_Bevollmächtigungsvertrag.docx'),
  weee_cn: join(projectsDir, '中国主体合同', '非德国主体_WEEE合同模板_Bevollmächtigungsvertrag_Kunde mit Sitz außerhalb von Deutschland_WEEE.docx'),
  weee_de: join(projectsDir, '德国主体合同', '德国主体_WEEE合同模板_Leistungsvertrag_Kunde mit Sitz in Deutschland_WEEE.docx'),
  battery_cn: join(projectsDir, '中国主体合同', '非德国主体_WEEE&电池法合同模板_Bevollmächtigungsvertrag_Kunde mit Sitz außerhalb von Deutschland_WEEE & Batterien.docx'),
  battery_de: join(projectsDir, '德国主体合同', '德国主体_WEEE&电池法合同模板_Leistungsvertrag_Kunde mit Sitz in Deutschland_WEEE & Batterien.docx'),
}

/**
 * Generate a filled .docx contract.
 *
 * @param {Object} opts
 * @param {string} opts.type - 'ar' | 'weee' | 'battery'
 * @param {string} opts.clientLocation - 'cn' (non-German) | 'de' (German)
 * @param {Object} opts.data - key-value pairs to fill into the template
 * @returns {string} Path to the generated .docx file
 */
export async function generateContract({ type, clientLocation, data }) {
  const key = type === 'ar' ? 'ar' : `${type}_${clientLocation || 'cn'}`
  const templatePath = TEMPLATES[key]
  if (!templatePath) throw new Error(`No template for: ${key}`)

  // Check template exists (async)
  try { await access(templatePath, constants.R_OK) } catch { throw new Error(`Template not found: ${templatePath}`) }

  const buf = await readFile(templatePath)
  const zip = new PizZip(buf)
  const doc = new Docxtemplater(zip, {
    paragraphLoop: true,
    linebreaks: true,
  })

  // Normalize packaging items once (used in both tags and post-processing)
  const pkgItems = Array.isArray(data.packaging_items)
    ? data.packaging_items.map(p => ({ material: p.material_type||p.material||'', category: p.category||'', kg: String(p.estimated_kg||p.kg||''), example: p.example||'' }))
    : []

  // Map common field names to template placeholders
  const tags = {
    // Company info
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
    // Contract info
    contract_number: data.contract_number || '',
    contract_date: data.contract_date || new Date().toISOString().slice(0, 10),
    start_date: data.start_date || '',
    end_date: data.end_date || '',
    annual_fee_eur: data.annual_fee_eur || data.fee_eur || '',
    // WEEE/Battery specific
    device_count: data.device_count || '',
    brand_count: data.brand_count || '',
    device_categories: data.device_categories || '',
    packaging_rows: 'PACKAGING_DATA', // placeholder for post-processing
    packaging_items: pkgItems,
    // Signature
    signer_name: data.signer_name || '',
    signer_title: data.signer_title || '',
    sign_date: data.sign_date || new Date().toISOString().slice(0, 10),
    // LIVANTO info
    livanto_name: 'LIVANTO GmbH',
    livanto_address: data.livanto_address || '',
    livanto_register: data.livanto_register || '',
  }

  // Log which tags were actually filled (non-empty) for debugging template mismatches
  const filledTags = Object.keys(tags).filter(k => tags[k])
  console.log(`[contract-gen] Filling template ${key} with ${filledTags.length} tags: ${filledTags.join(', ')}`)
  // Debug: log Chinese content
  if (tags.company_name) console.log(`[contract-gen] company_name='${tags.company_name}' (len=${tags.company_name.length})`)
  if (tags.company_address) console.log(`[contract-gen] company_address='${tags.company_address}' (len=${tags.company_address.length})`)

  try {
    doc.render(tags)
  } catch (e) {
    console.error('[contract-gen] Template render error:', e.message)
    throw new Error(`Template render failed: ${e.message}`)
  }

  const outName = `${key}_${data.contract_number || Date.now().toString(36)}.docx`
  const outPath = join(outputDir, outName)
  const outBuf = doc.getZip().generate({ type: 'nodebuffer' })

  // Post-process: fill Anlage B table rows from packaging_items array
  if (pkgItems.length > 0) {
    const outZip = new PizZip(outBuf)
    let outXml = outZip.files['word/document.xml'].asText()
    const marker = outXml.indexOf('PACKAGING_DATA')
    if (marker > 0) {
      // Locate the <w:tr> that contains the marker row.
      // The data row in the template is ONE <w:tr> with one <w:tc> containing
      // {packaging_rows} and three empty <w:tc> cells.
      // After docxtemplater, the tag becomes the literal text "PACKAGING_DATA".

      // Find the enclosing <w:tr> by walking backwards from the marker
      let trS = outXml.lastIndexOf('<w:tr', marker)
      // Verify we got the right one — there should be no </w:tr> between trS and marker
      const endCheck = outXml.indexOf('</w:tr>', trS + 5)
      if (endCheck > 0 && endCheck < marker) {
        // The <w:tr we found closes before the marker — look for the next one
        trS = outXml.indexOf('<w:tr', endCheck)
        if (trS < 0 || trS > marker) trS = outXml.lastIndexOf('<w:tr', marker)
      }

      let trE = outXml.indexOf('</w:tr>', marker)
      if (trE < 0) trE = outXml.indexOf('</w:tr>', marker + 100)
      trE += '</w:tr>'.length

      // Extract the cell containing PACKAGING_DATA as a template for building new cells
      const tcS = outXml.lastIndexOf('<w:tc', marker)
      const tcE = outXml.indexOf('</w:tc>', marker) + '</w:tc>'.length
      const cellTpl = outXml.substring(tcS, tcE)

      // Extract the paragraph from the cell (contains font/style info)
      const pS = cellTpl.indexOf('<w:p')
      const pE = cellTpl.lastIndexOf('</w:p>') + '</w:p>'.length
      const paraTpl = cellTpl.substring(pS, pE)

      // Column widths for the 4-column Anlage B table
      const colWidths = ['2600', '1000', '2200', '3955']

      // Build a cell XML string for a given value and column width
      function buildCell(val, colW) {
        return '<w:tc>' +
          cellTpl.substring(
            cellTpl.indexOf('<w:tcPr>'),
            cellTpl.indexOf('</w:tcPr>') + '</w:tcPr>'.length
          ).replace(/<w:tcW w:w="[^"]*"/, '<w:tcW w:w="' + colW + '"') +
          paraTpl.replace(
            /<w:t[^>]*>[^<]*<\/w:t>/,
            '<w:t xml:space="preserve">' + val + '</w:t>'
          ) +
          '</w:tc>'
      }

      // Build all data rows
      const rows = pkgItems.map(item => {
        const vals = [item.material, item.category, item.kg, item.example]
        return '<w:tr>' + vals.map((v, i) => buildCell(v, colWidths[i])).join('') + '</w:tr>'
      }).join('')

      outXml = outXml.substring(0, trS) + rows + outXml.substring(trE)
      outZip.file('word/document.xml', outXml)

      console.log(`[contract-gen] Post-processed ${pkgItems.length} Anlage B rows`)
    } else {
      console.log('[contract-gen] PACKAGING_DATA marker not found, skipping post-processing')
    }
    await writeFile(outPath, outZip.generate({ type: 'nodebuffer', compression: 'DEFLATE' }))
  } else {
    await writeFile(outPath, outBuf)
  }
  console.log(`[contract-gen] Generated: ${outPath}`)
  return outPath
}

/**
 * Get the relative URL path for a generated contract file
 */
export function getContractUrl(filePath) {
  const rel = filePath.replace(rootPath, '').replace(/\\/g, '/')
  return rel.startsWith('/') ? rel : '/' + rel
}

export const contractTemplates = TEMPLATES
