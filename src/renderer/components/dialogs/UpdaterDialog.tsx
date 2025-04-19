import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'

interface UpdaterDialogProps {
  type: 'available' | 'downloaded'
  version?: string
  releaseNotes?: string
  onAction: () => void
  onCancel: () => void
}

export function UpdaterDialog({ type, version, releaseNotes, onAction, onCancel }: UpdaterDialogProps) {
  const { t } = useTranslation()
  const [open, setOpen] = useState(true)

  const handleAction = () => {
    onAction()
    setOpen(false)
  }

  const handleCancel = () => {
    onCancel()
    setOpen(false)
  }

  useEffect(() => {
    setOpen(true)
  }, [type, version])

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{type === 'available' ? t('Update Available') : t('Update Ready')}</DialogTitle>
          <DialogDescription>
            {type === 'available'
              ? t('A new version ({{version}}) is available!', { version })
              : t('The update has been downloaded. Restart the application to apply the updates.')}
          </DialogDescription>
        </DialogHeader>

        {releaseNotes && <div className="max-h-[200px] overflow-y-auto border rounded p-2 text-sm whitespace-pre-wrap">{releaseNotes}</div>}

        <DialogFooter>
          <Button variant="outline" onClick={handleCancel}>
            {t('Later')}
          </Button>
          <Button onClick={handleAction}>{type === 'available' ? t('Download') : t('Restart')}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
