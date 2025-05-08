import { updateRevisionStatus } from 'main/windows/overlayStateManager'
import { exec } from 'node:child_process'
import { promisify } from 'node:util'
import configurationStore from '../store/ConfigurationStore'

const execPromise = promisify(exec)
const { sourceFolder } = configurationStore.store

export async function update(filePath: string | string[] = '.'): Promise<SVNResponse> {
  try {
    let filePathsStr = ''
    if (Array.isArray(filePath)) {
      const paths = filePath.map(path => (path === '.' ? '' : `"${path}"`))
      filePathsStr = paths.filter(p => p !== '').join(' ')
      if (!filePathsStr) {
        filePathsStr = ''
      }
    } else {
      filePathsStr = filePath === '.' ? '' : `"${filePath}"`
    }
    const { stdout, stderr } = await execPromise(`svn update ${filePathsStr}`, { cwd: sourceFolder })
    if (stderr) return { status: 'error', message: stderr }

    updateRevisionStatus(false)

    const fileCount = Array.isArray(filePath) ? filePath.length : 1
    const message = fileCount > 1 ? `Successfully updated ${fileCount} files` : 'Update completed successfully'

    return {
      status: 'success',
      data: stdout.trim() || message,
      message,
    }
  } catch (error) {
    return { status: 'error', message: error instanceof Error ? error.message : String(error) }
  }
}
