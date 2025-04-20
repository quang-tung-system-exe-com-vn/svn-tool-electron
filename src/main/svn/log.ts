import { exec } from 'node:child_process'
import { promisify } from 'node:util'
import configurationStore from '../store/ConfigurationStore'

const execPromise = promisify(exec)
const { sourceFolder } = configurationStore.store

export async function log(filePath = '.'): Promise<SVNResponse> {
  try {
    const { stdout, stderr } = await execPromise(`svn log -v "${filePath}"`, { cwd: sourceFolder })
    if (stderr) return { status: 'error', message: stderr }
    return { status: 'success', data: stdout.trim() }
  } catch (error) {
    return { status: 'error', message: error instanceof Error ? error.message : String(error) }
  }
}
