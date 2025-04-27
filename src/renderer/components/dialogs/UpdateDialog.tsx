import toast from '@/components/ui-elements/Toast'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { useButtonVariant } from '@/stores/useAppearanceStore'
import { useTranslation } from 'react-i18next'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'

interface UpdateDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  version?: string
  releaseNotes?: string
}

export const UpdateDialog = ({ open, onOpenChange, version, releaseNotes }: UpdateDialogProps) => {
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
      <DialogContent className="sm:max-w-[700px]">
        <DialogHeader>
          <DialogTitle>{t('dialog.updateApp.title')}</DialogTitle>
          <DialogDescription>{t('dialog.updateApp.appVersion', { 0: version || t('common.notAvailable') })}</DialogDescription>
        </DialogHeader>
        <div className="prose prose-sm dark:prose-invert max-h-[40vh] overflow-y-auto p-4 border rounded bg-muted/30 max-w-none">
          {releaseNotes ? <ReactMarkdown remarkPlugins={[remarkGfm]}>{releaseNotes}</ReactMarkdown> : <p>{t('dialog.updateApp.noReleaseNotes')}</p>}
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
