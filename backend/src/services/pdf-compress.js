/**
 * 上传 PDF 自动压缩（Ghostscript /printer → 300 DPI 彩色，保留红章）
 *
 * 根因：客户回传的盖章扫描件是 600 DPI 彩色 / 手机拍照原图，单个 50-99M，
 * 内容却只是黑字 + 红章，24 位全彩纯属浪费。用 /printer 压到 300 DPI 彩色，
 * 体积降到 ~1/7，文字与红章肉眼无差（已用真实扫描件验证 90M → 12M）。
 *
 * 只对 >10MB 的 PDF 生效（平台自生成的文本 PDF 都远小于此，不碰）；
 * gs 缺失 / 超时 / 失败则保留原文件，不阻断上传。
 */
import { execFile } from 'child_process'
import { promisify } from 'util'
import { statSync, unlinkSync, renameSync, existsSync } from 'fs'

const execFileAsync = promisify(execFile)

/** 只压缩超过 10MB 的 PDF（大扫描件的特征） */
const SIZE_THRESHOLD = 10 * 1024 * 1024

/** 是否为 PDF（按 mime，扩展名兜底，防客户端 mime 误报） */
export function isPdf(file) {
  const mime = (file.mimetype || '').toLowerCase()
  const name = (file.originalname || '').toLowerCase()
  return mime === 'application/pdf' || name.endsWith('.pdf')
}

/**
 * 若 filePath 是超过阈值的 PDF，则压缩并覆盖原文件，返回最终文件大小（字节）。
 * 不做任何事 / 失败时返回原始大小。
 */
export async function compressPdfIfLarge(filePath) {
  const originalSize = statSync(filePath).size
  if (originalSize <= SIZE_THRESHOLD) return originalSize

  const tmpPath = `${filePath}.compressed.pdf`
  try {
    await execFileAsync('gs', [
      '-sDEVICE=pdfwrite',
      '-dPDFSETTINGS=/printer',
      '-dNOPAUSE', '-dQUIET', '-dBATCH',
      `-sOutputFile=${tmpPath}`,
      filePath,
    ], { timeout: 120000 })

    const compressedSize = statSync(tmpPath).size
    if (compressedSize > 0 && compressedSize < originalSize) {
      // 覆盖原文件：先删原文件再原子重命名压缩版为原名（stored_path 不变）
      unlinkSync(filePath)
      renameSync(tmpPath, filePath)
      console.log(`[pdf-compress] ${originalSize} → ${compressedSize} bytes (${filePath})`)
      return compressedSize
    }

    // 压缩后没变小或异常 → 丢弃压缩版，保留原文件
    unlinkSync(tmpPath)
    return originalSize
  } catch (e) {
    // gs 缺失 / 超时 / 失败 → 保留原文件
    if (existsSync(tmpPath)) { try { unlinkSync(tmpPath) } catch {} }
    console.error('[pdf-compress] skipped:', e.message)
    return originalSize
  }
}
