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
import { STATUS_TEXT, type SvnStatusCode } from '../shared/constants'
import { StatusIcon } from '../ui-elements/StatusIcon'
import { Textarea } from '../ui/textarea'
import { StatisticDialog } from '../dialogs/StatisticDialog'
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
  date: string
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
  const [totalEntries, setTotalEntries] = useState(0)
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

        // Cập nhật trạng thái phân trang
        if (result.pagination) {
          // Nếu số lượng entries nhỏ hơn pageSize, có thể đã hết entries
          setHasMoreEntries(entries.length >= pageSize)
          setCurrentPage(page)
        }

        const parsedEntries: LogEntry[] = []

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

          parsedEntries.push({
            revision: revisionStr,
            author,
            date: new Date(date).toLocaleString(),
            message: messageLines.join('\n').trim(),
            action: Array.from(new Set(changedFiles.map(f => f.action))),
            changedFiles,
          })
        }
        setData(parsedEntries)

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
    if (!searchTerm.trim()) return data;

    return data.filter(entry =>
      entry.revision.toLowerCase().includes(searchTerm.toLowerCase()) ||
      entry.author.toLowerCase().includes(searchTerm.toLowerCase()) ||
      entry.message.toLowerCase().includes(searchTerm.toLowerCase()) ||
      entry.date.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [data, searchTerm]);

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
      if (newPage < 1 || (newPage > currentPage && !hasMoreEntries)) return
      loadLogData(filePath, newPage)
    },
    [currentPage, hasMoreEntries, filePath]
  )

  // Hàm xử lý search
  const handleSearchChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value);
  }, []);

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
                      <Input
                        placeholder="Tìm kiếm theo revision, author, message..."
                        value={searchTerm}
                        onChange={handleSearchChange}
                        className="pl-8"
                      />
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

                  {/* Pagination UI - Đã được di chuyển ra khỏi ScrollArea */}
                  <div className="flex items-center justify-between p-2 border-t mt-2">
                    <div className="text-sm text-muted-foreground">Trang {currentPage}</div>
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm" onClick={() => handlePageChange(currentPage - 1)} disabled={currentPage <= 1 || isLoading}>
                        Trang trước
                      </Button>
                      <Button variant="outline" size="sm" onClick={() => handlePageChange(currentPage + 1)} disabled={!hasMoreEntries || isLoading}>
                        Trang sau
                      </Button>
                    </div>
                  </div>
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
      <StatisticDialog
        isOpen={isStatisticOpen}
        onOpenChange={setIsStatisticOpen}
        filePath={filePath}
        dateRange={dateRange}
      />
    </div>
  )
}
