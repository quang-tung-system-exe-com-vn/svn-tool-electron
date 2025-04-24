import { isTextFile } from 'main/utils/utils'
import { execFile } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'
import configurationStore from '../store/ConfigurationStore'
interface SelectedFile {
  status: string
  filePath: string
}
export async function getDiff(selectedFiles: SelectedFile[]) {
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
        if (isText) {
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
            console.log(`⚠️ Error reading ${file}: ${e.message}`, 'error')
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
      console.error('❌ getDiff - SVN status error:', err)
      resolve({ status: 'error', message: err })
    }
  })
}

module.exports = { getDiff }
