import { exec } from 'node:child_process'
import { promisify } from 'node:util'
import configurationStore from '../store/ConfigurationStore'

const execPromise = promisify(exec)

export async function cat(filePath: string, fileStatus: string, revision?: string): Promise<SVNResponse> {
  const { sourceFolder } = configurationStore.store
  try {
    const repoUrl = await getRepositoryUrl()
    if (!repoUrl) {
      return { status: 'error', message: 'Không thể lấy URL của repository' }
    }
    const fullUrl = `${repoUrl}/${filePath.replace(/\\/g, '/')}`
    console.log(`svn cat ${revision} "${fullUrl}"`)
    if (fileStatus === 'A') {
      const revisionFlag = revision ? `-r ${revision}` : ''
      const { stdout, stderr } = await execPromise(`svn cat ${revisionFlag} "${fullUrl}"`, { cwd: sourceFolder })
      if (stderr) return { status: 'error', message: stderr }
      return { status: 'success', data: stdout.trim() }
    }
    const revisionFlag = revision ? `-r ${revision}` : ''
    const { stdout, stderr } = await execPromise(`svn cat ${revisionFlag} "${fullUrl}"`, { cwd: sourceFolder })
    if (stderr) return { status: 'error', message: stderr }
    return { status: 'success', data: stdout.trim() }
  } catch (error) {
    return { status: 'error', message: error instanceof Error ? error.message : String(error) }
  }
}


async function getRepositoryUrl(): Promise<string> {
  try {
    const { sourceFolder } = configurationStore.store
    const command = 'svn info --show-item url'
    const { stdout, stderr } = await execPromise(command, { cwd: sourceFolder })
    if (stderr?.trim()) throw new Error(stderr.trim())
    return stdout.trim()
  } catch (error) {
    console.error('Lỗi khi lấy repository URL:', error)
    return ''
  }
}
