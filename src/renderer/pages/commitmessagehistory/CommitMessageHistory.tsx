'use client'
import toast from '@/components/ui-elements/Toast'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { cn } from '@/lib/utils'
import indexedDBService from '@/services/indexedDB'
import { useHistoryStore } from '@/stores/useHistoryStore'
import { format } from 'date-fns'
import { Copy } from 'lucide-react'
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
        await loadHistoryConfig()
        await handleRefresh()
      } catch (error) {
        console.error('Lỗi khi khởi tạo dữ liệu:', error)
      } finally {
        setIsLoading(false)
      }
    }

    initData()
  }, [t])

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
    toast.success(t('toast.copied'))
  }
  const handleRefresh = async () => {
    setIsLoading(true)
    try {
      console.log('Đang tải dữ liệu từ IndexedDB...')
      // Lấy dữ liệu trực tiếp từ IndexedDB thay vì qua API
      const messages = await indexedDBService.getHistoryMessages()
      console.log('Dữ liệu từ IndexedDB:', messages)

      const sortedMessages = messages.sort((a, b) => {
        return new Date(b.date).getTime() - new Date(a.date).getTime()
      })
      setResult(sortedMessages)
      console.log('Đã cập nhật state với dữ liệu từ IndexedDB')
    } catch (error) {
      console.error('Lỗi khi tải dữ liệu từ IndexedDB:', error)

      // Fallback: Sử dụng dữ liệu từ store nếu không thể truy cập IndexedDB trực tiếp
      console.log('Sử dụng dữ liệu từ store:', commitMessages)
      const sortedMessages = [...commitMessages].sort((a, b) => {
        return new Date(b.date).getTime() - new Date(a.date).getTime()
      })
      setResult(sortedMessages)
    } finally {
      setIsLoading(false)
    }
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
    <div className="flex h-screen w-full">
      <div className="flex flex-col flex-1 w-full">
        <CommitMessageHistoryToolbar isLoading={isLoading} onRefresh={() => handleRefresh()} />
        <div className="p-4 space-y-4 flex-1 h-full flex flex-col overflow-hidden">
          <ScrollArea className="flex-1 border-1 rounded-md">
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
                        {item.message}
                        <Button variant="ghost" size="icon" onClick={() => copyToClipboard(item.message)} title={t('common.copy')}>
                          <Copy className="h-4 w-4" />
                        </Button>
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
