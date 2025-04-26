import { execFile, execSync } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'
import { promisify } from 'node:util'
import log from 'electron-log'
import configurationStore from '../store/ConfigurationStore'

const execFileAsync = promisify(execFile)

function listAllFilesRecursive(dirPath: string): string[] {
  const result: string[] = []

  function walk(currentPath: string) {
    const entries = fs.readdirSync(currentPath, { withFileTypes: true })
    for (const entry of entries) {
      const fullPath = path.join(currentPath, entry.name)
      if (entry.isDirectory()) {
        result.push(fullPath)
        walk(fullPath)
      } else {
        result.push(fullPath)
      }
    }
  }

  if (fs.existsSync(dirPath)) walk(dirPath)
  return result
}

export async function changedFiles() {
  const { svnFolder, sourceFolder } = configurationStore.store
  if (!fs.existsSync(svnFolder)) {
    return { status: 'error', message: 'Invalid path to svn.exe.' }
  }
  if (!fs.existsSync(sourceFolder)) {
    return { status: 'error', message: 'Invalid source folder.' }
  }

  const svnExecutable = path.join(svnFolder, 'bin', 'svn.exe')
  try {
    const { stdout } = await execFileAsync(svnExecutable, ['status'], {
      cwd: sourceFolder,
      windowsHide: true,
    })

    const rawChangedFiles = stdout.split('\n').filter(line => line.trim() !== '')
    const changedFiles: any[] = []

    for (const line of rawChangedFiles) {
      const status = line[0]
      const propStatus = line[1] ?? ''
      const lockStatus = line[2] ?? ''
      const historyStatus = line[3] ?? ''
      const switchedStatus = line[4] ?? ''
      const lockInfo = line[5] ?? ''
      const versionStatus = line[6] ?? ''
      const filePath = line.substring(8).trim()

      if (filePath.includes('ignore-on-commit')) {
        break
      }
      const absolutePath = path.join(sourceFolder, filePath)
      const fileType = path.extname(filePath).toLowerCase()
      const isFile = fs.existsSync(absolutePath) && fs.statSync(absolutePath).isFile()
      const isDirectory = fs.existsSync(absolutePath) && fs.statSync(absolutePath).isDirectory()
      if ((status === '?' || status === 'D') && isDirectory) {
        changedFiles.push({
          status,
          propStatus,
          lockStatus,
          historyStatus,
          switchedStatus,
          lockInfo,
          versionStatus,
          filePath,
          fileType,
          isFile: false,
        })
        const untrackedFiles = listAllFilesRecursive(absolutePath)
        for (const file of untrackedFiles) {
          const relative = path.relative(sourceFolder, file)
          changedFiles.push({
            status,
            propStatus: '',
            lockStatus: '',
            historyStatus: '',
            switchedStatus: '',
            lockInfo: '',
            versionStatus: '',
            filePath: relative,
            fileType: path.extname(relative).toLowerCase(),
            isFile: fs.statSync(file).isFile(),
          })
        }
      } else {
        changedFiles.push({
          status,
          propStatus,
          lockStatus,
          historyStatus,
          switchedStatus,
          lockInfo,
          versionStatus,
          filePath,
          fileType,
          isFile: status === '!' ? checkIsFile(absolutePath) : isFile,
        })
      }
    }
    log.info('✅ SVN status successfully retrieved with all files and folders')
    return { status: 'success', data: changedFiles }
  } catch (error) {
    log.error('❌ changedFiles - SVN status error:', error)
    return { status: 'error', message: error }
  }
}

function checkIsFile(filePath: string): any {
  try {
    const absolutePath = path.resolve(filePath)
    const output = execSync(`svn info --show-item=kind "${absolutePath}"`, { encoding: 'utf-8' }).trim()
    if (output === 'dir') return false
    if (output === 'file') return true
    return null
  } catch (error) {
    return null
  }
}
