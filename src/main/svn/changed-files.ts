import { execFile } from 'node:child_process'
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

async function batchCheckKind(svnExecutable: string, sourceFolder: string, relativePaths: string[]): Promise<Map<string, 'file' | 'dir'>> {
  if (relativePaths.length === 0) return new Map()

  try {
    const { stdout } = await execFileAsync(svnExecutable, ['info', ...relativePaths, '--show-item', 'kind'], {
      cwd: sourceFolder,
      windowsHide: true,
      maxBuffer: 10 * 1024 * 1024,
    })

    const lines = stdout
      .split('\n')
      .map(line => line.trim())
      .filter(line => line !== '')
    const map = new Map<string, 'file' | 'dir'>()

    for (const line of lines) {
      const parts = line.split(/\s+/)
      if (parts.length >= 2) {
        const kind = parts[0] as 'file' | 'dir'
        const filePath = parts.slice(1).join(' ')
        map.set(filePath, kind)
      }
    }

    return map
  } catch (error) {
    log.error('❌ batchCheckKind - SVN info error:', error)
    return new Map()
  }
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
    const missingFiles: string[] = []

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
      const exists = fs.existsSync(absolutePath)
      const stat = exists ? fs.statSync(absolutePath) : null
      const isDirectory = stat?.isDirectory() ?? false
      const fileType = path.extname(filePath).toLowerCase()

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
        if (status === '!') {
          missingFiles.push(filePath)
        }

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
          isFile: exists ? stat?.isFile() : null,
        })
      }
    }

    // Batch check missing files kind
    const kindMap = await batchCheckKind(svnExecutable, sourceFolder, missingFiles)

    // Update lại isFile cho những file missing
    for (const file of changedFiles) {
      if (file.isFile === null && kindMap.has(file.filePath)) {
        const kind = kindMap.get(file.filePath)
        file.isFile = kind === 'file'
      }
    }

    log.info('✅ SVN status successfully retrieved with all files and folders')
    return { status: 'success', data: changedFiles }
  } catch (error) {
    log.error('❌ changedFiles - SVN status error:', error)
    return { status: 'error', message: error }
  }
}
