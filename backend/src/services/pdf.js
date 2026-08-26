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
import { rm } from 'fs/promises'

const execFileAsync = promisify(execFile)

export async function docxToPdf(docxPath) {
  const outDir = dirname(docxPath)
  // 每次转换用唯一 profile 目录：process.pid 在同一进程内不变，并发转换会因共享
  // profile 触发 LibreOffice 锁冲突。加入时间戳+随机后缀后每次独立，互不干扰。
  const profileDir = `/tmp/lo-${process.pid}-${Date.now()}-${Math.random().toString(36).slice(2)}`
  try {
    await execFileAsync('soffice', [
      '--headless',
      '-env:UserInstallation=file://' + profileDir,
      '--convert-to', 'pdf', '--outdir', outDir, docxPath,
    ])
  } finally {
    // 清理本次转换遗留的 profile 目录，避免 /tmp 无限增长
    await rm(profileDir, { recursive: true, force: true }).catch(() => {})
  }
  return docxPath.replace(/\.docx$/i, '.pdf')
}
