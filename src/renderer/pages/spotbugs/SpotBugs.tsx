'use client'
import { BUG_DESCRIPTIONS, CATEGORY_DESCRIPTIONS } from '@/components/shared/constants'
import { OverlayLoader } from '@/components/ui-elements/OverlayLoader'
import toast from '@/components/ui-elements/Toast'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { ChartContainer, ChartLegend, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart'
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from '@/components/ui/resizable'
import { ScrollArea } from '@/components/ui/scroll-area'
import { TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { cn } from '@/lib/utils'
import logger from '@/services/logger'
import { AlertCircle, AlertTriangle, ArrowDown, ArrowUp, ArrowUpDown, BarChart as BarChartIcon, Bug, FileCode, Info, List } from 'lucide-react'
import { forwardRef, useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Bar, BarChart, CartesianGrid, Pie, PieChart, XAxis, YAxis } from 'recharts'
import { SpotbugsToolbar } from './SpotbugsToolbar'

// Định nghĩa cấu trúc dữ liệu cho một dòng mã nguồn
interface SourceLineInfo {
  classname: string
  start: number | null
  end: number | null
  startBytecode?: number | null
  endBytecode?: number | null
  sourcefile: string
  sourcepath: string
  relSourcepath?: string
  synthetic?: boolean
  role?: string
  primary?: boolean
  message?: string
}

// Định nghĩa cấu trúc dữ liệu cho một phương thức
interface MethodInfo {
  classname: string
  name: string
  signature: string
  isStatic: boolean
  role?: string
  primary?: boolean
  sourceLine: SourceLineInfo | null
  message?: string
}

// Định nghĩa cấu trúc dữ liệu cho một trường
interface FieldInfo {
  classname: string
  name: string
  signature: string
  sourceSignature?: string
  isStatic: boolean
  role?: string
  primary?: boolean
  sourceLine?: SourceLineInfo | null
  message?: string
}

// Định nghĩa cấu trúc dữ liệu cho một biến cục bộ
interface LocalVariableInfo {
  name: string
  register?: number | null
  pc?: number | null
  role?: string
  message?: string
}

// Định nghĩa cấu trúc dữ liệu cho một thuộc tính
interface PropertyInfo {
  name: string
  value: string
}

// Định nghĩa cấu trúc dữ liệu cho một giá trị Int
interface IntInfo {
  value: number | null
  role?: string
  message?: string
}

// Định nghĩa cấu trúc dữ liệu cho một giá trị String
interface StringInfo {
  value: string
  role?: string
  message?: string
}

// Định nghĩa cấu trúc dữ liệu cho một lớp
interface ClassInfo {
  classname: string
  role?: string
  primary?: boolean
  sourceLine?: SourceLineInfo | null
  message?: string
}

// Định nghĩa cấu trúc dữ liệu cho một lỗi
interface BugInstance {
  id: string
  type: string
  priority: number
  rank: number
  abbrev: string
  category: string
  cweid?: number
  shortMessage: string
  longMessage: string
  classes: ClassInfo[]
  methods: MethodInfo[]
  fields: FieldInfo[]
  localVariables: LocalVariableInfo[]
  sourceLines: SourceLineInfo[]
  ints: IntInfo[]
  strings: StringInfo[]
  properties: PropertyInfo[]
  userAnnotation?: {
    designation: string
    user: string
    needsSync: boolean
    timestamp: number
    value: string
  }
  patternDetails?: {
    type: string
    abbrev: string
    category: string
    cweid?: number
    shortDescription: string
    details: string
  }
  categoryDetails?: {
    name: string
    description: string
    abbreviation: string
    details: string
  }
  codeDetails?: {
    abbrev: string
    cweid?: number
    description: string
  }

  // Các trường phụ thêm cho UI
  className?: string
  sourceFile?: string
  startLine?: number
  endLine?: number
  message?: string
  details?: string
  categoryDescription?: string
}

// Định nghĩa cấu trúc dữ liệu cho kết quả phân tích
interface SpotBugsResult {
  version: {
    version: string
    sequence: number | null
    timestamp: number | null
    analysisTimestamp: number | null
    release: string
  }
  project: {
    projectName: string
    filename: string
    jars: string[]
    srcDirs: string[]
    auxClasspathEntries?: string[]
    wrkDir?: string
  }
  summary: {
    timestamp: string
    totalClasses: number
    referencedClasses: number
    totalBugs: number
    totalSize: number
    numPackages: number
    javaVersion?: string
    vmVersion?: string
    cpuSeconds?: number | null
    clockSeconds?: number | null
    peakMbytes?: number | null
    allocMbytes?: number | null
    gcSeconds?: number | null
    priority1: number
    priority2: number
    priority3: number
  }
  fileStats: Array<{
    path: string
    bugCount: number
    size?: number | null
    bugHash?: string
  }>
  packageStats: Array<{
    packageName: string
    totalBugs: number
    totalTypes: number
    totalSize: number
    priority1: number
    priority2: number
    priority3: number
    classStats: Array<{
      className: string
      sourceFile?: string
      interface: boolean
      size: number
      bugs: number
      priority1: number
      priority2: number
      priority3: number
    }>
  }>
  errors: {
    errors: number
    missingClasses: number
    missingClassList: string[]
  }
  bugCategories: Record<string, any>
  bugPatterns: Record<string, any>
  bugCodes: Record<string, any>
  bugInstances: BugInstance[]
  bugCount: {
    total: number
    byPriority: {
      high: number
      medium: number
      low: number
    }
  }
}

export function SpotBugs() {
  const { t } = useTranslation()
  const [isLoading, setIsLoading] = useState(true)
  const [filePaths, setFilePaths] = useState<string[]>([])
  const [spotbugsResult, setSpotbugsResult] = useState<SpotBugsResult>({
    version: { version: '', sequence: null, timestamp: null, analysisTimestamp: null, release: '' },
    project: { projectName: '', filename: '', jars: [], srcDirs: [] },
    summary: {
      timestamp: '',
      totalClasses: 0,
      referencedClasses: 0,
      totalBugs: 0,
      totalSize: 0,
      numPackages: 0,
      priority1: 0,
      priority2: 0,
      priority3: 0,
    },
    fileStats: [],
    packageStats: [],
    errors: { errors: 0, missingClasses: 0, missingClassList: [] },
    bugCategories: {},
    bugPatterns: {},
    bugCodes: {},
    bugInstances: [],
    bugCount: {
      total: 0,
      byPriority: {
        high: 0,
        medium: 0,
        low: 0,
      },
    },
  })
  const [selectedBug, setSelectedBug] = useState<BugInstance | null>(null)
  const [activeTab, setActiveTab] = useState('all')
  const [activeDetailTab, setActiveDetailTab] = useState('issue')

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
          setSelectedBug(processedResult.bugInstances[0])
        }
        toast.success(t('toast.spotbugsSuccess', { 0: processedResult.bugCount.total }))
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
    toast.info(t('toast.refreshingSpotbugs'))
  }
  const processSpotBugsResult = (result: any): SpotBugsResult => {
    if (result.bugCount && result.version) {
      const processedBugInstances = result.bugInstances.map((bug: BugInstance) => {
        const primaryClass = bug.classes.find(c => c.primary) || bug.classes[0]
        const primarySourceLine = bug.sourceLines.find(sl => sl.primary) || primaryClass?.sourceLine || bug.sourceLines[0]
        return {
          ...bug,
          className: primaryClass?.classname || '',
          sourceFile: primarySourceLine?.sourcefile || '',
          startLine: primarySourceLine?.start || 0,
          endLine: primarySourceLine?.end || 0,
          message: bug.shortMessage,
          details: bug.patternDetails?.details || '',
          categoryDescription: bug.categoryDetails?.description || '',
        }
      })
      return {
        ...result,
        bugInstances: processedBugInstances,
      }
    }
    return {
      version: { version: '', sequence: null, timestamp: null, analysisTimestamp: null, release: '' },
      project: { projectName: '', filename: '', jars: [], srcDirs: [] },
      summary: {
        timestamp: '',
        totalClasses: 0,
        referencedClasses: 0,
        totalBugs: result.totalBugs || 0,
        totalSize: 0,
        numPackages: 0,
        priority1: result.bugsBySeverity?.high || 0,
        priority2: result.bugsBySeverity?.medium || 0,
        priority3: result.bugsBySeverity?.low || 0,
      },
      fileStats: [],
      packageStats: [],
      errors: { errors: 0, missingClasses: 0, missingClassList: [] },
      bugCategories: {},
      bugPatterns: {},
      bugCodes: {},
      bugInstances: result.bugInstances || [],
      bugCount: {
        total: result.totalBugs || 0,
        byPriority: {
          high: result.bugsBySeverity?.high || 0,
          medium: result.bugsBySeverity?.medium || 0,
          low: result.bugsBySeverity?.low || 0,
        },
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
    return CATEGORY_DESCRIPTIONS[categoryType] || 'Unknown'
  }

  const getBugDescriptionDetails = (bugType: string): string => {
    return BUG_DESCRIPTIONS[bugType] || 'Unknown'
  }

  const getPriorityColor = (priority: number) => {
    switch (priority) {
      case 1:
        return 'bg-red-200/10 text-red-800 dark:text-red-400 border-red-500/20'
      case 2:
        return 'bg-yellow-200/10 text-yellow-800 dark:text-yellow-400 border-yellow-500/20'
      case 3:
        return 'bg-blue-200/10 text-blue-800 dark:text-blue-400 border-blue-500/20'
    }
  }

  const getRankColor = (rank: number) => {
    if (rank <= 4) return 'bg-red-200/10 text-red-800 dark:text-red-400 border-red-500/20'
    if (rank <= 9) return 'bg-yellow-200/10 text-yellow-800 dark:text-yellow-400 border-yellow-500/20'
    if (rank <= 14) return 'bg-amber-200/10 text-amber-800 dark:text-amber-400 border-amber-500/20'
    if (rank <= 20) return 'bg-blue-200/10 text-blue-800 dark:text-blue-400 border-blue-500/20'
    return 'bg-emerald-200/10 text-emerald-800 dark:text-emerald-400 border-emerald-500/20'
  }

  const filteredBugs = spotbugsResult.bugInstances.filter(bug => {
    if (activeTab === 'all') return true
    if (activeTab === 'high') return bug.priority === 1
    if (activeTab === 'medium') return bug.priority === 2
    if (activeTab === 'low') return bug.priority === 3
    return true
  })

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

  const sortedBugs = [...filteredBugs].sort((a, b) => {
    const aVal = sortKey ? (a[sortKey] ?? '') : ''
    const bVal = sortKey ? (b[sortKey] ?? '') : ''
    if (aVal < bVal) return sortDirection === 'asc' ? -1 : 1
    if (aVal > bVal) return sortDirection === 'asc' ? 1 : -1
    return 0
  })

  const handleSort = (key: typeof sortKey) => {
    if (sortKey === key) {
      if (sortDirection === 'asc') {
        setSortDirection('desc')
      } else if (sortDirection === 'desc') {
        setSortKey('')
        setSortDirection('')
      }
    } else {
      setSortKey(key)
      setSortDirection('asc')
    }
  }

  // Hàm tạo đường dẫn SVG cho hình chữ nhật có góc bo
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

  // Xác định vị trí của các thanh trong biểu đồ
  function getBarRadius(data: any[], priorityKeys: string[]) {
    const posMap: Record<string, { single?: string; top?: string; bottom?: string }> = {}
    for (const row of data) {
      const prioritiesWithValue = priorityKeys.filter(key => row[key] > 0)
      if (prioritiesWithValue.length === 1) {
        posMap[row.packageName] = { single: prioritiesWithValue[0] }
      } else if (prioritiesWithValue.length > 1) {
        posMap[row.packageName] = {
          top: prioritiesWithValue[prioritiesWithValue.length - 1],
          bottom: prioritiesWithValue[0],
        }
      }
    }
    return posMap
  }

  // Lấy bán kính bo góc cho từng thanh
  const getRadiusForPriority = (packageName: string, priority: string) => {
    if (!posMap[packageName]) return [0, 0, 0, 0]
    if (posMap[packageName].single === priority) return [4, 4, 4, 4]
    if (posMap[packageName].top === priority) return [4, 4, 0, 0]
    if (posMap[packageName].bottom === priority) return [0, 0, 4, 4]
    return [0, 0, 0, 0]
  }

  // Component tùy chỉnh hình dạng của các thanh trong biểu đồ
  const CustomBarShape = (props: any) => {
    const { x, y, width, height, payload, dataKey, fill } = props
    const packageName = payload.packageName
    const radius = getRadiusForPriority(packageName, dataKey)
    const d = roundedRect(x, y, width, height, ...(radius as [number, number, number, number]))
    return <path d={d} fill={fill} />
  }

  // Tạo dữ liệu cho biểu đồ
  const packageStatsData = useMemo(() => {
    return spotbugsResult.packageStats.slice(0, 10).map(stat => ({
      packageName: stat.packageName.split('.').pop() || stat.packageName,
      priority1: stat.priority1,
      priority2: stat.priority2,
      priority3: stat.priority3,
      fullPackage: stat.packageName,
    }))
  }, [spotbugsResult.packageStats])

  // Tạo bản đồ vị trí cho các thanh
  const posMap = useMemo(() => {
    return getBarRadius(packageStatsData, ['priority1', 'priority2', 'priority3'])
  }, [packageStatsData])

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
                <Badge variant="outline" className="rounded-md">
                  {spotbugsResult.bugCount.total}
                </Badge>
              </TabsTrigger>
              <TabsTrigger value="high">
                <AlertCircle strokeWidth={1.5} className="h-4 w-4 text-red-800 dark:text-red-400 border-red-500/20" />
                {t('dialog.spotbugs.high')}
                <Badge variant="outline" className="rounded-md bg-red-200/10 text-red-800 dark:text-red-400 border-red-500/20 font-bold">
                  {spotbugsResult.bugCount.byPriority.high}
                </Badge>
              </TabsTrigger>
              <TabsTrigger value="medium">
                <AlertTriangle strokeWidth={1.5} className="h-4 w-4 text-yellow-800 dark:text-yellow-400 border-yellow-500/20" />
                {t('dialog.spotbugs.medium')}
                <Badge variant="outline" className="rounded-md bg-yellow-200/10 text-yellow-800 dark:text-yellow-400 border-yellow-500/20 font-bold">
                  {spotbugsResult.bugCount.byPriority.medium}
                </Badge>
              </TabsTrigger>
              <TabsTrigger value="low">
                <Info strokeWidth={1.5} className="h-4 w-4 text-blue-800 dark:text-blue-400 border-blue-500/20" />
                {t('dialog.spotbugs.low')}
                <Badge variant="outline" className="rounded-md bg-blue-200/10 text-blue-800 dark:text-blue-400 border-blue-500/20 font-bold">
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
                <Badge variant="outline" className="rounded-md">
                  {filePaths.length}
                </Badge>
              </TabsTrigger>
            </TabsList>

            <TabsContent value={activeTab} className="flex-1 flex flex-col h-full">
              <div className="space-y-4 flex-1 h-full flex flex-col overflow-hidden">
                {(activeTab === 'all' || activeTab === 'high' || activeTab === 'medium' || activeTab === 'low') && (
                  <ResizablePanelGroup direction="horizontal">
                    <ResizablePanel defaultSize={70} minSize={50} className="h-full pr-2">
                      <div className="flex flex-col border rounded-md overflow-hidden h-full">
                        <div className="bg-muted p-2 font-medium">{t('dialog.spotbugs.issues')}</div>
                        <ScrollArea className="h-full w-full">
                          <Table wrapperClassName={cn('overflow-clip', filteredBugs.length === 0 && 'h-full')}>
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
                                    onClick={() => setSelectedBug(bug)}
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

                    <ResizablePanel defaultSize={30} minSize={30} className="h-full">
                      <div className="flex flex-col gap-4 h-full">
                        {selectedBug ? (
                          <div className="border rounded-md overflow-hidden h-full">
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

                            <Tabs value={activeDetailTab} onValueChange={setActiveDetailTab} className="w-full h-full p-2">
                              <TabsList className="w-full justify-start">
                                <TabsTrigger value="issue" className="flex items-center gap-1">
                                  <AlertCircle strokeWidth={1.5} className="h-4 w-4" />
                                  <span>{t('dialog.spotbugs.issueDetails')}</span>
                                </TabsTrigger>
                                <TabsTrigger value="location" className="flex items-center gap-1">
                                  <FileCode strokeWidth={1.5} className="h-4 w-4" />
                                  <span>{t('dialog.spotbugs.location')}</span>
                                </TabsTrigger>
                                <TabsTrigger value="details" className="flex items-center gap-1">
                                  <Bug strokeWidth={1.5} className="h-4 w-4" />
                                  <span>{t('dialog.spotbugs.bugDetails')}</span>
                                </TabsTrigger>
                              </TabsList>

                              {/* Issue Details Tab */}
                              <TabsContent value="issue" className="mt-0 border-0 p-0">
                                <ScrollArea className="h-full">
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
                                  </div>
                                </ScrollArea>
                              </TabsContent>

                              {/* Location Tab */}
                              <TabsContent value="location" className="mt-0 border-0 p-0">
                                <ScrollArea className="h-full">
                                  <div className="p-4 space-y-4">
                                    <div>
                                      <h3 className="text-sm font-medium">{t('table.class')}</h3>
                                      <p className="text-sm font-mono">{selectedBug.className}</p>
                                    </div>

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
                                </ScrollArea>
                              </TabsContent>

                              {/* Bug Details Tab */}
                              <TabsContent value="details" className="mt-0 border-0 p-0">
                                <ScrollArea className="h-full">
                                  <div className="p-4 space-y-4 mb-[35px]">
                                    {/* Source Lines */}
                                    {selectedBug.sourceLines && selectedBug.sourceLines.length > 0 && (
                                      <div>
                                        <h3 className="text-sm font-medium">{t('dialog.spotbugs.sourceLines')}</h3>
                                        <div className="mt-2 space-y-4">
                                          {selectedBug.sourceLines.map((sourceLine, index) => (
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
                                                    <td className="text-xs p-2  border-b-[1px]">
                                                      {sourceLine.primary ? <Badge className="bg-black text-white dark:bg-white dark:text-black">PRIMARY</Badge> : '-'}
                                                    </td>
                                                  </tr>
                                                  {sourceLine.message && (
                                                    <tr>
                                                      <th className="text-xs p-2 text-left border-r-[1px]">{t('table.message')}</th>
                                                      <td className="text-xs p-2 break-all">{sourceLine.message}</td>
                                                    </tr>
                                                  )}
                                                </tbody>
                                              </table>
                                            </div>
                                          ))}
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
                  <div className="h-full flex flex-column gap-2">
                    <Card className="flex flex-col w-full relative">
                      <CardHeader className="items-center pb-0">
                        <CardTitle>{t('dialog.spotbugs.priorityChart')}</CardTitle>
                        <CardDescription>{t('dialog.spotbugs.priorityChartDescription')}</CardDescription>
                      </CardHeader>
                      <CardContent className="flex-1 pb-0 overflow-hidden flex">
                        <OverlayLoader isLoading={isLoading} />
                        {!isLoading && spotbugsResult.bugCount.total > 0 ? (
                          <ChartContainer
                            config={{
                              count: {
                                label: t('dialog.spotbugs.bugCount'),
                                color: 'var(--color-red-500)',
                              },
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

                    <Card className="flex flex-col w-full relative">
                      <CardHeader className="items-center pb-0">
                        <CardTitle>{t('dialog.spotbugs.fileStatsChart')}</CardTitle>
                        <CardDescription>{t('dialog.spotbugs.fileStatsChartDescription')}</CardDescription>
                      </CardHeader>
                      <CardContent className="flex-1 pb-0 overflow-hidden flex">
                        <OverlayLoader isLoading={isLoading} />
                        {!isLoading && spotbugsResult.fileStats.length > 0 ? (
                          <ChartContainer
                            config={{
                              bugCount: {
                                label: t('dialog.spotbugs.bugCount'),
                                color: 'var(--chart-1)',
                              },
                            }}
                            className="w-full"
                          >
                            <BarChart
                              accessibilityLayer
                              data={spotbugsResult.fileStats.slice(0, 10).map(stat => ({
                                path: stat.path.split('/').pop() || stat.path,
                                bugCount: stat.bugCount,
                                fullPath: stat.path,
                              }))}
                            >
                              <CartesianGrid vertical={false} />
                              <XAxis dataKey="path" tickLine={false} tickMargin={10} axisLine={false} height={60} />
                              <YAxis allowDecimals={false} />
                              <ChartTooltip
                                cursor={false}
                                content={({ active, payload }) => {
                                  if (active && payload && payload.length) {
                                    return (
                                      <div className="rounded-lg border bg-background p-2 shadow-sm">
                                        <div className="grid grid-cols-1 gap-2">
                                          <div className="flex flex-row gap-2">
                                            <span className="font-bold text-muted-foreground break-all max-w-[200px]">{payload[0].payload.fullPath}</span>
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
                              <Bar dataKey="bugCount" fill="var(--chart-1)" radius={4} />
                            </BarChart>
                          </ChartContainer>
                        ) : (
                          <div className="flex items-center justify-center h-full w-full">
                            <p className="text-muted-foreground">{isLoading ? t('message.loading') : t('common.noData')}</p>
                          </div>
                        )}{' '}
                      </CardContent>
                    </Card>

                    <Card className="flex flex-col w-full relative">
                      <CardHeader className="items-center pb-0">
                        <CardTitle>{t('dialog.spotbugs.packageStatsChart')}</CardTitle>
                        <CardDescription>{t('dialog.spotbugs.packageStatsChartDescription')}</CardDescription>
                      </CardHeader>
                      <CardContent className="flex-1 pb-0 overflow-hidden flex">
                        <OverlayLoader isLoading={isLoading} />
                        {!isLoading && spotbugsResult.packageStats.length > 0 ? (
                          <ChartContainer
                            config={{
                              priority1: {
                                label: t('dialog.spotbugs.high'),
                                color: 'var(--color-red-500)',
                              },
                              priority2: {
                                label: t('dialog.spotbugs.medium'),
                                color: 'var(--color-yellow-500)',
                              },
                              priority3: {
                                label: t('dialog.spotbugs.low'),
                                color: 'var(--color-blue-500)',
                              },
                            }}
                            className="w-full"
                          >
                            <BarChart accessibilityLayer data={packageStatsData}>
                              <CartesianGrid vertical={false} />
                              <XAxis dataKey="packageName" tickLine={false} tickMargin={10} axisLine={false} height={60} />
                              <YAxis allowDecimals={false} />
                              <ChartTooltip
                                cursor={false}
                                content={({ active, payload }) => {
                                  if (active && payload && payload.length) {
                                    return (
                                      <div className="rounded-lg border bg-background p-2 shadow-sm">
                                        <div className="grid grid-cols-1 gap-2">
                                          <div className="flex flex-row gap-2">
                                            <span className="font-bold text-muted-foreground break-all max-w-[200px]">{payload[0].payload.fullPackage}</span>
                                          </div>
                                          <div className="flex flex-row gap-2">
                                            <span className="text-[0.70rem] text-muted-foreground">{t('dialog.spotbugs.high')}</span>
                                            <span className="font-bold text-red-500">{payload[0].payload.priority1}</span>
                                          </div>
                                          <div className="flex flex-row gap-2">
                                            <span className="text-[0.70rem] text-muted-foreground">{t('dialog.spotbugs.medium')}</span>
                                            <span className="font-bold text-yellow-500">{payload[0].payload.priority2}</span>
                                          </div>
                                          <div className="flex flex-row gap-2">
                                            <span className="text-[0.70rem] text-muted-foreground">{t('dialog.spotbugs.low')}</span>
                                            <span className="font-bold text-blue-500">{payload[0].payload.priority3}</span>
                                          </div>
                                        </div>
                                      </div>
                                    )
                                  }
                                  return null
                                }}
                              />
                              <ChartLegend />
                              <Bar
                                dataKey="priority1"
                                name={t(getPriorityName(1))}
                                fill="var(--color-red-500)"
                                stackId="a"
                                shape={(props: any) => <CustomBarShape {...props} dataKey="priority1" fill="var(--color-red-500)" />}
                              />
                              <Bar
                                dataKey="priority2"
                                name={t(getPriorityName(2))}
                                fill="var(--color-yellow-500)"
                                stackId="a"
                                shape={(props: any) => <CustomBarShape {...props} dataKey="priority2" fill="var(--color-yellow-500)" />}
                              />
                              <Bar
                                dataKey="priority3"
                                name={t(getPriorityName(3))}
                                fill="var(--color-blue-500)"
                                stackId="a"
                                shape={(props: any) => <CustomBarShape {...props} dataKey="priority3" fill="var(--color-blue-500)" />}
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
