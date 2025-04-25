import { Button } from '@/components/ui/button'
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import logger from '@/services/logger'
import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
interface InfoDialogProps {
  open?: boolean
  onOpenChange?: (open: boolean) => void
}

export function InfoDialog({ open, onOpenChange }: InfoDialogProps) {
  const { t } = useTranslation()
  const [appVersion, setAppVersion] = useState('1.0.0')

  // Get app version when dialog opens
  useEffect(() => {
    if (open) {
      const getAppVersion = async () => {
        try {
          const version = await window.api.updater.get_version()
          setAppVersion(version)
        } catch (error) {
          logger.error('Error getting app version:', error)
        }
      }

      getAppVersion()
    }
  }, [open])

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{t('dialog.aboutDialog.title')}</DialogTitle>
          <DialogDescription>{t('dialog.aboutDialog.description')}</DialogDescription>
        </DialogHeader>
        <div className="space-y-2 text-sm">
          <p>
            <strong>{t('dialog.aboutDialog.developer')}:</strong> Nguyễn Quang Tùng
          </p>
          <p>
            <strong>{t('dialog.aboutDialog.version')}:</strong> {appVersion}
          </p>
          <p>
            <strong>{t('dialog.aboutDialog.email')}:</strong> quang-tung@system-exe.com.vn
          </p>
          <p>
            <strong>{t('dialog.aboutDialog.github')}:</strong>{' '}
            <a href="https://github.com/quang-tung-system-exe-com-vn" className="text-blue-600" target="_blank" rel="noreferrer">
              https://github.com/quang-tung-system-exe-com-vn
            </a>
          </p>
        </div>
        <DialogFooter>
          <DialogClose asChild>
            <Button>{t('dialog.aboutDialog.close')}</Button>
          </DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
