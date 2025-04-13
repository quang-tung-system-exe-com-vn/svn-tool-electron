import { exec } from 'node:child_process'
import path from 'node:path'
import { dialog } from 'electron'
import { sendMail } from 'main/notification/sendMail'
import { sendTeams } from 'main/notification/sendTeams'
import configurationStore from '../store/ConfigurationStore'
import { findSvnUser } from './getSvnUser'

export async function commit(commitMessage: string, violations: string, selectedFiles: any[]): Promise<void> {
  const deletedFiles = selectedFiles.filter(file => file.status === 'deleted')
  const addedFiles = selectedFiles.filter(file => file.status === 'added')
  const modifiedFiles = selectedFiles.filter(file => file.status === 'modified')
  if (deletedFiles.length > 0) {
    try {
      const result = await runSVNCommand('delete', deletedFiles)
      console.log('Deleted files:', result)
      await runSVNCommand('update')
    } catch (error) {
      dialog.showErrorBox('Error', `Deletion failed:\n${error}`)
      return
    }
  }

  if (addedFiles.length > 0) {
    try {
      const result = await runSVNCommand('add', addedFiles)
      console.log('Added files:', result)
    } catch (error) {
      console.log('Add files failed:', error)
      return
    }
  }

  try {
    const result = await runSVNCommand('commit', ['-m', commitMessage, ...selectedFiles])
    console.log('Commit successful:', result)
    const commitUser = (await findSvnUser()) ?? ''
    const today = new Date()
    const commitTime = new Intl.DateTimeFormat('sv-SE', {
      dateStyle: 'short',
      timeStyle: 'medium',
      hour12: false,
    })
      .format(today)
      .replaceAll('-', '/')

    const data = {
      commitUser,
      commitTime,
      commitMessage,
      violations,
      addedFiles,
      modifiedFiles,
      deletedFiles,
    }
    sendMail(data)
    sendTeams(data)
  } catch (error) {
    dialog.showErrorBox('Error', `Commit failed:\n${error}`)
  }
}

function runSVNCommand(command: string, selectedFiles: any[] = []) {
  const { svnFolder, sourceFolder } = configurationStore.store
  return new Promise(resolve => {
    exec([path.join(svnFolder, 'bin', 'svn.exe'), command, ...selectedFiles].join(' '), { cwd: sourceFolder }, (error, stdout, stderr) => {
      if (error) {
        resolve({ status: 'error', message: stderr })
      } else {
        resolve({ status: 'success', message: stdout })
      }
    })
  })
}
