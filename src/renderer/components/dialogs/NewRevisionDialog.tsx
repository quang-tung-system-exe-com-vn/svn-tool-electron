'use client'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Dialog, DialogClose, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Textarea } from '@/components/ui/textarea'
import { cn } from '@/lib/utils'
import { Clock, Hash, User } from 'lucide-react'
import { forwardRef } from 'react'
import { useTranslation } from 'react-i18next'
import { useAppearanceStore } from '../../stores/useAppearanceStore'
import type { SvnStatusCode } from '../shared/constants'
import { StatusIcon } from '../ui-elements/StatusIcon'
import { ScrollArea } from '../ui/scroll-area'

interface NewRevisionDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  svnInfo: {
    author: string
    revision: string
    date: string
    curRevision: string
    commitMessage: string
    changedFiles: { status: SvnStatusCode; path: string }[]
  }
  onUpdate: () => void
  onCurRevisionUpdate: (revision: string) => void
  hasSvnUpdate: boolean
}

export function NewRevisionDialog({ open, onOpenChange, svnInfo, onUpdate, onCurRevisionUpdate, hasSvnUpdate }: NewRevisionDialogProps) {
  const { t, i18n } = useTranslation()
  const { buttonVariant } = useAppearanceStore()

  const handleSvnUpdate = () => {
    onUpdate()
    if (svnInfo?.revision && typeof onCurRevisionUpdate === 'function') {
      onCurRevisionUpdate(svnInfo.revision)
    }
    if (onOpenChange) onOpenChange(false)
  }

  const Table = forwardRef<HTMLTableElement, React.HTMLAttributes<HTMLTableElement> & { wrapperClassName?: string }>(({ className, wrapperClassName, ...props }, ref) => {
    return (
      <div className={cn('relative w-full overflow-auto', wrapperClassName)}>
        <table ref={ref} className={cn('w-full caption-bottom text-sm', className)} {...props} />
      </div>
    )
  })
  Table.displayName = 'Table'

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{t('dialog.updateSvn.title')}</DialogTitle>
        </DialogHeader>

        {svnInfo && (
          <Card className="max-w-md">
            <CardContent className="space-y-2 text-sm">
              <div className="flex items-center gap-2">
                <User className="w-4 h-4 text-muted-foreground" />
                <span>
                  <strong>{t('dialog.updateSvn.author')}</strong>
                  {svnInfo.author}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Hash className="w-4 h-4 text-muted-foreground" />
                <span>
                  <strong>{t('dialog.updateSvn.revision')}</strong>
                  {svnInfo.revision} ({t('dialog.updateSvn.curRevision')} {svnInfo.curRevision})
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-muted-foreground" />
                <span>
                  <strong>{t('dialog.updateSvn.date')}</strong>
                  {svnInfo.date &&
                    new Date(svnInfo.date).toLocaleString(i18n.language, {
                      year: 'numeric',
                      month: '2-digit',
                      day: '2-digit',
                      hour: '2-digit',
                      minute: '2-digit',
                      second: '2-digit',
                    })}
                </span>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Changed Files Table */}
        <div className="space-y-2">
          <label htmlFor="commitMessage" className="text-sm font-medium">
            {t('dialog.updateSvn.changedFiles')}
          </label>
          <div className="max-h-60 overflow-auto">
            <ScrollArea className="h-[200px] border-1 rounded-md">
              <Table wrapperClassName={cn('overflow-clip', (svnInfo?.changedFiles ?? []).length === 0 && 'h-full')}>
                <TableHeader className="sticky top-0 z-10 bg-[var(--table-header-bg)]">
                  <TableRow>
                    <TableHead>{t('dialog.updateSvn.action')}</TableHead>
                    <TableHead>{t('dialog.updateSvn.path')}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody className={(svnInfo?.changedFiles ?? []).length === 0 ? 'h-full' : ''}>
                  {(svnInfo?.changedFiles ?? []).map((file, index) => (
                    <TableRow key={index}>
                      <TableCell className="p-0 h-6 px-2">
                        <StatusIcon code={file.status} />
                      </TableCell>
                      <TableCell className="p-0 h-6 px-2 cursor-pointer break-words whitespace-normal">{file.path}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </ScrollArea>
          </div>
        </div>

        {/* Commit Message */}
        <div className="space-y-2">
          <label htmlFor="commitMessage" className="text-sm font-medium">
            {t('dialog.updateSvn.commitMessage')}
          </label>
          <Textarea value={svnInfo?.commitMessage} readOnly={true} className="min-h-[80px] cursor-not-allowed resize-none" />
        </div>

        <DialogFooter className="mt-4">
          <DialogClose asChild>
            <Button variant={buttonVariant}>{t('common.cancel')}</Button>
          </DialogClose>
          <Button variant="destructive" disabled={!hasSvnUpdate} onClick={handleSvnUpdate}>
            {t('common.update')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
