import { OverlayLoader } from '@/components/ui-elements/OverlayLoader'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { AlertCircle, AlertTriangle, Bug, FileCode, Info } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import { SpotbugsToolbar } from './SpotbugsToolbar'

interface BugInstance {
  id: string
  type: string
  category: string
  priority: number
  rank: number
  className: string
  methodName: string
  signature: string
  isStatic?: boolean
  isPrimary?: boolean
  methodInfo?: {
    startLine: number
    endLine: number
    startBytecode: number
    endBytecode: number
    message: string
  }
  sourceFile: string
  startLine: number
  endLine: number
  message: string
  longMessage: string
  details: string
  severity: 'High' | 'Medium' | 'Low'
  categoryDescription: string
  localVariables?: Array<{
    name?: string
    message?: string
  }>
  properties?: Array<{
    name?: string
    value?: string
  }>
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
  const { t } = useTranslation()
  const [isLoading, setIsLoading] = useState(true)
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
  const [activeDetailTab, setActiveDetailTab] = useState('issue')

  useEffect(() => {
    const handler = (_event: any, data: { filePaths: string[]; spotbugsResult?: any; error?: string }) => {
      setIsLoading(true)
      setFilePaths(data.filePaths || [])
      if (data.error) {
        toast.error(t('toast.refreshingSpotbugs', `${data.error}`))
        setIsLoading(false)
        return
      }
      if (data.spotbugsResult) {
        console.log('SpotBugs result:', data.spotbugsResult)
        setSpotbugsResult(data.spotbugsResult)
        if (data.spotbugsResult.bugInstances.length > 0) {
          setSelectedBug(data.spotbugsResult.bugInstances[0])
        }
        toast.success(t('toast.refreshingSpotbugs', { totalBugs: data.spotbugsResult.totalBugs }))
        setIsLoading(false)
      } else {
        setIsLoading(false)
      }
    }

    window.api.on('load-diff-data', handler)
  }, [])

  const handleRefresh = () => {
    setIsLoading(true)
    window.api.electron.send('window-action', 'refresh-spotbugs')
    toast.info('toast.refreshingSpotbugs')
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

  // Hàm lấy màu sắc cho rank bug
  const getRankColor = (rank: number) => {
    if (rank <= 4) return 'bg-destructive/10 text-destructive border-destructive/20' // Scariest (1-4)
    if (rank <= 9) return 'bg-warning/10 text-warning border-warning/20' // Scary (5-9)
    if (rank <= 14) return 'bg-amber-500/10 text-amber-500 border-amber-500/20' // Troubling (10-14)
    if (rank <= 20) return 'bg-info/10 text-info border-info/20' // Concern (15-20)
    return 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' // Of concern (21+)
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
        <SpotbugsToolbar isLoading={isLoading} onRefresh={handleRefresh} />
        <div className="p-4 space-y-4 flex-1 h-full flex flex-col">
          <div className="flex justify-between items-center mb-4">
            <div className="flex items-center gap-3">
              <Bug className="h-6 w-6 text-primary" />
              <h2 className="text-xl font-semibold">{t('dialog.spotbugs.title')}</h2>
            </div>
          </div>

          <div className="flex gap-4 mb-2">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium">{t('dialog.spotbugs.filesAnalyzed')}:</span>
              <Badge variant="outline" className="rounded-md">
                {filePaths.length}
              </Badge>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium">{t('dialog.spotbugs.totalIssues')}:</span>
              <Badge variant="outline" className="rounded-md">
                {spotbugsResult.totalBugs}
              </Badge>
            </div>
            <div className="flex items-center gap-2">
              <AlertCircle className="h-4 w-4 text-destructive" />
              <span className="text-sm font-medium">{t('dialog.spotbugs.high')}:</span>
              <Badge variant="outline" className="rounded-md bg-destructive/10 text-destructive border-destructive/20 font-bold">
                {spotbugsResult.bugsBySeverity.high}
              </Badge>
            </div>
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-warning" />
              <span className="text-sm font-medium">{t('dialog.spotbugs.medium')}:</span>
              <Badge variant="outline" className="rounded-md bg-warning/10 text-warning border-warning/20 font-bold">
                {spotbugsResult.bugsBySeverity.medium}
              </Badge>
            </div>
            <div className="flex items-center gap-2">
              <Info className="h-4 w-4 text-info" />
              <span className="text-sm font-medium">{t('dialog.spotbugs.low')}:</span>
              <Badge variant="outline" className="rounded-md bg-info/10 text-info border-info/20 font-bold">
                {spotbugsResult.bugsBySeverity.low}
              </Badge>
            </div>
          </div>

          <Tabs defaultValue="all" value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col">
            <TabsList>
              <TabsTrigger value="all">{t('dialog.spotbugs.allIssues')}</TabsTrigger>
              <TabsTrigger value="high">{t('dialog.spotbugs.high')}</TabsTrigger>
              <TabsTrigger value="medium">{t('dialog.spotbugs.medium')}</TabsTrigger>
              <TabsTrigger value="low">{t('dialog.spotbugs.low')}</TabsTrigger>
            </TabsList>
            <TabsContent value={activeTab} className="flex-1 flex flex-col">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 flex-1">
                <div className="flex flex-col border rounded-md overflow-hidden">
                  <div className="bg-muted p-2 font-medium">{t('dialog.spotbugs.issues')}</div>
                  <ScrollArea className="flex-1">
                    <OverlayLoader isLoading={isLoading} />
                    <Table>
                      <TableHeader className="sticky top-0 z-10 bg-[var(--table-header-bg)]">
                        <TableRow>
                          <TableHead className="w-24">{t('table.severity')}</TableHead>
                          <TableHead>{t('table.issue')}</TableHead>
                          <TableHead className="w-32">{t('table.file')}</TableHead>
                          <TableHead className="w-24">{t('table.line')}</TableHead>
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
                              <TableCell>
                                <div className="flex flex-col">
                                  <span className="font-medium text-xs truncate max-w-[200px]" title={bug.type}>
                                    {bug.type}
                                  </span>
                                  <span className="text-xs text-muted-foreground truncate max-w-[200px]" title={bug.message}>
                                    {bug.message}
                                  </span>
                                </div>
                              </TableCell>
                              <TableCell className="text-xs font-mono truncate max-w-[100px]" title={bug.sourceFile}>
                                {bug.sourceFile}
                              </TableCell>
                              <TableCell>{bug.startLine}</TableCell>
                            </TableRow>
                          ))
                        ) : (
                          <TableRow>
                            <TableCell colSpan={4} className="text-center py-4">
                              {isLoading ? t('message.loading') : t('message.noIssues')}
                            </TableCell>
                          </TableRow>
                        )}
                      </TableBody>
                    </Table>
                  </ScrollArea>
                </div>

                <div className="flex flex-col gap-4">
                  {selectedBug ? (
                    <div className="border rounded-md overflow-hidden">
                      <div className="bg-muted p-2 font-medium flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span>{t('dialog.spotbugs.bugDetails')}</span>
                          <Badge className={`${getSeverityColor(selectedBug.severity)}`}>{selectedBug.severity}</Badge>
                        </div>
                      </div>

                      <Tabs value={activeDetailTab} onValueChange={setActiveDetailTab} className="w-full">
                        <TabsList className="w-full justify-start px-2 pt-2">
                          <TabsTrigger value="issue" className="flex items-center gap-1">
                            <AlertCircle className="h-4 w-4" />
                            <span>{t('dialog.spotbugs.issueDetails')}</span>
                          </TabsTrigger>
                          <TabsTrigger value="location" className="flex items-center gap-1">
                            <FileCode className="h-4 w-4" />
                            <span>{t('dialog.spotbugs.location')}</span>
                          </TabsTrigger>
                          {((selectedBug.localVariables && selectedBug.localVariables.length > 0) || (selectedBug.properties && selectedBug.properties.length > 0)) && (
                            <TabsTrigger value="details" className="flex items-center gap-1">
                              <Bug className="h-4 w-4" />
                              <span>{t('dialog.spotbugs.bugDetails')}</span>
                            </TabsTrigger>
                          )}
                        </TabsList>

                        {/* Issue Details Tab */}
                        <TabsContent value="issue" className="mt-0 border-0 p-0">
                          <ScrollArea className="h-[350px]">
                            <div className="p-4 space-y-4">
                              <div>
                                <h3 className="text-sm font-medium">{t('table.type')}</h3>
                                <p className="text-sm font-mono">{selectedBug.type}</p>
                              </div>
                              <div>
                                <h3 className="text-sm font-medium">{t('table.message')}</h3>
                                <p className="text-sm">{selectedBug.longMessage}</p>
                              </div>
                              <div>
                                <h3 className="text-sm font-medium">{t('table.category')}</h3>
                                <div className="flex items-center gap-2">
                                  <Badge variant="outline" className="rounded-md">
                                    {selectedBug.category}
                                  </Badge>
                                  {selectedBug.categoryDescription && <span className="text-xs text-muted-foreground">{selectedBug.categoryDescription}</span>}
                                </div>
                              </div>
                              <div className="flex gap-4">
                                <div>
                                  <h3 className="text-sm font-medium">{t('table.priority')}</h3>
                                  <Badge variant="outline" className={`${getSeverityColor(selectedBug.severity)}`}>
                                    {selectedBug.priority} ({selectedBug.severity})
                                  </Badge>
                                </div>
                                <div>
                                  <h3 className="text-sm font-medium">{t('table.rank')}</h3>
                                  <Badge variant="outline" className={`${getRankColor(selectedBug.rank)}`}>
                                    {selectedBug.rank}
                                  </Badge>
                                </div>
                              </div>
                            </div>
                          </ScrollArea>
                        </TabsContent>

                        {/* Location Tab */}
                        <TabsContent value="location" className="mt-0 border-0 p-0">
                          <ScrollArea className="h-[350px]">
                            <div className="p-4 space-y-4">
                              <div>
                                <h3 className="text-sm font-medium">{t('table.class')}</h3>
                                <p className="text-sm font-mono">{selectedBug.className}</p>
                              </div>
                              <div>
                                <h3 className="text-sm font-medium">{t('table.method')}</h3>
                                <div className="space-y-1">
                                  <p className="text-sm font-mono">
                                    {selectedBug.methodName}
                                    {selectedBug.signature}
                                  </p>
                                  <div className="flex gap-2 flex-wrap">
                                    {selectedBug.isStatic && (
                                      <Badge variant="outline" className="text-xs">
                                        {t('dialog.spotbugs.static')}
                                      </Badge>
                                    )}
                                    {selectedBug.isPrimary && (
                                      <Badge variant="outline" className="text-xs">
                                        {t('dialog.spotbugs.primary')}
                                      </Badge>
                                    )}
                                  </div>
                                  {selectedBug.methodInfo?.message && <p className="text-xs text-muted-foreground">{selectedBug.methodInfo.message}</p>}
                                </div>
                              </div>

                              {selectedBug.methodInfo && (
                                <div>
                                  <h3 className="text-sm font-medium">{t('dialog.spotbugs.methodLocation')}</h3>
                                  <div className="space-y-1">
                                    <div className="flex items-center gap-2">
                                      <span className="text-xs font-medium">{t('dialog.spotbugs.lines')}</span>
                                      <span className="text-xs font-mono">
                                        {selectedBug.methodInfo.startLine} - {selectedBug.methodInfo.endLine}
                                      </span>
                                    </div>
                                  </div>
                                </div>
                              )}
                            </div>
                          </ScrollArea>
                        </TabsContent>

                        {/* Bug Details Tab */}
                        {((selectedBug.localVariables && selectedBug.localVariables.length > 0) || (selectedBug.properties && selectedBug.properties.length > 0)) && (
                          <TabsContent value="details" className="mt-0 border-0 p-0">
                            <ScrollArea className="h-[350px]">
                              <div className="p-4 space-y-4">
                                {selectedBug.localVariables && selectedBug.localVariables.length > 0 && (
                                  <div>
                                    <h3 className="text-sm font-medium">{t('dialog.spotbugs.localVariables')}</h3>
                                    <div className="mt-2 space-y-2">
                                      {selectedBug.localVariables?.map((variable, index) => (
                                        <div key={index} className="border rounded p-2 bg-muted/30">
                                          <div className="flex items-center gap-2">
                                            <span className="text-xs font-medium">{t('dialog.spotbugs.name')}</span>
                                            <span className="text-xs font-mono font-bold">{variable.name || t('dialog.spotbugs.notAvailable')}</span>
                                          </div>
                                          {variable.message && (
                                            <div className="mt-1">
                                              <span className="text-xs font-medium">{t('table.message')}:</span>
                                              <p className="text-xs mt-1">{variable.message}</p>
                                            </div>
                                          )}
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                )}

                                {selectedBug.properties && selectedBug.properties.length > 0 && (
                                  <div>
                                    <h3 className="text-sm font-medium">{t('dialog.spotbugs.properties')}</h3>
                                    <div className="mt-2 space-y-2">
                                      {selectedBug.properties.map((property, index) => (
                                        <div key={index} className="border rounded p-2 bg-muted/30">
                                          <div className="flex items-center gap-2">
                                            <span className="text-xs font-medium">{t('dialog.spotbugs.name')}</span>
                                            <span className="text-xs font-mono font-bold">{property.name || t('dialog.spotbugs.notAvailable')}</span>
                                          </div>
                                          {property.value && (
                                            <div className="mt-1">
                                              <span className="text-xs font-medium">{t('dialog.spotbugs.value')}</span>
                                              <p className="text-xs font-mono mt-1">{property.value}</p>
                                            </div>
                                          )}
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                )}
                              </div>
                            </ScrollArea>
                          </TabsContent>
                        )}
                      </Tabs>
                    </div>
                  ) : (
                    <div className="border rounded-md p-4 flex items-center justify-center h-full">
                      <p className="text-muted-foreground">{t('message.selectIssue')}</p>
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
