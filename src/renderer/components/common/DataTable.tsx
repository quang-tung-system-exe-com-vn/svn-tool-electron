'use client'
import { type ColumnDef, type SortingState, flexRender, getCoreRowModel, getFilteredRowModel, getSortedRowModel, useReactTable } from '@tanstack/react-table'
import { type HTMLProps, forwardRef, useEffect, useImperativeHandle, useRef, useState } from 'react'

import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'

import { TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { cn } from '@/lib/utils'
import 'ldrs/react/Quantum.css'
import { ArrowDown, ArrowUp, ArrowUpDown, File, Folder } from 'lucide-react'
import { toast } from 'sonner'
import { STATUS_COLOR_CLASS_MAP, STATUS_TEXT, type SvnStatusCode } from '../shared/constants'
import { OverlayLoader } from './OverlayLoader'

export type SvnFile = {
  filePath: string
  status: SvnStatusCode
  isFile: boolean
}
export const columns: ColumnDef<SvnFile>[] = [
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
          onChange: row.getToggleSelectedHandler(),
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
          File Path
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
          {row.getValue('isFile') ? <File strokeWidth={1.25} className={cn('w-4 h-4', className)} /> : <Folder strokeWidth={1.25} className={cn('w-4 h-4', className)} />}
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
          Status
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
        <div className={className}>
          <div>{row.getValue('isFile') ? 'Yes' : 'No'}</div>
        </div>
      )
    },
  },
  {
    accessorKey: 'fileType',
    size: 80,
    header: ({ column }) => {
      return (
        <Button className="!p-0 !h-7 !bg-transparent !hover:bg-transparent" variant="ghost" onClick={() => column.toggleSorting()}>
          Extension
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
          Status
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
      return <div className={className}>{status}</div>
    },
  },
]

async function getSvnChangedFiles(): Promise<SvnFile[]> {
  const result = await window.api.svn.get_changed_files()

  const { status, message, data } = result
  if (status === 'error') {
    toast.error(message)
    return [] as SvnFile[]
  }
  // toast.success(t('toast.getSvnChangedFilesSuccess'))
  return data as SvnFile[]
}

export const DataTable = forwardRef((props, ref) => {
  const [sorting, setSorting] = useState<SortingState>([])
  const [rowSelection, setRowSelection] = useState({})
  const [data, setData] = useState<SvnFile[]>([])
  const [isLoading, setIsLoading] = useState(false)

  const hasLoaded = useRef(false)

  useEffect(() => {
    if (!hasLoaded.current) {
      reloadData()
      hasLoaded.current = true
    }
  }, [])

  useImperativeHandle(ref, () => table)

  const reloadData = async () => {
    try {
      setIsLoading(true)
      const result = await getSvnChangedFiles()
      setData(result)
    } catch (err) {
      console.error('Error reloading SVN files:', err)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Kiểm tra tổ hợp phím F5 hoặc Ctrl+R
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
  }, []) // Thêm dependency table để cập nhật khi bảng thay đổi

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
      <table ref={ref} className={cn('w-full caption-bottom text-sm', className)} {...props} />
    </div>
  ))
  Table.displayName = 'Table'

  function handleFilePathDoubleClick(row: any) {
    const { filePath, status } = row.original
    console.log('Double clicked row:', { filePath, status })
    window.api.svn.open_svn_dif(filePath, status)
  }

  return (
    <div className="h-full p-2">
      <ScrollArea className="h-full border-1 rounded-md">
        <OverlayLoader isLoading={isLoading} />
        <Table wrapperClassName="overflow-clip">
          <TableHeader className="sticky top-0 z-10 bg-[var(--table-header-bg)]">
            {table.getHeaderGroups().map(headerGroup => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header, index) => (
                  <TableHead
                    key={header.id}
                    style={{ width: header.getSize() }}
                    className={cn('relative group h-9 p-0', '!text-[var(--table-header-fg)]', index === 0 && 'text-center')}
                  >
                    {header.isPlaceholder ? null : flexRender(header.column.columnDef.header, header.getContext())}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows?.length ? (
              table.getRowModel().rows.map(row => (
                <TableRow key={row.id} data-state={row.getIsSelected() && 'selected'}>
                  {row.getVisibleCells().map((cell, index) => (
                    <TableCell
                      key={cell.id}
                      className={cn(
                        'p-0 h-6',
                        index === 0 && 'text-center',
                        cell.column.id === 'filePath' && 'cursor-pointer' // 👈 Thêm class 'cursor-pointer' cho cột filePath
                      )}
                      onDoubleClick={cell.column.id === 'filePath' ? () => handleFilePathDoubleClick(row) : undefined}
                    >
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={table.getAllColumns().length} className="text-center">
                  No results.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </ScrollArea>
      <div className="absolute flex items-center justify-end space-x-2 pt-4 px-4 right-4">
        <div className="flex-1 text-sm text-muted-foreground">
          {table.getFilteredSelectedRowModel().rows.length} of {table.getFilteredRowModel().rows.length} row(s) selected.
        </div>
      </div>
    </div>
  )
})

function IndeterminateCheckbox({ indeterminate, className = '', ...rest }: { indeterminate?: boolean } & HTMLProps<HTMLInputElement>) {
  const ref = useRef<HTMLInputElement | null>(null)
  useEffect(() => {
    if (typeof indeterminate === 'boolean') {
      if (ref.current) {
        ref.current.indeterminate = !rest.checked && indeterminate
      }
    }
  }, [ref, indeterminate])

  return <input type="checkbox" ref={ref} className={`${className} accent-[var(--primary)] translate-y-[2px] cursor-pointer`} {...rest} />
}
