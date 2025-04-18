import { OverlayLoader } from '@/components/ui-elements/OverlayLoader'
import { Button } from '@/components/ui/button'
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area'
import { TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { cn } from '@/lib/utils'
import { type ColumnDef, type SortingState, flexRender, getCoreRowModel, getSortedRowModel, useReactTable } from '@tanstack/react-table'
import { ArrowDown, ArrowUp, ArrowUpDown } from 'lucide-react'
import { forwardRef, useEffect, useState } from 'react'
import { toast } from 'sonner'
import { STATUS_TEXT, type SvnStatusCode } from '../shared/constants'
import { StatusIcon } from '../ui-elements/StatusIcon'
import { ShowlogToolbar } from './ShowlogToolbar'

import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from '@/components/ui/resizable'
import { Textarea } from '../ui/textarea'

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
      const result = await window.api.svn.log(path)

      if (result.status === 'success') {
        const rawLog = result.data as string
        const entries = rawLog
          .split('------------------------------------------------------------------------')
          .map(entry => entry.trim())
          .filter(entry => entry)

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
            const actionCode = line.charAt(0)

            if (!isSvnStatusCode(actionCode)) break

            const filePath = line.substring(2).trim()
            changedFiles.push({
              action: actionCode, // ✅ đã kiểm tra bằng type guard
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
    const entry = data.find(e => e.revision === revision)
    if (entry) {
      setCommitMessage(entry.message)
      setChangedFiles(entry.changedFiles)
    }
  }

  const handleRefresh = () => {
    loadLogData(filePath)
  }

  const [sorting, setSorting] = useState<SortingState>([])
  const [data, setData] = useState<LogEntry[]>([])

  const table = useReactTable({
    data,
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
        <ShowlogToolbar onRefresh={handleRefresh} filePath={filePath} isLoading={isLoading} />
        <div className="p-4 space-y-4 flex-1 h-full flex flex-col overflow-hidden">
          <ResizablePanelGroup direction="horizontal">
            {/* LEFT PANEL: Log Table */}
            <ResizablePanel defaultSize={50} minSize={30} className="h-full">
              <div className="h-full pr-2">
                <ScrollArea className="h-full border-1 rounded-md">
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
                            onClick={() => selectRevision(row.original.revision)}
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
                  <div className="p-2 font-medium">Changed Files</div>
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
    </div>
  )
}
