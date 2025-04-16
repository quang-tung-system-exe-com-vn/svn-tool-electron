import { exec } from 'node:child_process'
import { promisify } from 'node:util'
import configurationStore from '../store/ConfigurationStore'
const { sourceFolder } = configurationStore.store

const execPromise = promisify(exec)

export async function info(filePath: string): Promise<SVNResponse> {
  try {
    const { stdout, stderr } = await execPromise(`svn info ${filePath}`, { cwd: sourceFolder })
    if (stderr) {
      return { status: 'error', message: 'Error executing svn info' }
    }
    return { status: 'success', data: stdout.trim() }
  } catch (error) {
    return { status: 'error', message: error instanceof Error ? error.message : String(error) }
  }
}
