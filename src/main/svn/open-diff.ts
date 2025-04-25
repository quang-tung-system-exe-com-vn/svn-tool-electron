import { spawn } from 'node:child_process'
import * as fs from 'node:fs'
import * as path from 'node:path'
import log from 'electron-log'
import { isTextFile } from 'main/utils/utils'
import configurationStore from '../store/ConfigurationStore'

export async function openDiff(file: string, status: string): Promise<SVNResponse> {
  const { svnFolder, sourceFolder } = configurationStore.store
  if (!fs.existsSync(svnFolder)) {
    return { status: 'error', message: 'Invalid path to svn.exe.' }
  }
  if (!fs.existsSync(sourceFolder)) {
    return { status: 'error', message: 'Invalid source folder.' }
  }

  const filePath = path.join(sourceFolder, file)
  const tortoiseBinPath = path.join(svnFolder, 'bin')

  log.info(`Open file: [${status}] ${filePath}`)

  try {
    if (status === '?' || status === '!') {
      const isTextResult = isTextFile(filePath, status, sourceFolder)
      const tool = isTextResult ? 'TortoiseMerge.exe' : 'TortoiseIDiff.exe'
      const args = isTextResult ? [`/base:${filePath}`, `/mine:${filePath}`] : [`/left:${filePath}`, `/right:${filePath}`]
      const child = spawn(path.join(tortoiseBinPath, tool), args, {
        detached: true,
        stdio: 'ignore',
        windowsHide: true,
      })

      child.unref()
      return { status: 'success', message: `${tool} opened successfully.` }
    }
    const result = spawn(path.join(tortoiseBinPath, 'TortoiseProc.exe'), ['/command:diff', `/path:${filePath}`], {
      detached: true,
      stdio: 'ignore',
      windowsHide: true,
    })

    result.unref()
    return { status: 'success', message: 'TortoiseProc diff opened successfully.' }
  } catch (error: any) {
    log.error(`Exception running diff: ${error.message}`)
    return { status: 'error', message: `Exception: ${error.message}` }
  }
}
