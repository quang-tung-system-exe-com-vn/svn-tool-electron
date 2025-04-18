import { TitleBar } from '@/components/layout/TitleBar'
import { useButtonVariant } from '@/components/stores/useAppearanceStore'
import { OverlayLoader } from '@/components/ui-elements/OverlayLoader'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { AlertCircle, AlertTriangle, Bug, FileCode, Info, RefreshCw } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'

interface BugInstance {
  id: string
  type: string
  category: string
  priority: number
  rank: number
  className: string
  methodName: string
  signature: string
  sourceFile: string
  startLine: number
  endLine: number
  message: string
  longMessage: string
  details: string
  severity: 'High' | 'Medium' | 'Low'
  categoryDescription: string
}

interface SpotBugsResult {
  totalBugs: number
  bugsBySeverity: {
    high: number
    medium: number
    low: number
  }
  bugInstances: BugInstance[]
}

export function SpotBugs() {
  const variant = useButtonVariant()
  const { t } = useTranslation()
  const [isLoading, setIsLoading] = useState(false)
  const [filePaths, setFilePaths] = useState<string[]>([])
  const [spotbugsResult, setSpotbugsResult] = useState<SpotBugsResult>({
    totalBugs: 0,
    bugsBySeverity: {
      high: 0,
      medium: 0,
      low: 0,
    },
    bugInstances: [],
  })
  const [selectedBug, setSelectedBug] = useState<BugInstance | null>(null)
  const [activeTab, setActiveTab] = useState('all')

  useEffect(() => {
    const handler = (_event: any, data: { filePaths: string[]; spotbugsResult?: any; error?: string }) => {
      setFilePaths(data.filePaths || [])

      if (data.error) {
        toast.error(`Error running SpotBugs: ${data.error}`)
        setIsLoading(false)
        return
      }

      if (data.spotbugsResult) {
        // Use the actual SpotBugs result from the main process
        setSpotbugsResult(data.spotbugsResult)

        // Select the first bug if available
        if (data.spotbugsResult.bugInstances.length > 0) {
          setSelectedBug(data.spotbugsResult.bugInstances[0])
        }

        toast.success(`SpotBugs analysis completed: ${data.spotbugsResult.totalBugs} issues found`)
      } else {
        // If no result is provided, start the analysis
        setIsLoading(true)
      }
    }

    window.api.on('load-diff-data', handler)

    return () => {
      // Clean up event listener
      window.api.on('load-diff-data', () => {})
    }
  }, [])

  const handleRefresh = () => {
    setIsLoading(true)
    // Send a message to the main process to re-run SpotBugs
    window.api.electron.send('window-action', 'refresh-spotbugs')
    toast.info('Refreshing SpotBugs analysis...')
  }

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case 'High':
        return <AlertCircle className="h-4 w-4 text-destructive" />
      case 'Medium':
        return <AlertTriangle className="h-4 w-4 text-warning" />
      case 'Low':
        return <Info className="h-4 w-4 text-info" />
      default:
        return <Info className="h-4 w-4" />
    }
  }

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'High':
        return 'bg-destructive/10 text-destructive border-destructive/20'
      case 'Medium':
        return 'bg-warning/10 text-warning border-warning/20'
      case 'Low':
        return 'bg-info/10 text-info border-info/20'
      default:
        return ''
    }
  }

  const filteredBugs = spotbugsResult.bugInstances.filter(bug => {
    if (activeTab === 'all') return true
    if (activeTab === 'high') return bug.severity === 'High'
    if (activeTab === 'medium') return bug.severity === 'Medium'
    if (activeTab === 'low') return bug.severity === 'Low'
    return true
  })

  return (
    <div className="flex h-screen w-full">
      <div className="flex flex-col flex-1 w-full">
        <TitleBar isLoading={isLoading} progress={0} />

        <div className="p-4 space-y-4 flex-1 h-full flex flex-col">
          <div className="flex justify-between items-center mb-4">
            <div className="flex items-center gap-3">
              <Bug className="h-6 w-6 text-primary" />
              <h2 className="text-xl font-semibold">{t('SpotBugs Analysis')}</h2>
            </div>
            <Button variant={variant} onClick={handleRefresh} className="flex items-center gap-2">
              <RefreshCw className="h-4 w-4" />
              {t('Refresh')}
            </Button>
          </div>

          <div className="flex gap-4 mb-2">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium">{t('Files Analyzed')}:</span>
              <Badge variant="outline" className="rounded-md">
                {filePaths.length}
              </Badge>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium">{t('Total Issues')}:</span>
              <Badge variant="outline" className="rounded-md">
                {spotbugsResult.totalBugs}
              </Badge>
            </div>
            <div className="flex items-center gap-2">
              <AlertCircle className="h-4 w-4 text-destructive" />
              <span className="text-sm font-medium">{t('High')}:</span>
              <Badge variant="outline" className="rounded-md bg-destructive/10 text-destructive border-destructive/20">
                {spotbugsResult.bugsBySeverity.high}
              </Badge>
            </div>
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-warning" />
              <span className="text-sm font-medium">{t('Medium')}:</span>
              <Badge variant="outline" className="rounded-md bg-warning/10 text-warning border-warning/20">
                {spotbugsResult.bugsBySeverity.medium}
              </Badge>
            </div>
            <div className="flex items-center gap-2">
              <Info className="h-4 w-4 text-info" />
              <span className="text-sm font-medium">{t('Low')}:</span>
              <Badge variant="outline" className="rounded-md bg-info/10 text-info border-info/20">
                {spotbugsResult.bugsBySeverity.low}
              </Badge>
            </div>
          </div>

          <Tabs defaultValue="all" value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col">
            <TabsList>
              <TabsTrigger value="all">All Issues</TabsTrigger>
              <TabsTrigger value="high">High</TabsTrigger>
              <TabsTrigger value="medium">Medium</TabsTrigger>
              <TabsTrigger value="low">Low</TabsTrigger>
            </TabsList>
            <TabsContent value={activeTab} className="flex-1 flex flex-col">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 flex-1">
                <div className="flex flex-col border rounded-md overflow-hidden">
                  <div className="bg-muted p-2 font-medium">Issues</div>
                  <ScrollArea className="flex-1">
                    <OverlayLoader isLoading={isLoading} />
                    <Table>
                      <TableHeader className="sticky top-0 z-10 bg-[var(--table-header-bg)]">
                        <TableRow>
                          <TableHead className="w-24">Severity</TableHead>
                          <TableHead>Issue</TableHead>
                          <TableHead className="w-32">Line</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredBugs.length > 0 ? (
                          filteredBugs.map(bug => (
                            <TableRow key={bug.id} className={selectedBug?.id === bug.id ? 'bg-muted/50' : ''} onClick={() => setSelectedBug(bug)} style={{ cursor: 'pointer' }}>
                              <TableCell>
                                <div className="flex items-center gap-1">
                                  {getSeverityIcon(bug.severity)}
                                  <span className="text-xs">{bug.severity}</span>
                                </div>
                              </TableCell>
                              <TableCell className="font-medium truncate max-w-[200px]">{bug.type}</TableCell>
                              <TableCell>{bug.startLine}</TableCell>
                            </TableRow>
                          ))
                        ) : (
                          <TableRow>
                            <TableCell colSpan={3} className="text-center py-4">
                              {isLoading ? 'Loading...' : 'No issues found'}
                            </TableCell>
                          </TableRow>
                        )}
                      </TableBody>
                    </Table>
                  </ScrollArea>
                </div>

                <div className="flex flex-col gap-4">
                  {selectedBug ? (
                    <>
                      <div className="border rounded-md overflow-hidden">
                        <div className="bg-muted p-2 font-medium flex items-center justify-between">
                          <span>Issue Details</span>
                          <Badge className={`${getSeverityColor(selectedBug.severity)}`}>{selectedBug.severity}</Badge>
                        </div>
                        <ScrollArea className="h-[200px]">
                          <div className="p-4 space-y-4">
                            <div>
                              <h3 className="text-sm font-medium">Type</h3>
                              <p className="text-sm">{selectedBug.type}</p>
                            </div>
                            <div>
                              <h3 className="text-sm font-medium">Message</h3>
                              <p className="text-sm">{selectedBug.longMessage}</p>
                            </div>
                            <div>
                              <h3 className="text-sm font-medium">Category</h3>
                              <p className="text-sm">{selectedBug.category}</p>
                            </div>
                            <div className="flex gap-4">
                              <div>
                                <h3 className="text-sm font-medium">Priority</h3>
                                <p className="text-sm">{selectedBug.priority}</p>
                              </div>
                              <div>
                                <h3 className="text-sm font-medium">Rank</h3>
                                <p className="text-sm">{selectedBug.rank}</p>
                              </div>
                            </div>
                          </div>
                        </ScrollArea>
                      </div>

                      <div className="border rounded-md overflow-hidden flex-1">
                        <div className="bg-muted p-2 font-medium flex items-center gap-2">
                          <FileCode className="h-4 w-4" />
                          <span>Location</span>
                        </div>
                        <ScrollArea className="h-[calc(100%-2.5rem)]">
                          <div className="p-4 space-y-4">
                            <div>
                              <h3 className="text-sm font-medium">File</h3>
                              <p className="text-sm font-mono">{selectedBug.sourceFile}</p>
                            </div>
                            <div>
                              <h3 className="text-sm font-medium">Class</h3>
                              <p className="text-sm font-mono">{selectedBug.className}</p>
                            </div>
                            <div>
                              <h3 className="text-sm font-medium">Method</h3>
                              <p className="text-sm font-mono">{selectedBug.methodName}</p>
                            </div>
                            <div>
                              <h3 className="text-sm font-medium">Line</h3>
                              <p className="text-sm">
                                {selectedBug.startLine} - {selectedBug.endLine}
                              </p>
                            </div>
                          </div>
                        </ScrollArea>
                      </div>
                    </>
                  ) : (
                    <div className="border rounded-md p-4 flex items-center justify-center h-full">
                      <p className="text-muted-foreground">Select an issue to view details</p>
                    </div>
                  )}
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  )
}
