import { exec } from 'node:child_process'
import { promisify } from 'node:util'
import configurationStore from '../store/ConfigurationStore'
const { sourceFolder } = configurationStore.store

const execPromise = promisify(exec)

export async function info(filePath: string, revision?: 'HEAD' | string): Promise<SVNResponse> {
  try {
    const revArg = revision ? `--show-item revision -r ${revision}` : ''
    const command = `svn info ${revArg} "${filePath}"`
    const { stdout, stderr } = await execPromise(command, { cwd: sourceFolder })

    if (stderr?.trim()) {
      return { status: 'error', message: `SVN stderr: ${stderr.trim()}` }
    }

    console.log(command)
    return { status: 'success', data: stdout.trim() }
  } catch (error) {
    return {
      status: 'error',
      message: error instanceof Error ? error.message : String(error),
    }
  }
}
