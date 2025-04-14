import { exec } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'
import { sendMail } from 'main/notification/sendMail'
import { sendTeams } from 'main/notification/sendTeams'
import configurationStore from '../store/ConfigurationStore'
import { findSvnUser } from './getSvnUser'

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

  // Handle deleted (missing) files
  if (deletedFiles.length > 0) {
    const deleteResult = await runSVNCommand('delete', deletedFiles)
    if (deleteResult.status === 'error') {
      console.error('❌ Deletion failed:', deleteResult.message)
      return Promise.resolve({ status: 'error', message: `❌ Deletion failed: ${deleteResult.message}` })
    }
    console.log('🗑️ Deleted missing files:', deleteResult.message)
    deletedFilePaths = extractFilePaths(deleteResult.message)

    const updateResult = await runSVNCommand('update')
    if (updateResult.status === 'error') {
      console.error('❌ Update failed:', updateResult.message)
      return Promise.resolve({ status: 'error', message: `❌ Update failed: ${updateResult.message}` })
    }
    console.log('🔄 Updated working copy:', updateResult.message)
  }

  // Handle added (unversioned) files
  if (addedFiles.length > 0) {
    const addResult = await runSVNCommand('add', addedFiles)
    if (addResult.status === 'error') {
      console.error('❌ Add files failed:', addResult.message)
      return Promise.resolve({ status: 'error', message: `❌ Add files failed: ${addResult.message}` })
    }
    console.log('🆕 Added unversioned files:', addResult.message)
    addedFilePaths = extractFilePaths(addResult.message)
  }

  // Handle commit for modified, added, and deleted files
  const allFiles = [...modifiedFiles, ...addedFiles, ...deletedFiles]
  if (allFiles.length > 0) {
    try {
      const commitResult = await runSVNCommand('commit', ['-m', commitMessage, ...allFiles])
      if (commitResult.status === 'error') {
        console.error('❌ Commit failed:', commitResult.message)
        return Promise.resolve({ status: 'error', message: `❌ Commit failed: ${commitResult.message}` })
      }
      console.log('✅ Commit successful:', commitResult.message)

      const commitUser = (await findSvnUser()) ?? ''
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

      sendMail(data)
      sendTeams(data)
      return Promise.resolve({ status: 'success', message: `✅ Commit successful: ${commitResult.message}` })
    } catch (error: any) {
      return Promise.resolve({ status: 'error', message: `❌ Commit failed: ${error?.message ?? error}` })
    }
  } else {
    console.log('✅ No changes to commit.')
    return Promise.resolve({ status: 'success', message: '✅ No changes to commit.' })
  }
}

// Extract file paths from the SVN response message (lines starting with "A")
function extractFilePaths(message: string): string[] {
  return message.split(',').map(p => p.trim())
}
function runSVNCommand(command: string, selectedFiles?: string[]): Promise<SVNResponse> {
  const batchSize = 100
  const { svnFolder, sourceFolder } = configurationStore.store

  return new Promise((resolve, reject) => {
    if (!fs.existsSync(svnFolder)) {
      return reject({ status: 'error', message: 'Invalid path to svn.exe.' })
    }
    if (!fs.existsSync(sourceFolder)) {
      return reject({ status: 'error', message: 'Invalid source folder.' })
    }

    const runBatch = (args: string[]): Promise<SVNResponse> => {
      return new Promise((batchResolve, batchReject) => {
        const svnExePath = `"${path.join(svnFolder, 'bin', 'svn.exe')}"`
        const fullCommand = `${svnExePath} ${command} ${args.join(' ')}`.trim()

        exec(fullCommand, { cwd: sourceFolder }, (error, stdout, stderr) => {
          if (error) {
            batchReject({ status: 'error', message: stderr || error.message })
          } else {
            console.log(stdout)
            batchResolve({ status: 'success', message: stdout })
          }
        })
      })
    }

    if (!selectedFiles || selectedFiles.length === 0) {
      runBatch([]).then(resolve).catch(reject)
      return
    }

    const batchedFiles = chunkArray(selectedFiles, batchSize)
    const pattern = /^[AD]\s+(?:\(bin\)\s+)?([^\r\n]+)/gm
    const filePaths: string[] = []
    ;(async () => {
      for (const batch of batchedFiles) {
        try {
          const result = await runBatch(batch)
          let match: RegExpExecArray | null
          while (true) {
            match = pattern.exec(result.message)
            if (match === null) {
              break
            }
            filePaths.push(match[1].replace(/\\\\/g, '\\'))
          }
        } catch (error) {
          reject(error)
          return
        }
      }
      console.log('Batch processed successfully:', filePaths)
      resolve({ status: 'success', message: filePaths.toString() })
    })()
  })
}

// Helper function to chunk array into smaller batches
function chunkArray<T>(array: T[], chunkSize: number): T[][] {
  const result: T[][] = []
  for (let i = 0; i < array.length; i += chunkSize) {
    result.push(array.slice(i, i + chunkSize))
  }
  return result
}
