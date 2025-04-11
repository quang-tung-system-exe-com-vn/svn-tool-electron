import fs from 'node:fs'
import path from 'node:path'
import { execFile } from 'node:child_process'
import configurationStore from '../setting/ConfigurationStore'

function isTextFile(filePath: string) {
  const buffer = fs.readFileSync(filePath)
  return !buffer.includes(0)
}

export async function getSvnDiff(selectedFiles: any[]) {
  const { svnFolder, sourceFolder } = configurationStore.store
  return new Promise((resolve, reject) => {
    try {
      if (!fs.existsSync(svnFolder)) return reject('Invalid path to svn.exe.')
      if (!fs.existsSync(sourceFolder)) return reject('Invalid source folder.')

      if (selectedFiles.length === 0) return reject('No files selected.')

      let diffResult = ''
      const unversioned = selectedFiles.filter(f => f.status === '?').map(f => f.filePath)
      // Read content of unversioned files
      for (const file of unversioned) {
        const filePath = path.join(sourceFolder, file)
        const fileObj = selectedFiles.find(f => f.filePath === file)
        if (fileObj?.status === '?' && fs.existsSync(filePath) && isTextFile(filePath)) {
          const content = fs.readFileSync(filePath, 'utf-8')
          diffResult += `\nFile: ${file}\nCode:\n`
          diffResult += content.trim() ? `${content}\n\n` : 'This file is empty. No content available.\n\n'
        }
      }

      const diffFiles = selectedFiles.filter(f => !['?', '!'].includes(f.status)).map(f => f.filePath)
      if (diffFiles.length === 0) return resolve(diffResult.trim())

      const svnExe = path.join(svnFolder, 'bin', 'svn.exe')
      execFile(svnExe, ['diff', ...diffFiles], { cwd: sourceFolder }, (error, stdout, stderr) => {
        if (error) return reject(`SVN diff error: ${stderr}`)

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

        resolve(diffResult.trim())
      })
    } catch (err) {
      console.error('❌ SVN status error:', err)
    }
  })
}

module.exports = { getSvnDiff }
