import { Button } from '@/components/ui/button'
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { useTranslation } from 'react-i18next'
interface InfoDialogProps {
  open?: boolean
  onOpenChange?: (open: boolean) => void
}

export function InfoDialog({ open, onOpenChange }: InfoDialogProps) {
  const { t } = useTranslation()

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{t('aboutDialog.title')}</DialogTitle>
          <DialogDescription>{t('aboutDialog.description')}</DialogDescription>
        </DialogHeader>
        <div className="space-y-2 text-sm">
          <p>
            <strong>{t('aboutDialog.developer')}:</strong> Nguyễn Quang Tùng
          </p>
          <p>
            <strong>{t('aboutDialog.version')}:</strong> 1.0.0
          </p>
          <p>
            <strong>{t('aboutDialog.email')}:</strong> quang-tung@system-exe.com.vn
          </p>
          <p>
            <strong>{t('aboutDialog.github')}:</strong>{' '}
            <a href="https://github.com/quang-tung-system-exe-com-vn" className="text-blue-600" target="_blank" rel="noreferrer">
              https://github.com/quang-tung-system-exe-com-vn
            </a>
          </p>
        </div>
        <DialogFooter>
          <DialogClose asChild>
            <Button>{t('aboutDialog.close')}</Button>
          </DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
