/**
 * DOCX → PDF 转换（LibreOffice headless）
 *
 * 合同是 .docx 模板生成的 Word 文档，格式已经定死。
 * 用 LibreOffice 把这份 DOCX 原样渲染成 PDF（不是重新排版），
 * 表格 / 字体 / 分页 / 页眉页脚全部沿用 Word 原始设定，保证格式不乱。
 */
import { execFile } from 'child_process'
import { promisify } from 'util'
import { dirname } from 'path'

const execFileAsync = promisify(execFile)

export async function docxToPdf(docxPath) {
  const outDir = dirname(docxPath)
  await execFileAsync('soffice', [
    '--headless',
    // 独立 profile，避免并发转换时 LibreOffice 的 profile 锁冲突
    '-env:UserInstallation=file:///tmp/lo-' + process.pid,
    '--convert-to', 'pdf', '--outdir', outDir, docxPath,
  ])
  return docxPath.replace(/\.docx$/i, '.pdf')
}
