import { DataTable } from '@/components/common/DataTable'
import { TitleBar } from '@/components/common/TitleBar'
import { useButtonVariant } from '@/components/stores/useAppearanceStore'
import { Button } from '@/components/ui/button'
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from '@/components/ui/resizable'
import { Textarea } from '@/components/ui/textarea'
import { useTranslation } from 'react-i18next'

export function MainPage() {
  const variant = useButtonVariant()
  const { t } = useTranslation()
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
            <DataTable />
          </ResizablePanel>
          <ResizableHandle />
          <ResizablePanel className="p-4 pt-8" minSize={25} defaultSize={25}>
            <Textarea placeholder={t('placeholder.commitMessage')} className="w-full h-full resize-none" />
          </ResizablePanel>
        </ResizablePanelGroup>

        {/* Footer Buttons */}
        <div className="flex justify-center gap-2">
          <Button variant={variant}>{t('action.generate')}</Button>
          <Button variant={variant}>{t('action.check')}</Button>
          <Button variant={variant}>{t('action.commit')}</Button>
        </div>
      </div>
    </div>
  )
}
