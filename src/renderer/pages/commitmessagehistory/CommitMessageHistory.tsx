'use client'
import toast from '@/components/ui-elements/Toast'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { cn } from '@/lib/utils'
import indexedDBService from '@/services/indexedDB'
import logger from '@/services/logger'
import { useHistoryStore } from '@/stores/useHistoryStore'
import { format } from 'date-fns'
import { Check, Copy } from 'lucide-react'
import { forwardRef, useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { CommitMessageHistoryToolbar } from './CommitMessageHistoryToolbar'

type CommitHistory = {
  message: string
  date: string
}
export function CommitMessageHistory() {
  const { t } = useTranslation()
  const { loadHistoryConfig, commitMessages } = useHistoryStore()
  const [isLoading, setIsLoading] = useState(true)
  const [result, setResult] = useState<CommitHistory[]>([])

  useEffect(() => {
    const initData = async () => {
      setIsLoading(true)
      try {
        const { initializeIfNeeded } = await import('@/services/indexedDB')
        await initializeIfNeeded()
        await loadHistoryConfig()
        await handleRefresh()
      } catch (error) {
        logger.error('Lỗi khi khởi tạo dữ liệu:', error)
      } finally {
        setIsLoading(false)
      }
    }

    initData()
  }, [t])

  const handleRefresh = async () => {
    setIsLoading(true)
    try {
      logger.info('Đang tải dữ liệu từ IndexedDB...')
      const messages = await indexedDBService.getHistoryMessages()
      logger.info('Dữ liệu từ IndexedDB:', messages)

      const sortedMessages = messages.sort((a, b) => {
        return new Date(b.date).getTime() - new Date(a.date).getTime()
      })
      setResult(sortedMessages)
      logger.info('Đã cập nhật state với dữ liệu từ IndexedDB')
    } catch (error) {
      logger.error('Lỗi khi tải dữ liệu từ IndexedDB:', error)
      logger.info('Sử dụng dữ liệu từ store:', commitMessages)
      const sortedMessages = [...commitMessages].sort((a, b) => {
        return new Date(b.date).getTime() - new Date(a.date).getTime()
      })
      setResult(sortedMessages)
    } finally {
      setIsLoading(false)
    }
  }

  const [copiedCode, setCopiedCode] = useState<string | null>(null)
  const copyToClipboard = (text: string) => {
    navigator.clipboard
      .writeText(text)
      .then(() => {
        setCopiedCode(text)
        setTimeout(() => setCopiedCode(null), 2000)
      })
      .catch(err => {
        logger.error('Không thể copy vào clipboard:', err)
        toast.error('Không thể copy vào clipboard')
      })
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
    <div className="flex flex-col h-screen w-full">
      <CommitMessageHistoryToolbar isLoading={isLoading} onRefresh={() => handleRefresh()} />
      <div className="p-4 space-y-4 flex-1 h-full flex flex-col overflow-hidden">
        <div className="flex flex-col border rounded-md overflow-auto h-full">
          <ScrollArea className="h-full w-full">
            <Table wrapperClassName={cn('overflow-clip', result.length === 0 && 'h-full')}>
              <TableHeader className="sticky top-0 z-10 bg-[var(--table-header-bg)]">
                <TableRow>
                  <TableHead className={cn('relative group h-9 px-2', '!text-[var(--table-header-fg)]', 'w-[150px')}>{t('dialog.commitMessageHistroy.date')}</TableHead>
                  <TableHead className={cn('relative group h-9 px-2', '!text-[var(--table-header-fg)]')}>{t('dialog.commitMessageHistroy.commitMessage')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {result.length > 0 ? (
                  result.map((item, index) => (
                    <TableRow key={index}>
                      <TableCell>
                        {(() => {
                          try {
                            return format(new Date(item.date), 'yyyy-MM-dd HH:mm:ss')
                          } catch (e) {
                            return item.date
                          }
                        })()}
                      </TableCell>
                      <TableCell className="whitespace-pre-wrap">
                        <div className="relative group">
                          <Button variant="ghost" size="icon" className="absolute right-2 top-2 h-7 w-7" onClick={() => copyToClipboard(item.message)} title="Copy code">
                            {copiedCode === item.message ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
                          </Button>
                          {item.message}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={3} className="h-24 text-center">
                      {t('common.noData')}
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </ScrollArea>
        </div>
      </div>
    </div>
  )
}
