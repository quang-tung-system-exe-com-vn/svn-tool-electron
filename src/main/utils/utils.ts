import fs from 'node:fs'
import path from 'node:path'
import { isText } from './istextorbinary'

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

export function isTextFile(filePath: string, status: string, sourceFolder: string) {
  const fileName = path.basename(filePath)
  if (status === '!') return false
  if (status === '?') {
    const absolutePath = path.resolve(sourceFolder, filePath.replace(/\\\\/g, '\\'))
    const buffer = fs.readFileSync(absolutePath)
    return isText(fileName, buffer)
  }
}
