'use client'
import {
  type ColumnDef,
  type ColumnFiltersState,
  type SortingState,
  type VisibilityState,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getSortedRowModel,
  useReactTable,
} from '@tanstack/react-table'
import { ArrowUpDown } from 'lucide-react'
import * as React from 'react'

import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { ScrollArea } from '@/components/ui/scroll-area'

import { TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { cn } from '@/lib/utils'
import type { Theme } from 'main/setting/AppearanceStore'
import { STATUS_COLOR_MAP_DARK, STATUS_COLOR_MAP_LIGHT, STATUS_TEXT, type SvnStatusCode } from '../shared/constants'
import { useAppearanceStore } from '../stores/useAppearanceStore'

export type SvnFile = {
  filePath: string
  status: SvnStatusCode
}

export const getColumns = (theme: Theme): ColumnDef<SvnFile>[] => [
  {
    id: 'select',
    size: 20,
    header: ({ table }) => (
      <Checkbox
        className="border-primary"
        checked={table.getIsAllPageRowsSelected() || (table.getIsSomePageRowsSelected() && 'indeterminate')}
        onCheckedChange={value => table.toggleAllPageRowsSelected(!!value)}
        aria-label="Select all"
      />
    ),
    cell: ({ row }) => <Checkbox className="border-primary" checked={row.getIsSelected()} onCheckedChange={value => row.toggleSelected(!!value)} aria-label="Select row" />,
  },
  {
    accessorKey: 'filePath',
    minSize: 500,
    header: ({ column }) => {
      return (
        <Button className="!p-0 !h-7 !bg-transparent !hover:bg-transparent" variant="ghost" onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}>
          File Path
          <ArrowUpDown />
        </Button>
      )
    },
    cell: ({ row }) => {
      const statusCode = row.getValue('status') as SvnStatusCode
      const color = theme === 'dark' ? STATUS_COLOR_MAP_DARK[statusCode] : STATUS_COLOR_MAP_LIGHT[statusCode]
      return (
        <div className="capitalize" style={{ color }}>
          {row.getValue('filePath')}
        </div>
      )
    },
  },
  {
    accessorKey: 'status',
    size: 80,
    header: ({ column }) => {
      return (
        <Button className="!p-0 !h-7 !bg-transparent !hover:bg-transparent" variant="ghost" onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}>
          Status
          <ArrowUpDown />
        </Button>
      )
    },
    enableResizing: true,
    cell: ({ row }) => {
      const statusCode = row.getValue('status') as SvnStatusCode
      const status = STATUS_TEXT[statusCode]
      return <div className="capitalize">{status}</div>
    },
  },
]

async function getSvnChangedFiles(): Promise<SvnFile[]> {
  const result = await window.api.svn.get_changed_files()
  return result as SvnFile[]
}

export function DataTable() {
  const [sorting, setSorting] = React.useState<SortingState>([])
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>([])
  const [columnVisibility, setColumnVisibility] = React.useState<VisibilityState>({})
  const [rowSelection, setRowSelection] = React.useState({})
  const [data, setData] = React.useState<SvnFile[]>([])
  const { theme } = useAppearanceStore()

  React.useEffect(() => {
    getSvnChangedFiles().then(setData).catch(console.error)
  }, [])

  const table = useReactTable({
    data,
    columns: getColumns(theme),
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    onColumnVisibilityChange: setColumnVisibility,
    onRowSelectionChange: setRowSelection,
    state: {
      sorting,
      columnFilters,
      columnVisibility,
      rowSelection,
    },
  })
  const Table = React.forwardRef<HTMLTableElement, React.HTMLAttributes<HTMLTableElement> & { wrapperClassName?: string }>(({ className, wrapperClassName, ...props }, ref) => (
    <div className={cn('relative w-full overflow-auto', wrapperClassName)}>
      <table ref={ref} className={cn('w-full caption-bottom text-sm', className)} {...props} />
    </div>
  ))
  Table.displayName = 'Table'

  return (
    <div className="h-full">
      <ScrollArea className="h-full">
        <Table wrapperClassName="overflow-clip">
          <TableHeader className="sticky top-0 z-10 bg-[var(--table-header-bg)]">
            {table.getHeaderGroups().map(headerGroup => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header, index) => (
                  <TableHead
                    key={header.id}
                    style={{ width: header.getSize() }}
                    className={cn('relative group h-9', '!text-[var(--table-header-fg)]', index === 0 && 'text-center')}
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
                    <TableCell key={cell.id} className={cn('py-0 h-6', index === 0 && 'text-center')}>
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
      <div className="absolute flex items-center justify-end space-x-2 py-2 px-4 right-4">
        <div className="flex-1 text-sm text-muted-foreground">
          {table.getFilteredSelectedRowModel().rows.length} of {table.getFilteredRowModel().rows.length} row(s) selected.
        </div>
      </div>
    </div>
  )
}
