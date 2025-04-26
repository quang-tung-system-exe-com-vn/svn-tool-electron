import { DataTable } from '@/components/common/DataTable'
import { FooterBar } from '@/components/layout/FooterBar'
import { TitleBar } from '@/components/layout/TitleBar'
import { LANGUAGES } from '@/components/shared/constants'
import { useAppearanceStore, useButtonVariant } from '@/components/stores/useAppearanceStore'
import { useHistoryStore } from '@/components/stores/useHistoryStore'
import { GlowLoader } from '@/components/ui-elements/GlowLoader'
import { OverlayLoader } from '@/components/ui-elements/OverlayLoader'
import toast from '@/components/ui-elements/Toast'
import { Button } from '@/components/ui/button'
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from '@/components/ui/resizable'
import { Textarea } from '@/components/ui/textarea'
import { IPC } from 'main/constants'
import { useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'

export function MainPage() {
  const variant = useButtonVariant()
  const { t } = useTranslation()
  const [isLoadingGenerate, setLoadingGenerate] = useState(false)
  const [isLoadingCommit, setLoadingCommit] = useState(false)
  const [progress, setProgress] = useState(0)
  const { language } = useAppearanceStore()
  const tableRef = useRef<any>(null)
  const isAnyLoading = isLoadingGenerate || isLoadingCommit
  const commitMessageRef = useRef<HTMLTextAreaElement>(null)
  const codingRuleRef = useRef<HTMLTextAreaElement>(null)
  const commitMessage = useRef('')
  const codingRule = useRef('')
  const { addHistory } = useHistoryStore()

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
      // Save commit message to history
      addHistory({ message: openai_result, date: new Date().toISOString() })
      toast.success(t('toast.generateSuccess'))
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
      toast.warning(t('message.commitMessageWarning'))
      return
    }
    const selectedRows = tableRef.current.table?.getSelectedRowModel().rows ?? []
    const selectedFiles = selectedRows.map((row: { original: { filePath: any; status: any } }) => ({
      filePath: row.original.filePath,
      status: row.original.status,
    }))
    if (selectedFiles.length === 0) {
      toast.warning(t('message.noFilesWarning'))
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
      toast.success(t('toast.generateSuccess'))
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
      toast.error(message)
      setLoadingCommit(false)
    }
  }

  const isMountedRef = useRef(true)
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
        <TitleBar isLoading={isLoadingGenerate || isLoadingCommit} tableRef={tableRef} />
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
              className={`relative ${isLoadingGenerate ? 'border-effect' : ''} ${isAnyLoading ? 'cursor-progress' : ''}`}
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
              className={`relative ${isAnyLoading ? 'cursor-progress' : ''}`}
              variant={variant}
              onClick={() => {
                if (!isAnyLoading) {
                  checkViolations()
                }
              }}
            >
              {t('action.check')}
            </Button>
            <Button
              className={`relative ${isAnyLoading ? 'cursor-progress' : ''}`}
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
                    toast.warning(t('toast.leastOneJavaFile'))
                    return
                  }
                  window.api.electron.send(IPC.WINDOW.SPOTBUGS, selectedFiles)
                }
              }}
            >
              {t('SpotBugs')}
            </Button>
            <Button
              className={`relative ${isLoadingCommit ? 'border-effect' : ''} ${isAnyLoading ? 'cursor-progress' : ''}`}
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
        <FooterBar isLoading={isLoadingGenerate || isLoadingCommit} progress={progress} />
      </div>
    </div>
  )
}
