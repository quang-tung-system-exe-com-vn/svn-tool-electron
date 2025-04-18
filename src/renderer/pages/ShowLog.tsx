import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { useButtonVariant } from '@/components/stores/useAppearanceStore'
import { TitleBar } from '@/components/layout/TitleBar'
import { OverlayLoader } from '@/components/ui-elements/OverlayLoader'
import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import { RefreshCw } from 'lucide-react'

interface LogEntry {
  revision: string
  author: string
  date: string
  message: string
  action: string
}

interface LogFile {
  path: string
  action: string
}

export function ShowLog() {
  const variant = useButtonVariant()
  const { t } = useTranslation()
  const [isLoading, setIsLoading] = useState(false)
  const [filePath, setFilePath] = useState('')
  const [logEntries, setLogEntries] = useState<LogEntry[]>([])
  const [selectedRevision, setSelectedRevision] = useState<string | null>(null)
  const [commitMessage, setCommitMessage] = useState('')
  const [changedFiles, setChangedFiles] = useState<LogFile[]>([])

  useEffect(() => {
    const handler = (_event: any, { filePath }: any) => {
      setFilePath(filePath)
      loadLogData(filePath)
    }
    window.api.on('load-diff-data', handler)
  }, [])

  const loadLogData = async (path: string) => {
    try {
      setIsLoading(true)
      const result = await window.api.svn.log_xml(path)

      if (result.status === 'success') {
        // Parse XML data
        const parser = new DOMParser()
        const xmlDoc = parser.parseFromString(result.data, 'text/xml')
        const logEntries = xmlDoc.getElementsByTagName('logentry')

        const parsedEntries: LogEntry[] = []

        for (let i = 0; i < logEntries.length; i++) {
          const entry = logEntries[i]
          const revision = entry.getAttribute('revision') || ''
          const author = entry.getElementsByTagName('author')[0]?.textContent || ''
          const date = entry.getElementsByTagName('date')[0]?.textContent || ''
          const message = entry.getElementsByTagName('msg')[0]?.textContent || ''

          // Determine action based on paths
          const paths = entry.getElementsByTagName('path')
          let action = 'modified'

          if (paths.length > 0) {
            const kind = paths[0].getAttribute('kind')
            const changeType = paths[0].getAttribute('action')

            if (changeType === 'A') action = 'added'
            else if (changeType === 'D') action = 'deleted'
            else if (changeType === 'M') action = 'modified'
            else if (changeType === 'R') action = 'replaced'
          }

          parsedEntries.push({
            revision,
            author,
            date: new Date(date).toLocaleString(),
            message,
            action
          })
        }

        setLogEntries(parsedEntries)

        // Select the first revision by default
        if (parsedEntries.length > 0) {
          selectRevision(parsedEntries[0].revision)
        }
      } else {
        toast.error(result.message)
      }
    } catch (error) {
      console.error('Error loading log data:', error)
      toast.error('Error loading log data')
    } finally {
      setIsLoading(false)
    }
  }

  const selectRevision = async (revision: string) => {
    setSelectedRevision(revision)
    const entry = logEntries.find(e => e.revision === revision)
    if (entry) {
      setCommitMessage(entry.message)

      // In a real implementation, you would fetch the files changed in this revision
      // For now, we'll create some sample data
      const sampleFiles: LogFile[] = [
        { path: 'src/main/java/com/example/App.java', action: entry.action },
        { path: 'src/main/resources/config.xml', action: 'modified' },
        { path: 'pom.xml', action: 'modified' }
      ]
      setChangedFiles(sampleFiles)
    }
  }

  const handleRefresh = () => {
    loadLogData(filePath)
  }

  return (
    <div className="flex h-screen w-full">
      <div className="flex flex-col flex-1 w-full">
        <TitleBar isLoading={isLoading} progress={0} />

        <div className="p-4 space-y-4 flex-1 h-full flex flex-col">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold">
              {filePath === '.' ? 'SVN Log (All)' : `SVN Log: ${filePath}`}
            </h2>
            <Button variant={variant} onClick={handleRefresh} className="flex items-center gap-2">
              <RefreshCw className="h-4 w-4" />
              {t('Refresh')}
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 flex-1">
            <div className="flex flex-col border rounded-md overflow-hidden">
              <div className="bg-muted p-2 font-medium">Revision History</div>
              <ScrollArea className="flex-1">
                <OverlayLoader isLoading={isLoading} />
                <Table>
                  <TableHeader className="sticky top-0 z-10 bg-[var(--table-header-bg)]">
                    <TableRow>
                      <TableHead className="w-24">Revision</TableHead>
                      <TableHead className="w-24">Action</TableHead>
                      <TableHead className="w-32">Author</TableHead>
                      <TableHead className="w-40">Date</TableHead>
                      <TableHead>Message</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {logEntries.length > 0 ? (
                      logEntries.map((entry) => (
                        <TableRow
                          key={entry.revision}
                          className={selectedRevision === entry.revision ? 'bg-muted/50' : ''}
                          onClick={() => selectRevision(entry.revision)}
                          style={{ cursor: 'pointer' }}
                        >
                          <TableCell className="font-medium">r{entry.revision}</TableCell>
                          <TableCell>{entry.action}</TableCell>
                          <TableCell>{entry.author}</TableCell>
                          <TableCell>{entry.date}</TableCell>
                          <TableCell className="truncate max-w-[200px]">{entry.message}</TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center py-4">
                          {isLoading ? 'Loading...' : 'No log entries found'}
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </ScrollArea>
            </div>

            <div className="flex flex-col gap-4">
              <div className="border rounded-md overflow-hidden flex-1">
                <div className="bg-muted p-2 font-medium">Commit Message</div>
                <ScrollArea className="h-[200px]">
                  <div className="p-4 whitespace-pre-wrap">{commitMessage}</div>
                </ScrollArea>
              </div>

              <div className="border rounded-md overflow-hidden flex-1">
                <div className="bg-muted p-2 font-medium">Changed Files</div>
                <ScrollArea className="h-[calc(100%-2.5rem)]">
                  <Table>
                    <TableHeader className="sticky top-0 z-10 bg-[var(--table-header-bg)]">
                      <TableRow>
                        <TableHead className="w-24">Action</TableHead>
                        <TableHead>Path</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {changedFiles.length > 0 ? (
                        changedFiles.map((file, index) => (
                          <TableRow key={index}>
                            <TableCell>{file.action}</TableCell>
                            <TableCell>{file.path}</TableCell>
                          </TableRow>
                        ))
                      ) : (
                        <TableRow>
                          <TableCell colSpan={2} className="text-center py-4">
                            {selectedRevision ? 'No files changed in this revision' : 'Select a revision to view changed files'}
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </ScrollArea>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
