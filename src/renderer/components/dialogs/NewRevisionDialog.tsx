'use client'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Textarea } from '@/components/ui/textarea'
import { cn } from '@/lib/utils'
import { Clock, Hash, User } from 'lucide-react'
import { forwardRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useButtonVariant } from '../../stores/useAppearanceStore'
import type { SvnStatusCode } from '../shared/constants'
import { GlowLoader } from '../ui-elements/GlowLoader'
import { StatusIcon } from '../ui-elements/StatusIcon'
import toast from '../ui-elements/Toast'
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
  onCurRevisionUpdate: (revision: string) => void
  hasSvnUpdate: boolean
}

export function NewRevisionDialog({ open, onOpenChange, svnInfo, onCurRevisionUpdate, hasSvnUpdate }: NewRevisionDialogProps) {
  const { t, i18n } = useTranslation()
  const variant = useButtonVariant()
  const [isLoading, setLoading] = useState(false)

  const handleSvnUpdate = () => {
    toast.info(t('Updating SVN...'))
    setLoading(true)
    window.api.svn
      .update()
      .then(result => {
        if (result.status === 'success') {
          if (svnInfo?.revision && typeof onCurRevisionUpdate === 'function') {
            onCurRevisionUpdate(svnInfo.revision)
          }
          toast.success(t('SVN updated successfully'))
        } else {
          toast.error(result.message)
        }
      })
      .catch((error: Error) => {
        toast.error(error.message || 'Error updating SVN')
      })
      .finally(() => setLoading(false))
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
      <DialogContent className="sm:max-w-md" aria-describedby={t('dialog.updateSvn.title')}>
        <DialogHeader>
          <DialogTitle>{t('dialog.updateSvn.title')}</DialogTitle>
          <DialogDescription>{t('dialog.updateSvn.description', { 0: svnInfo.revision, 1: svnInfo.curRevision })}</DialogDescription>
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

        {hasSvnUpdate && (
          <DialogFooter className="mt-4">
            <DialogClose asChild>
              <Button disabled={isLoading} variant={variant}>
                {t('common.cancel')}
              </Button>
            </DialogClose>
            <Button
              className={`relative ${isLoading ? 'border-effect cursor-progress' : ''}`}
              variant={variant}
              onClick={() => {
                if (!isLoading) {
                  handleSvnUpdate()
                }
              }}
            >
              {isLoading ? <GlowLoader /> : null} {t('common.update')}
            </Button>
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  )
}
