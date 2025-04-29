'use client'
import toast from '@/components/ui-elements/Toast'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { useButtonVariant } from '@/stores/useAppearanceStore'
import { CircleAlert, MoveRight } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'

interface UpdateDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  currentVersion: string
  newVersion: string
  releaseNotes: string
}

export const UpdateDialog = ({ open, onOpenChange, currentVersion, newVersion, releaseNotes }: UpdateDialogProps) => {
  const { t } = useTranslation()
  const variant = useButtonVariant()
  const handleInstall = async () => {
    try {
      onOpenChange(false)
      await window.api.updater.install_updates()
    } catch (error: any) {
      console.error('Install update error:', error)
      toast.error(error.message || String(error) || t('toast.updateError'))
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[700px]" aria-describedby={t('dialog.updateApp.appVersion')}>
        <DialogHeader>
          <DialogTitle className="flex flex-row items-center gap-2">
            {t('dialog.updateApp.appVersion')}
            <div className="flex flex-row items-center gap-2">
              <span className="text-gray-500/100">{currentVersion}</span> <MoveRight className="w-4 h-4" /> {newVersion}
            </div>
          </DialogTitle>
          <DialogDescription>{t('dialog.updateApp.description')}</DialogDescription>
        </DialogHeader>

        <div className="mt-2 prose prose-sm dark:prose-invert max-h-[40vh] overflow-y-auto p-4 border rounded bg-muted/30 max-w-none">
          {releaseNotes ? <ReactMarkdown remarkPlugins={[remarkGfm]}>{releaseNotes}</ReactMarkdown> : <p>{t('dialog.updateApp.noReleaseNotes')}</p>}
        </div>
        <div className="border rounded w-full p-3 items-center justify-center text-sm flex flex-row gap-2 border-red-400">
          <CircleAlert className="w-4 h-4 text-red-400" />
          {t('dialog.updateApp.message')}
        </div>
        <DialogFooter>
          <Button variant={variant} onClick={() => onOpenChange(false)}>
            {t('common.cancel')}
          </Button>
          <Button variant={variant} onClick={handleInstall}>
            {t('common.install')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
