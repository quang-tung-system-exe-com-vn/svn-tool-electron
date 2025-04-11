import { execFile } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'
import { promisify } from 'node:util'
import configurationStore from '../setting/ConfigurationStore'

const execFileAsync = promisify(execFile)

export async function getSvnChangedFiles(): Promise<any[]> {
  const { svnFolder, sourceFolder } = configurationStore.store
  if (!svnFolder || !sourceFolder) return []

  if (!fs.existsSync(svnFolder)) {
    throw new Error(`SVN path '${svnFolder}' does not exist.`)
  }

  const svnExecutable = path.join(svnFolder, 'bin', 'svn.exe')

  try {
    const { stdout } = await execFileAsync(svnExecutable, ['status'], {
      cwd: sourceFolder,
      windowsHide: true,
    })

    const rawChangedFiles = stdout.split('\n').filter(line => line.trim() !== '')

    const changedFiles = []

    for (const line of rawChangedFiles) {
      const status = line[0]
      const propStatus = line[1] ?? ''
      const lockStatus = line[2] ?? ''
      const historyStatus = line[3] ?? ''
      const switchedStatus = line[4] ?? ''
      const lockInfo = line[5] ?? ''
      const versionStatus = line[6] ?? ''
      const filePath = line.substring(8).trim()

      if (filePath.includes('ignore-on-commit')) {
        console.log(`🛑 Ignored file detected: ${filePath} — stopping parsing.`)
        break
      }

      changedFiles.push({
        status,
        propStatus,
        lockStatus,
        historyStatus,
        switchedStatus,
        lockInfo,
        versionStatus,
        filePath,
      })
    }

    console.log('✅ SVN status succesfully retrieved')
    return changedFiles
  } catch (error) {
    console.error('❌ SVN status error:', error)
    return []
  }
}
