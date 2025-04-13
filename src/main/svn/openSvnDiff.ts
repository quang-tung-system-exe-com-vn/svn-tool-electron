import { spawn } from 'node:child_process'
import * as fs from 'node:fs'
import * as path from 'node:path'
import { isText } from 'main/utils/istextorbinary'
import configurationStore from '../store/ConfigurationStore'

export function isTextFile(filePath: string, status: string, sourceFolder: string) {
  const fileName = path.basename(filePath)
  if (status === '!') return false
  if (status === '?') {
    return isText(fileName)
  }
}

export async function openSvnDiff(file: string, status: string): Promise<void> {
  const { svnFolder, sourceFolder } = configurationStore.store

  if (!fs.existsSync(svnFolder)) {
    console.log('Error', 'Invalid path to svn.exe.')
    return
  }

  if (!fs.existsSync(sourceFolder)) {
    console.log('Error', 'Invalid source folder.')
    return
  }

  const filePath = path.join(sourceFolder, file)
  const tortoiseBinPath = path.join(svnFolder, 'bin')

  console.log(`Open file: [${status}] ${filePath}`)
  if (status === '?' || status === '!') {
    try {
      const isTextResult = isTextFile(filePath, status, sourceFolder)
      console.log(isTextResult)
      const tool = isTextResult ? 'TortoiseMerge.exe' : 'TortoiseIDiff.exe'
      const args = isTextResult ? [`/base:${filePath}`, `/mine:${filePath}`] : [`/left:${filePath}`, `/right:${filePath}`]
      const child = spawn(path.join(tortoiseBinPath, tool), args, {
        detached: true,
        stdio: 'ignore',
        windowsHide: true,
      })
      child.unref()
      if (child.stderr) {
        console.log(`Error opening ${tool}: ${child.stderr}`, 'error')
      }
    } catch (error: any) {
      console.log(`Exception running diff: ${error.message}`, 'error')
    }
  } else {
    try {
      const result = spawn(path.join(tortoiseBinPath, 'TortoiseProc.exe'), ['/command:diff', `/path:${filePath}`], {
        detached: true,
        stdio: 'ignore',
        windowsHide: true,
      })
      result.unref()
      if (result.stderr) {
        console.log('Error', `Error opening TortoiseSVN: ${result.stderr}`)
      }
    } catch (error: any) {
      console.log('Error', `Unexpected error: ${error.message}`)
    }
  }
}
