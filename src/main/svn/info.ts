import { exec } from 'node:child_process'
import { promisify } from 'node:util'
import configurationStore from '../store/ConfigurationStore'

const execPromise = promisify(exec)

export type SVNResponse = { status: 'success'; data: any } | { status: 'no-change'; data: any } | { status: 'error'; message: string }

export interface SVNLastChangedInfo {
  author: string
  revision: string
  curRevision?: string
  date: string
}

export async function info(filePath: string): Promise<SVNResponse> {
  try {
    const { sourceFolder } = configurationStore.store
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
      curRevision: base.revision
    }
    if (head.revision !== base.revision) {
      return { status: 'success', data }
    }
    return { status: 'no-change', data }
  } catch (error) {
    return {
      status: 'error',
      message: error instanceof Error ? error.message : String(error),
    }
  }
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
  let commitMessage = ''

  for (const line of lines) {
    if (line.startsWith('Changed paths:')) {
      const fileLines = lines.slice(lines.indexOf(line) + 1)
      for (const fileLine of fileLines) {
        const fileMatch = fileLine.match(/([AMDR])\s+(.+)/)
        if (fileMatch) {
          changedFiles.push({
            status: fileMatch[1],
            path: fileMatch[2].trim(),
          })
        }
      }
    }
    if (line && !line.startsWith('Changed paths:') && !line.startsWith('r') && !line.startsWith('---')) {
      commitMessage = line.trim()
    }
  }

  return {
    changedFiles,
    commitMessage,
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
