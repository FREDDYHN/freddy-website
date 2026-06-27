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
    packaging_items: Array.isArray(data.packaging_items)
      ? data.packaging_items.map(p => ({ material: p.material_type || p.material || '', category: p.category || '', kg: p.estimated_kg || p.kg || '', example: p.example || '' }))
      : (data.packaging_items || ''),
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
  await writeFile(outPath, doc.getZip().generate({ type: 'nodebuffer' }))
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
