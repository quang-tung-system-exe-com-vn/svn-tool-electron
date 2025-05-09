import { Notification } from 'electron'
import { exec } from 'node:child_process'
import { promisify } from 'node:util'
import configurationStore from '../store/ConfigurationStore'
import { getResourcePath } from '../utils/utils'
import { updateRevisionStatus } from '../windows/overlayStateManager'

export type SVNResponse = { status: 'success'; data: any } | { status: 'no-change'; data: any } | { status: 'error'; message: string }

export interface SVNLastChangedInfo {
  author: string
  revision: string
  curRevision?: string
  date: string
}
const execPromise = promisify(exec)

let sourceFolderPrefix = '';

async function calculateSourceFolderPrefix() {
  try {
    const { sourceFolder } = configurationStore.store
    const rootFolder = await getWorkingCopyRoot()

    if (rootFolder && sourceFolder) {
      const normalizedRoot = rootFolder.replace(/\\/g, '/').replace(/\/$/, '')
      const normalizedSource = sourceFolder.replace(/\\/g, '/').replace(/\/$/, '')
      if (normalizedSource.length > normalizedRoot.length && normalizedSource.startsWith(normalizedRoot)) {
        sourceFolderPrefix = normalizedSource.substring(normalizedRoot.length)
        if (sourceFolderPrefix.startsWith('/')) {
          sourceFolderPrefix = sourceFolderPrefix.substring(1)
        }
        console.log('Phần dư giữa sourceFolder và rootFolder:', sourceFolderPrefix)
      }
    }
  } catch (error) {
    console.error('Lỗi khi tính toán phần dư:', error)
  }
}

calculateSourceFolderPrefix()

export async function getWorkingCopyRoot(): Promise<string> {
  try {
    const { sourceFolder } = configurationStore.store
    const command = 'svn info --show-item wc-root'
    const { stdout, stderr } = await execPromise(command, { cwd: sourceFolder })
    if (stderr?.trim()) throw new Error(stderr.trim())
    return stdout.trim()
  } catch (error) {
    console.error('Lỗi khi lấy root folder:', error)
    return ''
  }
}

export async function info(filePath: string): Promise<SVNResponse> {
  try {
    const { sourceFolder, showNotifications } = configurationStore.store
    const quotedPath = `"${filePath}"`

    const runInfo = async (rev?: string): Promise<string> => {
      const revArg = rev ? `-r ${rev}` : ''
      const command = `svn info ${revArg} ${quotedPath}`
      const { stdout, stderr } = await execPromise(command, { cwd: sourceFolder })
      if (stderr?.trim()) throw new Error(stderr.trim())
      return stdout.trim()
    }

    if (filePath !== '.') {
      const infoOutput = await runInfo(undefined)
      return { status: 'success', data: infoOutput }
    }

    const [headRaw, baseRaw] = await Promise.all([runInfo('HEAD'), runInfo('BASE')])
    const head = parseLastChangedInfo(headRaw)
    const base = parseLastChangedInfo(baseRaw)
    const commit = await getCommitInfo()
    if (commit.status === 'error') {
      return { status: 'error', message: commit.message }
    }
    const data = {
      ...head,
      changedFiles: commit.changedFiles,
      commitMessage: commit.commitMessage,
      curRevision: base.revision,
    }
    if (head.revision !== base.revision) {
      try {
        updateRevisionStatus(true)
        if (showNotifications) {
          const icon = getResourcePath('icon.ico')
          const formattedDate = formatDate(head.date || '')
          const bodyLines = [`Revision: ${head.revision} (current: ${base.revision})`, `Author: ${head.author || 'Unknown'}`, `Date: ${formattedDate || 'Invalid date'}`]
          new Notification({
            title: 'SVN Update Available',
            body: bodyLines.join('\n'),
            icon: icon,
          }).show()
        }
      } catch (notificationError) {
        console.error('Failed to process SVN update notification:', notificationError)
      }
      return { status: 'success', data }
    }
    updateRevisionStatus(false)
    return { status: 'no-change', data }
  } catch (error) {
    updateRevisionStatus(false)
    return {
      status: 'error',
      message: error instanceof Error ? error.message : String(error),
    }
  }
}

function formatDate(dateStr: string): string {
  const date = new Date(dateStr)
  const pad = (n: number) => n.toString().padStart(2, '0')
  return `${date.getFullYear()}/${pad(date.getMonth() + 1)}/${pad(date.getDate())} ` + `${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`
}

async function getCommitInfo(): Promise<any> {
  try {
    const { sourceFolder } = configurationStore.store
    const command = 'svn log -r HEAD:1 -l 1 -v'
    const { stdout, stderr } = await execPromise(command, { cwd: sourceFolder })
    if (stderr?.trim()) {
      return { status: 'error', message: `SVN stderr: ${stderr.trim()}` }
    }
    const commitInfo = parseCommitInfo(stdout.trim())
    return commitInfo
  } catch (error) {
    return {
      status: 'error',
      message: error instanceof Error ? error.message : String(error),
    }
  }
}

function parseCommitInfo(info: string) {
  const lines = info.split('\n')
  const changedFiles: { status: string; path: string }[] = []
  const commitMessageLines: string[] = []
  let changedPathsIndex = -1
  let emptyLineAfterChangedPathsIndex = -1

  for (let i = 0; i < lines.length; i++) {
    if (lines[i].startsWith('Changed paths:')) {
      changedPathsIndex = i
    }
    if (changedPathsIndex !== -1 && i > changedPathsIndex && lines[i].trim() === '') {
      emptyLineAfterChangedPathsIndex = i
      break
    }
  }
  if (changedPathsIndex !== -1) {
    for (let i = changedPathsIndex + 1; i < lines.length; i++) {
      if (lines[i].trim() === '') break
      const fileMatch = lines[i].match(/([AMDRCI?!~X])\s+(.+)/)
      if (fileMatch) {
        let filePath = fileMatch[2].trim();
        try {
          if (sourceFolderPrefix) {
            const prefixPattern = new RegExp(`^/?${sourceFolderPrefix}/?`);
            filePath = filePath.replace(prefixPattern, '');
          } else {
            const pathParts = filePath.split('/').filter(Boolean);
            if (pathParts.length > 1) {
              filePath = pathParts.slice(1).join('/');
            }
          }
        } catch (error) {
          console.error('Lỗi khi xử lý đường dẫn:', error);
          const pathParts = filePath.split('/').filter(Boolean);
          if (pathParts.length > 1) {
            filePath = pathParts.slice(1).join('/');
          }
        }
        changedFiles.push({
          status: fileMatch[1],
          path: filePath,
        })
      }
    }
  }

  if (emptyLineAfterChangedPathsIndex !== -1) {
    for (let i = emptyLineAfterChangedPathsIndex + 1; i < lines.length; i++) {
      if (lines[i].startsWith('---') || lines[i].startsWith('r')) {
        break
      }
      commitMessageLines.push(lines[i])
    }
  }

  if (commitMessageLines.length === 0) {
    let messageStarted = false
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i]
      if (line.startsWith('r') || line.startsWith('---') ||
        line.startsWith('Changed paths:') ||
        (changedPathsIndex !== -1 && i > changedPathsIndex && i <= emptyLineAfterChangedPathsIndex)) {
        continue
      }
      if (line.trim() !== '' || messageStarted) {
        messageStarted = true
        commitMessageLines.push(line)
      }
    }
  }

  return {
    changedFiles,
    commitMessage: commitMessageLines.join('\n'),
  }
}

function parseLastChangedInfo(info: string): SVNLastChangedInfo {
  const lines = info.split('\n')
  let author = ''
  let revision = ''
  let date = ''
  for (const line of lines) {
    if (line.startsWith('Last Changed Author:')) {
      author = line.replace('Last Changed Author:', '').trim()
    } else if (line.startsWith('Last Changed Rev:')) {
      revision = line.replace('Last Changed Rev:', '').trim()
    } else if (line.startsWith('Last Changed Date:')) {
      date = line.replace('Last Changed Date:', '').trim()
    }
  }
  return { author, revision, date }
}
