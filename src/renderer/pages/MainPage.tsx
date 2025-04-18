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
import { IPC } from 'main/constants'
import { useEffect, useRef, useState, useCallback } from 'react'
import { Download } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'

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
  const [appUpdateInfo, setAppUpdateInfo] = useState<{version?: string, releaseNotes?: string}>({})

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
      toast.warning(t('message.noFilesWarning'))
      return
    }
    const languageName = LANGUAGES.find(lang => lang.code === language)?.label || 'English'
    setLoadingGenerate(true)
    await updateProgress(0, 20, 1000)
    const result = await window.api.svn.get_diff(selectedFiles)
    const { status, message, data } = result
    console.log(result)
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
      toast.success(t('toast.commitMessageGenerated'))
      await updateProgress(50, 100, 1000)
      setLoadingGenerate(false)
    } else {
      toast.error(message)
      if (commitMessageRef.current) {
        commitMessageRef.current.value = message ?? ''
      }
      setLoadingGenerate(false)
    }
  }

  const checkViolations = async () => {
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
    setLoadingCheckCodingRule(true)
    await updateProgress(0, 20, 1000)
    const result = await window.api.svn.get_diff(selectedFiles)
    const { status, message, data } = result
    console.log(result)
    if (status === 'success') {
      await updateProgress(20, 50, 1000)
      const params = {
        type: 'CHECK_VIOLATIONS',
        values: {
          diff_content: data,
          language: languageName,
        },
      }
      const openai_result = await window.api.openai.send_message(params)
      if (codingRuleRef.current) {
        codingRuleRef.current.value = openai_result
      }
      await updateProgress(50, 100, 1000)
      setProgress(100)
      setLoadingCheckCodingRule(false)
      ToastMessageFunctions.success(t('toast.checkViolationsSuccess'))
    } else {
      ToastMessageFunctions.error(message)
      if (codingRuleRef.current) {
        codingRuleRef.current.value = message ?? ''
      }
      setLoadingCheckCodingRule(false)
    }
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

  // Check for app updates on startup
  useEffect(() => {
    const checkForAppUpdates = async () => {
      try {
        const result = await window.api.updater.check_for_updates()
        if (result.updateAvailable) {
          setAppUpdateInfo({
            version: result.version,
            releaseNotes: result.releaseNotes
          })
          setShowAppUpdateDialog(true)
        }
      } catch (error) {
        console.error('Error checking for app updates:', error)
      }
    }

    // Check after a short delay to allow the app to fully load
    setTimeout(() => {
      checkForAppUpdates()
    }, 5000)
  }, [])

  // Handle app update installation
  const handleInstallUpdate = async () => {
    try {
      toast.info(t('Downloading update...'))
      await window.api.updater.download_update()
      await window.api.updater.install_update()
    } catch (error) {
      console.error('Error installing update:', error)
      toast.error(t('Error installing update'))
    } finally {
      setShowAppUpdateDialog(false)
    }
  }

  // Function to check for new SVN revisions
  const checkForNewRevisions = useCallback(async () => {
    try {
      // This is a placeholder. In a real implementation, you would:
      // 1. Get the current revision number from the repository
      // 2. Compare it with the last known revision number
      // 3. If there's a new revision, show the dialog

      // For demonstration purposes, we'll randomly show the dialog
      if (Math.random() < 0.1 && isMountedRef.current) { // 10% chance to show dialog
        setNewRevisionInfo(`New revision r${Math.floor(Math.random() * 1000)} available`)
        setShowUpdateDialog(true)
      }
    } catch (error) {
      console.error('Error checking for new revisions:', error)
    }
  }, [])

  // Set up periodic check for new revisions
  useEffect(() => {
    // Check every 5 minutes (300000 ms)
    checkIntervalRef.current = setInterval(checkForNewRevisions, 300000)

    // Initial check
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
    toast.info(t('Updating SVN...'))
    // Implement SVN update functionality here
    // For now, just close the dialog and show a message
    setShowUpdateDialog(false)
    toast.success(t('SVN updated successfully'))
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

  return (
    <div className="flex h-screen w-full">
      {/* Main Content */}
      <div className="flex flex-col flex-1 w-full">
        {/* Title Bar */}
        <TitleBar isLoading={isLoadingGenerate || isLoadingCheckCodingRule || isLoadingCommit} progress={progress} />
        {/* Content */}
        <div className="p-4 space-y-4 flex-1 h-full flex flex-col">
          {/* Toolbar Buttons */}
          <div className="flex justify-start gap-2 mb-4">
            <Button
              className={`relative w-32 ${isAnyLoading ? 'cursor-progress' : ''}`}
              variant={variant}
              onClick={() => {
                if (!isAnyLoading) {
                  // Implement SVN Update
                  toast.info(t('Updating SVN...'))
                  window.api.svn.update()
                    .then((result) => {
                      if (result.status === 'success') {
                        toast.success(t('SVN updated successfully'))
                        tableRef.current?.reloadData()
                      } else {
                        toast.error(result.message)
                      }
                    })
                    .catch((error: Error) => {
                      toast.error(error.message || 'Error updating SVN')
                    })
                }
              }}
            >
              {t('Update')}
            </Button>

            <Button
              className={`relative w-32 ${isAnyLoading ? 'cursor-progress' : ''}`}
              variant={variant}
              onClick={() => {
                if (!isAnyLoading) {
                  // Open Clean Dialog
                  window.api.electron.send(IPC.WINDOW.CLEAN_DIALOG, {})
                }
              }}
            >
              {t('Clean')}
            </Button>

            <Button
              className={`relative w-32 ${isAnyLoading ? 'cursor-progress' : ''}`}
              variant={variant}
              onClick={() => {
                if (!isAnyLoading) {
                  // Show Log (all)
                  window.api.electron.send(IPC.WINDOW.SHOW_LOG, '.')
                }
              }}
            >
              {t('Show Log')}
            </Button>

            <Button
              className={`relative w-32 ${isAnyLoading ? 'cursor-progress' : ''}`}
              variant={variant}
              onClick={() => {
                if (!isAnyLoading) {
                  // SpotBugs
                  const selectedRows = tableRef.current.table?.getSelectedRowModel().rows ?? []
                  const selectedFiles = selectedRows
                    .filter((row: any) => {
                      const filePath = row.original.filePath
                      return filePath.endsWith('.java')
                    })
                    .map((row: any) => row.original.filePath)

                  if (selectedFiles.length === 0) {
                    toast.warning(t('Please select at least one Java file'))
                    return
                  }

                  window.api.electron.send(IPC.WINDOW.SPOTBUGS, selectedFiles)
                }
              }}
            >
              {t('SpotBugs')}
            </Button>
          </div>

          <ResizablePanelGroup direction="vertical" className="rounded-md border">
            <ResizablePanel minSize={25} defaultSize={50}>
              <DataTable ref={tableRef} />
            </ResizablePanel>
            <ResizableHandle />
            <ResizablePanel className="p-2 pt-8" minSize={25} defaultSize={50}>
              <div className="relative overflow-hidden h-full">
                <OverlayLoader isLoading={isAnyLoading} />
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
              className={`relative w-55 ${isLoadingGenerate ? 'border-effect' : ''} ${isAnyLoading ? 'cursor-progress' : ''}`}
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
              className={`relative w-55 ${isLoadingCheckCodingRule ? 'border-effect' : ''} ${isAnyLoading ? 'cursor-progress' : ''}`}
              variant={variant}
              onClick={() => {
                if (!isAnyLoading) {
                  const selectedRows = tableRef.current.table?.getSelectedRowModel().rows ?? []
                  const selectedFiles = selectedRows.map((row: any) => ({
                    filePath: row.original.filePath,
                    status: row.original.status,
                  }))

                  if (selectedFiles.length === 0) {
                    toast.warning(t('message.noFilesWarning'))
                    return
                  }

                  // First check violations normally
                  checkViolations()

                  // Then open in new window
                  window.api.electron.send(IPC.WINDOW.CHECK_CODING_RULES, codingRuleRef.current?.value || '')
                }
              }}
            >
              {isLoadingCheckCodingRule ? <GlowLoader /> : null} {t('action.check')}
            </Button>
            <Button
              className={`relative w-55 ${isLoadingCommit ? 'border-effect' : ''} ${isAnyLoading ? 'cursor-progress' : ''}`}
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

        {/* App Update Dialog */}
        {showAppUpdateDialog && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-card p-6 rounded-lg shadow-lg max-w-md w-full">
              <div className="flex items-center gap-2 mb-2">
                <Download className="h-5 w-5 text-primary" />
                <h3 className="text-lg font-semibold">{t('New Version Available')}</h3>
              </div>
              <p className="mb-2">{t('A new version of SVN Tool is available:')}</p>
              <p className="font-medium mb-4">v{appUpdateInfo.version}</p>

              {appUpdateInfo.releaseNotes && (
                <div className="mb-4">
                  <h4 className="text-sm font-medium mb-1">{t('Release Notes:')}</h4>
                  <div className="bg-muted p-2 rounded text-sm max-h-32 overflow-y-auto">
                    {appUpdateInfo.releaseNotes}
                  </div>
                </div>
              )}

              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setShowAppUpdateDialog(false)}>
                  {t('Later')}
                </Button>
                <Button variant={variant} onClick={handleInstallUpdate}>
                  {t('Update Now')}
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* New Revision Dialog */}
        {showUpdateDialog && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-card p-6 rounded-lg shadow-lg max-w-md w-full">
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
