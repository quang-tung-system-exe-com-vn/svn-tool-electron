'use client'
import { StatusIcon } from '@/components/ui-elements/StatusIcon'
import toast from '@/components/ui-elements/Toast'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Button } from '@/components/ui/button'
import { ContextMenu, ContextMenuContent, ContextMenuItem, ContextMenuSeparator, ContextMenuShortcut, ContextMenuTrigger } from '@/components/ui/context-menu'
import { TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { cn } from '@/lib/utils'
import { useButtonVariant } from '@/stores/useAppearanceStore'
import { type ColumnDef, type SortingState, flexRender, getCoreRowModel, getFilteredRowModel, getSortedRowModel, useReactTable } from '@tanstack/react-table'
import { t } from 'i18next'
import 'ldrs/react/Quantum.css'
import { ArrowDown, ArrowUp, ArrowUpDown, Folder, FolderOpen, History, Info, RefreshCw, RotateCcw } from 'lucide-react'
import { IPC } from 'main/constants'
import { type HTMLProps, forwardRef, useEffect, useImperativeHandle, useMemo, useRef, useState } from 'react'
import { STATUS_COLOR_CLASS_MAP, STATUS_TEXT, type SvnStatusCode } from '../../components/shared/constants'

export type SvnFile = {
  filePath: string
  status: SvnStatusCode
  isFile: boolean
}

export function buildColumns({
  handleCheckboxChange,
  handleFilePathDoubleClick,
}: {
  handleCheckboxChange: (row: any) => void
  handleFilePathDoubleClick?: (row: any) => void
}): ColumnDef<SvnFile>[] {
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
          <div
            className={cn('flex items-center gap-2 w-full h-full cursor-pointer', className)}
            onDoubleClick={handleFilePathDoubleClick ? () => handleFilePathDoubleClick(row) : undefined}
          >
            {row.getValue('isFile') ? (
              <StatusIcon code={statusCode as SvnStatusCode} />
            ) : (
              <Folder fill="#F5A623" color="#F5A623" strokeWidth={1.25} className={cn('w-4 h-4', className)} />
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
  const hasLoaded = useRef(false)
  const variant = useButtonVariant()
  const [selectedFiles, setSelectedFiles] = useState<SvnFile[]>([])
  const [isConfirmDialogOpen, setIsConfirmDialogOpen] = useState(false)
  const [anchorRowIndex, setAnchorRowIndex] = useState<number | null>(null)
  const [confirmDialogProps, setConfirmDialogProps] = useState<{
    title: string
    description: string
    onConfirm: () => void
    actionText?: string
    cancelText?: string
  } | null>(null)

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
        toast.info(t('toast.getListSuccess'))
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
      const result = await changedFiles()
      setData(result)
    } catch (err) {
      toast.error(err)
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
    console.log(filePath)
    try {
      window.api.svn.open_diff(filePath)
    } catch (error) {
      toast.error(error)
    }
  }

  const lastClickRef = useRef({ time: 0, rowId: '' })
  const handleRowClick = (event: React.MouseEvent, row: any) => {
    const allRows = table.getRowModel().rows
    const currentRowIndex = allRows.findIndex(r => r.id === row.id)
    const currentTime = new Date().getTime()
    if ((event.target as HTMLElement).tagName === 'INPUT') {
      return
    }
    if (lastClickRef.current.rowId === row.id && currentTime - lastClickRef.current.time < 300) {
      return
    }
    lastClickRef.current = { time: currentTime, rowId: row.id }

    if (event.shiftKey) {
      if (anchorRowIndex !== null) {
        const start = Math.min(anchorRowIndex, currentRowIndex)
        const end = Math.max(anchorRowIndex, currentRowIndex)
        const selectedRowIds: Record<string, boolean> = {}
        for (let i = start; i <= end; i++) {
          selectedRowIds[allRows[i].id] = true
        }
        table.setRowSelection(selectedRowIds)
      } else {
        table.setRowSelection({ [row.id]: true })
        setAnchorRowIndex(currentRowIndex)
      }
    } else if (event.ctrlKey) {
      const currentSelection = { ...table.getState().rowSelection }
      currentSelection[row.id] = !currentSelection[row.id]
      table.setRowSelection(currentSelection)
      setAnchorRowIndex(currentRowIndex)
    } else {
      table.setRowSelection({ [row.id]: true })
      setAnchorRowIndex(currentRowIndex)
    }
    updateSelectedFiles()
  }

  const updateSelectedFiles = () => {
    const selectedRows = table.getFilteredSelectedRowModel().rows
    const files = selectedRows.map(row => row.original)
    setSelectedFiles(files)
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

  const showLog = (filePath: string | string[]) => {
    window.api.electron.send(IPC.WINDOW.SHOW_LOG, filePath)
  }

  const showConfirmationDialog = (title: string, description: string, onConfirm: () => void, actionText?: string, cancelText?: string) => {
    setConfirmDialogProps({
      title,
      description,
      onConfirm,
      actionText: actionText || t('common.confirm'),
      cancelText: cancelText || t('common.cancel'),
    })
    setIsConfirmDialogOpen(true)
  }

  const revertFile = async (filePath: string | string[]) => {
    const numFiles = Array.isArray(filePath) ? filePath.length : 1
    const fileText = numFiles > 1 ? `${numFiles} ${t('common.files', { count: numFiles }).toLowerCase()}` : `"${typeof filePath === 'string' ? filePath : filePath.join(', ')}"`

    showConfirmationDialog(
      t('dialog.revert.title'),
      t('dialog.revert.description', { files: fileText }),
      async () => {
        try {
          const result = await window.api.svn.revert(filePath)
          if (result.status === 'success') {
            toast.success(result.message || (Array.isArray(filePath) ? t('toast.revertedMultiple', { count: filePath.length }) : t('toast.revertedSingle', { file: filePath })))
            await reloadData()
            table.toggleAllPageRowsSelected(false)
          } else {
            toast.error(result.message)
          }
        } catch (error) {
          toast.error(t('toast.revertError', { error: error instanceof Error ? error.message : String(error) }))
        }
      },
      t('common.revert')
    )
  }

  const updateFile = async (filePath: string | string[]) => {
    const numFiles = Array.isArray(filePath) ? filePath.length : 1
    const fileText = numFiles > 1 ? `${numFiles} ${t('common.files', { count: numFiles }).toLowerCase()}` : `"${typeof filePath === 'string' ? filePath : filePath.join(', ')}"`

    showConfirmationDialog(
      t('dialog.update.title'),
      t('dialog.update.description', { files: fileText }),
      async () => {
        try {
          if (Array.isArray(filePath)) {
            toast.info(t('toast.updatingMultiple', { count: filePath.length }))
          } else {
            toast.info(t('toast.updatingSingle', { file: filePath }))
          }
          const result = await window.api.svn.update(filePath)
          if (result.status === 'success') {
            toast.success(result.message || (Array.isArray(filePath) ? t('toast.updatedMultiple', { count: filePath.length }) : t('toast.updatedSingle', { file: filePath })))
            await reloadData()
            table.toggleAllPageRowsSelected(false)
          } else {
            toast.error(result.message)
          }
        } catch (error) {
          toast.error(t('toast.updateError', { error: error instanceof Error ? error.message : String(error) }))
        }
      },
      t('common.update')
    )
  }

  const columns = useMemo(() => buildColumns({ handleCheckboxChange, handleFilePathDoubleClick }), [data])
  const table = useReactTable({
    data,
    columns,
    onSortingChange: setSorting,
    onRowSelectionChange: updatedRowSelection => {
      setRowSelection(updatedRowSelection)
      setTimeout(updateSelectedFiles, 0)
    },
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
      <div className="flex flex-col border rounded-md overflow-auto h-full">
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
              table.getRowModel().rows.map(row => {
                const isMultipleSelected = selectedFiles.length > 1 && row.getIsSelected()
                const filePaths = selectedFiles.map(file => file.filePath)
                const hasUnversionedFiles = selectedFiles.some(file => file.status === '?')

                return (
                  <ContextMenu key={row.id}>
                    <ContextMenuTrigger asChild>
                      <TableRow key={row.id} data-state={row.getIsSelected() && 'selected'} onClick={e => handleRowClick(e, row)}>
                        {row.getVisibleCells().map((cell, index) => (
                          <TableCell key={cell.id} className={cn('p-0 h-6 px-2', index === 0 && 'text-center', cell.column.id === 'filePath' && 'cursor-pointer')}>
                            {flexRender(cell.column.columnDef.cell, cell.getContext())}
                          </TableCell>
                        ))}
                      </TableRow>
                    </ContextMenuTrigger>
                    <ContextMenuContent>
                      {isMultipleSelected ? (
                        <>
                          <ContextMenuItem onClick={() => showLog(filePaths)}>
                            Show Log
                            <ContextMenuShortcut>
                              <History strokeWidth={1.25} className="ml-3 h-4 w-4" />
                            </ContextMenuShortcut>
                          </ContextMenuItem>
                          <ContextMenuItem disabled={hasUnversionedFiles} onClick={() => revertFile(filePaths)}>
                            Revert Selected Files
                            <ContextMenuShortcut>
                              <RotateCcw strokeWidth={1.25} className="ml-3 h-4 w-4" />
                            </ContextMenuShortcut>
                          </ContextMenuItem>
                          <ContextMenuItem onClick={() => updateFile(filePaths)}>
                            Update Selected Files
                            <ContextMenuShortcut>
                              <RefreshCw strokeWidth={1.25} className="ml-3 h-4 w-4" />
                            </ContextMenuShortcut>
                          </ContextMenuItem>
                        </>
                      ) : (
                        <>
                          <ContextMenuItem disabled={row.original.status === '!'} onClick={() => revealInFileExplorer(row.original.filePath)}>
                            Reveal in File Explorer
                            <ContextMenuShortcut>
                              <FolderOpen strokeWidth={1.25} className="ml-3 h-4 w-4" />
                            </ContextMenuShortcut>
                          </ContextMenuItem>
                          <ContextMenuSeparator />
                          <ContextMenuItem onClick={() => info(row.original.filePath)}>
                            File Info
                            <ContextMenuShortcut>
                              <Info strokeWidth={1.25} className="ml-3 h-4 w-4" />
                            </ContextMenuShortcut>
                          </ContextMenuItem>
                          <ContextMenuSeparator />
                          <ContextMenuItem onClick={() => showLog(row.original.filePath)}>
                            Show Log
                            <ContextMenuShortcut>
                              <History strokeWidth={1.25} className="ml-3 h-4 w-4" />
                            </ContextMenuShortcut>
                          </ContextMenuItem>
                          <ContextMenuItem disabled={row.original.status === '?'} onClick={() => revertFile(row.original.filePath)}>
                            Revert
                            <ContextMenuShortcut>
                              <RotateCcw strokeWidth={1.25} className="ml-3 h-4 w-4" />
                            </ContextMenuShortcut>
                          </ContextMenuItem>
                          <ContextMenuItem onClick={() => updateFile(row.original.filePath)}>
                            Update
                            <ContextMenuShortcut>
                              <RefreshCw strokeWidth={1.25} className="ml-3 h-4 w-4" />
                            </ContextMenuShortcut>
                          </ContextMenuItem>
                        </>
                      )}
                    </ContextMenuContent>
                  </ContextMenu>
                )
              })
            ) : (
              <TableRow className="h-full">
                <TableCell colSpan={table.getAllColumns().length} className="text-center h-full">
                  <div className="flex flex-col items-center justify-center gap-4 h-full">
                    <p className="text-muted-foreground">{t('message.noFilesChanged')}</p>
                    <Button variant={variant} onClick={reloadData}>
                      {t('common.reload')}
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
      <div className="absolute flex items-center justify-end space-x-2 pt-[22px] px-4 right-4">
        <div className="flex-1 text-sm text-muted-foreground">
          {t('message.rowSelected', {
            0: table.getFilteredSelectedRowModel().rows.length,
            1: table.getFilteredRowModel().rows.length,
          })}
        </div>
      </div>
      {confirmDialogProps && (
        <AlertDialog open={isConfirmDialogOpen} onOpenChange={setIsConfirmDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>{confirmDialogProps.title}</AlertDialogTitle>
              <AlertDialogDescription>{confirmDialogProps.description}</AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel onClick={() => setIsConfirmDialogOpen(false)}>{confirmDialogProps.cancelText}</AlertDialogCancel>
              <AlertDialogAction
                onClick={() => {
                  confirmDialogProps.onConfirm()
                  setIsConfirmDialogOpen(false)
                }}
              >
                {confirmDialogProps.actionText}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}
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
    return <input type="checkbox" ref={localRef} className={`${className} translate-y-[2px] cursor-pointer`} {...rest} />
  }
)
