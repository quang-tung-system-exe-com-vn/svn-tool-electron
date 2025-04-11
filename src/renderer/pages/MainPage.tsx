import { DataTable } from '@/components/common/DataTable'
import { TitleBar } from '@/components/common/TitleBar'
import { LANGUAGES } from '@/components/shared/constants'
import { useAppearanceStore, useButtonVariant } from '@/components/stores/useAppearanceStore'
import { Button } from '@/components/ui/button'
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from '@/components/ui/resizable'
import { Textarea } from '@/components/ui/textarea'
import { useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'

export function MainPage() {
  const variant = useButtonVariant()
  const { t } = useTranslation()
  const [text, setText] = useState('')
  const [isLoading, setLoading] = useState(false)
  const { language } = useAppearanceStore()

  const tableRef = useRef<any>(null)

  const generateCommitMessage = async () => {
    const selectedRows = tableRef.current?.getSelectedRowModel().rows ?? []
    const selectedFiles = selectedRows.map((row: { original: { filePath: any; status: any } }) => ({
      filePath: row.original.filePath,
      status: row.original.status,
    }))
    const languageName = LANGUAGES.find(lang => lang.code === language)?.label || 'English'
    setLoading(true)
    const diff_content = await window.api.svn.get_svn_diff(selectedFiles)
    const params = {
      type: 'GENERATE_COMMIT',
      values: {
        diff_content,
        language: languageName,
      },
    }
    const result = await window.api.openai.send_message(params)
    setText(result)
    setLoading(false)
  }

  const checkViolations = async () => {
    const selectedRows = tableRef.current?.getSelectedRowModel().rows ?? []
    const selectedFiles = selectedRows.map((row: { original: { filePath: any; status: any } }) => ({
      filePath: row.original.filePath,
      status: row.original.status,
    }))
    const languageName = LANGUAGES.find(lang => lang.code === language)?.label || 'English'
    console.log(selectedFiles)
    setLoading(true)
    const diff_content = await window.api.svn.get_svn_diff(selectedFiles)
    const params = {
      type: 'CHECK_VIOLATIONS',
      values: {
        diff_content,
        language: languageName,
      },
    }
    const result = await window.api.openai.send_message(params)
    setLoading(false)
  }
  return (
    <div className="flex flex-col h-screen">
      {/* Title Bar */}
      <TitleBar />
      {/* Content */}
      <div className="p-4 space-y-4 flex-1 flex flex-col">
        <div>
          <Button variant={variant}>{t('action.refresh')}</Button>
        </div>

        {/* Resizable Panel Group */}
        <ResizablePanelGroup direction="vertical" className="rounded-lg border">
          <ResizablePanel minSize={50} defaultSize={75}>
            <DataTable ref={tableRef} />
          </ResizablePanel>
          <ResizableHandle />
          <ResizablePanel className="p-4 pt-8" minSize={25} defaultSize={25}>
            <Textarea placeholder={t('placeholder.commitMessage')} className="w-full h-full resize-none" value={text} onChange={e => setText(e.target.value)} spellCheck={false} />
          </ResizablePanel>
        </ResizablePanelGroup>

        {/* Footer Buttons */}
        <div className="flex justify-center gap-2">
          <Button variant={variant} onClick={generateCommitMessage} disabled={isLoading}>
            {isLoading ? t('action.loading') : t('action.generate')}
          </Button>
          <Button variant={variant} onClick={checkViolations} disabled={isLoading}>
            {isLoading ? t('action.loading') : t('action.check')}
          </Button>
          <Button variant={variant} onClick={() => console.log('Commit')} disabled={isLoading}>
            {t('action.commit')}
          </Button>
        </div>
      </div>
    </div>
  )
}
