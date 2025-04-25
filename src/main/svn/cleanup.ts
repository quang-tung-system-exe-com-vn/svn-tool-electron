import { exec } from 'node:child_process'
import { promisify } from 'node:util'
import log from 'electron-log'
import configurationStore from '../store/ConfigurationStore'

const execPromise = promisify(exec)
const { sourceFolder } = configurationStore.store

export async function cleanup(options?: string[]): Promise<SVNResponse> {
  try {
    const command = 'svn cleanup'
    const args: string[] = []
    const customOps: string[] = []

    const optionMap: Record<string, string> = {
      externals: '--include-externals',
      unversioned: '--remove-unversioned',
      ignored: '--remove-ignored',
      unused: '--vacuum-pristines',
    }

    if (options) {
      for (const opt of options) {
        if (optionMap[opt]) {
          args.push(optionMap[opt])
        } else {
          customOps.push(opt)
        }
      }
    }

    // Gọi cleanup với args hợp lệ
    const fullCommand = `${command} ${args.join(' ')}`.trim()
    const result = await execPromise(fullCommand, { cwd: sourceFolder })
    log.info(fullCommand)

    // Xử lý logic bổ sung
    if (customOps.includes('metadata')) {
      await execPromise('svn status', { cwd: sourceFolder })
    }

    if (customOps.includes('locks')) {
      await execPromise('svn cleanup', { cwd: sourceFolder })
    }

    if (customOps.includes('fixTimestamps')) {
      const { stdout } = await execPromise('svn status', { cwd: sourceFolder })
      const modifiedFiles = stdout
        .split('\n')
        .filter(line => line.startsWith('M '))
        .map(line => line.slice(2).trim())
      for (const file of modifiedFiles) {
        await execPromise(`touch "${file}"`, { cwd: sourceFolder })
      }
    }

    return { status: 'success', data: 'Cleanup completed successfully' }
  } catch (error) {
    return { status: 'error', message: error instanceof Error ? error.message : String(error) }
  }
}
