import { spawnSync } from 'node:child_process'
import * as fs from 'node:fs'
import * as path from 'node:path'
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

export function openSvnDiff(file: string, status: string) {
  const { svnFolder, sourceFolder } = configurationStore.store

  return new Promise(resolve => {
    if (!fs.existsSync(svnFolder)) return resolve({ status: 'error', message: 'Invalid path to svn.exe.' })
    if (!fs.existsSync(sourceFolder)) return resolve({ status: 'error', message: 'Invalid source folder.' })

    const filePath = path.join(sourceFolder, file)
    console.log(`Open file: [${status}] ${filePath}`)

    const tortoiseBinPath = path.join(svnFolder, 'bin')

    if (status === '?' || status === '!') {
      try {
        const isText = isTextFile(filePath, status, sourceFolder)
        const tool = isText ? 'TortoiseMerge.exe' : 'TortoiseIDiff.exe'
        const args = isText ? [`/base:${filePath}`, `/mine:${filePath}`] : [`/left:${filePath}`, `/right:${filePath}`]
        const result = spawnSync(path.join(tortoiseBinPath, tool), args, {
          stdio: 'pipe',
          encoding: 'utf-8',
          windowsHide: true,
        })
        if (result.error) {
          console.log(`Error opening ${tool}: ${result.error}`, 'error')
        }
      } catch (error: any) {
        console.log(`Exception running diff: ${error.message}`, 'error')
      }
      return
    }

    try {
      const result = spawnSync(path.join(tortoiseBinPath, 'TortoiseProc.exe'), ['/command:diff', `/path:${filePath}`], {
        stdio: 'pipe',
        encoding: 'utf-8',
        windowsHide: true,
      })
      if (result.stderr) {
        console.log('Error', `Error opening TortoiseSVN: ${result.stderr}`)
      }
    } catch (error: any) {
      console.log('Error', `Unexpected error: ${error.message}`)
    }
  })
}
