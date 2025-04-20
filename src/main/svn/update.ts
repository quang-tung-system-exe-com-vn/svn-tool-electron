import { exec } from 'node:child_process'
import { promisify } from 'node:util'
import configurationStore from '../store/ConfigurationStore'

const execPromise = promisify(exec)
const { sourceFolder } = configurationStore.store

export async function update(filePath = '.'): Promise<SVNResponse> {
  try {
    const targetPath = filePath === '.' ? '' : `"${filePath}"`
    const { stdout, stderr } = await execPromise(`svn update ${targetPath}`, { cwd: sourceFolder })
    if (stderr) return { status: 'error', message: stderr }
    return { status: 'success', data: stdout.trim() || 'Update completed successfully' }
  } catch (error) {
    return { status: 'error', message: error instanceof Error ? error.message : String(error) }
  }
}
