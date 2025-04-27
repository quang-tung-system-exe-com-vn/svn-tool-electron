import toast from '@/components/ui-elements/Toast'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { useHistoryStore } from '@/stores/useHistoryStore'
import { format } from 'date-fns'
import { Copy } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { CommitMessageHistoryToolbar } from './CommitMessageHistoryToolbar'

type CommitHistory = {
  message: string
  date: string
}
export function CommitMessageHistory() {
  const { t } = useTranslation()
  const { commitMessages, loadHistoryConfig } = useHistoryStore()
  const [isLoading, setIsLoading] = useState(true)
  const [result, setResult] = useState<CommitHistory[]>([])

  useEffect(() => {
    setIsLoading(true)
    loadHistoryConfig()
    handleRefresh()
    setIsLoading(false)
  }, [t])

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
    toast.success(t('toast.copied'))
  }
  const handleRefresh = async () => {
    setIsLoading(true)
    const result = await window.api.history.get()
    setResult(result.commitMessages)
    setIsLoading(false)
  }
  return (
    <div className="flex h-screen w-full">
      <div className="flex flex-col flex-1 w-full">
        <CommitMessageHistoryToolbar isLoading={isLoading} onRefresh={() => handleRefresh()} />
        <ScrollArea className="h-full">
          {' '}
          <Table>
            <TableHeader className="sticky top-0 z-10 bg-background">
              {' '}
              <TableRow>
                <TableHead className="w-[180px]">{t('history.date')}</TableHead>
                <TableHead>{t('history.commitMessage')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {result.length > 0 ? (
                result.map((item, index) => (
                  <TableRow key={index}>
                    <TableCell className="font-medium">
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
                    {t('message.noResults')}
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </ScrollArea>
      </div>
    </div>
  )
}
