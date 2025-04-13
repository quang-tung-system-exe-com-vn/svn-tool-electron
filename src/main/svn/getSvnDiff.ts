import { execFile } from 'node:child_process'
import { log } from 'node:console'
import fs from 'node:fs'
import path from 'node:path'
import configurationStore from '../store/ConfigurationStore'

export const TEXT_FILE_EXTENSIONS: Set<string> = new Set([
  // 📄 Văn bản & cấu hình
  '.txt',
  '.md',
  '.log',
  '.xml',
  '.json',
  '.yaml',
  '.yml',
  '.ini',
  '.toml',
  '.csv',

  // 💻 Ngôn ngữ lập trình
  '.py',
  '.java',
  '.c',
  '.cpp',
  '.h',
  '.hpp',
  '.cs',
  '.go',
  '.rs',
  '.swift',
  '.m',
  '.mm',

  // 🌐 Web development
  '.html',
  '.htm',
  '.css',
  '.scss',
  '.sass',
  '.less',
  '.js',
  '.jsx',
  '.ts',
  '.tsx',

  // ⚙️ Script & Automation
  '.sh',
  '.bat',
  '.ps1',
  '.cmd',
  '.pl',
  '.rb',
  '.php',
  '.perl',
  '.lua',
  '.tcl',
  '.awk',

  // 📊 Dữ liệu & Cơ sở dữ liệu
  '.sql',
  '.sqlite',
  '.db',
  '.db3',

  // 🏗️ Build systems
  '.cmake',
  '.make',
  '.mak',
  'Makefile',
  'CMakeLists.txt',

  // 🐳 DevOps & hạ tầng
  '.dockerfile',
  'Dockerfile',
  '.k8s',
  '.helm',
  '.tf',
  '.terraform',

  // 📘 Markdown & ReStructuredText
  '.rst',
  '.mdown',

  // ⚙️ File cấu hình bổ sung
  '.gitignore',
  '.gitattributes',
  '.editorconfig',
  '.eslintrc',
  '.prettierrc',

  // ☕ Java & JVM ecosystem
  '.gradle',
  '.kt',
  '.kts',
  '.groovy',
  '.jar',
  '.war',

  // 🔧 Khác
  '.env',
  '.config',
  '.properties',
  '.toml',
])

export function isTextFile(filePath: string, status: string, sourceFolder: string): boolean {
  const fullPath = path.join(sourceFolder.trim(), filePath)
  const fileName = path.basename(filePath)
  const fileExt = path.extname(filePath).toLowerCase()

  if (status === '!') return false

  if (status === '?') {
    try {
      const buffer = fs.readFileSync(fullPath, { encoding: 'utf-8' })
      buffer.slice(0, 1024)
      return true
    } catch {
      return false
    }
  }

  return TEXT_FILE_EXTENSIONS.has(fileExt) || TEXT_FILE_EXTENSIONS.has(fileName)
}

interface SelectedFile {
  status: string
  filePath: string
}
export async function getSvnDiff(selectedFiles: SelectedFile[]) {
  const { svnFolder, sourceFolder } = configurationStore.store
  return new Promise(resolve => {
    try {
      if (!fs.existsSync(svnFolder)) return resolve({ status: 'error', message: 'Invalid path to svn.exe.' })
      if (!fs.existsSync(sourceFolder)) return resolve({ status: 'error', message: 'Invalid source folder.' })
      if (selectedFiles.length === 0) return resolve({ status: 'error', message: 'No files selected.' })
      let diffResult = ''
      const unversionedFiles = selectedFiles.filter(file => file.status === '?')
      for (const file of unversionedFiles) {
        const status = file.status
        const filePath = path.join(sourceFolder, file.filePath)
        const isText = isTextFile(file.filePath, status, sourceFolder)
        if (isText && fs.existsSync(filePath)) {
          try {
            const fileContent = fs.readFileSync(filePath, 'utf-8')
            diffResult += `\nFile: ${file}\n`
            diffResult += 'Code:\n'
            if (fileContent.trim()) {
              diffResult += `${fileContent}\n\n`
            } else {
              diffResult += 'This file is empty. No content available.\n\n'
            }
          } catch (e: any) {
            log(`⚠️ Error reading ${file}: ${e.message}`, 'error')
          }
        }
      }

      const diffFiles = selectedFiles.filter(f => !['?', '!'].includes(f.status)).map(f => f.filePath)
      if (diffFiles.length === 0) return resolve({ status: 'success', data: diffResult.trim() })
      const svnExe = path.join(svnFolder, 'bin', 'svn.exe')
      execFile(svnExe, ['diff', ...diffFiles], { cwd: sourceFolder }, (error, stdout, stderr) => {
        if (error) return resolve({ status: 'error', message: error.message })
        const lines = stdout.split(/\r?\n/)
        const allBlocks = []
        let currentFile = null
        let currentBlock = []
        let isCode = false
        let delLine = 0
        let addLine = 0
        for (let line of lines) {
          line = line.trim()
          if (line.startsWith('Index:')) {
            if (currentBlock.length && currentFile) allBlocks.push([currentFile, currentBlock])
            currentFile = line.split(/\s+/)[1]
            currentBlock = []
            isCode = false
          } else if (line.startsWith('@@')) {
            isCode = true
            const parts = line.split(' ')
            delLine = Number.parseInt(parts[1].split(',')[0].replace('-', ''))
            addLine = Number.parseInt(parts[2].split(',')[0].replace('+', ''))
          } else if (isCode) {
            if (line.startsWith('-')) currentBlock.push([delLine++, line])
            else if (line.startsWith('+')) currentBlock.push([addLine++, line])
            else {
              delLine++
              addLine++
            }
          }
        }

        if (currentBlock.length && currentFile) allBlocks.push([currentFile, currentBlock])
        for (const [fileName, lines] of allBlocks) {
          diffResult += `File: ${fileName}\nCode:\n`
          for (const [num, code] of lines) {
            diffResult += `${num}: ${code}\n`
          }
          diffResult += '\n'
        }
        resolve({ status: 'success', data: diffResult.trim() })
      })
    } catch (err) {
      console.error('❌ SVN status error:', err)
    }
  })
}

module.exports = { getSvnDiff }
