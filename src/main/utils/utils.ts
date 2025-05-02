import fs from 'node:fs'
import path from 'node:path'
import { app } from 'electron'
import log from 'electron-log'
import { isText } from './istextorbinary'

/**
 * Recursively lists all files and subdirectories within a given directory.
 * Returns an array of absolute paths for all discovered files and folders.
 *
 * @param dirPath The base directory to start the search.
 * @returns Array of full paths to files and directories found.
 */
export function listAllFilesRecursive(dirPath: string): string[] {
  const result: string[] = []

  function walk(currentPath: string) {
    const entries = fs.readdirSync(currentPath, { withFileTypes: true })
    for (const entry of entries) {
      const fullPath = path.join(currentPath, entry.name)
      if (entry.isDirectory()) {
        result.push(fullPath)
        walk(fullPath)
      } else {
        result.push(fullPath)
      }
    }
  }

  if (fs.existsSync(dirPath)) walk(dirPath)
  return result
}

/**
 * Determines whether a given file is a text file, based on SVN status and its contents.
 * Only evaluates for files with '?' status (untracked). Directories are excluded.
 *
 * @param filePath Relative or absolute file path.
 * @param status SVN file status ('?', '!', etc.)
 * @param sourceFolder The root folder where the file resides.
 * @returns True if the file is a text file; false for binary or non-existent files.
 */
export function isTextFile(filePath: string, status: string, sourceFolder: string) {
  const fileName = path.basename(filePath)
  if (status === '!') return false
  if (status === '?') {
    const absolutePath = path.resolve(sourceFolder, filePath.replace(/\\\\/g, '\\'))
    const isDirectory = fs.existsSync(absolutePath) && fs.statSync(absolutePath).isDirectory()
    log.info('isDirectory: ', absolutePath, isDirectory)
    if (isDirectory) {
      return false
    }
    const buffer = fs.readFileSync(absolutePath)
    return isText(fileName, buffer)
  }
}

/**
 * Returns the correct path to a resource file in the public directory,
 * handling differences between development and packaged environments.
 * @param fileName The name of the file in the public directory.
 * @returns The absolute path to the resource file.
 */
export function getResourcePath(fileName: string): string {
  if (app.isPackaged) {
    return path.join(process.resourcesPath, 'public', fileName)
  }
  return path.join(app.getAppPath(), 'src/resources/public', fileName)
}
