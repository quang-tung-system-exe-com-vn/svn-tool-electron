'use client'
import { Button } from '@/components/ui/button'
import { ContextMenu, ContextMenuContent, ContextMenuItem, ContextMenuSeparator, ContextMenuShortcut, ContextMenuTrigger } from '@/components/ui/context-menu'
import { ScrollArea } from '@/components/ui/scroll-area'
import { type ColumnDef, type SortingState, flexRender, getCoreRowModel, getFilteredRowModel, getSortedRowModel, useReactTable } from '@tanstack/react-table'
import { type HTMLProps, forwardRef, useEffect, useImperativeHandle, useMemo, useRef, useState } from 'react'

import toast from '@/components/ui-elements/Toast'
import { TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { cn } from '@/lib/utils'
import { t } from 'i18next'
import 'ldrs/react/Quantum.css'
import { ArrowDown, ArrowUp, ArrowUpDown, Folder, FolderOpen, History, Info, RefreshCw, RotateCcw } from 'lucide-react'
import { IPC } from 'main/constants'
import { STATUS_COLOR_CLASS_MAP, STATUS_TEXT, type SvnStatusCode } from '../shared/constants'
import { OverlayLoader } from '../ui-elements/OverlayLoader'
import { StatusIcon } from '../ui-elements/StatusIcon'

export type SvnFile = {
  filePath: string
  status: SvnStatusCode
  isFile: boolean
}

export function buildColumns({ handleCheckboxChange }: { handleCheckboxChange: (row: any) => void }): ColumnDef<SvnFile>[] {
  return [
    {
      id: 'select',
      size: 30,
      header: ({ table }) => (
        <IndeterminateCheckbox
          {...{
            checked: table.getIsAllRowsSelected(),
            indeterminate: table.getIsSomeRowsSelected(),
            onChange: table.getToggleAllRowsSelectedHandler(),
          }}
        />
      ),
      cell: ({ row }) => (
        <IndeterminateCheckbox
          {...{
            checked: row.getIsSelected(),
            disabled: !row.getCanSelect(),
            indeterminate: row.getIsSomeSelected(),
            // onChange: row.getToggleSelectedHandler(),
            onChange: () => {
              handleCheckboxChange(row)
            },
          }}
        />
      ),
    },
    {
      accessorKey: 'filePath',
      minSize: 500,
      header: ({ column }) => {
        return (
          <Button className="!p-0 !h-7 !bg-transparent !hover:bg-transparent" variant="ghost" onClick={() => column.toggleSorting()}>
            {t('table.filePath')}
            {!column.getIsSorted() && <ArrowUpDown />}
            {column.getIsSorted() === 'asc' && <ArrowUp />}
            {column.getIsSorted() === 'desc' && <ArrowDown />}
          </Button>
        )
      },
      cell: ({ row }) => {
        const statusCode = row.getValue('status') as SvnStatusCode
        const className = STATUS_COLOR_CLASS_MAP[statusCode]
        return (
          <div className={cn('flex items-center gap-2', className)}>
            {row.getValue('isFile') ? (
              <StatusIcon code={statusCode as SvnStatusCode} />
            ) : (
              <Folder fill="#F5A623" color="#F5A623" strokeWidth={1} className={cn('w-4 h-4', className)} />
            )}
            {row.getValue('filePath')}
          </div>
        )
      },
    },

    {
      accessorKey: 'isFile',
      header: ({ column }) => {
        return (
          <Button className="!p-0 !h-7 !bg-transparent !hover:bg-transparent" variant="ghost" onClick={() => column.toggleSorting()}>
            {t('table.isFile')}
            {!column.getIsSorted() && <ArrowUpDown />}
            {column.getIsSorted() === 'asc' && <ArrowUp />}
            {column.getIsSorted() === 'desc' && <ArrowDown />}
          </Button>
        )
      },
      cell: ({ row }) => {
        return <div>{row.getValue('isFile') ? 'Yes' : 'No'}</div>
      },
    },
    {
      accessorKey: 'fileType',
      size: 80,
      header: ({ column }) => {
        return (
          <Button className="!p-0 !h-7 !bg-transparent !hover:bg-transparent" variant="ghost" onClick={() => column.toggleSorting()}>
            {t('table.extension')}
            {!column.getIsSorted() && <ArrowUpDown />}
            {column.getIsSorted() === 'asc' && <ArrowUp />}
            {column.getIsSorted() === 'desc' && <ArrowDown />}
          </Button>
        )
      },
      cell: ({ row }) => {
        const statusCode = row.getValue('status') as SvnStatusCode
        const className = STATUS_COLOR_CLASS_MAP[statusCode]
        return <div className={className}>{row.getValue('fileType')}</div>
      },
    },
    {
      accessorKey: 'status',
      size: 80,
      header: ({ column }) => {
        return (
          <Button className="!p-0 !h-7 !bg-transparent !hover:bg-transparent" variant="ghost" onClick={() => column.toggleSorting()}>
            {t('table.status')}
            {!column.getIsSorted() && <ArrowUpDown />}
            {column.getIsSorted() === 'asc' && <ArrowUp />}
            {column.getIsSorted() === 'desc' && <ArrowDown />}
          </Button>
        )
      },
      cell: ({ row }) => {
        const statusCode = row.getValue('status') as SvnStatusCode
        const status = STATUS_TEXT[statusCode]
        const className = STATUS_COLOR_CLASS_MAP[statusCode]
        return <div className={className}>{t(status)}</div>
      },
    },
  ]
}

async function changedFiles(): Promise<SvnFile[]> {
  const result = await window.api.svn.changed_files()
  const { status, message, data } = result
  if (status === 'error') {
    toast.error(message)
    return [] as SvnFile[]
  }
  return data as SvnFile[]
}

export const DataTable = forwardRef((props, ref) => {
  const [sorting, setSorting] = useState<SortingState>([])
  const [rowSelection, setRowSelection] = useState({})
  const [data, setData] = useState<SvnFile[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const hasLoaded = useRef(false)

  useImperativeHandle(ref, () => ({
    reloadData,
    table,
  }))

  useEffect(() => {
    if (!hasLoaded.current) {
      reloadData()
      hasLoaded.current = true
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'F5' || (event.ctrlKey && event.key === 'r')) {
        event.preventDefault()
        reloadData()
        setTimeout(() => {
          table.toggleAllPageRowsSelected(false)
        }, 0)
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => {
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [])

  const reloadData = async () => {
    try {
      setIsLoading(true)
      const result = await changedFiles()
      setData(result)
    } catch (err) {
      toast.error(err)
    } finally {
      setIsLoading(false)
    }
  }

  const getStatusOfPath = (filePath: string) => {
    const file = data.find(f => f.filePath === filePath)
    return file?.status || null
  }

  const getParentDirectory = (filePath: string) => {
    const parts = filePath.split('\\')
    parts.pop()
    const parentDirectory = parts.join('\\')
    return parentDirectory
  }

  const handleCheckboxChange = (row: any) => {
    const { filePath, status } = row.original
    const willBeSelected = !row.getIsSelected()
    const normalizedFolder = filePath.replaceAll('\\', '/')
    const rows = table.getRowModel().rows

    if (willBeSelected) {
      if (status === '?') {
        let currentPath = filePath
        while (true) {
          const parentPath = getParentDirectory(currentPath)
          if (!parentPath) break
          const parentStatus = getStatusOfPath(parentPath)
          if (parentStatus !== '?') break
          const parentRow = rows.find(r => r.original.filePath === parentPath)
          if (parentRow) {
            parentRow.toggleSelected(true)
          }
          currentPath = parentPath
        }
        for (const r of rows) {
          const childPath = r.original.filePath.replaceAll('\\', '/')
          if (childPath.startsWith(`${normalizedFolder}/`)) {
            r.toggleSelected(true)
          }
        }
      } else if (status === '!') {
        for (const r of rows) {
          const childPath = r.original.filePath.replaceAll('\\', '/')
          if (childPath.startsWith(`${normalizedFolder}/`)) {
            r.toggleSelected(true)
          }
        }
      }
    } else {
      for (const r of rows) {
        const childPath = r.original.filePath.replaceAll('\\', '/')
        if (childPath !== normalizedFolder && childPath.startsWith(`${normalizedFolder}/`)) {
          r.toggleSelected(false)
        }
      }
    }

    row.toggleSelected(willBeSelected)
  }

  const handleFilePathDoubleClick = async (row: any) => {
    const { filePath } = row.original
    try {
      window.api.svn.open_diff(filePath)
    } catch (error) {
      toast.error(error)
    }
  }

  const revealInFileExplorer = (filePath: string) => {
    window.api.system.reveal_in_file_explorer(filePath)
  }

  const info = async (filePath: string) => {
    const result = await window.api.svn.info(filePath)
    const { status, message, data } = result
    if (status === 'success') {
      return toast.info(data)
    }
    toast.error(message)
  }

  const showLog = (filePath: string) => {
    window.api.electron.send(IPC.WINDOW.SHOW_LOG, filePath)
  }

  const revertFile = async (filePath: string) => {
    try {
      const result = await window.api.svn.revert(filePath)
      if (result.status === 'success') {
        toast.success(`Reverted: ${filePath}`)
        reloadData()
      } else {
        toast.error(result.message)
      }
    } catch (error) {
      toast.error(`Error reverting file: ${error}`)
    }
  }

  const updateFile = async (filePath: string) => {
    try {
      toast.info(`Updating: ${filePath}`)
      const result = await window.api.svn.update(filePath)
      if (result.status === 'success') {
        toast.success(`Updated: ${filePath}`)
        reloadData()
      } else {
        toast.error(result.message)
      }
    } catch (error) {
      toast.error(`Error updating file: ${error}`)
    }
  }

  const columns = useMemo(() => buildColumns({ handleCheckboxChange }), [data])
  const table = useReactTable({
    data,
    columns,
    onSortingChange: setSorting,
    onRowSelectionChange: setRowSelection,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    enableSortingRemoval: true,
    state: {
      sorting,
      rowSelection,
      columnVisibility: {
        isFile: false,
      },
    },
  })
  const Table = forwardRef<HTMLTableElement, React.HTMLAttributes<HTMLTableElement> & { wrapperClassName?: string }>(({ className, wrapperClassName, ...props }, ref) => (
    <div className={cn('relative w-full overflow-auto', wrapperClassName)}>
      <table ref={ref} className={cn('w-full caption-bottom text-sm', table.getRowModel().rows.length === 0 && 'h-full', className)} {...props} />
    </div>
  ))
  Table.displayName = 'Table'

  return (
    <div className="h-full p-2">
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
                <ContextMenu key={row.id}>
                  <ContextMenuTrigger asChild>
                    <TableRow key={row.id} data-state={row.getIsSelected() && 'selected'}>
                      {row.getVisibleCells().map((cell, index) => (
                        <TableCell
                          key={cell.id}
                          className={cn('p-0 h-6 px-2', index === 0 && 'text-center', cell.column.id === 'filePath' && 'cursor-pointer')}
                          onDoubleClick={cell.column.id === 'filePath' ? () => handleFilePathDoubleClick(row) : undefined}
                        >
                          {flexRender(cell.column.columnDef.cell, cell.getContext())}
                        </TableCell>
                      ))}
                    </TableRow>
                  </ContextMenuTrigger>
                  <ContextMenuContent>
                    <ContextMenuItem disabled={row.original.status === '!'} onClick={() => revealInFileExplorer(row.original.filePath)}>
                      Reveal in File Explorer
                      <ContextMenuShortcut>
                        <FolderOpen strokeWidth={1} className="ml-3 h-4 w-4" />
                      </ContextMenuShortcut>
                    </ContextMenuItem>
                    <ContextMenuSeparator />
                    <ContextMenuItem onClick={() => info(row.original.filePath)}>
                      File Info
                      <ContextMenuShortcut>
                        <Info strokeWidth={1} className="ml-3 h-4 w-4" />
                      </ContextMenuShortcut>
                    </ContextMenuItem>
                    <ContextMenuSeparator />
                    <ContextMenuItem onClick={() => showLog(row.original.filePath)}>
                      Show Log
                      <ContextMenuShortcut>
                        <History strokeWidth={1} className="ml-3 h-4 w-4" />
                      </ContextMenuShortcut>
                    </ContextMenuItem>
                    <ContextMenuItem disabled={row.original.status === '?'} onClick={() => revertFile(row.original.filePath)}>
                      Revert
                      <ContextMenuShortcut>
                        <RotateCcw strokeWidth={1} className="ml-3 h-4 w-4" />
                      </ContextMenuShortcut>
                    </ContextMenuItem>
                    <ContextMenuItem onClick={() => updateFile(row.original.filePath)}>
                      Update
                      <ContextMenuShortcut>
                        <RefreshCw strokeWidth={1} className="ml-3 h-4 w-4" />
                      </ContextMenuShortcut>
                    </ContextMenuItem>
                  </ContextMenuContent>
                </ContextMenu>
              ))
            ) : (
              <TableRow className="h-full">
                <TableCell colSpan={table.getAllColumns().length} className="text-center h-full">
                  <div className="flex flex-col items-center justify-center gap-4 h-full">
                    <p className="text-muted-foreground">{t('message.noFilesChanged')}</p>
                    <Button variant="outline" onClick={reloadData}>
                      {t('common.reload')}
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
        {/* <ScrollBar orientation="vertical" />
        <ScrollBar orientation="horizontal" /> */}
      </ScrollArea>
      <div className="absolute flex items-center justify-end space-x-2 pt-4 px-4 right-4">
        <div className="flex-1 text-sm text-muted-foreground">
          {t('message.rowSelected', {
            0: table.getFilteredSelectedRowModel().rows.length,
            1: table.getFilteredRowModel().rows.length,
          })}
        </div>
      </div>
    </div>
  )
})

const IndeterminateCheckbox = forwardRef<HTMLInputElement, { indeterminate?: boolean } & HTMLProps<HTMLInputElement>>(
  ({ indeterminate = false, className = '', ...rest }, forwardedRef) => {
    const localRef = useRef<HTMLInputElement>(null)
    useImperativeHandle(forwardedRef, () => localRef.current as HTMLInputElement)
    useEffect(() => {
      if (localRef.current) {
        localRef.current.indeterminate = !rest.checked && indeterminate
      }
    }, [indeterminate, rest.checked])
    return <input type="checkbox" ref={localRef} className={`${className} accent-[var(--primary)] translate-y-[2px] cursor-pointer`} {...rest} />
  }
)
