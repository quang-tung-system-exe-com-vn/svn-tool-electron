import { DataTable } from '@/components/common/DataTable'
import { FooterBar } from '@/components/layout/FooterBar'
import { TitleBar } from '@/components/layout/TitleBar'
import { LANGUAGES } from '@/components/shared/constants'
import { useAppearanceStore, useButtonVariant } from '@/components/stores/useAppearanceStore'
import { GlowLoader } from '@/components/ui-elements/GlowLoader'
import { OverlayLoader } from '@/components/ui-elements/OverlayLoader'
import ToastMessageFunctions from '@/components/ui-elements/ToastMessage'
import { Button } from '@/components/ui/button'
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from '@/components/ui/resizable'
import { Textarea } from '@/components/ui/textarea'
import chalk from 'chalk'
import { IPC } from 'main/constants'
import { useCallback, useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { UpdaterDialog } from '../components/dialogs/UpdaterDialog'

export function MainPage() {
  const variant = useButtonVariant()
  const { t } = useTranslation()
  const [isLoadingGenerate, setLoadingGenerate] = useState(false)
  const [isLoadingCheckCodingRule, setLoadingCheckCodingRule] = useState(false)
  const [isLoadingCommit, setLoadingCommit] = useState(false)
  const [progress, setProgress] = useState(0)
  const { language } = useAppearanceStore()
  const tableRef = useRef<any>(null)
  const isAnyLoading = isLoadingGenerate || isLoadingCheckCodingRule || isLoadingCommit
  const commitMessageRef = useRef<HTMLTextAreaElement>(null)
  const codingRuleRef = useRef<HTMLTextAreaElement>(null)
  const commitMessage = useRef('')
  const codingRule = useRef('')
  const [showUpdateDialog, setShowUpdateDialog] = useState(false)
  const [newRevisionInfo, setNewRevisionInfo] = useState<string>('')
  const checkIntervalRef = useRef<NodeJS.Timeout | null>(null)
  const [showAppUpdateDialog, setShowAppUpdateDialog] = useState(false)
  const [appUpdateInfo, setAppUpdateInfo] = useState<{ version?: string; releaseNotes?: string }>({})

  const handleCommitMessage = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    commitMessage.current = e.target.value
  }
  const handleCheckCodingRule = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    codingRule.current = e.target.value
  }

  const generateCommitMessage = async () => {
    setProgress(0)
    const selectedRows = tableRef.current.table?.getSelectedRowModel().rows ?? []
    const selectedFiles = selectedRows.map((row: { original: { filePath: any; status: any } }) => ({
      filePath: row.original.filePath,
      status: row.original.status,
    }))
    if (selectedFiles.length === 0) {
      ToastMessageFunctions.warning(t('message.noFilesWarning'))
      return
    }
    const languageName = LANGUAGES.find(lang => lang.code === language)?.label || 'English'
    setLoadingGenerate(true)
    await updateProgress(0, 20, 1000)
    const result = await window.api.svn.get_diff(selectedFiles)
    const { status, message, data } = result
    if (status === 'success') {
      await updateProgress(20, 50, 1000)
      const params = {
        type: 'GENERATE_COMMIT',
        values: {
          diff_content: data,
          language: languageName,
        },
      }
      const openai_result = await window.api.openai.send_message(params)
      if (commitMessageRef.current) {
        commitMessageRef.current.value = openai_result
      }
      ToastMessageFunctions.success(t('toast.commitMessageGenerated'))
      await updateProgress(50, 100, 1000)
      setLoadingGenerate(false)
    } else {
      ToastMessageFunctions.error(message)
      if (commitMessageRef.current) {
        commitMessageRef.current.value = message ?? ''
      }
      setLoadingGenerate(false)
    }
  }

  const checkViolations = async () => {
    const selectedRows = tableRef.current.table?.getSelectedRowModel().rows ?? []
    const selectedFiles = selectedRows.map((row: { original: { filePath: any; status: any } }) => ({
      filePath: row.original.filePath,
      status: row.original.status,
    }))
    window.api.electron.send(IPC.WINDOW.CHECK_CODING_RULES, selectedFiles)
  }

  const commitCode = async () => {
    setProgress(0)
    if (!commitMessage.current) {
      ToastMessageFunctions.warning(t('message.commitMessageWarning'))
      return
    }
    const selectedRows = tableRef.current.table?.getSelectedRowModel().rows ?? []
    const selectedFiles = selectedRows.map((row: { original: { filePath: any; status: any } }) => ({
      filePath: row.original.filePath,
      status: row.original.status,
    }))
    if (selectedFiles.length === 0) {
      ToastMessageFunctions.warning(t('message.noFilesWarning'))
      return
    }
    setLoadingCommit(true)
    await updateProgress(0, 20, 1000)
    const result = await window.api.svn.commit(commitMessage.current, codingRule.current, selectedFiles)
    const { status, message } = result
    await updateProgress(20, 50, 1000)

    if (status === 'success') {
      await updateProgress(50, 100, 1000)
      setLoadingCommit(false)
      ToastMessageFunctions.success(t('toast.commitSuccess'))
      if (tableRef.current) {
        tableRef.current.reloadData()
        setTimeout(() => {
          tableRef.current.table.toggleAllPageRowsSelected(false)
        }, 0)
      }
      if (commitMessageRef.current) {
        commitMessageRef.current.value = ''
      }
    } else {
      ToastMessageFunctions.error(message)
      setLoadingCommit(false)
    }
  }

  const isMountedRef = useRef(true)

  // Listen for updater dialog events from main process
  useEffect(() => {
    const handleUpdaterDialog = (_event: any, data: any) => {
      setAppUpdateInfo({
        version: data.version,
        releaseNotes: data.releaseNotes,
      })
      setShowAppUpdateDialog(true)
    }

    window.api.on(IPC.UPDATER.SHOW_DIALOG, handleUpdaterDialog)

    return () => {
      // No need to remove listener as it's automatically cleaned up when component unmounts
    }
  }, [])

  // Check for app updates on startup
  useEffect(() => {
    const checkForAppUpdates = async () => {
      try {
        await window.api.updater.check_for_updates()
        // Dialog will be shown via IPC if update is available
      } catch (error) {
        ToastMessageFunctions.error(error)
      }
    }

    // Check after a short delay to allow the app to fully load
    setTimeout(() => {
      checkForAppUpdates()
    }, 5000)
  }, [])

  // Handle app update actions
  const handleUpdateAction = (type: 'available' | 'downloaded') => {
    try {
      if (type === 'available') {
        ToastMessageFunctions.info(t('Downloading update...'))
        window.api.updater.dialog_response('available', 'accept')
      } else {
        window.api.updater.dialog_response('downloaded', 'accept')
      }
    } catch (error) {
      ToastMessageFunctions.error(t('Error handling update'))
    } finally {
      setShowAppUpdateDialog(false)
    }
  }

  // Handle app update cancellation
  const handleUpdateCancel = (type: 'available' | 'downloaded') => {
    window.api.updater.dialog_response(type, 'cancel')
    setShowAppUpdateDialog(false)
  }

  // Function to check for new SVN revisions
  const checkForNewRevisions = useCallback(async () => {
    try {
      console.log(chalk.green('[SUCCESS]'), 'Begin check for new SVN revisions...')
      const localInfo = await window.api.svn.info('.', 'BASE')
      const remoteInfo = await window.api.svn.info('.', 'HEAD')
      if (localInfo?.data < remoteInfo?.data) {
        setNewRevisionInfo(`New revision r${remoteInfo.data} available`)
        setShowUpdateDialog(true)
      }
    } catch (error) {
      ToastMessageFunctions.error(error)
    }
  }, [])

  // Set up periodic check for new revisions
  useEffect(() => {
    checkIntervalRef.current = setInterval(checkForNewRevisions, 300000)
    checkForNewRevisions()

    return () => {
      if (checkIntervalRef.current) {
        clearInterval(checkIntervalRef.current)
      }
      isMountedRef.current = false
    }
  }, [checkForNewRevisions])

  // Handle SVN update from dialog
  const handleSvnUpdate = () => {
    ToastMessageFunctions.info(t('Updating SVN...'))
    window.api.svn.update()
    setShowUpdateDialog(false)
    ToastMessageFunctions.success(t('SVN updated successfully'))
    tableRef.current?.reloadData()
  }

  const updateProgress = (from: number, to: number, duration: number) => {
    return new Promise<void>(resolve => {
      const startTime = performance.now()
      const easeInOut = (t: number) => {
        return t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t
      }

      const step = () => {
        const currentTime = performance.now() - startTime
        const progress = Math.min(from + (to - from) * easeInOut(currentTime / duration), to)

        if (isMountedRef.current) {
          setProgress(progress)
        }

        if (currentTime < duration && isMountedRef.current) {
          requestAnimationFrame(step)
        } else {
          resolve()
        }
      }

      requestAnimationFrame(step)
    })
  }

  const handleUpdateClick = () => {
    if (!isAnyLoading) {
      ToastMessageFunctions.info(t('Updating SVN...'))
      window.api.svn
        .update()
        .then(result => {
          if (result.status === 'success') {
            ToastMessageFunctions.success(t('SVN updated successfully'))
            tableRef.current?.reloadData()
          } else {
            ToastMessageFunctions.error(result.message)
          }
        })
        .catch((error: Error) => {
          ToastMessageFunctions.error(error.message || 'Error updating SVN')
        })
    }
  }

  const handleShowLogClick = () => {
    if (!isAnyLoading) {
      window.api.electron.send(IPC.WINDOW.SHOW_LOG, '.')
    }
  }

  return (
    <div className="flex h-screen w-full">
      {/* Main Content */}
      <div className="flex flex-col flex-1 w-full">
        {/* Title Bar */}
        <TitleBar isLoading={isLoadingGenerate || isLoadingCheckCodingRule || isLoadingCommit} progress={progress} onUpdate={handleUpdateClick} onShowLog={handleShowLogClick} />
        {/* Content */}
        <div className="p-4 space-y-4 flex-1 h-full flex flex-col">
          <ResizablePanelGroup direction="vertical" className="rounded-md border">
            <ResizablePanel minSize={25} defaultSize={50}>
              <DataTable ref={tableRef} />
            </ResizablePanel>
            <ResizableHandle />
            <ResizablePanel className="p-2 pt-8" minSize={25} defaultSize={50}>
              <div className="relative overflow-hidden h-full">
                <OverlayLoader isLoading={isLoadingGenerate} />
                <Textarea
                  placeholder={t('placeholder.commitMessage')}
                  className="w-full h-full resize-none"
                  onChange={handleCommitMessage}
                  ref={commitMessageRef}
                  spellCheck={false}
                />
                <Textarea placeholder={t('placeholder.commitMessage')} className="hidden" onChange={handleCheckCodingRule} ref={codingRuleRef} spellCheck={false} />
              </div>
            </ResizablePanel>
          </ResizablePanelGroup>

          {/* Footer Buttons */}
          <div className="flex justify-center gap-2">
            <Button
              className={`relative w-50 ${isLoadingGenerate ? 'border-effect' : ''} ${isAnyLoading ? 'cursor-progress' : ''}`}
              variant={variant}
              onClick={() => {
                if (!isAnyLoading) {
                  generateCommitMessage()
                }
              }}
            >
              {isLoadingGenerate ? <GlowLoader /> : null} {t('action.generate')}
            </Button>

            <Button
              className={`relative w-50 ${isLoadingCheckCodingRule ? 'border-effect' : ''} ${isAnyLoading ? 'cursor-progress' : ''}`}
              variant={variant}
              onClick={() => {
                if (!isAnyLoading) {
                  checkViolations()
                }
              }}
            >
              {isLoadingCheckCodingRule ? <GlowLoader /> : null} {t('action.check')}
            </Button>
            <Button
              className={`relative w-50 ${isAnyLoading ? 'cursor-progress' : ''}`}
              variant={variant}
              onClick={() => {
                if (!isAnyLoading) {
                  const selectedRows = tableRef.current.table?.getSelectedRowModel().rows ?? []
                  const selectedFiles = selectedRows
                    .filter((row: any) => {
                      const filePath = row.original.filePath
                      return filePath.endsWith('.java')
                    })
                    .map((row: any) => row.original.filePath)

                  if (selectedFiles.length === 0) {
                    ToastMessageFunctions.warning(t('Please select at least one Java file'))
                    return
                  }
                  window.api.electron.send(IPC.WINDOW.SPOTBUGS, selectedFiles)
                }
              }}
            >
              {t('SpotBugs')}
            </Button>
            <Button
              className={`relative w-50 ${isLoadingCommit ? 'border-effect' : ''} ${isAnyLoading ? 'cursor-progress' : ''}`}
              variant={variant}
              onClick={() => {
                if (!isAnyLoading) {
                  commitCode()
                }
              }}
            >
              {isLoadingCommit ? <GlowLoader /> : null} {t('action.commit')}
            </Button>
          </div>
        </div>

        {/* Footer Bar */}
        <FooterBar isLoading={isLoadingGenerate || isLoadingCheckCodingRule || isLoadingCommit} progress={progress} />

        {/* App Update Dialog using Shadcn UI */}
        {showAppUpdateDialog && (
          <UpdaterDialog
            type="available"
            version={appUpdateInfo.version}
            releaseNotes={appUpdateInfo.releaseNotes}
            onAction={() => handleUpdateAction('available')}
            onCancel={() => handleUpdateCancel('available')}
          />
        )}

        {/* New Revision Dialog */}
        {showUpdateDialog && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-card p-6 rounded-lg shadow-lg w-100">
              <h3 className="text-lg font-semibold mb-4">{t('New SVN Revision Available')}</h3>
              <p className="mb-6">{newRevisionInfo}</p>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setShowUpdateDialog(false)}>
                  {t('Cancel')}
                </Button>
                <Button variant={variant} onClick={handleSvnUpdate}>
                  {t('Update Now')}
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
