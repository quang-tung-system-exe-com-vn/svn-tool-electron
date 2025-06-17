import log from 'electron-log'
import { sendMail } from 'main/notification/sendMail'
import { sendTeams } from 'main/notification/sendTeams'
import { listAllFilesRecursive } from 'main/utils/utils'
import { exec } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'
import configurationStore from '../store/ConfigurationStore'
import { findUser } from './find-user'

function isSVNDirectory(path: string) {
  const { sourceFolder } = configurationStore.store
  return new Promise(resolve => {
    exec(`svn info "${path}"`, { cwd: sourceFolder }, (err, stdout, stderr) => {
      if (err) return resolve(false)
      const kindLine = stdout.split('\n').find(line => line.startsWith('Node Kind:'))
      resolve(kindLine?.includes('directory'))
    })
  })
}

enum SVNStatus {
  ADDED = '?',
  DELETED = '!',
  MODIFIED = 'M',
}

interface SVNResponse {
  status: 'success' | 'error'
  message: string
}

export async function commit(commitMessage: string, violations: string, selectedFiles: { filePath: string; status: SVNStatus }[]): Promise<SVNResponse> {
  const deletedFiles = selectedFiles.filter(file => file.status === SVNStatus.DELETED).map(file => file.filePath)
  const addedFiles = selectedFiles.filter(file => file.status === SVNStatus.ADDED).map(file => file.filePath)
  const modifiedFiles = selectedFiles.filter(file => ![SVNStatus.ADDED, SVNStatus.DELETED].includes(file.status)).map(file => file.filePath)

  let addedFilePaths: string[] = []
  let deletedFilePaths: string[] = []
  const unsortedPaths: string[] = []
  const { sourceFolder } = configurationStore.store

  for (const filePath of deletedFiles) {
    const absolutePath = path.join(sourceFolder, filePath)
    const isDir = await isSVNDirectory(filePath)

    if (isDir) {
      const allPaths = listAllFilesRecursive(absolutePath)
      unsortedPaths.push(...allPaths)
      unsortedPaths.push(filePath)
    } else {
      unsortedPaths.push(filePath)
    }
  }

  const finalDeletedPaths = unsortedPaths.sort((a, b) => {
    const depthA = a.split(/[\\/]/).length
    const depthB = b.split(/[\\/]/).length
    return depthB - depthA || a.localeCompare(b)
  })

  const targetFiles = getMinimalParentFolders(finalDeletedPaths)
  if (finalDeletedPaths.length > 0) {
    log.info('▶️ Deleting files...', targetFiles)
    const deleteResult = await runSVNCommand('delete', targetFiles)
    if (deleteResult.status === 'error') {
      log.error('🛑 Deletion failed:', deleteResult.message)
      return { status: 'error', message: `${deleteResult.message}` }
    }
    log.info('🗑️ Deleted missing files:', deleteResult.message)
    deletedFilePaths = extractFilePaths(deleteResult.message)
  }

  if (addedFiles.length > 0) {
    log.info('▶️ Adding files...')
    const addResult = await runSVNCommand('add', addedFiles)
    if (addResult.status === 'error') {
      log.error('🛑 Add files failed:', addResult.message)
      return { status: 'error', message: `${addResult.message}` }
    }
    log.info('▶️ Added unversioned files:', addResult.message)
    addedFilePaths = extractFilePaths(addResult.message)
  }

  const allFiles = [...modifiedFiles, ...addedFiles, ...targetFiles]
  if (allFiles.length > 0) {
    try {
      const os = require('node:os')
      const tempFile = path.join(os.tmpdir(), `svn-commit-message-${Date.now()}.txt`)
      fs.writeFileSync(tempFile, commitMessage, { encoding: 'utf8' })

      let commitResult: SVNResponse
      try {
        commitResult = await runSVNCommand('commit', allFiles, tempFile, true)
      } finally {
        try {
          if (fs.existsSync(tempFile)) {
            fs.unlinkSync(tempFile)
          }
        } catch (err) {
          log.warn('⚠️ Không thể xóa file tạm thời:', err)
        }
      }

      if (commitResult.status === 'error') {
        log.error('🛑 Commit failed:', commitResult.message)
        return { status: 'error', message: `${commitResult.message}` }
      }
      log.info('✅ Commit successful:', commitResult.message)

      const commitUser = (await findUser()) ?? ''
      const commitTime = new Intl.DateTimeFormat('sv-SE', {
        dateStyle: 'short',
        timeStyle: 'medium',
        hour12: false,
      })
        .format(new Date())
        .replaceAll('-', '/')

      const data = {
        commitUser,
        commitTime,
        commitMessage,
        violations,
        addedFiles: addedFilePaths,
        modifiedFiles,
        deletedFiles: deletedFilePaths,
      }

      const { enableMailNotification, enableTeamsNotification } = configurationStore.store

      if (enableMailNotification) {
        sendMail(data)
      }

      if (enableTeamsNotification) {
        sendTeams(data)
      }
      return { status: 'success', message: `${commitResult.message}` }
    } catch (error: any) {
      return { status: 'error', message: `${error?.message ?? error}` }
    }
  } else {
    log.info('✅ No changes to commit.')
    return { status: 'success', message: 'No changes to commit.' }
  }
}

async function runSVNCommand(command: string, selectedFiles: string[], commitMessage?: string, isMessageFile = false): Promise<SVNResponse> {
  const batchSize = 100
  const { svnFolder, sourceFolder } = configurationStore.store
  if (!fs.existsSync(svnFolder)) {
    return Promise.reject({ status: 'error', message: 'Invalid path to svn.exe.' })
  }
  if (!fs.existsSync(sourceFolder)) {
    return Promise.reject({ status: 'error', message: 'Invalid source folder.' })
  }
  const runBatch = (args: string[]): Promise<SVNResponse> => {
    return new Promise((batchResolve, batchReject) => {
      const svnExePath = `"${path.join(svnFolder, 'bin', 'svn.exe')}"`
      const modifiedArgs = args.map(arg => {
        if (arg === '.') {
          return ''
        }
        const fullPath = path.join(sourceFolder, arg)
        if (fs.existsSync(fullPath) && fs.statSync(fullPath).isDirectory()) {
          if (command === 'add') return `--depth=empty "${arg}"`
          if (command === 'delete') return `"${arg}" --force`
        }
        return `"${arg}"`
      })

      if (commitMessage && command !== 'add' && command !== 'delete') {
        if (isMessageFile) {
          modifiedArgs.unshift(`-F "${commitMessage}"`)
        } else {
          modifiedArgs.unshift(`-m ${commitMessage}`)
        }
      }

      const fullCommand = `${svnExePath} ${command} ${modifiedArgs.join(' ')}`.trim()
      log.info(`✏️ Command ${command}: ${fullCommand}`)
      exec(fullCommand, { cwd: sourceFolder }, (error, stdout, stderr) => {
        if (error) {
          log.error(`🛑 Error: ${stderr || error.message}`)
          batchReject({ status: 'error', message: stderr || error.message })
        } else {
          log.info(`✅ ${stdout}`)
          batchResolve({ status: 'success', message: stdout })
        }
      })
    })
  }

  if (!selectedFiles || selectedFiles.length === 0) {
    return runBatch([])
  }

  const batchedFiles = chunkArray(selectedFiles, batchSize)
  const pattern = /^[AD]\s+(?:\(bin\)\s+)?([^\r\n]+)/gm
  const filePaths: string[] = []

  for (const batch of batchedFiles) {
    try {
      const result = await runBatch(batch)
      let match: RegExpExecArray | null = pattern.exec(result.message)
      while (match !== null) {
        filePaths.push(match[1].replace(/\\\\/g, '\\'))
        match = pattern.exec(result.message)
      }
    } catch (error) {
      return error as SVNResponse
    }
  }

  log.info('Batch processed successfully:', filePaths)
  return { status: 'success', message: filePaths.toString() }
}

function extractFilePaths(message: string): string[] {
  return message.split(',').map(p => p.trim())
}

function chunkArray<T>(array: T[], chunkSize: number): T[][] {
  const result: T[][] = []
  for (let i = 0; i < array.length; i += chunkSize) {
    result.push(array.slice(i, i + chunkSize))
  }
  return result
}

function getMinimalParentFolders(filePaths: string[]): string[] {
  if (filePaths.length === 1) {
    return [...filePaths]
  }
  return [...new Set(filePaths)]
}
