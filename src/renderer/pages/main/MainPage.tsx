'use client'
import { LANGUAGES } from '@/components/shared/constants'
import { GlowLoader } from '@/components/ui-elements/GlowLoader'
import { OverlayLoader } from '@/components/ui-elements/OverlayLoader'
import toast from '@/components/ui-elements/Toast'
import { Button } from '@/components/ui/button'
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from '@/components/ui/resizable'
import { Textarea } from '@/components/ui/textarea'
import { DataTable } from '@/pages/main/DataTable'
import { TitleBar } from '@/pages/main/TitleBar'
import logger from '@/services/logger'
import { useAppearanceStore, useButtonVariant } from '@/stores/useAppearanceStore'
import { useHistoryStore } from '@/stores/useHistoryStore'
import { CircleAlert } from 'lucide-react'
import { IPC } from 'main/constants'
import { useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'

export function MainPage() {
  const { language } = useAppearanceStore()
  const { t } = useTranslation()
  const variant = useButtonVariant()
  const { addHistory } = useHistoryStore()
  const [isLoadingGenerate, setLoadingGenerate] = useState(false)
  const [isLoadingCommit, setLoadingCommit] = useState(false)
  const tableRef = useRef<any>(null)
  const commitMessageRef = useRef<HTMLTextAreaElement>(null)
  const commitMessage = useRef('')
  const isAnyLoading = isLoadingGenerate || isLoadingCommit

  const handleCommitMessage = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    commitMessage.current = e.target.value
  }

  const generateCommitMessage = async () => {
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
    const result = await window.api.svn.get_diff(selectedFiles)
    const { status, message, data } = result
    if (status === 'success') {
      const diffContent = data.diffContent ? data.diffContent : 'No modifications found.'
      const deletedFilesList = data.deletedFiles?.length > 0 ? data.deletedFiles.map((f: any) => `- ${f}`).join('\n') : []
      const params = {
        type: 'GENERATE_COMMIT',
        values: {
          diff_content: diffContent,
          language: languageName,
          deletedFiles: deletedFilesList,
        },
      }
      const openai_result = await window.api.openai.send_message(params)
      if (commitMessageRef.current) {
        commitMessageRef.current.value = openai_result
        logger.info(commitMessageRef.current.value)
      }
      addHistory({ message: openai_result, date: new Date().toISOString() })
      toast.success(t('toast.generateSuccess'))
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
    if (!commitMessageRef.current?.value) {
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
    const result = await window.api.svn.commit(commitMessageRef.current?.value, '', selectedFiles)
    const { status, message } = result

    if (status === 'success') {
      setLoadingCommit(false)
      toast.success(t('toast.commitSuccess'))
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

  return (
    <div className="flex h-screen w-full">
      {/* Main Content */}
      <div className="flex flex-col flex-1 w-full">
        {/* Title Bar */}
        <TitleBar isLoading={isLoadingGenerate || isLoadingCommit} tableRef={tableRef} />
        {/* Content */}
        <div className="p-4 space-y-4 flex-1 flex flex-col">
          <ResizablePanelGroup direction="vertical" className="rounded-md border">
            <ResizablePanel minSize={25} defaultSize={50}>
              <DataTable ref={tableRef} />
            </ResizablePanel>
            <ResizableHandle />
            <ResizablePanel className="p-2 pt-8 mb-[20px]" minSize={25} defaultSize={50}>
              <div className="relative overflow-hidden h-full">
                <OverlayLoader isLoading={isLoadingGenerate} />
                <Textarea
                  placeholder={t('placeholder.commitMessage')}
                  className="w-full h-full resize-none"
                  onChange={handleCommitMessage}
                  ref={commitMessageRef}
                  spellCheck={false}
                />
              </div>
              <span className="absolute flex flex-row text-xs py-[5px] gap-2">
                <CircleAlert className="w-4 h-4 text-yellow-600 dark:text-yellow-400" />
                {t('message.aiContentWarning')}
              </span>
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
              {isLoadingGenerate ? <GlowLoader /> : null} {t('common.generate')}
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
              {t('common.check')}
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
              {isLoadingCommit ? <GlowLoader /> : null} {t('common.commit')}
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
