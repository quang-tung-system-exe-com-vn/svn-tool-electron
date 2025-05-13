import log from 'electron-log'
import { XMLParser } from 'fast-xml-parser'
import { isText } from 'main/utils/istextorbinary'
import { exec } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'
import { promisify } from 'node:util'
import configurationStore from '../store/ConfigurationStore'

const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: '',
})
const execPromise = promisify(exec)

interface MergeOptions {
  sourcePath: string
  targetPath: string
  dryRun?: boolean
  revision?: string
}

interface MergeResult {
  status: 'success' | 'error' | 'conflict'
  message: string
  data?: {
    conflicts?: Array<{
      path: string
      content?: {
        mine: string
        theirs: string
        base: string
      }
      isRevisionConflict?: boolean
    }>
    changedFiles?: string[]
    commits?: Commit[]
    dryRunOutput?: string
    mergeTableData?: MergeOutputItem[]
  }
}

interface Commit {
  revision: string;
  author: string;
  date: string;
  message: string;
}

interface MergeOutputItem {
  status: string;
  filePath: string;
}


async function checkCleanWorkingCopy(path: string): Promise<boolean> {
  try {
    const { sourceFolder } = configurationStore.store
    const { stdout } = await execPromise(`svn status "${path}"`, { cwd: sourceFolder })
    return stdout.trim() === ''
  } catch (error) {
    log.error('Lỗi khi kiểm tra trạng thái working copy:', error)
    return false
  }
}

async function getMergeInfo(sourcePath: string, targetPath: string): Promise<string> {
  try {
    const { sourceFolder } = configurationStore.store
    const { stdout } = await execPromise(`svn mergeinfo --show-revs eligible "${sourcePath}" "${targetPath}"`, { cwd: sourceFolder })
    return stdout.trim()
  } catch (error) {
    log.error('Lỗi khi lấy thông tin merge:', error)
    throw new Error(`Không thể lấy thông tin merge: ${error}`)
  }
}

async function getCommitsBetweenBranches(sourcePath: string, targetPath: string): Promise<Commit[]> {
  try {
    const { sourceFolder } = configurationStore.store
    const eligibleRevs = await getMergeInfo(sourcePath, targetPath)
    if (!eligibleRevs) return []

    const revisions = eligibleRevs.split('\n').filter(rev => rev.trim() !== '')
    const commits = []

    for (const rev of revisions) {
      const revNumber = rev.replace('r', '')
      const { stdout } = await execPromise(`svn log -r ${revNumber} "${sourcePath}" --xml`, { cwd: sourceFolder })
      const result = parser.parse(stdout)
      const entry = result.log?.logentry
      if (entry) {
        const logEntry = Array.isArray(entry) ? entry[0] : entry
        commits.push({
          revision: logEntry.revision,
          author: logEntry.author,
          date: new Date(logEntry.date).toLocaleString(),
          message: logEntry.msg?.trim() || '',
        })
      }
    }

    return commits
  } catch (error) {
    log.error('Lỗi khi lấy danh sách commit giữa hai nhánh:', error)
    throw new Error(`Không thể lấy danh sách commit: ${error}`)
  }
}

export async function merge(options: MergeOptions): Promise<MergeResult> {
  const { sourcePath, targetPath, dryRun = false, revision } = options
  const { sourceFolder } = configurationStore.store
  try {
    const isClean = await checkCleanWorkingCopy(targetPath)
    if (!isClean) {
      return {
        status: 'error',
        message: 'Working copy is not clean. Please commit or revert changes before merging.'
      }
    }
    let mergeCommand = 'svn merge'
    if (dryRun) {
      mergeCommand += ' --dry-run'
    }
    if (revision) {
      if (revision.includes(':')) {
        mergeCommand += ` -r ${revision} "${sourcePath}" "${targetPath}"`
      } else {
        const startRev = revision.toUpperCase() === 'HEAD' ? '1' : revision
        mergeCommand += ` -r ${startRev}:HEAD "${sourcePath}" "${targetPath}"`
      }
    } else {
      mergeCommand += ` "${sourcePath}" "${targetPath}"`
    }
    log.info(`Thực hiện lệnh: ${mergeCommand}`)
    const { stdout, stderr } = await execPromise(mergeCommand, { cwd: sourceFolder })
    if (dryRun) {
      const mergeTableData = formatMergeOutput(stdout)
      return {
        status: 'success',
        message: 'Check merge successfully',
        data: {
          dryRunOutput: stdout,
          mergeTableData: mergeTableData
        }
      }
    }

    let hasConflicts = false
    let conflictOutput = ''

    try {
      const conflictCheck = await execPromise(`svn status "${targetPath}" | findstr /R "^[ ]*C"`, { cwd: sourceFolder })
      conflictOutput = conflictCheck.stdout
      hasConflicts = conflictOutput !== ''
    } catch (error) {
      conflictOutput = ''
      hasConflicts = false
    }

    if (hasConflicts) {
      const conflictFiles = conflictOutput
        .split(/\r?\n/)
        .filter((line: string) => line.trim() !== '')
        .map((line: string) => {
          const filePath = line.substring(8).trim()
          return { path: path.relative(sourceFolder, filePath) }
        })

      const conflicts = await Promise.all(
        conflictFiles
          .filter((conflict): conflict is { path: string } => conflict !== null)
          .map(async (conflict: { path: string }) => {
            try {
              const filePath = conflict.path
              const fullFilePath = path.join(targetPath, filePath)
              const textResult = isText(fullFilePath)
              if (textResult) {
                const minePath = `${fullFilePath}.mine`
                const theirsPath = `${fullFilePath}.r.new`
                const basePath = `${fullFilePath}.r.old`

                // Kiểm tra xem có phải conflict revision không
                const hasMineFile = fs.existsSync(minePath)
                const hasTheirsFile = fs.existsSync(theirsPath)
                const hasBaseFile = fs.existsSync(basePath)

                // Nếu không có các file .mine, .r.new, .r.old thì đây là conflict revision
                const isRevisionConflict = !(hasMineFile || hasTheirsFile || hasBaseFile)

                if (isRevisionConflict) {
                  return {
                    path: filePath,
                    isRevisionConflict: true
                  }
                }

                const mine = hasMineFile ? fs.readFileSync(minePath, 'utf8') : 'No .mine file available'
                const theirs = hasTheirsFile ? fs.readFileSync(theirsPath, 'utf8') : 'No .r.new file available'
                const base = hasBaseFile ? fs.readFileSync(basePath, 'utf8') : 'No .r.old file available'

                return {
                  path: filePath,
                  content: { mine, theirs, base },
                  isRevisionConflict: false
                }
              }
              return { path: filePath }
            } catch (error) {
              log.error(`Lỗi khi đọc file xung đột ${conflict.path}:`, error)
              return { path: conflict.path, content: undefined }
            }
          })
      )

      return {
        status: 'conflict',
        message: 'Merge có xung đột cần giải quyết',
        data: { conflicts }
      }
    }

    const changedFilesResult = await execPromise(`svn status "${targetPath}"`, { cwd: sourceFolder })
    const changedFiles = changedFilesResult.stdout
      .split('\n')
      .filter(line => line.trim() !== '')
      .map(line => line.substring(8).trim())

    return {
      status: 'success',
      message: 'Merge thành công',
      data: { changedFiles }
    }
  } catch (error) {
    log.error('Lỗi khi thực hiện merge:', error)
    return {
      status: 'error',
      message: `Lỗi khi thực hiện merge: ${error}`
    }
  }
}

export async function resolveConflict(filePath: string, resolution: 'mine' | 'theirs' | 'base' | 'working', isRevisionConflict?: boolean, targetPath?: string): Promise<MergeResult> {
  try {
    const { sourceFolder } = configurationStore.store
    let command: string
    if (isRevisionConflict) {
      command = `svn resolve --accept working "${filePath}"`
    } else {
      switch (resolution) {
        case 'mine':
          command = `svn resolve --accept mine-full "${filePath}"`
          break
        case 'theirs':
          command = `svn resolve --accept theirs-full "${filePath}"`
          break
        case 'base':
          command = `svn resolve --accept base "${filePath}"`
          break
        case 'working':
          command = `svn resolve --accept working "${filePath}"`
          break
        default:
          return {
            status: 'error',
            message: 'Phương thức giải quyết xung đột không hợp lệ'
          }
      }
    }
    await execPromise(command, { cwd: sourceFolder })

    const pathToCheck = targetPath || path.dirname(filePath)
    const changedFilesResult = await execPromise(`svn status "${pathToCheck}"`, { cwd: sourceFolder })
    const changedFiles = changedFilesResult.stdout
      .split('\n')
      .filter(line => line.trim() !== '')
      .map(line => path.relative(sourceFolder, line.substring(8).trim()))

    const successMessage = isRevisionConflict
      ? `Đã giải quyết xung đột revision cho file ${filePath}`
      : `Đã giải quyết xung đột cho file ${filePath}`
    return {
      status: 'success',
      message: successMessage,
      data: { changedFiles }
    }
  } catch (error) {
    log.error('Lỗi khi giải quyết xung đột:', error)
    return {
      status: 'error',
      message: `Lỗi khi giải quyết xung đột: ${error}`
    }
  }
}

export async function createSnapshot(targetPath: string): Promise<MergeResult> {
  try {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
    const snapshotName = `${path.basename(targetPath)}_snapshot_${timestamp}`
    const snapshotDir = path.join(path.dirname(targetPath), snapshotName)
    const srcPath = path.join(targetPath, 'src')
    const snapshotSrcDir = path.join(snapshotDir, 'src')
    const zipPath = `${snapshotDir}.zip`

    // Bước 1: Tạo thư mục snapshot và sao chép source
    await execPromise(`mkdir "${snapshotDir}"`)
    await execPromise(`xcopy "${srcPath}" "${snapshotSrcDir}" /E /I /H`, {
      maxBuffer: 1024 * 1024 * 10
    })

    // Bước 2: Tạo file zip bằng PowerShell
    const powershellCommand = `powershell Compress-Archive -Path "${snapshotDir}\\*" -DestinationPath "${zipPath}"`
    await execPromise(powershellCommand)

    // Bước 3: Xóa thư mục snapshot sau khi nén xong
    await execPromise(`rmdir /s /q "${snapshotDir}"`)

    return {
      status: 'success',
      message: `Đã tạo và nén snapshot thành công: ${zipPath}`
    }

  } catch (error) {
    console.error('Lỗi khi tạo snapshot:', error)
    return {
      status: 'error',
      message: `Lỗi khi tạo snapshot: ${error}`
    }
  }
}

export async function getCommitsForMerge(options: MergeOptions): Promise<MergeResult> {
  try {
    const commits = await getCommitsBetweenBranches(options.sourcePath, options.targetPath)
    return {
      status: 'success',
      message: 'Lấy danh sách commit thành công',
      data: {
        changedFiles: commits.map(commit => commit.revision),
        commits: commits
      }
    }
  } catch (error) {
    log.error('Lỗi khi lấy danh sách commit cho merge:', error)
    return {
      status: 'error',
      message: `Lỗi khi lấy danh sách commit: ${error}`
    }
  }
}

function formatMergeOutput(output: string): MergeOutputItem[] {
  const lines = output.split('\n')
  const result: MergeOutputItem[] = []
  for (const line of lines) {
    const trimmed = line.trim()
    if (trimmed.startsWith('---') || trimmed === '') {
      continue
    }
    let status = ''
    const filePath = trimmed.slice(1).trim()

    if (trimmed.startsWith('C')) {
      status = 'C'
    } else if (trimmed.startsWith('U')) {
      status = 'U'
    } else if (trimmed.startsWith('A')) {
      status = 'A'
    } else if (trimmed.startsWith('D')) {
      status = 'D'
    } else {
      continue
    }

    result.push({
      status,
      filePath
    })
  }

  return result
}
