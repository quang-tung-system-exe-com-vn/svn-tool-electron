import { OverlayLoader } from '@/components/ui-elements/OverlayLoader'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from '@/components/ui/resizable'
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area'
import { TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { cn } from '@/lib/utils'
import { type ColumnDef, type SortingState, flexRender, getCoreRowModel, getSortedRowModel, useReactTable } from '@tanstack/react-table'
import { ArrowDown, ArrowUp, ArrowUpDown, Search } from 'lucide-react'
import { forwardRef, useCallback, useEffect, useMemo, useState } from 'react'
import type { DateRange } from 'react-day-picker'
import { toast } from 'sonner'
import { StatisticDialog } from '../dialogs/StatisticDialog'
import { STATUS_TEXT, type SvnStatusCode } from '../shared/constants'
import { StatusIcon } from '../ui-elements/StatusIcon'
import { Textarea } from '../ui/textarea'
import { ShowlogToolbar } from './ShowlogToolbar'

window.addEventListener('storage', event => {
  if (event.key === 'ui-settings') {
    const style = JSON.parse(event.newValue || '{}')
    document.documentElement.setAttribute('data-font-size', style.state.fontSize)
    document.documentElement.setAttribute('data-font-family', style.state.fontFamily)
    document.documentElement.setAttribute('data-button-variant', style.state.buttonVariant)
  }
})

interface LogEntry {
  revision: string
  author: string
  date: string // Formatted date for display
  isoDate: string // Original ISO date string for comparison/sorting
  message: string
  action: string[]
  changedFiles: LogFile[]
}

interface LogFile {
  action: SvnStatusCode
  filePath: string
}

interface CommitByDate {
  date: string
  count: number
}

interface CommitByAuthor {
  author: string
  count: number
}

interface AuthorshipData {
  author: string
  percentage: number
  count: number
}

interface SummaryData {
  author: string
  count: number
  percentage: number
}

interface StatisticsData {
  commitsByDate: CommitByDate[]
  commitsByAuthor: CommitByAuthor[]
  authorship: AuthorshipData[]
  summary: SummaryData[]
  totalCommits: number
}

export const columns: ColumnDef<LogEntry>[] = [
  {
    accessorKey: 'revision',
    size: 30,
    maxSize: 30,
    header: ({ column }) => (
      <Button className="!p-0 !h-7 !bg-transparent !hover:bg-transparent" variant="ghost" onClick={() => column.toggleSorting()}>
        Revision
        {!column.getIsSorted() && <ArrowUpDown />}
        {column.getIsSorted() === 'asc' && <ArrowUp />}
        {column.getIsSorted() === 'desc' && <ArrowDown />}
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
          Date
          {!column.getIsSorted() && <ArrowUpDown />}
          {column.getIsSorted() === 'asc' && <ArrowUp />}
          {column.getIsSorted() === 'desc' && <ArrowDown />}
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
          Author
          {!column.getIsSorted() && <ArrowUpDown />}
          {column.getIsSorted() === 'asc' && <ArrowUp />}
          {column.getIsSorted() === 'desc' && <ArrowDown />}
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
          Action
          {!column.getIsSorted() && <ArrowUpDown />}
          {column.getIsSorted() === 'asc' && <ArrowUp />}
          {column.getIsSorted() === 'desc' && <ArrowDown />}
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
    accessorKey: 'message',
    header: ({ column }) => {
      return (
        <Button className="!p-0 !h-7 !bg-transparent !hover:bg-transparent" variant="ghost" onClick={() => column.toggleSorting()}>
          Message
          {!column.getIsSorted() && <ArrowUpDown />}
          {column.getIsSorted() === 'asc' && <ArrowUp />}
          {column.getIsSorted() === 'desc' && <ArrowDown />}
        </Button>
      )
    },
    cell: ({ row }) => <div>{row.getValue('message')}</div>,
  },
]

export function ShowLog() {
  const [isLoading, setIsLoading] = useState(false)
  const [filePath, setFilePath] = useState('')
  const [selectedRevision, setSelectedRevision] = useState<string | null>(null)
  const [commitMessage, setCommitMessage] = useState('')
  const [changedFiles, setChangedFiles] = useState<LogFile[]>([])
  const [statusSummary, setStatusSummary] = useState<Record<SvnStatusCode, number>>({} as Record<SvnStatusCode, number>)
  const [searchTerm, setSearchTerm] = useState('')

  // Date range state - mặc định là 1 tuần trước đến ngày hiện tại
  const [dateRange, setDateRange] = useState<DateRange | undefined>(() => {
    const today = new Date()
    const oneWeekAgo = new Date()
    oneWeekAgo.setDate(today.getDate() - 7)
    return {
      from: oneWeekAgo,
      to: today,
    }
  })

  // Statistic dialog state
  const [isStatisticOpen, setIsStatisticOpen] = useState(false)

  // Pagination states
  const [currentPage, setCurrentPage] = useState(1)
  const [totalEntries, setTotalEntries] = useState(0) // State để lưu tổng số entries
  const [hasMoreEntries, setHasMoreEntries] = useState(true)
  const pageSize = 50 // Số lượng log entries mỗi trang

  const [sorting, setSorting] = useState<SortingState>([])
  const [data, setData] = useState<LogEntry[]>([])

  useEffect(() => {
    const handler = (_event: any, { filePath }: any) => {
      setFilePath(filePath)
      // Reset pagination when loading new file
      setCurrentPage(1)
      setTotalEntries(0)
      setHasMoreEntries(true)
      loadLogData(filePath, 1)
    }
    window.api.on('load-diff-data', handler)
  }, [])

  // Tải lại dữ liệu khi dateRange thay đổi
  useEffect(() => {
    if (filePath) {
      // Reset pagination when date range changes
      setCurrentPage(1)
      setHasMoreEntries(true)
      loadLogData(filePath, 1)
    }
  }, [dateRange])

  const loadLogData = async (path: string, page = currentPage) => {
    try {
      setCommitMessage('')
      setChangedFiles([])
      setStatusSummary({} as Record<SvnStatusCode, number>)
      table.resetRowSelection()
      setIsLoading(true)

      // Tính offset dựa trên trang hiện tại
      const offset = (page - 1) * pageSize

      // Chuẩn bị tham số cho API
      const options: any = { limit: pageSize, offset }

      // Thêm date range nếu có
      if (dateRange?.from) {
        options.dateFrom = dateRange.from.toISOString()
        if (dateRange.to) {
          options.dateTo = dateRange.to.toISOString()
        }
      }

      // Gọi API với tham số phân trang và date range
      const result = await window.api.svn.log(path, options)

      if (result.status === 'success') {
        const rawLog = result.data as string
        const entries = rawLog
          .split('------------------------------------------------------------------------')
          .map(entry => entry.trim())
          .filter(entry => entry)

        // Khởi tạo parsedEntries và Set để theo dõi revision đã thêm
        const parsedEntries: LogEntry[] = []
        const addedRevisions = new Set<string>() // Set to track added revisions

        for (const entry of entries) {
          const lines = entry
            .split('\n')
            .map(line => line.trim())
            .filter(Boolean)

          const headerMatch = lines[0]?.match(/^r(\d+)\s+\|\s+(.+?)\s+\|\s+(.+?)\s+\|\s+(\d+)\s+line/)
          if (!headerMatch) continue

          const [, revisionStr, author, date] = headerMatch
          let i = 1

          // Skip "Changed paths:" line
          if (lines[i]?.startsWith('Changed paths:')) i++

          const changedFiles: LogFile[] = []

          const isSvnStatusCode = (code: string): code is SvnStatusCode => {
            return Object.keys(STATUS_TEXT).includes(code)
          }

          while (i < lines.length) {
            const line = lines[i]
            const match = line.match(/^([A-Z\?\!~])\s+(\/.+)$/)
            if (!match) break

            const [, actionCode, filePath] = match
            if (!isSvnStatusCode(actionCode)) break

            changedFiles.push({
              action: actionCode,
              filePath,
            })
            i++
          }

          const messageLines = lines.slice(i)

          // Chỉ thêm entry nếu revision chưa tồn tại trong Set
          if (!addedRevisions.has(revisionStr)) {
            // Store both formatted and ISO date
            const originalDate = new Date(date)
            parsedEntries.push({
              revision: revisionStr,
              author,
              date: originalDate.toLocaleString(), // Formatted for display
              isoDate: originalDate.toISOString(), // ISO for comparison
              message: messageLines.join('\n').trim(),
              action: Array.from(new Set(changedFiles.map(f => f.action))),
              changedFiles,
            })
            addedRevisions.add(revisionStr) // Đánh dấu revision này đã được thêm
          } else {
            console.warn(`Skipping duplicate revision entry found during frontend parsing: r${revisionStr}`)
          }
        }

        // Log số lượng entry trước và sau khi loại bỏ trùng lặp (nếu có)
        if (entries.length !== parsedEntries.length) {
          console.log(`Parsed ${entries.length} raw entries, kept ${parsedEntries.length} unique entries.`)
        }

        setData(parsedEntries) // Cập nhật data state với entries duy nhất đã parse

        // --- Find earliest date from the *current* results and update dateRange.from if needed ---
        if (parsedEntries.length > 0) {
          // Sort entries by isoDate to find the earliest
          const sortedEntries = [...parsedEntries].sort((a, b) => a.isoDate.localeCompare(b.isoDate))
          const earliestIsoDate = sortedEntries[0].isoDate
          const earliestDate = new Date(earliestIsoDate)

          // Only update if the earliest date found is different from the current 'from' date
          // Compare time values to avoid issues with object references
          if (dateRange?.from?.getTime() !== earliestDate.getTime()) {
            console.log(`Updating dateRange.from to earliest date found: ${earliestIsoDate}`)
            // Update only the 'from' date, keep 'to' as is
            setDateRange(prevRange => ({
              from: earliestDate,
              to: prevRange?.to, // Keep the existing 'to' date
            }))
          }
        }
        // --- End of earliest date update ---

        // --- Cập nhật trạng thái phân trang SAU KHI parsedEntries được tạo và setData được gọi ---
        if (result.pagination) {
          const receivedTotal = result.pagination.totalEntries ?? 0
          const receivedLimit = result.pagination.limit ?? pageSize
          const receivedOffset = result.pagination.offset ?? (page - 1) * receivedLimit

          setTotalEntries(receivedTotal)
          // Tính lại trang hiện tại một cách an toàn
          const calculatedCurrentPage = receivedLimit > 0 ? Math.floor(receivedOffset / receivedLimit) + 1 : 1
          setCurrentPage(calculatedCurrentPage)

          // Xác định hasMoreEntries dựa trên totalEntries nếu có, hoặc số lượng entry nhận được
          let moreEntriesExist: boolean
          if (receivedTotal > 0) {
            // So sánh offset + số lượng thực tế nhận được với total
            moreEntriesExist = receivedOffset + parsedEntries.length < receivedTotal
          } else {
            // Fallback: Nếu không có total, kiểm tra xem có nhận đủ số lượng yêu cầu không
            // Dùng >= vì trang cuối có thể ít hơn limit
            moreEntriesExist = parsedEntries.length >= receivedLimit
          }
          setHasMoreEntries(moreEntriesExist)
          console.log(`Pagination updated: currentPage=${calculatedCurrentPage}, totalEntries=${receivedTotal}, hasMoreEntries=${moreEntriesExist}`)
        } else {
          // Fallback nếu không có thông tin pagination từ API
          setTotalEntries(0)
          setHasMoreEntries(parsedEntries.length >= pageSize) // Dùng logic cũ dựa trên số lượng nhận được
          setCurrentPage(page)
          console.warn('Pagination info missing from API response. Using fallback logic.')
        }
        // --- Kết thúc cập nhật phân trang ---

        if (parsedEntries.length > 0) {
          // Initialize status summary with the first entry
          const firstEntry = parsedEntries[0]
          const summary: Record<SvnStatusCode, number> = {} as Record<SvnStatusCode, number>
          // Initialize all status codes with 0
          for (const code of Object.keys(STATUS_TEXT)) {
            summary[code as SvnStatusCode] = 0
          }

          // Count files by status
          for (const file of firstEntry.changedFiles) {
            summary[file.action] = (summary[file.action] || 0) + 1
          }

          setCommitMessage(firstEntry.message)
          setChangedFiles(firstEntry.changedFiles)
          setStatusSummary(summary)
          table.setRowSelection({ '0': true })
          console.log('FirstEntry: ', firstEntry)
          console.log('Summary: ', summary)
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

  // Memoize the calculation of status summary to improve performance
  const calculateStatusSummary = useCallback((changedFiles: LogFile[]) => {
    const summary: Record<SvnStatusCode, number> = {} as Record<SvnStatusCode, number>

    // Initialize all status codes with 0
    for (const code of Object.keys(STATUS_TEXT)) {
      summary[code as SvnStatusCode] = 0
    }

    // Count files by status
    for (const file of changedFiles) {
      summary[file.action] = (summary[file.action] || 0) + 1
    }

    return summary
  }, [])

  const selectRevision = useCallback(
    (revision: string) => {
      if (revision === selectedRevision) return // Avoid unnecessary updates if same revision

      const entry = data.find(e => e.revision === revision)
      if (entry) {
        setSelectedRevision(revision)
        setCommitMessage(entry.message)
        setChangedFiles(entry.changedFiles)
        setStatusSummary(calculateStatusSummary(entry.changedFiles))
      }
    },
    [data, selectedRevision, calculateStatusSummary]
  )

  // Lọc dữ liệu dựa trên searchTerm
  const filteredData = useMemo(() => {
    if (!searchTerm.trim()) return data

    return data.filter(
      entry =>
        entry.revision.toLowerCase().includes(searchTerm.toLowerCase()) ||
        entry.author.toLowerCase().includes(searchTerm.toLowerCase()) ||
        entry.message.toLowerCase().includes(searchTerm.toLowerCase()) ||
        entry.date.toLowerCase().includes(searchTerm.toLowerCase())
    )
  }, [data, searchTerm])

  // Tính tổng số trang
  const totalPages = useMemo(() => {
    if (totalEntries <= 0 || pageSize <= 0) return 1 // Tránh chia cho 0
    return Math.ceil(totalEntries / pageSize)
  }, [totalEntries, pageSize])

  // Sử dụng useCallback cho handleRefresh và handlePageChange để tránh tạo lại hàm mỗi lần render
  const handleRefresh = useCallback(() => {
    // Reset pagination when refreshing
    setCurrentPage(1)
    setHasMoreEntries(true)
    loadLogData(filePath, 1)
  }, [filePath])

  // Hàm xử lý chuyển trang
  const handlePageChange = useCallback(
    (newPage: number) => {
      // Kiểm tra giới hạn trang dựa trên totalPages nếu totalEntries > 0
      const maxPage = totalPages > 0 ? totalPages : Number.POSITIVE_INFINITY // Sửa lỗi Biome
      if (newPage < 1 || newPage > maxPage || newPage === currentPage) return

      // Kiểm tra hasMoreEntries chỉ khi đi tới trang tiếp theo
      if (newPage > currentPage && !hasMoreEntries) return

      loadLogData(filePath, newPage)
    },
    [currentPage, hasMoreEntries, filePath, totalPages] // Thêm totalPages vào dependencies
  )

  // Hàm xử lý search
  const handleSearchChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value)
  }, [])

  const table = useReactTable({
    data: filteredData,
    columns,
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    enableSortingRemoval: true,
    state: {
      sorting,
    },
  })
  const Table = forwardRef<HTMLTableElement, React.HTMLAttributes<HTMLTableElement> & { wrapperClassName?: string }>(({ className, wrapperClassName, ...props }, ref) => (
    <div className={cn('relative w-full overflow-auto', wrapperClassName)}>
      <table ref={ref} className={cn('w-full caption-bottom text-sm', className)} {...props} />
    </div>
  ))
  Table.displayName = 'Table'

  return (
    <div className="flex h-screen w-full">
      <div className="flex flex-col flex-1 w-full">
        <ShowlogToolbar
          onRefresh={handleRefresh}
          filePath={filePath}
          isLoading={isLoading}
          dateRange={dateRange}
          setDateRange={setDateRange}
          onOpenStatistic={() => setIsStatisticOpen(true)}
        />
        <div className="p-4 space-y-4 flex-1 h-full flex flex-col overflow-hidden">
          <ResizablePanelGroup direction="horizontal">
            {/* LEFT PANEL: Log Table */}
            <ResizablePanel defaultSize={50} minSize={30} className="h-full">
              <div className="h-full pr-2">
                <div className="flex flex-col h-full">
                  {/* Search input */}
                  <div className="mb-2 flex items-center gap-2">
                    <div className="relative flex-1">
                      <Search className="absolute left-2 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                      <Input placeholder="Tìm kiếm theo revision, author, message..." value={searchTerm} onChange={handleSearchChange} className="pl-8" />
                    </div>
                  </div>
                  <ScrollArea className="flex-1 border-1 rounded-md">
                    <OverlayLoader isLoading={isLoading} />
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
                              className="cursor-pointer data-[state=selected]:bg-blue-100 dark:data-[state=selected]:bg-blue-900/40"
                            >
                              {row.getVisibleCells().map((cell, index) => (
                                <TableCell key={cell.id} className={cn('p-0 h-6 px-2', index === 0 && 'text-center', cell.column.id === 'filePath' && 'cursor-pointer')}>
                                  {flexRender(cell.column.columnDef.cell, cell.getContext())}
                                </TableCell>
                              ))}
                            </TableRow>
                          ))
                        ) : (
                          <TableRow className="h-full">
                            <TableCell colSpan={table.getAllColumns().length} className="text-center h-full">
                              <div className="flex flex-col items-center justify-center gap-4 h-full">
                                <p className="text-muted-foreground">No log entries found.</p>
                                <Button variant="outline" onClick={handleRefresh}>
                                  Reload
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        )}
                      </TableBody>
                    </Table>
                    <ScrollBar orientation="vertical" />
                    <ScrollBar orientation="horizontal" />
                  </ScrollArea>

                  {/* Pagination Controls */}
                  {(totalEntries > 0 || data.length > 0 || isLoading) && (
                    <div className="flex items-center justify-between pt-2 px-1 text-sm text-muted-foreground border-t">
                      <span className="flex-1 text-xs pl-1">
                        {totalEntries > 0 ? `${totalEntries} total entries` : isLoading ? 'Loading...' : data.length === 0 ? 'No entries' : ''}
                      </span>
                      <div className="flex items-center gap-2">
                        <Button variant="outline" size="sm" onClick={() => handlePageChange(currentPage - 1)} disabled={currentPage === 1 || isLoading}>
                          Previous
                        </Button>
                        <span>
                          Page {currentPage}
                          {totalPages > 1 ? ` of ${totalPages}` : ''}
                        </span>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handlePageChange(currentPage + 1)}
                          disabled={isLoading || !hasMoreEntries || (totalPages > 0 && currentPage >= totalPages)}
                        >
                          Next
                        </Button>
                      </div>
                      <div className="flex-1" /> {/* Spacer - Self-closing */}
                    </div>
                  )}
                </div>
              </div>
            </ResizablePanel>

            <ResizableHandle className="bg-transparent" />

            {/* RIGHT PANEL: Message + Changed Files */}
            <ResizablePanel defaultSize={50} minSize={30}>
              <ResizablePanelGroup direction="vertical" className="h-full">
                {/* Commit Message */}
                <ResizablePanel defaultSize={40} minSize={20}>
                  <div className="p-2 font-medium">Commit Message</div>
                  <div className="h-full pb-[2.45rem]">
                    <ScrollArea className="h-full border-1 rounded-md">
                      <Textarea className="w-full h-full resize-none border-none cursor-default break-all" readOnly={true} value={commitMessage} spellCheck={false} />
                      <ScrollBar orientation="vertical" />
                      <ScrollBar orientation="horizontal" />
                    </ScrollArea>
                  </div>
                </ResizablePanel>

                <ResizableHandle className="bg-transparent" />

                {/* Changed Files */}
                <ResizablePanel defaultSize={60} minSize={20} className="flex flex-col">
                  <div className="p-2 font-medium flex justify-between items-center">
                    <span>Changed Files</span>
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
                  <div className="h-full">
                    <ScrollArea className="h-full border-1 rounded-md">
                      <Table wrapperClassName={cn('overflow-clip', changedFiles.length === 0 && 'h-full')}>
                        <TableHeader className="sticky top-0 z-10 bg-[var(--table-header-bg)]">
                          <TableRow>
                            <TableHead className="w-24">Action</TableHead>
                            <TableHead>Path</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody className={changedFiles.length === 0 ? 'h-full' : ''}>
                          {changedFiles.length > 0 ? (
                            changedFiles.map((file, index) => (
                              <TableRow key={index}>
                                <TableCell>
                                  <StatusIcon code={file.action} />
                                </TableCell>
                                <TableCell>{file.filePath}</TableCell>
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
        </div>
      </div>

      {/* Statistic Dialog */}
      <StatisticDialog isOpen={isStatisticOpen} onOpenChange={setIsStatisticOpen} filePath={filePath} dateRange={dateRange} />
    </div>
  )
}
