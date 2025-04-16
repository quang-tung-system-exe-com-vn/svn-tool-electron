import { exec } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'
import { sendTeams } from 'main/notification/sendTeams'
import { listAllFilesRecursive } from 'main/utils/utils'
import configurationStore from '../store/ConfigurationStore'
import { findUser } from './find-user'
const { svnFolder, sourceFolder } = configurationStore.store

function isSVNDirectory(path: string) {
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

  // Handle deleted (missing) files
  const unsortedPaths: string[] = []

  for (const filePath of deletedFiles) {
    const absolutePath = path.join(sourceFolder, filePath)
    const isDir = await isSVNDirectory(filePath)

    if (isDir) {
      const allPaths = listAllFilesRecursive(absolutePath)
      unsortedPaths.push(...allPaths) // Thêm toàn bộ file/folder con
      unsortedPaths.push(filePath) // Cuối cùng thêm thư mục gốc
    } else {
      unsortedPaths.push(filePath)
    }
  }

  // Sau khi thu thập xong toàn bộ → sort theo độ dài giảm dần
  const finalDeletedPaths = unsortedPaths.sort((a, b) => {
    const depthA = a.split(/[\\/]/).length
    const depthB = b.split(/[\\/]/).length
    return depthB - depthA || a.localeCompare(b) // sâu hơn → xóa trước, tên giống nhau thì fallback alphabet
  })

  const targetFiles = getMinimalParentFolders(finalDeletedPaths)
  if (finalDeletedPaths.length > 0) {
    console.log('▶️ Deleting files...', targetFiles)
    const deleteResult = await runSVNCommand('delete', targetFiles)
    if (deleteResult.status === 'error') {
      console.error('🛑 Deletion failed:', deleteResult.message)
      return { status: 'error', message: `${deleteResult.message}` }
    }
    console.log('🗑️ Deleted missing files:', deleteResult.message)
    deletedFilePaths = extractFilePaths(deleteResult.message)
  }

  // Handle added (unversioned) files
  if (addedFiles.length > 0) {
    console.log('▶️ Adding files...')
    const addResult = await runSVNCommand('add', addedFiles)
    if (addResult.status === 'error') {
      console.error('🛑 Add files failed:', addResult.message)
      return { status: 'error', message: `${addResult.message}` }
    }
    console.log('▶️ Added unversioned files:', addResult.message)
    addedFilePaths = extractFilePaths(addResult.message)
  }

  // Handle commit for modified, added, and deleted files
  const allFiles = [...modifiedFiles, ...addedFiles, ...targetFiles]
  if (allFiles.length > 0) {
    try {
      const escapedMessage = `"${commitMessage.replace(/"/g, '\\"')}"`
      const commitResult = await runSVNCommand('commit', allFiles, escapedMessage)
      if (commitResult.status === 'error') {
        console.error('🛑 Commit failed:', commitResult.message)
        return { status: 'error', message: `${commitResult.message}` }
      }
      console.log('✅ Commit successful:', commitResult.message)

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

      // sendMail(data)
      sendTeams(data)
      return { status: 'success', message: `${commitResult.message}` }
    } catch (error: any) {
      return { status: 'error', message: `${error?.message ?? error}` }
    }
  } else {
    console.log('✅ No changes to commit.')
    return { status: 'success', message: 'No changes to commit.' }
  }
}

async function runSVNCommand(command: string, selectedFiles: string[], commitMessage?: string): Promise<SVNResponse> {
  const batchSize = 100

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
          if (command === 'delete') return `"${arg}"  --force`
        }
        return `"${arg}"`
      })

      if (commitMessage && command !== 'add' && command !== 'delete') {
        modifiedArgs.unshift(`-m "${commitMessage}"`)
      }

      const fullCommand = `${svnExePath} ${command} ${modifiedArgs.join(' ')}`.trim()
      console.log(`✏️ Command ${command}: ${fullCommand}`)
      exec(fullCommand, { cwd: sourceFolder }, (error, stdout, stderr) => {
        if (error) {
          console.error(`🛑 Error: ${stderr || error.message}`)
          batchReject({ status: 'error', message: stderr || error.message })
        } else {
          console.log(`✅ ${stdout}`)
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

  console.log('Batch processed successfully:', filePaths)
  return { status: 'success', message: filePaths.toString() }
}

// Extract file paths from the SVN response message (lines starting with "A")
function extractFilePaths(message: string): string[] {
  return message.split(',').map(p => p.trim())
}

// Helper function to chunk array into smaller batches
function chunkArray<T>(array: T[], chunkSize: number): T[][] {
  const result: T[][] = []
  for (let i = 0; i < array.length; i += chunkSize) {
    result.push(array.slice(i, i + chunkSize))
  }
  return result
}

function getMinimalParentFolders(filePaths: string[]): string[] {
  const dirSet = new Set<string>()
  for (const filePath of filePaths) {
    const dir = path.dirname(filePath)
    dirSet.add(filePath) // Thêm file vào Set
    dirSet.add(dir) // Thêm thư mục cha vào Set
  }

  const allDirs = Array.from(dirSet)
  allDirs.sort()

  const result: string[] = []

  // Nếu chỉ có một file duy nhất, trả về chính file đó mà không cần thư mục cha
  if (filePaths.length === 1) {
    return result.concat(filePaths)
  }

  // Tiến hành lọc các thư mục cha tối thiểu
  for (const dir of allDirs) {
    if (!result.some(parent => dir.startsWith(parent + path.sep))) {
      result.push(dir)
    }
  }

  return result
}
