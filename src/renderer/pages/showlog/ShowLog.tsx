'use client'
import { StatisticDialog } from '@/components/dialogs/StatisticDialog'
import { STATUS_TEXT, type SvnStatusCode } from '@/components/shared/constants'
import { GlowLoader } from '@/components/ui-elements/GlowLoader'
import { StatusIcon } from '@/components/ui-elements/StatusIcon'
import toast from '@/components/ui-elements/Toast'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from '@/components/ui/resizable'
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area'
import { TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Textarea } from '@/components/ui/textarea'
import i18n from '@/lib/i18n'
import { cn } from '@/lib/utils'
import logger from '@/services/logger'
import { useButtonVariant } from '@/stores/useAppearanceStore'
import { type ColumnDef, type SortingState, flexRender, getCoreRowModel, getSortedRowModel, useReactTable } from '@tanstack/react-table'
import chalk from 'chalk'
import { Search } from 'lucide-react'
import { forwardRef, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { DateRange } from 'react-day-picker'
import { useTranslation } from 'react-i18next'
import { ShowlogToolbar } from './ShowlogToolbar'

window.addEventListener('storage', event => {
  if (event.key === 'ui-settings') {
    const storage = JSON.parse(event.newValue || '{}')
    const html = document.documentElement
    html.classList.remove('dark', 'light')
    html.setAttribute('data-theme-mode', storage.state.themeMode)
    html.setAttribute('data-font-size', storage.state.fontSize)
    html.setAttribute('data-font-family', storage.state.fontFamily)
    html.setAttribute('data-button-variant', storage.state.buttonVariant)
    i18n.changeLanguage(storage.state.language)
    for (const cls of html.classList) {
      if (cls.startsWith('theme-')) {
        html.classList.remove(cls)
      }
    }
    html.classList.add(storage.state.theme)
    html.classList.add(storage.state.themeMode)
  }
})

interface LogEntry {
  revision: string
  author: string
  date: string
  isoDate: string
  message: string
  referenceId: string
  action: string[]
  changedFiles: LogFile[]
}

interface LogFile {
  action: SvnStatusCode
  filePath: string
}

const SHOWLOG_LAYOUT_KEY = 'showlog-layout-config'
const SHOWLOG_PANEL_SIZES_KEY = 'showlog-panel-sizes-config'

interface ShowlogLayoutConfig {
  direction: 'horizontal' | 'vertical'
}

interface ShowlogPanelSizes {
  mainPanelSize: number
  secondPanelSize: number
  commitPanelSize: number
  filesPanelSize: number
}

export function ShowLog() {
  const { t } = useTranslation()
  const variant = useButtonVariant()
  const [layoutDirection, setLayoutDirection] = useState<'horizontal' | 'vertical'>('horizontal')

  useEffect(() => {
    try {
      const savedConfig = localStorage.getItem(SHOWLOG_LAYOUT_KEY)
      if (savedConfig) {
        const config: ShowlogLayoutConfig = JSON.parse(savedConfig)
        setLayoutDirection(config.direction)
      }
    } catch (error) {
      console.error('Lỗi khi đọc cấu hình layout từ localStorage:', error)
    }
  }, [])

  useEffect(() => {
    return () => {
      try {
        const config: ShowlogLayoutConfig = {
          direction: layoutDirection,
        }
        localStorage.setItem(SHOWLOG_LAYOUT_KEY, JSON.stringify(config))
      } catch (error) {
        console.error('Lỗi khi lưu cấu hình layout vào localStorage:', error)
      }
    }
  }, [layoutDirection])

  useEffect(() => {
    try {
      const config: ShowlogLayoutConfig = {
        direction: layoutDirection,
      }
      localStorage.setItem(SHOWLOG_LAYOUT_KEY, JSON.stringify(config))
    } catch (error) {
      console.error('Lỗi khi lưu cấu hình layout vào localStorage:', error)
    }
  }, [layoutDirection])

  const columns: ColumnDef<LogEntry>[] = [
    {
      accessorKey: 'revision',
      size: 30,
      maxSize: 30,
      header: ({ column }) => (
        <Button className="!p-0 !h-7 !bg-transparent !hover:bg-transparent" variant="ghost" onClick={() => column.toggleSorting()}>
          {t('dialog.showLogs.revision')}
          <span className="pr-0.5">
            {!column.getIsSorted()}
            {column.getIsSorted() === 'asc' && '↑'}
            {column.getIsSorted() === 'desc' && '↓'}
          </span>
        </Button>
      ),
      cell: ({ row }) => <div>{row.getValue('revision')}</div>,
    },

    {
      accessorKey: 'date',
      size: 30,
      maxSize: 30,
      header: ({ column }) => {
        return (
          <Button className="!p-0 !h-7 !bg-transparent !hover:bg-transparent" variant="ghost" onClick={() => column.toggleSorting()}>
            {t('dialog.showLogs.date')}
            <span className="pr-0.5">
              {!column.getIsSorted()}
              {column.getIsSorted() === 'asc' && '↑'}
              {column.getIsSorted() === 'desc' && '↓'}
            </span>
          </Button>
        )
      },
      cell: ({ row }) => <div>{row.getValue('date')}</div>,
    },
    {
      accessorKey: 'author',
      size: 30,
      maxSize: 30,
      header: ({ column }) => {
        return (
          <Button className="!p-0 !h-7 !bg-transparent !hover:bg-transparent" variant="ghost" onClick={() => column.toggleSorting()}>
            {t('dialog.showLogs.author')}
            <span className="pr-0.5">
              {!column.getIsSorted()}
              {column.getIsSorted() === 'asc' && '↑'}
              {column.getIsSorted() === 'desc' && '↓'}
            </span>
          </Button>
        )
      },
      cell: ({ row }) => <div>{row.getValue('author')}</div>,
    },
    {
      accessorKey: 'action',
      size: 80,
      header: ({ column }) => {
        return (
          <Button className="!p-0 !h-7 !bg-transparent !hover:bg-transparent" variant="ghost" onClick={() => column.toggleSorting()}>
            {t('dialog.showLogs.action')}
            <span className="pr-0.5">
              {!column.getIsSorted()}
              {column.getIsSorted() === 'asc' && '↑'}
              {column.getIsSorted() === 'desc' && '↓'}
            </span>
          </Button>
        )
      },
      cell: ({ row }) => {
        const actions: SvnStatusCode[] = row.getValue('action')
        return (
          <div className="flex gap-1">
            {actions.map((code, index) => (
              <div className="relative group" key={code}>
                <StatusIcon code={code} />
              </div>
            ))}
          </div>
        )
      },
    },
    {
      accessorKey: 'referenceId',
      size: 30,
      maxSize: 30,
      header: ({ column }) => (
        <Button className="!p-0 !h-7 !bg-transparent !hover:bg-transparent" variant="ghost" onClick={() => column.toggleSorting()}>
          {t('dialog.showLogs.message')}
          <span className="pr-0.5">
            {!column.getIsSorted()}
            {column.getIsSorted() === 'asc' && '↑'}
            {column.getIsSorted() === 'desc' && '↓'}
          </span>
        </Button>
      ),
      cell: ({ row }) => <div>{row.getValue('referenceId')}</div>,
    },
    {
      accessorKey: 'message',
      header: ({ column }) => {
        return (
          <Button className="!p-0 !h-7 !bg-transparent !hover:bg-transparent" variant="ghost" onClick={() => column.toggleSorting()}>
            {t('dialog.showLogs.message')}
            <span className="pr-0.5">
              {!column.getIsSorted()}
              {column.getIsSorted() === 'asc' && '↑'}
              {column.getIsSorted() === 'desc' && '↓'}
            </span>
          </Button>
        )
      },
      cell: ({ row }) => {
        const message = row.getValue('message') as string
        const referenceId = row.getValue('referenceId') as string
        const displayMessage = referenceId && message.startsWith(referenceId) ? message.substring(referenceId.length).trim() : message
        return (
          <div className="overflow-hidden text-ellipsis whitespace-nowrap w-[200px]" title={displayMessage}>
            {displayMessage}
          </div>
        )
      },
    },
  ]

  const [isLoading, setIsLoading] = useState(false)
  const [filePath, setFilePath] = useState<string | string[]>('')
  const [currentRevision, setCurrentRevision] = useState<string>('')

  const displayFilePath = useMemo(() => {
    if (Array.isArray(filePath)) {
      return filePath.length > 1 ? `${filePath[0]} (+${filePath.length - 1} files)` : filePath[0]
    }
    return filePath
  }, [filePath])
  const [selectedRevision, setSelectedRevision] = useState<string | null>(null)
  const [commitMessage, setCommitMessage] = useState('')
  const [changedFiles, setChangedFiles] = useState<LogFile[]>([])
  const [statusSummary, setStatusSummary] = useState<Record<SvnStatusCode, number>>({} as Record<SvnStatusCode, number>)
  const [searchTerm, setSearchTerm] = useState('')

  const [dateRange, setDateRange] = useState<DateRange | undefined>(() => {
    const today = new Date()
    const oneWeekAgo = new Date()
    oneWeekAgo.setDate(today.getDate() - 7)
    return {
      from: oneWeekAgo,
      to: today,
    }
  })

  const [isStatisticOpen, setIsStatisticOpen] = useState(false)

  const [panelSizes, setPanelSizes] = useState<ShowlogPanelSizes>({
    mainPanelSize: 50,
    secondPanelSize: 50,
    commitPanelSize: 50,
    filesPanelSize: 50,
  })

  const mainPanelRef = useRef<any>(null)
  const secondPanelRef = useRef<any>(null)
  const commitPanelRef = useRef<any>(null)
  const filesPanelRef = useRef<any>(null)

  const [currentPage, setCurrentPage] = useState(1)
  const pageSize = 50
  const [sorting, setSorting] = useState<SortingState>([])

  const [allLogData, setAllLogData] = useState<LogEntry[]>([])
  const [filteredLogData, setFilteredLogData] = useState<LogEntry[]>([])
  const [dataForCurrentPage, setDataForCurrentPage] = useState<LogEntry[]>([])
  const [totalEntriesFromBackend, setTotalEntriesFromBackend] = useState(0)

  useEffect(() => {
    const handler = (_event: any, data: any) => {
      const path = typeof data === 'string' ? data : data.path
      const revision = typeof data === 'string' ? '' : data.currentRevision || ''
      setFilePath(path)
      setCurrentRevision(revision)
      setCurrentPage(1)
      setAllLogData([])
      setFilteredLogData([])
      setDataForCurrentPage([])
      setTotalEntriesFromBackend(0)
      loadLogData(path)
    }
    window.api.on('load-diff-data', handler)
  }, [])

  useEffect(() => {
    if (filePath) {
      setCurrentPage(1)
      setAllLogData([])
      setFilteredLogData([])
      setDataForCurrentPage([])
      setTotalEntriesFromBackend(0)
      loadLogData(filePath)
    }
  }, [dateRange])

  useEffect(() => {
    try {
      const savedPanelSizes = localStorage.getItem(SHOWLOG_PANEL_SIZES_KEY)
      if (savedPanelSizes) {
        const sizes: ShowlogPanelSizes = JSON.parse(savedPanelSizes)
        setPanelSizes(sizes)
        setTimeout(() => {
          if (mainPanelRef.current?.resize) mainPanelRef.current.resize(sizes.mainPanelSize)
          if (secondPanelRef.current?.resize) secondPanelRef.current.resize(sizes.secondPanelSize)
          if (commitPanelRef.current?.resize) commitPanelRef.current.resize(sizes.commitPanelSize)
          if (filesPanelRef.current?.resize) filesPanelRef.current.resize(sizes.filesPanelSize)
        }, 0)
      }
    } catch (error) {
      console.error('Lỗi khi đọc kích thước panel từ localStorage:', error)
    }
  }, [])

  useEffect(() => {
    return () => {
      try {
        localStorage.setItem(SHOWLOG_PANEL_SIZES_KEY, JSON.stringify(panelSizes))
      } catch (error) {
        console.error('Lỗi khi lưu kích thước panel vào localStorage:', error)
      }
    }
  }, [panelSizes])

  useEffect(() => {
    try {
      localStorage.setItem(SHOWLOG_PANEL_SIZES_KEY, JSON.stringify(panelSizes))
    } catch (error) {
      console.error('Lỗi khi lưu kích thước panel vào localStorage:', error)
    }
  }, [panelSizes])

  const handlePanelResize = (panelName: keyof ShowlogPanelSizes, size: number) => {
    setPanelSizes(prev => ({
      ...prev,
      [panelName]: size,
    }))
  }

  const loadLogData = async (path: string | string[]) => {
    try {
      setCommitMessage('')
      setChangedFiles([])
      setStatusSummary({} as Record<SvnStatusCode, number>)
      setIsLoading(true)
      setAllLogData([])
      setFilteredLogData([])
      setDataForCurrentPage([])
      setTotalEntriesFromBackend(0)
      setCurrentPage(1)

      const options: any = {}
      if (dateRange?.from) {
        options.dateFrom = dateRange.from.toISOString()
        if (dateRange.to) {
          options.dateTo = dateRange.to.toISOString()
        } else {
        }
      } else {
      }

      const result = await window.api.svn.log(path, options)
      if (result.status === 'success') {
        const sourceFolderPrefix = result.sourceFolderPrefix
        const rawLog = result.data as string
        const backendTotal = result.totalEntries ?? 0
        setTotalEntriesFromBackend(backendTotal)
        const entries = rawLog
          .split('------------------------------------------------------------------------')
          .map(entry => entry.trim())
          .filter(entry => entry)

        if (entries.length !== backendTotal && backendTotal > 0) {
          logger.warning(chalk.yellow.bold(`Số entries parse (${entries.length}) khác với total từ backend (${backendTotal})!`))
        }
        const parsedEntries: LogEntry[] = []
        const addedRevisions = new Set<string>()
        for (const entry of entries) {
          const lines = entry
            .split('\n')
            .map(line => line.trim())
            .filter(Boolean)
          const headerMatch = lines[0]?.match(/^r(\d+)\s+\|\s+(.+?)\s+\|\s+(.+?)\s+\|\s+(\d+)\s+line/)
          if (!headerMatch) continue
          const [, revisionStr, author, date] = headerMatch
          let i = 1
          if (lines[i]?.startsWith('Changed paths:')) i++
          const changedFiles: LogFile[] = []
          const isSvnStatusCode = (code: string): code is SvnStatusCode => Object.keys(STATUS_TEXT).includes(code)
          while (i < lines.length) {
            const line = lines[i]
            const match = line.match(/^([A-Z\?\!~])\s+(\/.+)$/)
            if (!match) break
            const [, actionCode, filePath] = match
            if (!isSvnStatusCode(actionCode)) break

            let processedPath = filePath
            if (sourceFolderPrefix) {
              const prefixPattern = new RegExp(`^/?${sourceFolderPrefix}/?`)
              processedPath = filePath.replace(prefixPattern, '')
            }
            changedFiles.push({ action: actionCode, filePath: processedPath })
            i++
          }
          const messageLines = lines.slice(i)
          const fullMessage = messageLines.join('\n').trim()
          const messageFirstLine = fullMessage.split('\n')[0] || ''
          const referenceId = messageFirstLine.trim()
          if (!addedRevisions.has(revisionStr)) {
            const originalDate = new Date(date)
            parsedEntries.push({
              revision: revisionStr,
              author,
              date: originalDate.toLocaleString(),
              isoDate: originalDate.toISOString(),
              message: fullMessage,
              referenceId: referenceId,
              action: Array.from(new Set(changedFiles.map(f => f.action))),
              changedFiles,
            })
            addedRevisions.add(revisionStr)
          } else {
            logger.warning(`Skipping duplicate revision entry found during frontend parsing: r${revisionStr}`)
          }
        }

        const sortedEntries = parsedEntries.sort((a: any, b: any) => b.revision - a.revision)
        setAllLogData(sortedEntries)

        if (result.suggestedStartDate) {
          const suggestedDate = new Date(result.suggestedStartDate)
          if (dateRange?.from?.getTime() !== suggestedDate.getTime()) {
            setDateRange(prevRange => ({
              from: suggestedDate,
              to: prevRange?.to,
            }))
          }
        } else if (parsedEntries.length > 0 && !dateRange?.from) {
          const earliestIsoDate = sortedEntries[0].isoDate
          const earliestDate = new Date(earliestIsoDate)
          setDateRange(prevRange => ({
            from: earliestDate,
            to: prevRange?.to,
          }))
        }
      } else {
        toast.error(result.message)
        setAllLogData([])
        setFilteredLogData([])
        setDataForCurrentPage([])
        setTotalEntriesFromBackend(0)
      }
    } catch (error) {
      toast.error('Error loading log data')
      setAllLogData([])
      setFilteredLogData([])
      setDataForCurrentPage([])
      setTotalEntriesFromBackend(0)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    if (allLogData.length > 0) {
      const topRevision = allLogData[0].revision
      const topRow = table.getRowModel().rows.find(row => row.original.revision === topRevision)
      if (topRow) {
        table.setRowSelection({ [topRow.id]: true })
        selectRevision(topRevision)
      }
    }
  }, [allLogData])

  const calculateStatusSummary = useCallback((changedFiles: LogFile[]) => {
    const summary: Record<SvnStatusCode, number> = {} as Record<SvnStatusCode, number>
    for (const code of Object.keys(STATUS_TEXT)) {
      summary[code as SvnStatusCode] = 0
    }
    for (const file of changedFiles) {
      summary[file.action] = (summary[file.action] || 0) + 1
    }
    return summary
  }, [])

  const selectRevision = useCallback(
    (revision: string) => {
      if (revision === selectedRevision) return

      const entry = allLogData.find(e => e.revision === revision)
      if (entry) {
        setSelectedRevision(revision)
        setCommitMessage(entry.message)
        setChangedFiles(entry.changedFiles)
        setStatusSummary(calculateStatusSummary(entry.changedFiles))
      }
    },
    [allLogData, selectedRevision, calculateStatusSummary]
  )
  const table = useReactTable({
    data: dataForCurrentPage,
    columns,
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    enableSortingRemoval: true,
    state: {
      sorting,
      columnVisibility: {
        message: false,
      },
    },
  })

  useEffect(() => {
    let filtered = allLogData
    if (searchTerm.trim()) {
      const lowerSearchTerm = searchTerm.toLowerCase()
      filtered = allLogData.filter(
        entry =>
          entry.revision.toLowerCase().includes(lowerSearchTerm) ||
          entry.author.toLowerCase().includes(lowerSearchTerm) ||
          entry.message.toLowerCase().includes(lowerSearchTerm) ||
          entry.date.toLowerCase().includes(lowerSearchTerm)
      )
    }
    setFilteredLogData(filtered)

    const startIndex = (currentPage - 1) * pageSize
    const endIndex = startIndex + pageSize
    const currentPageData = filtered.slice(startIndex, endIndex)
    setDataForCurrentPage(currentPageData)

    if (currentPageData.length > 0) {
      const selectedRow = table.getSelectedRowModel().rows[0]
      const isSelectedRowVisible = selectedRow && currentPageData.some(entry => entry.revision === selectedRow.original.revision)

      if (!selectedRow || !isSelectedRowVisible) {
        table.resetRowSelection()
        selectRevision(currentPageData[0].revision)
      }
    } else {
      setCommitMessage('')
      setChangedFiles([])
      setStatusSummary({} as Record<SvnStatusCode, number>)
      setSelectedRevision(null)
      table.resetRowSelection()
    }
  }, [allLogData, searchTerm, currentPage, pageSize, selectRevision, table])

  const totalPages = useMemo(() => {
    if (filteredLogData.length <= 0 || pageSize <= 0) return 1
    const pages = Math.ceil(filteredLogData.length / pageSize)
    return pages
  }, [filteredLogData, pageSize])

  const hasMoreEntries = useMemo(() => {
    const more = currentPage < totalPages
    return more
  }, [currentPage, totalPages])

  const handleRefresh = useCallback(() => {
    loadLogData(filePath)
  }, [filePath, loadLogData])

  const handlePageChange = useCallback(
    (newPage: number) => {
      if (newPage < 1 || newPage > totalPages || newPage === currentPage) {
        return
      }
      setCurrentPage(newPage)
    },
    [currentPage, totalPages]
  )

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
      {/* Dialogs */}
      <StatisticDialog data={allLogData} isOpen={isStatisticOpen} onOpenChange={setIsStatisticOpen} filePath={displayFilePath as string} dateRange={dateRange} />

      <div className="flex flex-col flex-1 w-full">
        <ShowlogToolbar
          onRefresh={handleRefresh}
          filePath={displayFilePath}
          isLoading={isLoading}
          dateRange={dateRange}
          setDateRange={setDateRange}
          onOpenStatistic={() => setIsStatisticOpen(true)}
          layoutDirection={layoutDirection}
          onToggleLayout={() => setLayoutDirection(prev => (prev === 'horizontal' ? 'vertical' : 'horizontal'))}
        />
        {isLoading ? (
          <div className="flex items-center justify-center h-full">
            <GlowLoader className="w-10 h-10" />
          </div>
        ) : (
          <div className="p-4 space-y-4 flex-1 h-full flex flex-col overflow-hidden">
            {layoutDirection === 'horizontal' ? (
              <ResizablePanelGroup direction="horizontal">
                <ResizablePanel
                  key={`main-panel-${layoutDirection}`}
                  defaultSize={panelSizes.mainPanelSize}
                  minSize={30}
                  className="h-full"
                  onResize={size => handlePanelResize('mainPanelSize', size)}
                  ref={mainPanelRef}
                >
                  <div className="h-full pr-2">
                    <div className="flex flex-col h-full">
                      <div className="mb-2 flex items-center gap-2">
                        <div className="relative flex-1">
                          <Search className="absolute left-2 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                          <Input placeholder={t('dialog.showLogs.placeholderSearch')} value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="pl-8" />
                        </div>
                      </div>
                      <div className="flex flex-col border rounded-md overflow-auto h-full">
                        <ScrollArea className="h-full w-full">
                          <Table wrapperClassName={cn('overflow-clip', table.getRowModel().rows.length === 0 && 'h-full')}>
                            <TableHeader className="sticky top-0 z-10 bg-[var(--table-header-bg)]">
                              {table.getHeaderGroups().map(headerGroup => (
                                <TableRow key={headerGroup.id}>
                                  {headerGroup.headers.map((header, index) => (
                                    <TableHead
                                      key={header.id}
                                      style={{ width: header.getSize() }}
                                      className={cn('relative group h-9 px-2', '!text-[var(--table-header-fg)]', index === 0 && 'text-center')}
                                    >
                                      {header.isPlaceholder ? null : flexRender(header.column.columnDef.header, header.getContext())}
                                    </TableHead>
                                  ))}
                                </TableRow>
                              ))}
                            </TableHeader>
                            <TableBody className={table.getRowModel().rows.length === 0 ? 'h-full' : ''}>
                              {table.getRowModel().rows?.length ? (
                                table.getRowModel().rows.map(row => (
                                  <TableRow
                                    key={row.id}
                                    data-state={row.getIsSelected() && 'selected'}
                                    onClick={() => {
                                      if (!row.getIsSelected()) {
                                        table.resetRowSelection()
                                        row.toggleSelected(true)
                                        selectRevision(row.original.revision)
                                      }
                                    }}
                                    className="cursor-pointer data-[state=selected]:bg-blue-100 dark:data-[state=selected]:bg-blue-900"
                                  >
                                    {row.getVisibleCells().map((cell, index) => {
                                      const isCurrentRevision = row.getValue('revision') === currentRevision
                                      return (
                                        <TableCell
                                          key={cell.id}
                                          className={cn(
                                            'p-0 h-6 px-2',
                                            index === 0 && 'text-center',
                                            cell.column.id === 'filePath' && 'cursor-pointer',
                                            isCurrentRevision && 'text-blue-700 dark:text-yellow-400'
                                          )}
                                        >
                                          {flexRender(cell.column.columnDef.cell, cell.getContext())}
                                        </TableCell>
                                      )
                                    })}
                                  </TableRow>
                                ))
                              ) : (
                                <TableRow className="h-full">
                                  <TableCell colSpan={table.getAllColumns().length} className="text-center h-full">
                                    <div className="flex flex-col items-center justify-center gap-4 h-full">
                                      <p className="text-muted-foreground">{t('common.noData')}</p>
                                    </div>
                                  </TableCell>
                                </TableRow>
                              )}
                            </TableBody>
                          </Table>
                          <ScrollBar orientation="vertical" />
                          <ScrollBar orientation="horizontal" />
                        </ScrollArea>
                      </div>

                      {(isLoading || filteredLogData.length > 0) && (
                        <div className="flex items-center justify-between pt-2 px-1 text-sm text-muted-foreground h-12">
                          <span className="flex-1 text-xs pl-1">
                            {isLoading
                              ? 'Loading...'
                              : `${t('dialog.showLogs.totalEntries', { 0: totalEntriesFromBackend })} ${
                                  searchTerm.trim() ? `(${t('dialog.showLogs.filtered', { 0: filteredLogData.length })})` : ''
                                }`}
                          </span>
                          {!isLoading && (
                            <div className="flex items-center gap-2">
                              <Button variant={variant} size="sm" onClick={() => handlePageChange(currentPage - 1)} disabled={currentPage === 1 || isLoading}>
                                {t('common.back')}
                              </Button>
                              <span>{t('dialog.showLogs.page', { 0: currentPage, 1: totalPages })}</span>
                              <Button variant={variant} size="sm" onClick={() => handlePageChange(currentPage + 1)} disabled={isLoading || !hasMoreEntries}>
                                {t('common.next')}
                              </Button>
                            </div>
                          )}
                          <div className="flex-1" />
                        </div>
                      )}
                    </div>
                  </div>
                </ResizablePanel>

                <ResizableHandle className="bg-transparent" />

                <ResizablePanel
                  key={`second-panel-${layoutDirection}`}
                  defaultSize={panelSizes.secondPanelSize}
                  minSize={layoutDirection === 'horizontal' ? 30 : 40}
                  onResize={size => handlePanelResize('secondPanelSize', size)}
                  ref={secondPanelRef}
                >
                  <ResizablePanelGroup direction="vertical" className="h-full">
                    <ResizablePanel
                      key={`commit-panel-${layoutDirection}`}
                      defaultSize={panelSizes.commitPanelSize}
                      minSize={20}
                      className=""
                      onResize={size => handlePanelResize('commitPanelSize', size)}
                      ref={commitPanelRef}
                    >
                      <div className="p-2 font-medium pb-[11px]">{t('dialog.showLogs.commitMessage')}</div>
                      <div className="h-full overflow-auto pb-[2.8rem]">
                        <Textarea
                          className="w-full h-full resize-none border-1 cursor-default break-all relative focus-visible:ring-0 !shadow-none focus-visible:border-color"
                          readOnly={true}
                          value={commitMessage}
                          spellCheck={false}
                        />
                      </div>
                    </ResizablePanel>

                    <ResizableHandle className="bg-transparent" />

                    <ResizablePanel
                      key={`files-panel-${layoutDirection}`}
                      defaultSize={panelSizes.filesPanelSize}
                      minSize={20}
                      className="flex flex-col"
                      onResize={size => handlePanelResize('filesPanelSize', size)}
                      ref={filesPanelRef}
                    >
                      <div className="p-2 font-medium flex justify-between items-center">
                        <span>{t('dialog.showLogs.changedFiles')}</span>
                        <div className="flex gap-2">
                          {Object.entries(statusSummary).map(([code, count]) =>
                            count > 0 ? (
                              <div key={code} className="flex items-center gap-1 text-xs bg-muted px-2 py-1 rounded">
                                <StatusIcon code={code as SvnStatusCode} />
                                <span>{count}</span>
                              </div>
                            ) : null
                          )}
                        </div>
                      </div>
                      <div className="h-full overflow-auto border-1 rounded-md">
                        <ScrollArea className="h-full">
                          <Table wrapperClassName={cn('overflow-clip', changedFiles.length === 0 && 'h-full')}>
                            <TableHeader className="sticky top-0 z-10 bg-[var(--table-header-bg)]">
                              <TableRow>
                                <TableHead className="w-24">{t('dialog.showLogs.action')}</TableHead>
                                <TableHead>{t('dialog.showLogs.path')}</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody className={changedFiles.length === 0 ? 'h-full' : ''}>
                              {changedFiles.length > 0 ? (
                                changedFiles.map((file, index) => (
                                  <TableRow key={index}>
                                    <TableCell className="p-0 h-6 px-2">
                                      <StatusIcon code={file.action} />
                                    </TableCell>
                                    <TableCell
                                      className="p-0 h-6 px-2 cursor-pointer break-words whitespace-normal"
                                      onClick={() => {
                                        try {
                                          if (selectedRevision) {
                                            window.api.svn.open_diff(file.filePath, {
                                              fileStatus: file.action,
                                              revision: selectedRevision,
                                              currentRevision: currentRevision,
                                            })
                                          } else {
                                            window.api.svn.open_diff(file.filePath)
                                          }
                                        } catch (error) {
                                          toast.error(error)
                                        }
                                      }}
                                    >
                                      {file.filePath}
                                    </TableCell>
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
                          <ScrollBar orientation="vertical" />
                          <ScrollBar orientation="horizontal" />
                        </ScrollArea>
                      </div>
                    </ResizablePanel>
                  </ResizablePanelGroup>
                </ResizablePanel>
              </ResizablePanelGroup>
            ) : (
              <ResizablePanelGroup direction="vertical">
                <ResizablePanel
                  key={`main-panel-${layoutDirection}`}
                  defaultSize={panelSizes.mainPanelSize}
                  minSize={20}
                  className="w-full"
                  onResize={size => handlePanelResize('mainPanelSize', size)}
                  ref={mainPanelRef}
                >
                  <div className="h-full pb-2">
                    <div className="flex flex-col h-full">
                      <div className="mb-2 flex items-center gap-2">
                        <div className="relative flex-1">
                          <Search className="absolute left-2 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                          <Input placeholder={t('dialog.showLogs.placeholderSearch')} value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="pl-8" />
                        </div>
                      </div>
                      <div className="flex flex-col border rounded-md overflow-auto h-full">
                        <ScrollArea className="h-full w-full">
                          <Table wrapperClassName={cn('overflow-clip', table.getRowModel().rows.length === 0 && 'h-full')}>
                            <TableHeader className="sticky top-0 z-10 bg-[var(--table-header-bg)]">
                              {table.getHeaderGroups().map(headerGroup => (
                                <TableRow key={headerGroup.id}>
                                  {headerGroup.headers.map((header, index) => (
                                    <TableHead
                                      key={header.id}
                                      style={{ width: header.getSize() }}
                                      className={cn('relative group h-9 px-2', '!text-[var(--table-header-fg)]', index === 0 && 'text-center')}
                                    >
                                      {header.isPlaceholder ? null : flexRender(header.column.columnDef.header, header.getContext())}
                                    </TableHead>
                                  ))}
                                </TableRow>
                              ))}
                            </TableHeader>
                            <TableBody className={table.getRowModel().rows.length === 0 ? 'h-full' : ''}>
                              {table.getRowModel().rows?.length ? (
                                table.getRowModel().rows.map(row => (
                                  <TableRow
                                    key={row.id}
                                    data-state={row.getIsSelected() && 'selected'}
                                    onClick={() => {
                                      if (!row.getIsSelected()) {
                                        table.resetRowSelection()
                                        row.toggleSelected(true)
                                        selectRevision(row.original.revision)
                                      }
                                    }}
                                    className="cursor-pointer data-[state=selected]:bg-blue-100 dark:data-[state=selected]:bg-blue-900"
                                  >
                                    {row.getVisibleCells().map((cell, index) => {
                                      const isCurrentRevision = row.getValue('revision') === currentRevision
                                      return (
                                        <TableCell
                                          key={cell.id}
                                          className={cn(
                                            'p-0 h-6 px-2',
                                            index === 0 && 'text-center',
                                            cell.column.id === 'filePath' && 'cursor-pointer',
                                            isCurrentRevision && 'text-blue-700 dark:text-yellow-400'
                                          )}
                                        >
                                          {flexRender(cell.column.columnDef.cell, cell.getContext())}
                                        </TableCell>
                                      )
                                    })}
                                  </TableRow>
                                ))
                              ) : (
                                <TableRow className="h-full">
                                  <TableCell colSpan={table.getAllColumns().length} className="text-center h-full">
                                    <div className="flex flex-col items-center justify-center gap-4 h-full">
                                      <p className="text-muted-foreground">{t('common.noData')}</p>
                                    </div>
                                  </TableCell>
                                </TableRow>
                              )}
                            </TableBody>
                          </Table>
                          <ScrollBar orientation="vertical" />
                          <ScrollBar orientation="horizontal" />
                        </ScrollArea>
                      </div>

                      {(isLoading || filteredLogData.length > 0) && (
                        <div className="flex items-center justify-between pt-2 px-1 text-sm text-muted-foreground h-12">
                          <span className="flex-1 text-xs pl-1">
                            {isLoading
                              ? 'Loading...'
                              : `${t('dialog.showLogs.totalEntries', { 0: totalEntriesFromBackend })} ${
                                  searchTerm.trim() ? `(${t('dialog.showLogs.filtered', { 0: filteredLogData.length })})` : ''
                                }`}
                          </span>
                          {!isLoading && (
                            <div className="flex items-center gap-2">
                              <Button variant={variant} size="sm" onClick={() => handlePageChange(currentPage - 1)} disabled={currentPage === 1 || isLoading}>
                                {t('common.back')}
                              </Button>
                              <span>{t('dialog.showLogs.page', { 0: currentPage, 1: totalPages })}</span>
                              <Button variant={variant} size="sm" onClick={() => handlePageChange(currentPage + 1)} disabled={isLoading || !hasMoreEntries}>
                                {t('common.next')}
                              </Button>
                            </div>
                          )}
                          <div className="flex-1" />
                        </div>
                      )}
                    </div>
                  </div>
                </ResizablePanel>

                <ResizableHandle className="bg-transparent" />

                <ResizablePanel
                  key={`second-panel-${layoutDirection}`}
                  defaultSize={panelSizes.secondPanelSize}
                  minSize={40}
                  onResize={size => handlePanelResize('secondPanelSize', size)}
                  ref={secondPanelRef}
                >
                  <ResizablePanelGroup direction="horizontal" className="h-full">
                    <ResizablePanel
                      key={`commit-panel-${layoutDirection}`}
                      defaultSize={panelSizes.commitPanelSize}
                      minSize={20}
                      className="pr-2"
                      onResize={size => handlePanelResize('commitPanelSize', size)}
                      ref={commitPanelRef}
                    >
                      <div className="p-2 font-medium pb-[11px]">{t('dialog.showLogs.commitMessage')}</div>
                      <div className="h-full overflow-auto pb-[2.8rem]">
                        <Textarea
                          className="w-full h-full resize-none border-1 cursor-default break-all relative focus-visible:ring-0 !shadow-none focus-visible:border-color"
                          readOnly={true}
                          value={commitMessage}
                          spellCheck={false}
                        />
                      </div>
                    </ResizablePanel>

                    <ResizableHandle className="bg-transparent" />

                    <ResizablePanel
                      key={`files-panel-${layoutDirection}`}
                      defaultSize={panelSizes.filesPanelSize}
                      minSize={20}
                      className="flex flex-col pl-2"
                      onResize={size => handlePanelResize('filesPanelSize', size)}
                      ref={filesPanelRef}
                    >
                      <div className="p-2 font-medium flex justify-between items-center">
                        <span>{t('dialog.showLogs.changedFiles')}</span>
                        <div className="flex gap-2">
                          {Object.entries(statusSummary).map(([code, count]) =>
                            count > 0 ? (
                              <div key={code} className="flex items-center gap-1 text-xs bg-muted px-2 py-1 rounded">
                                <StatusIcon code={code as SvnStatusCode} />
                                <span>{count}</span>
                              </div>
                            ) : null
                          )}
                        </div>
                      </div>
                      <div className="h-full overflow-auto border-1 rounded-md">
                        <ScrollArea className="h-full">
                          <Table wrapperClassName={cn('overflow-clip', changedFiles.length === 0 && 'h-full')}>
                            <TableHeader className="sticky top-0 z-10 bg-[var(--table-header-bg)]">
                              <TableRow>
                                <TableHead className="w-24">{t('dialog.showLogs.action')}</TableHead>
                                <TableHead>{t('dialog.showLogs.path')}</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody className={changedFiles.length === 0 ? 'h-full' : ''}>
                              {changedFiles.length > 0 ? (
                                changedFiles.map((file, index) => (
                                  <TableRow key={index}>
                                    <TableCell className="p-0 h-6 px-2">
                                      <StatusIcon code={file.action} />
                                    </TableCell>
                                    <TableCell
                                      className="p-0 h-6 px-2 cursor-pointer break-words whitespace-normal"
                                      onClick={() => {
                                        try {
                                          if (selectedRevision) {
                                            window.api.svn.open_diff(file.filePath, {
                                              fileStatus: file.action,
                                              revision: selectedRevision,
                                              currentRevision: currentRevision,
                                            })
                                          } else {
                                            window.api.svn.open_diff(file.filePath)
                                          }
                                        } catch (error) {
                                          toast.error(error)
                                        }
                                      }}
                                    >
                                      {file.filePath}
                                    </TableCell>
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
                          <ScrollBar orientation="vertical" />
                          <ScrollBar orientation="horizontal" />
                        </ScrollArea>
                      </div>
                    </ResizablePanel>
                  </ResizablePanelGroup>
                </ResizablePanel>
              </ResizablePanelGroup>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
