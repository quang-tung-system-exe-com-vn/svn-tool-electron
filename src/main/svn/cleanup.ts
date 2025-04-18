import { exec } from 'node:child_process'
import { promisify } from 'node:util'
import configurationStore from '../store/ConfigurationStore'

const execPromise = promisify(exec)
const { sourceFolder } = configurationStore.store

export async function cleanup(options?: string[]): Promise<SVNResponse> {
  try {
    let command = 'svn cleanup'

    // Add options if provided
    if (options && options.length > 0) {
      // Map option IDs to SVN cleanup options
      const optionMap: Record<string, string> = {
        'externals': '--include-externals',
        'unversioned': '--remove-unversioned',
        'ignored': '--remove-ignored',
        'unused': '--vacuum-pristines',
        'metadata': '--refresh',
        'locks': '--break-locks',
        'fixTimestamps': '--fix-timestamps'
      }

      // Add each option to the command
      for (const option of options) {
        if (optionMap[option]) {
          command += ` ${optionMap[option]}`
        }
      }
    }

    const { stdout, stderr } = await execPromise(command, { cwd: sourceFolder })
    if (stderr) return { status: 'error', message: stderr }
    return { status: 'success', data: stdout.trim() || 'Cleanup completed' }
  } catch (error) {
    return { status: 'error', message: error instanceof Error ? error.message : String(error) }
  }
}
