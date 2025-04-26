import { useHistoryStore } from '@/components/stores/useHistoryStore'
import toast from '@/components/ui-elements/Toast'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { format } from 'date-fns'
import { Copy } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'

export function HistoryPage() {
  const { t } = useTranslation()
  const { commitMessages, loadHistoryConfig } = useHistoryStore()
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    setIsLoading(true)
    loadHistoryConfig()
    setIsLoading(false)
  }, [t])

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
    toast.success(t('toast.copied'))
  }

  return (
    <div className="p-4 h-screen flex flex-col">
      <h1 className="text-xl font-semibold mb-4">{t('title.historyCommitMessage')}</h1>
      <div className="flex-grow overflow-hidden border rounded-md">
        {' '}
        {isLoading ? (
          <div className="flex items-center justify-center h-full">
            <p>{t('common.loading')}...</p>
          </div>
        ) : (
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
                {commitMessages.length > 0 ? (
                  commitMessages.map((item, index) => (
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
        )}
      </div>
    </div>
  )
}
