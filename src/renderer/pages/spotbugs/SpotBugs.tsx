'use client'
import { CodeSnippetDialog } from '@/components/dialogs/CodeSnippetDialog'
import { BUG_DESCRIPTIONS, CATEGORY_DESCRIPTIONS } from '@/components/shared/constants'
import { OverlayLoader } from '@/components/ui-elements/OverlayLoader'
import toast from '@/components/ui-elements/Toast'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { ChartContainer, ChartLegend, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart'
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from '@/components/ui/resizable'
import { ScrollArea } from '@/components/ui/scroll-area'
import { TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { cn } from '@/lib/utils'
import logger from '@/services/logger'
import { AlertCircle, AlertTriangle, ArrowDown, ArrowUp, ArrowUpDown, BarChart as BarChartIcon, Bot, Bug, FileCode, Info, List } from 'lucide-react'
import { forwardRef, useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Bar, BarChart, CartesianGrid, Pie, PieChart, XAxis, YAxis } from 'recharts'
import { SpotbugsAIChat } from './SpotbugsAIChat'
import { SpotbugsToolbar } from './SpotbugsToolbar'
import type { BugInstance, SpotBugsResult } from './constants'

export function SpotBugs() {
  const { t } = useTranslation()
  const [isLoading, setIsLoading] = useState(true)
  const [filePaths, setFilePaths] = useState<string[]>([])
  const [spotbugsResult, setSpotbugsResult] = useState<SpotBugsResult>({
    version: { version: '', sequence: null, timestamp: null, analysisTimestamp: null, release: '' },
    project: { projectName: '', filename: '', jars: [], srcDirs: [] },
    summary: { timestamp: '', totalClasses: 0, referencedClasses: 0, totalBugs: 0, totalSize: 0, numPackages: 0, priority1: 0, priority2: 0, priority3: 0 },
    fileStats: [],
    packageStats: [],
    errors: { errors: 0, missingClasses: 0, missingClassList: [] },
    bugCategories: {},
    bugPatterns: {},
    bugCodes: {},
    bugInstances: [],
    bugCount: { total: 0, byPriority: { high: 0, medium: 0, low: 0 } },
  })
  const [selectedBug, setSelectedBug] = useState<BugInstance | null>(null)
  const [activeTab, setActiveTab] = useState('all')
  const [activeDetailTab, setActiveDetailTab] = useState('summary')

  const [fileContent, setFileContent] = useState('')
  const [codeSnippets, setCodeSnippets] = useState<Record<string, string>>({})
  const [selectedSourceLineKey, setSelectedSourceLineKey] = useState<string>('')

  useEffect(() => {
    const handler = (_event: any, data: { filePaths: string[]; spotbugsResult?: any; error?: string }) => {
      setIsLoading(true)
      setFilePaths(data.filePaths || [])
      if (data.error) {
        toast.error(t('toast.spotbugsError', { 0: data.error }))
        setIsLoading(false)
        return
      }
      if (data.spotbugsResult) {
        logger.info('SpotBugs result:', data.spotbugsResult)
        const processedResult = processSpotBugsResult(data.spotbugsResult)
        setSpotbugsResult(processedResult)

        if (processedResult.bugInstances.length > 0) {
          const firstBug = processedResult.bugInstances[0]
          setSelectedBug(firstBug)
          setActiveDetailTab('summary')
          // Không gọi handleBugSelection ở đây nữa, sẽ dùng useEffect riêng
        } else {
          setSelectedBug(null)
        }
        toast.success(t('toast.spotbugsSuccess', { 0: processedResult.bugCount.total }))
        setIsLoading(false)
      } else {
        setIsLoading(false)
      }
    }

    window.api.on('load-diff-data', handler)

    // Cleanup listener on component unmount
    return () => {
      window.api.removeAllListeners('load-diff-data') // Corrected: Use removeAllListeners
    }
  }, [t])

  // useEffect để lấy code snippet khi selectedBug thay đổi
  useEffect(() => {
    if (selectedBug) {
      fetchCodeSnippetsForBug(selectedBug)

      // Mở file trong editor
      if (selectedBug.sourceFile && selectedBug.startLine && selectedBug.startLine > 0) {
        logger.info(`Requesting to open file: ${selectedBug.sourceFile} at line ${selectedBug.startLine}`)
        window.api.electron.send('open-file-in-editor', { filePath: selectedBug.sourceFile, lineNumber: selectedBug.startLine })
      } else {
        logger.info('Cannot open file: sourceFile or startLine is missing or invalid.', selectedBug)
      }
    } else {
      // Reset khi không có bug nào được chọn
      setCodeSnippets({})
      setFileContent('')
    }
  }, [selectedBug, filePaths]) // Thêm filePaths vào dependency array

  // Hàm mới để lấy code snippets
  const fetchCodeSnippetsForBug = async (bug: BugInstance) => {
    if (bug.sourceLines && bug.sourceLines.length > 0) {
      const snippets: Record<string, string> = {}
      let mainFileContent = '' // Lưu nội dung file chính
      for (const sourceLine of bug.sourceLines) {
        if (!sourceLine.sourcefile || sourceLine.start === null || sourceLine.end === null) continue
        try {
          const matchingFilePath = filePaths.find(filePath => filePath.endsWith(sourceLine.sourcefile) || sourceLine.sourcefile.endsWith(filePath))
          if (matchingFilePath) {
            const content = await window.api.system.read_file(matchingFilePath)
            if (content && typeof content === 'string') {
              const lines = content.split('\n')
              const startIdx = Math.max(0, sourceLine.start - 6)
              const endIdx = Math.min(lines.length - 1, sourceLine.end + 4)
              const codeSnippet = lines.slice(startIdx, endIdx + 1).join('\n')
              const key = `${sourceLine.classname}:${sourceLine.start}-${sourceLine.end}`
              snippets[key] = codeSnippet
              if (sourceLine.primary || !mainFileContent) {
                // Ưu tiên file primary hoặc file đầu tiên
                mainFileContent = content
              }
            }
          }
        } catch (error) {
          logger.error('Error reading source file:', error)
        }
      }
      setCodeSnippets(snippets)
      setFileContent(mainFileContent) // Cập nhật nội dung file chính
    }
  }

  const handleRefresh = () => {
    setIsLoading(true)
    setSelectedBug(null)
    setActiveDetailTab('summary')

    setSpotbugsResult({
      version: { version: '', sequence: null, timestamp: null, analysisTimestamp: null, release: '' },
      project: { projectName: '', filename: '', jars: [], srcDirs: [] },
      summary: { timestamp: '', totalClasses: 0, referencedClasses: 0, totalBugs: 0, totalSize: 0, numPackages: 0, priority1: 0, priority2: 0, priority3: 0 },
      fileStats: [],
      packageStats: [],
      errors: { errors: 0, missingClasses: 0, missingClassList: [] },
      bugCategories: {},
      bugPatterns: {},
      bugCodes: {},
      bugInstances: [],
      bugCount: { total: 0, byPriority: { high: 0, medium: 0, low: 0 } },
    })
    window.api.electron.send('window-action', 'refresh-spotbugs')
    toast.info(t('toast.refreshingSpotbugs'))
  }

  const processSpotBugsResult = (result: any): SpotBugsResult => {
    if (result.project && result.summary && result.bugInstances) {
      const processedBugInstances = result.bugInstances.map((bug: BugInstance) => {
        const primaryClass = bug.classes?.find(c => c.primary) || bug.classes?.[0]
        const primarySourceLine = bug.sourceLines?.find(sl => sl.primary) || primaryClass?.sourceLine || bug.sourceLines?.[0]
        return {
          ...bug,
          className: primaryClass?.classname || '',
          sourceFile: primarySourceLine?.sourcefile || '',
          startLine: primarySourceLine?.start ?? 0,
          endLine: primarySourceLine?.end ?? 0,
          message: bug.shortMessage || bug.longMessage || '',
          details: bug.patternDetails?.details || bug.longMessage || '',
          categoryDescription: bug.categoryDetails?.description || getCategoryDescriptions(bug.category) || '',
        }
      })
      return {
        ...result,
        bugInstances: processedBugInstances,
        bugCount: {
          total: result.summary.totalBugs || 0,
          byPriority: {
            high: result.summary.priority1 || 0,
            medium: result.summary.priority2 || 0,
            low: result.summary.priority3 || 0,
          },
        },
      }
    }
    logger.info('Processing potentially simplified SpotBugs result structure.')
    const bugInstances = (result.bugInstances || result.bugs || []).map((bug: any) => ({
      ...bug,
      id: bug.id || `${bug.type}-${bug.sourceFile}-${bug.startLine}-${Math.random()}`,
      priority: bug.priority || 3,
      rank: bug.rank || 20,
      shortMessage: bug.shortMessage || bug.message || 'No short message',
      longMessage: bug.longMessage || bug.message || 'No long message',
      classes: bug.classes || [{ classname: bug.className || 'UnknownClass' }],
      methods: bug.methods || [],
      fields: bug.fields || [],
      localVariables: bug.localVariables || [],
      sourceLines: bug.sourceLines || [
        {
          classname: bug.className || 'UnknownClass',
          start: bug.startLine || bug.line || 0,
          end: bug.endLine || bug.line || 0,
          sourcefile: bug.sourceFile || 'UnknownFile.java',
          sourcepath: bug.sourcePath || 'UnknownFile.java',
          primary: true,
        },
      ],
      ints: bug.ints || [],
      strings: bug.strings || [],
      properties: bug.properties || [],
      className: bug.className || 'UnknownClass',
      sourceFile: bug.sourceFile || 'UnknownFile.java',
      startLine: bug.startLine || bug.line || 0,
      endLine: bug.endLine || bug.line || 0,
      message: bug.message || 'No message provided',
      details: bug.details || 'No details provided',
      categoryDescription: getCategoryDescriptions(bug.category) || 'Unknown category',
    }))

    const totalBugs = bugInstances.length
    const highPriority = bugInstances.filter((b: BugInstance) => b.priority === 1).length
    const mediumPriority = bugInstances.filter((b: BugInstance) => b.priority === 2).length
    const lowPriority = bugInstances.filter((b: BugInstance) => b.priority === 3).length

    return {
      version: result.version || { version: 'unknown', sequence: null, timestamp: null, analysisTimestamp: null, release: '' },
      project: result.project || { projectName: 'unknown', filename: '', jars: [], srcDirs: [] },
      summary: result.summary || {
        timestamp: new Date().toISOString(),
        totalClasses: 0,
        referencedClasses: 0,
        totalBugs: totalBugs,
        totalSize: 0,
        numPackages: 0,
        priority1: highPriority,
        priority2: mediumPriority,
        priority3: lowPriority,
      },
      fileStats: result.fileStats || [],
      packageStats: result.packageStats || [],
      errors: result.errors || { errors: 0, missingClasses: 0, missingClassList: [] },
      bugCategories: result.bugCategories || {},
      bugPatterns: result.bugPatterns || {},
      bugCodes: result.bugCodes || {},
      bugInstances: bugInstances,
      bugCount: {
        total: totalBugs,
        byPriority: { high: highPriority, medium: mediumPriority, low: lowPriority },
      },
    }
  }

  const getPrioriyIcon = (priority: number) => {
    switch (priority) {
      case 1:
        return <AlertCircle strokeWidth={1.5} className="h-4 w-4 text-red-800 dark:text-red-400 border-red-500/20" />
      case 2:
        return <AlertTriangle strokeWidth={1.5} className="h-4 w-4 text-yellow-800 dark:text-yellow-400 border-yellow-500/20" />
      case 3:
        return <Info strokeWidth={1.5} className="h-4 w-4 text-blue-800 dark:text-blue-400 border-blue-500/20" />
      default:
        return <Info strokeWidth={1.5} className="h-4 w-4 text-gray-800 dark:text-gray-400 border-gray-500/20" />
    }
  }

  const getPriorityName = (priority: number) => {
    switch (priority) {
      case 1:
        return 'dialog.spotbugs.high'
      case 2:
        return 'dialog.spotbugs.medium'
      case 3:
        return 'dialog.spotbugs.low'
      default:
        return ''
    }
  }

  const getCategoryDescriptions = (categoryType: string): string => {
    return CATEGORY_DESCRIPTIONS[categoryType] || 'Unknown Category'
  }

  const getBugDescriptionDetails = (bugType: string): string => {
    return BUG_DESCRIPTIONS[bugType] || 'No details available for this bug type.'
  }

  const getPriorityColor = (priority: number) => {
    switch (priority) {
      case 1:
        return 'bg-red-200/10 text-red-800 dark:text-red-400 border-red-500/20'
      case 2:
        return 'bg-yellow-200/10 text-yellow-800 dark:text-yellow-400 border-yellow-500/20'
      case 3:
        return 'bg-blue-200/10 text-blue-800 dark:text-blue-400 border-blue-500/20'
      default:
        return 'bg-gray-200/10 text-gray-800 dark:text-gray-400 border-gray-500/20'
    }
  }

  const getRankColor = (rank: number) => {
    if (rank <= 4) return 'bg-red-200/10 text-red-800 dark:text-red-400 border-red-500/20'
    if (rank <= 9) return 'bg-yellow-200/10 text-yellow-800 dark:text-yellow-400 border-yellow-500/20'
    if (rank <= 14) return 'bg-amber-200/10 text-amber-800 dark:text-amber-400 border-amber-500/20'
    if (rank <= 20) return 'bg-blue-200/10 text-blue-800 dark:text-blue-400 border-blue-500/20'
    return 'bg-emerald-200/10 text-emerald-800 dark:text-emerald-400 border-emerald-500/20'
  }

  const filteredBugs = useMemo(
    () =>
      spotbugsResult.bugInstances.filter(bug => {
        if (activeTab === 'all') return true
        if (activeTab === 'high') return bug.priority === 1
        if (activeTab === 'medium') return bug.priority === 2
        if (activeTab === 'low') return bug.priority === 3
        return true
      }),
    [spotbugsResult.bugInstances, activeTab]
  )

  const Table = forwardRef<HTMLTableElement, React.HTMLAttributes<HTMLTableElement> & { wrapperClassName?: string }>(({ className, wrapperClassName, ...props }, ref) => {
    return (
      <div className={cn('relative w-full overflow-auto', wrapperClassName)}>
        <table ref={ref} className={cn('w-full caption-bottom text-sm', className)} {...props} />
      </div>
    )
  })
  Table.displayName = 'Table'

  const [sortKey, setSortKey] = useState<'priority' | 'category' | 'sourceFile' | 'type' | ''>('')
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc' | ''>('')

  const sortedBugs = useMemo(() => {
    const bugsToSort = [...filteredBugs]
    if (!sortKey) return bugsToSort

    return bugsToSort.sort((a: BugInstance, b: BugInstance) => {
      const aVal = a[sortKey] ?? ''
      const bVal = b[sortKey] ?? ''
      if (sortKey === 'priority') {
        const aNum = Number(aVal)
        const bNum = Number(bVal)
        if (aNum < bNum) return sortDirection === 'asc' ? -1 : 1
        if (aNum > bNum) return sortDirection === 'asc' ? 1 : -1
        return 0
      }
      const comparison = String(aVal).localeCompare(String(bVal))
      return sortDirection === 'asc' ? comparison : -comparison
    })
  }, [filteredBugs, sortKey, sortDirection])

  const handleSort = (key: typeof sortKey) => {
    if (sortKey === key) {
      if (sortDirection === 'asc') {
        setSortDirection('desc')
      } else if (sortDirection === 'desc') {
        setSortKey('')
        setSortDirection('')
      } else {
        setSortDirection('asc')
      }
    } else {
      setSortKey(key)
      setSortDirection('asc')
    }
  }

  function roundedRect(x: any, y: any, width: any, height: any, radiusTopLeft: any, radiusTopRight: number, radiusBottomRight: number, radiusBottomLeft: number) {
    return `
        M${x + radiusTopLeft},${y}
        H${x + width - radiusTopRight}
        Q${x + width},${y} ${x + width},${y + radiusTopRight}
        V${y + height - radiusBottomRight}
        Q${x + width},${y + height} ${x + width - radiusBottomRight},${y + height}
        H${x + radiusBottomLeft}
        Q${x},${y + height} ${x},${y + height - radiusBottomLeft}
        V${y + radiusTopLeft}
        Q${x},${y} ${x + radiusTopLeft},${y}
        Z
      `
  }

  function getBarRadius(data: any[], priorityKeys: string[]) {
    const posMap: Record<string, { single?: string; top?: string; bottom?: string }> = {}
    for (const row of data) {
      const prioritiesWithValue = priorityKeys.filter(key => row[key] > 0)
      if (prioritiesWithValue.length === 1) {
        posMap[row.packageName] = { single: prioritiesWithValue[0] }
      } else if (prioritiesWithValue.length > 1) {
        const bottomKey = priorityKeys.find(key => row[key] > 0)
        const topKey = [...priorityKeys].reverse().find(key => row[key] > 0)
        posMap[row.packageName] = {
          top: topKey,
          bottom: bottomKey,
        }
      }
    }
    return posMap
  }

  const getRadiusForPriority = (packageName: string, priority: string, posMap: Record<string, any>) => {
    if (!posMap[packageName]) return [0, 0, 0, 0]
    if (posMap[packageName].single === priority) return [4, 4, 4, 4]
    if (posMap[packageName].top === priority) return [4, 4, 0, 0]
    if (posMap[packageName].bottom === priority) return [0, 0, 4, 4]
    return [0, 0, 0, 0]
  }

  const CustomBarShape = (props: any) => {
    const { x, y, width, height, payload, dataKey, fill, posMap } = props // Pass posMap
    const packageName = payload.packageName
    const radius = getRadiusForPriority(packageName, dataKey, posMap) // Pass posMap
    const d = roundedRect(x, y, width, height, ...(radius as [number, number, number, number]))
    return <path d={d} fill={fill} />
  }

  const packageStatsData = useMemo(() => {
    return spotbugsResult.packageStats.slice(0, 10).map(stat => ({
      packageName: stat.packageName.split('.').pop() || stat.packageName,
      priority1: stat.priority1,
      priority2: stat.priority2,
      priority3: stat.priority3,
      fullPackage: stat.packageName,
    }))
  }, [spotbugsResult.packageStats])

  const packagePosMap = useMemo(() => {
    return getBarRadius(packageStatsData, ['priority3', 'priority2', 'priority1'])
  }, [packageStatsData])

  // Hàm xử lý khi chọn một bug trong bảng
  const handleBugSelection = (bug: BugInstance) => {
    setSelectedBug(bug)
    setActiveDetailTab('summary')
    // Việc lấy code snippet và mở file sẽ được xử lý bởi useEffect theo dõi selectedBug
  }

  const handleExplainInAI = (sourceLine: any) => {
    const sourceLineKey = `${sourceLine.classname}:${sourceLine.start}-${sourceLine.end}`
    setSelectedSourceLineKey(sourceLineKey)
    setActiveDetailTab('ai')
  }

  return (
    <div className="flex h-screen w-full">
      <div className="flex flex-col flex-1 w-full">
        <SpotbugsToolbar isLoading={isLoading} onRefresh={handleRefresh} />
        <div className="p-4 space-y-4 flex-1 h-full flex flex-col">
          <Tabs defaultValue="all" value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col">
            <TabsList>
              <TabsTrigger value="all">
                <Bug strokeWidth={1.5} className="h-4 w-4  text-green-800 dark:text-green-400 border-green-500/20" />
                {t('dialog.spotbugs.allIssues')}
                <Badge variant="outline" className="rounded-md ml-2">
                  {spotbugsResult.bugCount.total}
                </Badge>
              </TabsTrigger>
              <TabsTrigger value="high">
                <AlertCircle strokeWidth={1.5} className="h-4 w-4 text-red-800 dark:text-red-400 border-red-500/20" />
                {t('dialog.spotbugs.high')}
                <Badge variant="outline" className="rounded-md ml-2 bg-red-200/10 text-red-800 dark:text-red-400 border-red-500/20 font-bold">
                  {spotbugsResult.bugCount.byPriority.high}
                </Badge>
              </TabsTrigger>
              <TabsTrigger value="medium">
                <AlertTriangle strokeWidth={1.5} className="h-4 w-4 text-yellow-800 dark:text-yellow-400 border-yellow-500/20" />
                {t('dialog.spotbugs.medium')}
                <Badge variant="outline" className="rounded-md ml-2 bg-yellow-200/10 text-yellow-800 dark:text-yellow-400 border-yellow-500/20 font-bold">
                  {spotbugsResult.bugCount.byPriority.medium}
                </Badge>
              </TabsTrigger>
              <TabsTrigger value="low">
                <Info strokeWidth={1.5} className="h-4 w-4 text-blue-800 dark:text-blue-400 border-blue-500/20" />
                {t('dialog.spotbugs.low')}
                <Badge variant="outline" className="rounded-md ml-2 bg-blue-200/10 text-blue-800 dark:text-blue-400 border-blue-500/20 font-bold">
                  {spotbugsResult.bugCount.byPriority.low}
                </Badge>
              </TabsTrigger>
              <TabsTrigger value="chart">
                <BarChartIcon strokeWidth={1.5} className="h-4 w-4 text-pink-800 dark:text-pink-400 border-pink-500/20" />
                {t('dialog.spotbugs.chart')}
              </TabsTrigger>
              <TabsTrigger value="filelist">
                <List strokeWidth={1.5} className="h-4 w-4" />
                {t('dialog.spotbugs.fileList')}
                <Badge variant="outline" className="rounded-md ml-2">
                  {filePaths.length}
                </Badge>
              </TabsTrigger>
            </TabsList>

            <TabsContent value={activeTab} className="flex-1 flex flex-col h-full mt-4">
              <div className="space-y-4 flex-1 h-full flex flex-col overflow-hidden">
                {(activeTab === 'all' || activeTab === 'high' || activeTab === 'medium' || activeTab === 'low') && (
                  <ResizablePanelGroup direction="horizontal">
                    <ResizablePanel defaultSize={50} minSize={50} className="h-full pr-2">
                      <div className="flex flex-col border rounded-md overflow-hidden h-full">
                        <div className="bg-muted p-2 font-medium">{t('dialog.spotbugs.issues')}</div>
                        <ScrollArea className="h-full w-full">
                          <Table wrapperClassName={cn('overflow-clip', sortedBugs.length === 0 && 'h-full')}>
                            <TableHeader className="sticky top-0 z-10 bg-[var(--table-header-bg)]">
                              <TableRow>
                                <TableHead className="w-24 cursor-pointer" onClick={() => handleSort('priority')}>
                                  <div className="flex items-center gap-1">
                                    {t('table.severity')}
                                    {sortKey !== 'priority' && <ArrowUpDown className="w-4 h-4" />}
                                    {sortKey === 'priority' && sortDirection === 'asc' && <ArrowUp className="w-4 h-4" />}
                                    {sortKey === 'priority' && sortDirection === 'desc' && <ArrowDown className="w-4 h-4" />}
                                  </div>
                                </TableHead>
                                <TableHead className="cursor-pointer" onClick={() => handleSort('sourceFile')}>
                                  <div className="flex items-center gap-1">
                                    {t('table.file')}
                                    {sortKey !== 'sourceFile' && <ArrowUpDown className="w-4 h-4" />}
                                    {sortKey === 'sourceFile' && sortDirection === 'asc' && <ArrowUp className="w-4 h-4" />}
                                    {sortKey === 'sourceFile' && sortDirection === 'desc' && <ArrowDown className="w-4 h-4" />}
                                  </div>
                                </TableHead>
                                <TableHead className="w-15 cursor-pointer" onClick={() => handleSort('category')}>
                                  <div className="flex items-center gap-1">
                                    {t('table.category')}
                                    {sortKey !== 'category' && <ArrowUpDown className="w-4 h-4" />}
                                    {sortKey === 'category' && sortDirection === 'asc' && <ArrowUp className="w-4 h-4" />}
                                    {sortKey === 'category' && sortDirection === 'desc' && <ArrowDown className="w-4 h-4" />}
                                  </div>
                                </TableHead>
                                <TableHead className="cursor-pointer" onClick={() => handleSort('type')}>
                                  <div className="flex items-center gap-1">
                                    {t('table.issue')}
                                    {sortKey !== 'type' && <ArrowUpDown className="w-4 h-4" />}
                                    {sortKey === 'type' && sortDirection === 'asc' && <ArrowUp className="w-4 h-4" />}
                                    {sortKey === 'type' && sortDirection === 'desc' && <ArrowDown className="w-4 h-4" />}
                                  </div>
                                </TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {sortedBugs.length > 0 ? (
                                sortedBugs.map(bug => (
                                  <TableRow
                                    key={bug.id}
                                    className={cn(
                                      selectedBug?.id === bug.id ? 'bg-blue-100 hover:bg-blue-100 dark:bg-blue-900 dark:hover:bg-blue-900' : '',
                                      'transition-colors duration-150'
                                    )}
                                    onClick={() => handleBugSelection(bug)} // Use new handler
                                    style={{ cursor: 'pointer' }}
                                  >
                                    <TableCell>
                                      <div className="flex items-center gap-1">
                                        {bug.priority !== null ? getPrioriyIcon(bug.priority) : null}
                                        <span>{t(getPriorityName(bug.priority))}</span>
                                      </div>
                                    </TableCell>
                                    <TableCell title={bug.sourceFile}>{bug.sourceFile}</TableCell>
                                    <TableCell>{bug.category}</TableCell>
                                    <TableCell>
                                      <div className="flex flex-col">
                                        <span className="font-medium text-xs break-all" title={bug.type}>
                                          {bug.type}
                                        </span>
                                        <span className="text-xs text-muted-foreground break-all" title={bug.message}>
                                          {bug.message}
                                        </span>
                                      </div>
                                    </TableCell>
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
                    </ResizablePanel>
                    <ResizableHandle className="bg-transparent" />

                    <ResizablePanel defaultSize={50} minSize={50} className="h-full">
                      <div className="flex flex-col gap-4 h-full">
                        {selectedBug ? (
                          <div className="border rounded-md overflow-hidden h-full flex flex-col">
                            <div className="bg-muted p-2 font-medium flex items-center justify-between">
                              <div className="flex items-center justify-between gap-2 w-full">
                                <span>{t('dialog.spotbugs.bugDetails')}</span>
                                <div className="flex flex-row items-center gap-2">
                                  <h3 className="text-sm font-semibold">{t('table.severity')}</h3>
                                  <Badge variant="outline" className={`${getPriorityColor(selectedBug.priority)} w-fit`}>
                                    {t(getPriorityName(selectedBug.priority))} ({selectedBug.priority})
                                  </Badge>
                                  <h3 className="text-sm font-semibold">{t('table.rank')}</h3>
                                  <Badge variant="outline" className={`${getRankColor(selectedBug.rank)} w-fit`}>
                                    {selectedBug.rank}
                                  </Badge>
                                </div>
                              </div>
                            </div>
                            <Tabs value={activeDetailTab} onValueChange={setActiveDetailTab} className="w-full flex-1 flex flex-col overflow-hidden">
                              <TabsList className="w-full justify-start flex-shrink-0">
                                <TabsTrigger value="summary" className="flex items-center gap-1">
                                  <AlertCircle strokeWidth={1.5} className="h-4 w-4" />
                                  <span>{t('dialog.spotbugs.bugSummary')}</span>
                                </TabsTrigger>
                                <TabsTrigger value="details" className="flex items-center gap-1">
                                  <Bug strokeWidth={1.5} className="h-4 w-4" />
                                  <span>{t('dialog.spotbugs.bugDetails')}</span>
                                </TabsTrigger>
                                <TabsTrigger value="ai" className="flex items-center gap-1">
                                  <Bot strokeWidth={1.5} className="h-4 w-4" />
                                  <span>{t('dialog.spotbugs.aiAssistant')}</span>
                                </TabsTrigger>
                              </TabsList>
                              {/* Bug Summary Tab */}
                              <TabsContent value="summary" className="mt-2 border-0 p-0 flex-1 overflow-hidden">
                                <ScrollArea className="h-full p-4">
                                  <div className="space-y-2">
                                    {/* Category */}
                                    <div className="border rounded-md bg-muted/30 p-4 space-y-2">
                                      <div className="flex items-center justify-between">
                                        <h3 className="text-sm font-semibold">{t('table.category')}</h3>
                                        <Badge className="bg-black text-white dark:bg-white dark:text-black">{selectedBug.category}</Badge>
                                      </div>
                                      <p className="text-xs break-all text-muted-foreground">{t(getCategoryDescriptions(selectedBug.category))}</p>
                                    </div>

                                    {/* Type */}
                                    <div className="border rounded-md bg-muted/30 p-4 space-y-2">
                                      <div className="flex items-center justify-between">
                                        <h3 className="text-sm font-semibold">{t('table.type')}</h3>
                                        <Badge className="bg-black text-white dark:bg-white dark:text-black">{selectedBug.type}</Badge>
                                      </div>
                                      <p className="text-xs break-all text-muted-foreground">{t(getBugDescriptionDetails(selectedBug.type))}</p>
                                    </div>

                                    {/* Message */}
                                    <div className="border rounded-md bg-muted/30 p-4">
                                      <h3 className="text-sm font-semibold">{t('table.message')}</h3>
                                      <p className="text-xs mt-2 break-all text-muted-foreground">{selectedBug.longMessage}</p>
                                    </div>

                                    <div className="border rounded-md bg-muted/30 p-4">
                                      <h3 className="text-sm font-medium">{t('table.class')}</h3>
                                      <p className="text-sm font-mono">{selectedBug.className}</p>

                                      {selectedBug.methods && selectedBug.methods.length > 0 && (
                                        <div>
                                          <h3 className="text-sm font-medium">{t('dialog.spotbugs.methods')}</h3>
                                          <div className="space-y-4 mt-2">
                                            {selectedBug.methods.map((method, index) => (
                                              <div key={index} className="overflow-x-auto border rounded-md bg-muted/30">
                                                <table className="min-w-full">
                                                  <tbody>
                                                    {/* Method Name */}
                                                    <tr>
                                                      <th className="text-xs p-2 text-left border-b-[1px] border-r-[1px] w-[90px]">{t('dialog.spotbugs.name')}</th>
                                                      <td className="text-xs p-2 border-b-[1px] font-mono font-bold">{method.name}</td>
                                                    </tr>

                                                    {/* Message */}
                                                    {method.message && (
                                                      <tr>
                                                        <th className="text-xs p-2 text-left border-b-[1px] border-r-[1px]">{t('table.message')}</th>
                                                        <td className="text-xs p-2 border-b-[1px] break-all">{method.message}</td>
                                                      </tr>
                                                    )}

                                                    {/* Lines */}
                                                    {method.sourceLine && (
                                                      <tr>
                                                        <th className="text-xs p-2 text-left border-b-[1px] border-r-[1px]">{t('dialog.spotbugs.lines')}</th>
                                                        <td className="text-xs p-2 border-b-[1px]">
                                                          {method.sourceLine.start} - {method.sourceLine.end}
                                                        </td>
                                                      </tr>
                                                    )}

                                                    {/* Roles (Colspan 2) */}
                                                    {(method.isStatic || method.primary || (method.role && method.role !== 'PRIMARY')) && (
                                                      <tr>
                                                        <td className="text-xs p-2" colSpan={2}>
                                                          <div className="flex flex-wrap gap-2">
                                                            {method.isStatic && <Badge className="bg-black text-white dark:bg-white dark:text-black">STATIC</Badge>}
                                                            {method.primary && <Badge className="bg-black text-white dark:bg-white dark:text-black">PRIMARY</Badge>}
                                                            {method.role && method.role !== 'PRIMARY' && (
                                                              <Badge className="bg-black text-white dark:bg-white dark:text-black">{method.role}</Badge>
                                                            )}
                                                          </div>
                                                        </td>
                                                      </tr>
                                                    )}
                                                  </tbody>
                                                </table>
                                              </div>
                                            ))}
                                          </div>
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                </ScrollArea>
                              </TabsContent>
                              {/* Location Tab */}
                              {/* <TabsContent value="location" className="mt-2 border-0 p-0 flex-1 overflow-hidden">
                                <ScrollArea className="h-full p-4">
                                </ScrollArea>
                              </TabsContent> */}
                              {/* Bug Details Tab */}
                              <TabsContent value="details" className="mt-2 border-0 p-0 flex-1 overflow-hidden">
                                <ScrollArea className="h-full p-4">
                                  <div className="space-y-4 mb-[35px]">
                                    {/* Source Lines */}
                                    {selectedBug.sourceLines && selectedBug.sourceLines.length > 0 && (
                                      <div>
                                        <h3 className="text-sm font-medium">{t('dialog.spotbugs.sourceLines')}</h3>
                                        <div className="mt-2 space-y-4">
                                          {selectedBug.sourceLines.map((sourceLine, index) => {
                                            const sourceLineKey = `${sourceLine.classname}:${sourceLine.start}-${sourceLine.end}`
                                            const codeSnippet = codeSnippets[sourceLineKey]

                                            return (
                                              <div key={index} className="overflow-x-auto border rounded-md bg-muted/30">
                                                <table className="min-w-full">
                                                  <tbody>
                                                    <tr>
                                                      <th className="text-xs p-2 text-left border-b-[1px] border-r-[1px] w-[90px]">{t('table.class')}</th>
                                                      <td className="text-xs p-2 border-b-[1px] break-all">{sourceLine.classname}</td>
                                                    </tr>
                                                    {sourceLine.sourcefile && (
                                                      <tr>
                                                        <th className="text-xs p-2 text-left border-b-[1px] border-r-[1px]">{t('table.file')}</th>
                                                        <td className="text-xs p-2 border-b-[1px] break-all">{sourceLine.sourcefile}</td>
                                                      </tr>
                                                    )}
                                                    {(sourceLine.start !== null || sourceLine.end !== null) && (
                                                      <tr>
                                                        <th className="text-xs p-2 text-left border-b-[1px] border-r-[1px]">{t('dialog.spotbugs.lines')}</th>
                                                        <td className="text-xs p-2 border-b-[1px]">
                                                          {`${sourceLine.start !== null ? sourceLine.start : '?'} - ${sourceLine.end !== null ? sourceLine.end : '?'}`}
                                                        </td>
                                                      </tr>
                                                    )}
                                                    {sourceLine.role && (
                                                      <tr>
                                                        <th className="text-xs p-2 text-left border-b-[1px] border-r-[1px]">Role</th>
                                                        <td className="text-xs p-2 border-b-[1px]">
                                                          <Badge className="bg-black text-white dark:bg-white dark:text-black">{sourceLine.role}</Badge>
                                                        </td>
                                                      </tr>
                                                    )}
                                                    <tr>
                                                      <th className="text-xs p-2 text-left border-b-[1px] border-r-[1px]">Primary</th>
                                                      <td className="text-xs p-2 border-b-[1px]">
                                                        {sourceLine.primary ? <Badge className="bg-black text-white dark:bg-white dark:text-black">PRIMARY</Badge> : '-'}
                                                      </td>
                                                    </tr>
                                                    {sourceLine.message && (
                                                      <tr>
                                                        <th className="text-xs p-2 text-left border-b-[1px] border-r-[1px]">{t('table.message')}</th>
                                                        <td className="text-xs p-2 border-b-[1px] break-all">{sourceLine.message}</td>
                                                      </tr>
                                                    )}
                                                    {codeSnippet && (
                                                      <tr>
                                                        <th className="text-xs p-2 text-left border-b-[1px] border-r-[1px] align-top">Code Snippet</th>
                                                        <td className="text-xs p-2 border-b-[1px]">
                                                          <CodeSnippetDialog
                                                            trigger={
                                                              <Button variant="outline" size="sm" className="w-full justify-start text-xs">
                                                                <FileCode className="h-4 w-4 mr-2" />
                                                                Xem Code Snippet
                                                              </Button>
                                                            }
                                                            title={`${sourceLine.sourcefile} (${sourceLine.start}-${sourceLine.end})`}
                                                            fileContent={fileContent}
                                                            codeSnippet={null}
                                                            startLine={sourceLine.start}
                                                            endLine={sourceLine.end}
                                                          />
                                                        </td>
                                                      </tr>
                                                    )}
                                                    <tr>
                                                      <td colSpan={2} className="p-2 text-right">
                                                        <Button variant="outline" size="sm" onClick={() => handleExplainInAI(sourceLine)} className="text-xs">
                                                          <Bot className="h-3 w-3 mr-1" />
                                                          Giải thích lỗi
                                                        </Button>
                                                      </td>
                                                    </tr>
                                                  </tbody>
                                                </table>
                                              </div>
                                            )
                                          })}
                                        </div>
                                      </div>
                                    )}
                                    {/* Local Variables */}
                                    {selectedBug.localVariables && selectedBug.localVariables.length > 0 && (
                                      <div>
                                        <h3 className="text-sm font-medium">{t('dialog.spotbugs.localVariables')}</h3>
                                        <div className="mt-2 space-y-4">
                                          {selectedBug.localVariables?.map((variable, index) => (
                                            <div key={index} className="overflow-x-auto border rounded-md bg-muted/30">
                                              <table className="min-w-full">
                                                <tbody>
                                                  <tr>
                                                    <th className="text-xs p-2 text-left border-b-[1px] border-r-[1px] w-[90px]">{t('dialog.spotbugs.name')}</th>
                                                    <td className="text-xs p-2 border-b-[1px] font-mono font-bold">{variable.name || t('dialog.spotbugs.notAvailable')}</td>
                                                  </tr>
                                                  {variable.message && (
                                                    <tr>
                                                      <th className="text-xs p-2 text-left border-b-[1px] border-r-[1px]">{t('table.message')}</th>
                                                      <td className="text-xs p-2 border-b-[1px] break-all">{variable.message}</td>
                                                    </tr>
                                                  )}
                                                  {variable.role && (
                                                    <tr>
                                                      <th className="text-xs p-2 text-left border-r-[1px]">Role</th>
                                                      <td className="text-xs p-2">
                                                        <Badge className="bg-black text-white dark:bg-white dark:text-black">{variable.role}</Badge>
                                                      </td>
                                                    </tr>
                                                  )}
                                                </tbody>
                                              </table>
                                            </div>
                                          ))}
                                        </div>
                                      </div>
                                    )}
                                    {/* Properties */}
                                    {selectedBug.properties && selectedBug.properties.length > 0 && (
                                      <div>
                                        <h3 className="text-sm font-medium">{t('dialog.spotbugs.properties')}</h3>
                                        <div className="mt-2 space-y-4">
                                          {selectedBug.properties?.map((property, index) => (
                                            <div key={index} className="overflow-x-auto border rounded-md bg-muted/30">
                                              <table className="min-w-full">
                                                <tbody>
                                                  <tr>
                                                    <th className="text-xs p-2 text-left border-b-[1px] border-r-[1px] w-[90px]">{t('dialog.spotbugs.name')}</th>
                                                    <td className="text-xs p-2 border-b-[1px] font-mono font-bold">{property.name || t('dialog.spotbugs.notAvailable')}</td>
                                                  </tr>
                                                  {property.value && (
                                                    <tr>
                                                      <th className="text-xs p-2 text-left border-r-[1px]">{t('dialog.spotbugs.value')}</th>
                                                      <td className="text-xs p-2 font-mono break-all">{property.value}</td>
                                                    </tr>
                                                  )}
                                                </tbody>
                                              </table>
                                            </div>
                                          ))}
                                        </div>
                                      </div>
                                    )}
                                  </div>
                                </ScrollArea>
                              </TabsContent>
                              {/* AI Assistant Tab */}
                              <TabsContent value="ai" className="mt-2 border-0 p-0 flex-1 overflow-hidden">
                                <SpotbugsAIChat bug={selectedBug} isLoading={isLoading} filePaths={filePaths} />
                              </TabsContent>
                            </Tabs>
                          </div>
                        ) : (
                          <div className="border rounded-md p-4 flex items-center justify-center h-full w-full">
                            <p className="text-muted-foreground">{t('message.selectIssue')}</p>
                          </div>
                        )}
                      </div>
                    </ResizablePanel>
                  </ResizablePanelGroup>
                )}
                {activeTab === 'filelist' && (
                  <div className="flex flex-col border rounded-md overflow-hidden h-full">
                    <div className="bg-muted p-2 font-medium">
                      {t('dialog.spotbugs.fileList')} ({filePaths.length})
                    </div>
                    <ScrollArea className="h-full w-full">
                      {/* <OverlayLoader isLoading={isLoading} /> */}
                      <Table wrapperClassName={cn('overflow-clip', filePaths.length === 0 && 'h-full')}>
                        <TableHeader className="sticky top-0 z-10 bg-[var(--table-header-bg)]">
                          <TableRow>
                            <TableHead>{t('table.filePath')}</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {filePaths.length > 0 ? (
                            filePaths.map((filePath, index) => (
                              <TableRow key={index}>
                                <TableCell className="text-xs font-mono">{filePath}</TableCell>
                              </TableRow>
                            ))
                          ) : (
                            <TableRow>
                              <TableCell className="text-center py-4">{isLoading ? t('message.loading') : t('message.noFilesAnalyzed')}</TableCell>
                            </TableRow>
                          )}
                        </TableBody>
                      </Table>
                    </ScrollArea>
                  </div>
                )}
                {activeTab === 'chart' && (
                  <div className="h-full flex flex-col gap-4 overflow-y-auto">
                    {/* Priority Chart */}
                    <Card className="flex flex-col w-full relative">
                      <CardHeader className="items-center pb-0">
                        <CardTitle>{t('dialog.spotbugs.priorityChart')}</CardTitle>
                        <CardDescription>{t('dialog.spotbugs.priorityChartDescription')}</CardDescription>
                      </CardHeader>
                      <CardContent className="flex-1 pb-0 overflow-hidden flex min-h-[300px]">
                        <OverlayLoader isLoading={isLoading} />
                        {!isLoading && spotbugsResult.bugCount.total > 0 ? (
                          <ChartContainer
                            config={{
                              count: {
                                label: t('dialog.spotbugs.bugCount'),
                                color: 'var(--color-red-500)',
                              },
                              high: { label: t('dialog.spotbugs.high'), color: 'var(--color-red-500)' },
                              medium: { label: t('dialog.spotbugs.medium'), color: 'var(--color-yellow-500)' },
                              low: { label: t('dialog.spotbugs.low'), color: 'var(--color-blue-500)' },
                            }}
                            className="w-full"
                          >
                            <PieChart>
                              <Pie
                                data={[
                                  {
                                    priority: t('dialog.spotbugs.high'),
                                    count: spotbugsResult.bugCount.byPriority.high,
                                    fill: 'var(--color-red-500)',
                                  },
                                  {
                                    priority: t('dialog.spotbugs.medium'),
                                    count: spotbugsResult.bugCount.byPriority.medium,
                                    fill: 'var(--color-yellow-500)',
                                  },
                                  {
                                    priority: t('dialog.spotbugs.low'),
                                    count: spotbugsResult.bugCount.byPriority.low,
                                    fill: 'var(--color-blue-500)',
                                  },
                                ]}
                                dataKey="count"
                                nameKey="priority"
                                label
                              />
                              <ChartTooltip content={<ChartTooltipContent />} />
                              <ChartLegend layout="horizontal" verticalAlign="bottom" align="center" />
                            </PieChart>
                          </ChartContainer>
                        ) : (
                          <div className="flex items-center justify-center h-full w-full">
                            <p className="text-muted-foreground">{isLoading ? t('message.loading') : t('common.noData')}</p>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                    {/* File Stats Chart */}
                    <Card className="flex flex-col w-full relative">
                      <CardHeader className="items-center pb-0">
                        <CardTitle>{t('dialog.spotbugs.fileStatsChart')}</CardTitle>
                        <CardDescription>{t('dialog.spotbugs.fileStatsChartDescription')}</CardDescription>
                      </CardHeader>
                      <CardContent className="flex-1 pb-0 overflow-hidden flex min-h-[300px]">
                        <OverlayLoader isLoading={isLoading} />
                        {!isLoading && spotbugsResult.fileStats.length > 0 ? (
                          <ChartContainer
                            config={{
                              bugCount: {
                                label: t('dialog.spotbugs.bugCount'),
                                color: 'hsl(var(--chart-1))',
                              },
                            }}
                            className="w-full"
                          >
                            <BarChart
                              accessibilityLayer
                              data={spotbugsResult.fileStats.slice(0, 10).map(stat => ({
                                path: stat.path.split(/[\\/]/).pop() || stat.path,
                                bugCount: stat.bugCount,
                                fullPath: stat.path,
                              }))}
                              margin={{ top: 5, right: 30, left: 20, bottom: 60 }}
                            >
                              <CartesianGrid vertical={false} />
                              <XAxis dataKey="path" tickLine={false} tickMargin={10} axisLine={false} height={60} interval={0} angle={-45} textAnchor="end" />
                              <YAxis allowDecimals={false} />
                              <ChartTooltip
                                cursor={false}
                                content={({ active, payload }) => {
                                  if (active && payload && payload.length) {
                                    return (
                                      <div className="rounded-lg border bg-background p-2 shadow-sm max-w-[300px]">
                                        <div className="grid grid-cols-1 gap-2">
                                          <div className="flex flex-row gap-2">
                                            <span className="font-bold text-muted-foreground break-all">{payload[0].payload.fullPath}</span> {/* Removed max-w */}
                                          </div>
                                          <div className="flex flex-row gap-2">
                                            <span className="text-[0.70rem] text-muted-foreground">{t('dialog.spotbugs.bugCount')}</span>
                                            <span className="font-bold">{payload[0].payload.bugCount}</span>
                                          </div>
                                        </div>
                                      </div>
                                    )
                                  }
                                  return null
                                }}
                              />
                              <ChartLegend content={() => null} />
                              <Bar dataKey="bugCount" fill="var(--color-chart-1)" radius={4} />
                            </BarChart>
                          </ChartContainer>
                        ) : (
                          <div className="flex items-center justify-center h-full w-full">
                            <p className="text-muted-foreground">{isLoading ? t('message.loading') : t('common.noData')}</p>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                    {/* Package Stats Chart */}
                    <Card className="flex flex-col w-full relative">
                      <CardHeader className="items-center pb-0">
                        <CardTitle>{t('dialog.spotbugs.packageStatsChart')}</CardTitle>
                        <CardDescription>{t('dialog.spotbugs.packageStatsChartDescription')}</CardDescription>
                      </CardHeader>
                      <CardContent className="flex-1 pb-0 overflow-hidden flex min-h-[300px]">
                        <OverlayLoader isLoading={isLoading} />
                        {!isLoading && spotbugsResult.packageStats.length > 0 ? (
                          <ChartContainer
                            config={{
                              priority1: { label: t('dialog.spotbugs.high'), color: 'var(--color-red-500)' },
                              priority2: { label: t('dialog.spotbugs.medium'), color: 'var(--color-yellow-500)' },
                              priority3: { label: t('dialog.spotbugs.low'), color: 'var(--color-blue-500)' },
                            }}
                            className="w-full"
                          >
                            <BarChart accessibilityLayer data={packageStatsData} margin={{ top: 5, right: 30, left: 20, bottom: 60 }}>
                              <CartesianGrid vertical={false} />
                              <XAxis dataKey="packageName" tickLine={false} tickMargin={10} axisLine={false} height={60} interval={0} angle={-45} textAnchor="end" />
                              <YAxis allowDecimals={false} />
                              <ChartTooltip
                                cursor={false}
                                content={({ active, payload }) => {
                                  if (active && payload && payload.length) {
                                    return (
                                      <div className="rounded-lg border bg-background p-2 shadow-sm max-w-[300px]">
                                        {' '}
                                        {/* Added max-w */}
                                        <div className="grid grid-cols-1 gap-2">
                                          <div className="flex flex-row gap-2">
                                            <span className="font-bold text-muted-foreground break-all">{payload[0].payload.fullPackage}</span> {/* Removed max-w */}
                                          </div>
                                          <div className="flex flex-row gap-2 items-center">
                                            {' '}
                                            {/* Added items-center */}
                                            <div className="w-2 h-2 rounded-full bg-red-500" /> {/* Corrected: Self-closing */}
                                            <span className="text-[0.70rem] text-muted-foreground">{t('dialog.spotbugs.high')}</span>
                                            <span className="font-bold ml-auto">{payload.find(p => p.dataKey === 'priority1')?.value ?? 0}</span> {/* Find value by key */}
                                          </div>
                                          <div className="flex flex-row gap-2 items-center">
                                            <div className="w-2 h-2 rounded-full bg-yellow-500" /> {/* Corrected: Self-closing */}
                                            <span className="text-[0.70rem] text-muted-foreground">{t('dialog.spotbugs.medium')}</span>
                                            <span className="font-bold ml-auto">{payload.find(p => p.dataKey === 'priority2')?.value ?? 0}</span>
                                          </div>
                                          <div className="flex flex-row gap-2 items-center">
                                            <div className="w-2 h-2 rounded-full bg-blue-500" /> {/* Corrected: Self-closing */}
                                            <span className="text-[0.70rem] text-muted-foreground">{t('dialog.spotbugs.low')}</span>
                                            <span className="font-bold ml-auto">{payload.find(p => p.dataKey === 'priority3')?.value ?? 0}</span>
                                          </div>
                                        </div>
                                      </div>
                                    )
                                  }
                                  return null
                                }}
                              />
                              <ChartLegend />
                              {/* Order bars visually: low -> medium -> high */}
                              <Bar
                                dataKey="priority3"
                                name={t(getPriorityName(3))}
                                fill="var(--color-blue-500)"
                                stackId="a"
                                shape={(props: any) => <CustomBarShape {...props} dataKey="priority3" fill="var(--color-blue-500)" posMap={packagePosMap} />}
                              />
                              <Bar
                                dataKey="priority2"
                                name={t(getPriorityName(2))}
                                fill="var(--color-yellow-500)"
                                stackId="a"
                                shape={(props: any) => <CustomBarShape {...props} dataKey="priority2" fill="var(--color-yellow-500)" posMap={packagePosMap} />}
                              />
                              <Bar
                                dataKey="priority1"
                                name={t(getPriorityName(1))}
                                fill="var(--color-red-500)"
                                stackId="a"
                                shape={(props: any) => <CustomBarShape {...props} dataKey="priority1" fill="var(--color-red-500)" posMap={packagePosMap} />}
                              />
                            </BarChart>
                          </ChartContainer>
                        ) : (
                          <div className="flex items-center justify-center h-full w-full">
                            <p className="text-muted-foreground">{isLoading ? t('message.loading') : t('common.noData')}</p>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  </div>
                )}
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  )
}
