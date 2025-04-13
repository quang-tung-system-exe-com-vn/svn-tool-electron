import { DataTable } from '@/components/common/DataTable'
import { FooterBar } from '@/components/common/FooterBar'
import { OverlayLoader } from '@/components/common/OverlayLoader'
import { TitleBar } from '@/components/common/TitleBar'
import { GlowLoader } from '@/components/shared/GlowLoader'
import { LANGUAGES } from '@/components/shared/constants'
import { useAppearanceStore, useButtonVariant } from '@/components/stores/useAppearanceStore'
import { Button } from '@/components/ui/button'
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from '@/components/ui/resizable'
import { Textarea } from '@/components/ui/textarea'
import { useRef, useState } from 'react'
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
  // const codingRuleRef = useRef<HTMLTextAreaElement>(null)
  const commitMessage = useRef('')
  // const codingRule = useRef('')

  const handleCommitMessage = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    commitMessage.current = e.target.value
  }
  // const handleCheckCodingRule = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
  //   codingRule.current = e.target.value
  // }

  const generateCommitMessage = async () => {
    setProgress(0)
    const selectedRows = tableRef.current?.getSelectedRowModel().rows ?? []
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
    const result = await window.api.svn.get_svn_diff(selectedFiles)
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
        commitMessageRef.current.value = message
      }
      setLoadingGenerate(false)
    }
  }

  const checkViolations = async () => {
    setProgress(0)
    const selectedRows = tableRef.current?.getSelectedRowModel().rows ?? []
    const selectedFiles = selectedRows.map((row: { original: { filePath: any; status: any } }) => ({
      filePath: row.original.filePath,
      status: row.original.status,
    }))
    if (selectedFiles.length === 0) {
      toast.warning(t('message.noFilesWarning'))
      return
    }
    const languageName = LANGUAGES.find(lang => lang.code === language)?.label || 'English'
    setLoadingCheckCodingRule(true)
    await updateProgress(0, 20, 1000)
    const result = await window.api.svn.get_svn_diff(selectedFiles)
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
      await updateProgress(50, 100, 1000)
      setProgress(100)
      setLoadingCheckCodingRule(false)
      toast.success(t('toast.checkViolationsSuccess'))
    } else {
      toast.error(message)
      // setCheckCodingRule(message)
      setLoadingCheckCodingRule(false)
    }
  }

  const commitCode = async () => {
    setProgress(0)
    if (!commitMessage.current) {
      toast.warning(t('message.commitMessageWarning'))
      return
    }
    const selectedRows = tableRef.current?.getSelectedRowModel().rows ?? []
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
    // const result = await window.api.svn.commit(commitMessage.current, codingRule.current, selectedFiles)
    // const { status, message, data } = result
    // console.log(result)

    // if (status === 'success') {
    await updateProgress(20, 50, 1000)
    await updateProgress(50, 100, 1000)
    setProgress(100)
    setLoadingCommit(false)
    toast.success(t('toast.commitSuccess'))
    // } else {
    // toast.error(message)
    // setCheckCodingRule(message)
    // setLoadingCommit(false)
    // }
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
        setProgress(progress)
        if (currentTime < duration) {
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
      </div>
    </div>
  )
}
