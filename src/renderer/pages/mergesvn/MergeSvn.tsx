'use client'
import { MERGE_STATUS_COLOR_CLASS_MAP, MERGE_STATUS_TEXT, type SvnMergeStatusCode } from '@/components/shared/constants'
import { GlowLoader } from '@/components/ui-elements/GlowLoader'
import toast from '@/components/ui-elements/Toast'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardFooter } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from '@/components/ui/resizable'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Switch } from '@/components/ui/switch'
import { TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Textarea } from '@/components/ui/textarea'
import { cn } from '@/lib/utils'
import logger from '@/services/logger'
import { useAppearanceStore, useButtonVariant } from '@/stores/useAppearanceStore'
import { DiffEditor, Editor, useMonaco } from '@monaco-editor/react'
import { FileWarning, GitMerge, SearchCheck, SendHorizontal } from 'lucide-react'
import { forwardRef, useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { MergeSvnToolbar } from './MergeSvnToolbar'

interface Commit {
  revision: string
  author: string
  date: string
  message: string
}

interface ConflictFile {
  path: string
  content?: {
    mine: string
    theirs: string
    base: string
  }
  isRevisionConflict?: boolean
}

interface MergeOutputItem {
  status: string
  filePath: string
}

export function MergeSvn() {
  const { t } = useTranslation()
  const variant = useButtonVariant()
  const { themeMode } = useAppearanceStore()
  const monaco = useMonaco()
  const [isLoading, setIsLoading] = useState(false)
  const [activeTab, setActiveTab] = useState('setup')
  const [sourcePath, setSourcePath] = useState('D:\\tokodenko\\ProgramSource\\FrontEnd\\tokodenko-material')
  const [targetPath, setTargetPath] = useState('D:\\tokodenko\\ProgramSource\\FrontEnd\\tokodenko-material_mobile')
  const [revision, setRevision] = useState('4598:4634')
  const [createBackup, setCreateBackup] = useState(false)
  const [dryRunOutput, setDryRunOutput] = useState('')
  const [mergeTableData, setMergeTableData] = useState<MergeOutputItem[]>([])
  const [commits, setCommits] = useState<Commit[]>([])
  const [conflicts, setConflicts] = useState<ConflictFile[]>([])
  const [selectedConflict, setSelectedConflict] = useState<ConflictFile | null>(null)
  const [commitMessage, setCommitMessage] = useState('')
  const [mergeCompleted, setMergeCompleted] = useState(false)
  const [changedFiles, setChangedFiles] = useState<string[]>([])
  const [mergeTableSort, setMergeTableSort] = useState<string | null>(null)
  const [mergeTableSortDirection, setMergeTableSortDirection] = useState<'asc' | 'desc'>('asc')
  const [commitsSort, setCommitsSort] = useState<string | null>(null)
  const [commitsSortDirection, setCommitsSortDirection] = useState<'asc' | 'desc'>('asc')

  useEffect(() => {
    if (!monaco) return
    monaco.editor.defineTheme('custom-dark', {
      base: 'vs-dark',
      inherit: true,
      rules: [],
      colors: {
        'editor.background': '#202020',
        'editorLineNumber.foreground': '#6c7086',
        'editorCursor.foreground': '#f38ba8',
        'diffEditor.insertedTextBackground': '#00fa5120',
        'diffEditor.removedTextBackground': '#ff000220',
        'diffEditor.insertedLineBackground': '#00aa5120',
        'diffEditor.removedLineBackground': '#aa000220',
      },
    })
    monaco.editor.defineTheme('custom-light', {
      base: 'vs',
      inherit: true,
      rules: [],
      colors: {
        'editor.background': '#f9f9f9',
        'editorLineNumber.foreground': '#9aa2b1',
        'editorCursor.foreground': '#931845',
        'diffEditor.insertedTextBackground': '#a2f3bdcc',
        'diffEditor.removedTextBackground': '#f19999cc',
        'diffEditor.insertedLineBackground': '#b7f5c6cc',
        'diffEditor.removedLineBackground': '#f2a8a8cc',
      },
    })
    const selectedTheme = themeMode === 'dark' ? 'custom-dark' : 'custom-light'
    monaco.editor.setTheme(selectedTheme)
  }, [monaco, themeMode])

  const checkMerge = async () => {
    if (!sourcePath || !targetPath) {
      toast.warning(t('message.pathsRequired'))
      return
    }

    setIsLoading(true)
    try {
      if (createBackup) {
        const snapshotResult = await window.api.svn.merge_create_snapshot(targetPath)
        if (snapshotResult.status === 'success') {
          toast.success(snapshotResult.message)
        } else {
          toast.error(snapshotResult.message)
          setIsLoading(false)
          return
        }
      }
      const result = await window.api.svn.merge({
        sourcePath,
        targetPath,
        dryRun: true,
        revision: revision || undefined,
      })
      if (result.status === 'success') {
        setDryRunOutput(result.data?.dryRunOutput || '')
        setMergeTableData(result.data?.mergeTableData || [])
        const commitsResult = await window.api.svn.merge_get_commits({
          sourcePath,
          targetPath,
        })
        if (commitsResult.status === 'success') {
          if (commitsResult.data?.commits) {
            logger.info('Commit List:', commitsResult.data.commits)
            setCommits(commitsResult.data.commits)
            if (commitsResult.data.commits.length > 0) {
              const revisions = commitsResult.data.commits.map((commit: Commit) => commit.revision)
              setCommitMessage(`Merge from ${sourcePath} to ${targetPath}\n\nRevisions: ${revisions.join(', ')}`)
            }
          } else if (commitsResult.data?.changedFiles) {
            const revisions = commitsResult.data.changedFiles
            const commitList = revisions.map((rev: string) => ({
              revision: rev,
              author: '',
              date: '',
              message: '',
            }))
            logger.info('Commit List (fallback):', commitList)
            setCommits(commitList)
            if (commitList.length > 0) {
              setCommitMessage(`Merge from ${sourcePath} to ${targetPath}\n\nRevisions: ${revisions.join(', ')}`)
            }
          }
        }
        setActiveTab('preview')
        toast.success(t('toast.dryRunSuccess'))
      } else {
        toast.error(result.message)
      }
    } catch (error) {
      toast.error(`${t('toast.dryRunError')}: ${error}`)
    } finally {
      setIsLoading(false)
    }
  }

  const performMerge = async () => {
    if (!sourcePath || !targetPath) {
      toast.warning(t('message.pathsRequired'))
      return
    }
    setIsLoading(true)
    try {
      const result = await window.api.svn.merge({
        sourcePath,
        targetPath,
        dryRun: false,
        revision: revision || undefined,
      })
      if (result.status === 'success') {
        setChangedFiles(result.data?.changedFiles || [])
        setMergeCompleted(true)
        setActiveTab('complete')
        toast.success(t('toast.mergeSuccess'))
      } else if (result.status === 'conflict') {
        setConflicts(result.data?.conflicts || [])
        if (result.data?.conflicts && result.data.conflicts.length > 0) {
          setSelectedConflict(result.data.conflicts[0])
        }
        setActiveTab('conflicts')
        toast.warning(t('toast.mergeConflicts'))
      } else {
        toast.error(result.message)
      }
    } catch (error) {
      toast.error(`${t('toast.mergeError')}: ${error}`)
    } finally {
      setIsLoading(false)
    }
  }

  const resolveConflict = async (resolution: 'mine' | 'theirs' | 'base' | 'working') => {
    if (!selectedConflict) return
    setIsLoading(true)
    try {
      const isRevisionConflict = selectedConflict.isRevisionConflict || false
      const result = await window.api.svn.merge_resolve_conflict(selectedConflict.path, resolution, isRevisionConflict, targetPath)
      if (result.status === 'success') {
        const updatedConflicts = conflicts.filter(conflict => conflict.path !== selectedConflict.path)
        setConflicts(updatedConflicts)
        if (result.data?.changedFiles) {
          setChangedFiles(result.data.changedFiles)
        }
        if (updatedConflicts.length > 0) {
          setSelectedConflict(updatedConflicts[0])
        } else {
          setMergeCompleted(true)
          setActiveTab('complete')
        }
        toast.success(result.message)
      } else {
        toast.error(result.message)
      }
    } catch (error) {
      toast.error(`${t('toast.resolveConflictError')}: ${error}`)
    } finally {
      setIsLoading(false)
    }
  }

  const commitMerge = async () => {
    if (!commitMessage) {
      toast.warning(t('message.commitMessageRequired'))
      return
    }
    setIsLoading(true)
    try {
      const result = await window.api.svn.commit(commitMessage, '', [])
      if (result.status === 'success') {
        toast.success(t('toast.commitSuccess'))
      } else {
        toast.error(result.message)
      }
    } catch (error) {
      toast.error(`${t('toast.commitError')}: ${error}`)
    } finally {
      setIsLoading(false)
    }
  }

  const handleMergeTableSort = (column: string) => {
    if (mergeTableSort === column) {
      if (mergeTableSortDirection === 'asc') {
        setMergeTableSortDirection('desc')
      } else {
        setMergeTableSort(null)
      }
    } else {
      setMergeTableSort(column)
      setMergeTableSortDirection('asc')
    }
  }

  const handleCommitsSort = (column: string) => {
    if (commitsSort === column) {
      if (commitsSortDirection === 'asc') {
        setCommitsSortDirection('desc')
      } else {
        setCommitsSort(null)
      }
    } else {
      setCommitsSort(column)
      setCommitsSortDirection('asc')
    }
  }

  const getSortedMergeTableData = () => {
    if (!mergeTableSort) return mergeTableData
    return [...mergeTableData].sort((a, b) => {
      let valueA = ''
      let valueB = ''
      if (mergeTableSort === 'status') {
        valueA = a.status
        valueB = b.status
      } else if (mergeTableSort === 'filePath') {
        valueA = a.filePath
        valueB = b.filePath
      } else {
        return 0
      }
      if (valueA < valueB) {
        return mergeTableSortDirection === 'asc' ? -1 : 1
      }
      if (valueA > valueB) {
        return mergeTableSortDirection === 'asc' ? 1 : -1
      }
      return 0
    })
  }

  const getSortedCommits = () => {
    if (!commitsSort) return commits
    return [...commits].sort((a, b) => {
      let valueA: string | number = ''
      let valueB: string | number = ''
      if (commitsSort === 'revision') {
        valueA = Number.parseInt(a.revision, 10) || 0
        valueB = Number.parseInt(b.revision, 10) || 0
      } else if (commitsSort === 'author') {
        valueA = a.author || ''
        valueB = b.author || ''
      } else if (commitsSort === 'date') {
        valueA = a.date || ''
        valueB = b.date || ''
      } else if (commitsSort === 'message') {
        valueA = a.message || ''
        valueB = b.message || ''
      } else {
        return 0
      }
      if (commitsSort === 'revision') {
        const numA = valueA as number
        const numB = valueB as number
        return commitsSortDirection === 'asc' ? numA - numB : numB - numA
      }
      if (valueA < valueB) {
        return commitsSortDirection === 'asc' ? -1 : 1
      }
      if (valueA > valueB) {
        return commitsSortDirection === 'asc' ? 1 : -1
      }
      return 0
    })
  }

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
      <div className="flex flex-col flex-1 w-full">
        <MergeSvnToolbar isLoading={isLoading} />
        <div className="p-4 space-y-4 flex-1 flex flex-col">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col">
            <TabsList className="grid grid-cols-4">
              <TabsTrigger value="setup">{t('dialog.mergeSvn.tabs.setup')}</TabsTrigger>
              <TabsTrigger value="preview">{t('dialog.mergeSvn.tabs.preview')}</TabsTrigger>
              <TabsTrigger value="conflicts">{t('dialog.mergeSvn.tabs.conflicts')}</TabsTrigger>
              <TabsTrigger value="complete">{t('dialog.mergeSvn.tabs.complete')}</TabsTrigger>
            </TabsList>

            <TabsContent value="setup" className="flex-1 flex flex-col">
              <div className="flex-1 flex flex-col">
                <Card className="flex-1">
                  <CardContent>
                    <div className="grid gap-4 py-2">
                      <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="source-path" className="text-right">
                          {t('dialog.mergeSvn.sourcePath')}
                        </Label>
                        <Input
                          id="source-path"
                          disabled={isLoading}
                          value={sourcePath}
                          onChange={e => setSourcePath(e.target.value)}
                          placeholder="Source path (URL hoặc local path)"
                          className="col-span-3"
                        />
                      </div>
                      <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="target-path" className="text-right">
                          {t('dialog.mergeSvn.targetPath')}
                        </Label>
                        <Input
                          id="target-path"
                          disabled={isLoading}
                          value={targetPath}
                          onChange={e => setTargetPath(e.target.value)}
                          placeholder="Target path (URL hoặc local path)"
                          className="col-span-3"
                        />
                      </div>
                      <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="revision" className="text-right">
                          {t('dialog.mergeSvn.revision')}
                        </Label>
                        <Input
                          id="revision"
                          disabled={isLoading}
                          value={revision}
                          onChange={e => setRevision(e.target.value)}
                          placeholder="100:HEAD hoặc 100:200"
                          className="col-span-3"
                        />
                      </div>
                      <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="create-backup" className="text-right">
                          {t('dialog.mergeSvn.createBackup')}
                        </Label>
                        <div className="flex items-center space-x-2 col-span-3">
                          <Switch id="create-backup" disabled={isLoading} checked={createBackup} onCheckedChange={setCreateBackup} />
                          <Label htmlFor="create-backup">{createBackup ? t('dialog.mergeSvn.backupEnabled') : t('dialog.mergeSvn.backupDisabled')}</Label>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                  <CardFooter>
                    <div className="flex justify-center w-full">
                      <Button
                        className={`relative ${isLoading ? 'border-effect' : ''} ${isLoading ? 'cursor-progress' : ''}`}
                        variant={variant}
                        onClick={() => {
                          if (!isLoading) {
                            checkMerge()
                          }
                        }}
                      >
                        {isLoading ? <GlowLoader /> : <SearchCheck className="h-4 w-4" />} {t('dialog.mergeSvn.checkMerge')}
                      </Button>
                    </div>
                  </CardFooter>
                </Card>
              </div>
            </TabsContent>

            <TabsContent value="preview" className="flex-1 flex flex-col">
              <ResizablePanelGroup direction="vertical" className="flex-1 gap-2">
                <ResizablePanel defaultSize={60} minSize={30}>
                  <Card className="flex-1 h-full p-2 pt-0">
                    <CardContent className="h-full p-2">
                      <div className="h-full flex flex-col">
                        <div className="flex items-center justify-between">
                          <Label className=" mb-2">{t('dialog.mergeSvn.dryRunResult')}</Label>
                          <div className="flex flex-wrap gap-2">
                            {Object.entries(
                              mergeTableData.reduce(
                                (acc, item) => {
                                  const status = item.status as SvnMergeStatusCode
                                  acc[status] = (acc[status] || 0) + 1
                                  return acc
                                },
                                {} as Record<SvnMergeStatusCode, number>
                              )
                            ).map(([status, count]) => (
                              <div key={status} className={`px-2 py-1 rounded-md text-sm ${MERGE_STATUS_COLOR_CLASS_MAP[status as SvnMergeStatusCode]}`}>
                                {t(MERGE_STATUS_TEXT[status as SvnMergeStatusCode])}: {count}
                              </div>
                            ))}
                          </div>
                        </div>
                        <div className="flex flex-col border rounded-md overflow-auto h-full">
                          <ScrollArea className="h-full w-full">
                            {mergeTableData.length > 0 ? (
                              <Table wrapperClassName={cn('overflow-clip', mergeTableData.length === 0 && 'h-full')}>
                                <TableHeader className="sticky top-0 z-10 bg-[var(--table-header-bg)]">
                                  <TableRow>
                                    <TableHead className="cursor-pointer hover:bg-muted/50 h-9" onClick={() => handleMergeTableSort('status')}>
                                      Trạng thái
                                      {mergeTableSort === 'status' && <span className="ml-1">{mergeTableSortDirection === 'asc' ? '↑' : '↓'}</span>}
                                    </TableHead>
                                    <TableHead className="cursor-pointer hover:bg-muted/50 h-9" onClick={() => handleMergeTableSort('filePath')}>
                                      Tệp tin
                                      {mergeTableSort === 'filePath' && <span className="ml-1">{mergeTableSortDirection === 'asc' ? '↑' : '↓'}</span>}
                                    </TableHead>
                                  </TableRow>
                                </TableHeader>
                                <TableBody>
                                  {getSortedMergeTableData().map((item, index) => (
                                    <TableRow key={index}>
                                      <TableCell className="w-1 py-0.5">
                                        <span className={`${MERGE_STATUS_COLOR_CLASS_MAP[item.status as SvnMergeStatusCode]}`}>
                                          {t(MERGE_STATUS_TEXT[item.status as SvnMergeStatusCode])}
                                        </span>
                                      </TableCell>
                                      <TableCell className={`py-0.5 ${MERGE_STATUS_COLOR_CLASS_MAP[item.status as SvnMergeStatusCode]}`}>{item.filePath}</TableCell>
                                    </TableRow>
                                  ))}
                                </TableBody>
                              </Table>
                            ) : (
                              <pre className="text-xs whitespace-pre-wrap">{dryRunOutput}</pre>
                            )}
                          </ScrollArea>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </ResizablePanel>
                <ResizableHandle withHandle className="bg-transparent" />
                <ResizablePanel defaultSize={40} minSize={30}>
                  <Card className="flex-1 h-full p-2 pt-0">
                    <CardContent className="h-full p-2">
                      <div className="h-full flex flex-col">
                        <Label className="mb-2">{t('dialog.mergeSvn.commits')}</Label>
                        <div className="flex flex-col border rounded-md overflow-auto h-full">
                          <ScrollArea className="h-full w-full">
                            {commits.length > 0 ? (
                              <Table wrapperClassName={cn('overflow-clip', commits.length === 0 && 'h-full')}>
                                <TableHeader className="sticky top-0 z-10 bg-[var(--table-header-bg)]">
                                  <TableRow>
                                    <TableHead className="cursor-pointer hover:bg-muted/50 h-9" onClick={() => handleCommitsSort('revision')}>
                                      Revision
                                      {commitsSort === 'revision' && <span className="ml-1">{commitsSortDirection === 'asc' ? '↑' : '↓'}</span>}
                                    </TableHead>
                                    <TableHead className="cursor-pointer hover:bg-muted/50 h-9" onClick={() => handleCommitsSort('author')}>
                                      Author
                                      {commitsSort === 'author' && <span className="ml-1">{commitsSortDirection === 'asc' ? '↑' : '↓'}</span>}
                                    </TableHead>
                                    <TableHead className="cursor-pointer hover:bg-muted/50 h-9" onClick={() => handleCommitsSort('date')}>
                                      Date
                                      {commitsSort === 'date' && <span className="ml-1">{commitsSortDirection === 'asc' ? '↑' : '↓'}</span>}
                                    </TableHead>
                                    <TableHead className="cursor-pointer hover:bg-muted/50 h-9" onClick={() => handleCommitsSort('message')}>
                                      Message
                                      {commitsSort === 'message' && <span className="ml-1">{commitsSortDirection === 'asc' ? '↑' : '↓'}</span>}
                                    </TableHead>
                                  </TableRow>
                                </TableHeader>
                                <TableBody>
                                  {getSortedCommits().map((commit, index) => (
                                    <TableRow key={index}>
                                      <TableCell className="w-1 py-0.5">{commit.revision}</TableCell>
                                      <TableCell className="w-1 py-0.5">{commit.author}</TableCell>
                                      <TableCell className="w-1 py-0.5">{commit.date}</TableCell>
                                      <TableCell className="whitespace-break-spaces py-0.5">{commit.message}</TableCell>
                                    </TableRow>
                                  ))}
                                </TableBody>
                              </Table>
                            ) : (
                              <div className="text-sm p-2">{t('dialog.mergeSvn.noCommits')}</div>
                            )}
                          </ScrollArea>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </ResizablePanel>
              </ResizablePanelGroup>
              <div className="flex justify-center gap-2 mt-4">
                <Button variant={variant} disabled={isLoading} onClick={() => setActiveTab('setup')}>
                  {t('common.back')}
                </Button>
                <Button
                  className={`relative ${isLoading ? 'border-effect' : ''} ${isLoading ? 'cursor-progress' : ''}`}
                  variant={variant}
                  onClick={() => {
                    if (!isLoading) {
                      performMerge()
                    }
                  }}
                >
                  {isLoading ? <GlowLoader /> : <GitMerge className="h-4 w-4" />} {t('dialog.mergeSvn.performMerge')}
                </Button>
              </div>
            </TabsContent>

            <TabsContent value="conflicts" className="flex-1 flex flex-col">
              <Card className="flex-1 h-full py-0">
                <CardContent className="h-full p-0">
                  <ResizablePanelGroup direction="horizontal" className="flex-1">
                    <ResizablePanel defaultSize={40} minSize={30}>
                      <div className="h-full flex flex-col p-2">
                        <ScrollArea className="flex-1">
                          {conflicts.map((conflict, index) => (
                            <button
                              key={index}
                              type="button"
                              className={`w-full text-left mb-1 p-1 rounded-xs cursor-pointer text-sm ${
                                selectedConflict?.path === conflict.path ? 'bg-primary text-primary-foreground' : 'hover:bg-muted'
                              }`}
                              onClick={() => setSelectedConflict(conflict)}
                              aria-pressed={selectedConflict?.path === conflict.path}
                            >
                              <FileWarning className="inline-block mr-1 h-4 w-4" />
                              {conflict.path}
                            </button>
                          ))}
                        </ScrollArea>
                      </div>
                    </ResizablePanel>
                    <ResizableHandle withHandle />
                    <ResizablePanel defaultSize={60} minSize={30}>
                      {conflicts.length > 0 && (
                        <div className="h-full flex flex-col p-2">
                          {selectedConflict?.isRevisionConflict ? (
                            <div className="flex flex-col items-center justify-center h-full">
                              <div className="text-center p-4 mb-4 border rounded-md bg-muted">
                                <h3 className="text-lg font-semibold mb-2">Conflict Revision</h3>
                                <p className="mb-2">File này chỉ có xung đột về revision, không có thay đổi nội dung.</p>
                                <p>Bạn có thể giải quyết xung đột bằng cách chọn một trong các tùy chọn bên dưới.</p>
                              </div>
                            </div>
                          ) : selectedConflict?.content ? (
                            <Tabs defaultValue="diff" className="w-full h-full flex flex-col">
                              <TabsList className="w-full grid grid-cols-3">
                                <TabsTrigger value="mine">{t('dialog.mergeSvn.mine')}</TabsTrigger>
                                <TabsTrigger value="theirs">{t('dialog.mergeSvn.theirs')}</TabsTrigger>
                                <TabsTrigger value="diff">{t('dialog.mergeSvn.diff')}</TabsTrigger>
                              </TabsList>
                              <TabsContent value="mine" className="flex-1">
                                <Editor height="100%" language="typescript" value={selectedConflict.content.mine} options={{ readOnly: true, minimap: { enabled: false } }} />
                              </TabsContent>
                              <TabsContent value="theirs" className="flex-1">
                                <Editor height="100%" language="typescript" value={selectedConflict.content.theirs} options={{ readOnly: true, minimap: { enabled: false } }} />
                              </TabsContent>
                              <TabsContent value="diff" className="flex-1">
                                <DiffEditor
                                  height="100%"
                                  language="typescript"
                                  original={selectedConflict.content.mine}
                                  modified={selectedConflict.content.theirs}
                                  theme={themeMode === 'dark' ? 'custom-dark' : 'custom-light'}
                                  options={{
                                    renderWhitespace: 'all',
                                    readOnly: true,
                                    fontSize: 12,
                                    fontFamily: 'Jetbrains Mono NL, monospace',
                                    automaticLayout: true,
                                    padding: { top: 12, bottom: 12 },
                                    lineNumbers: 'on',
                                    scrollBeyondLastLine: false,
                                    contextmenu: true,
                                    renderIndicators: true,
                                    renderMarginRevertIcon: true,
                                    showFoldingControls: 'always',
                                    smoothScrolling: true,
                                    scrollbar: {
                                      verticalScrollbarSize: 8,
                                      horizontalScrollbarSize: 8,
                                    },
                                    diffAlgorithm: 'advanced',
                                    renderValidationDecorations: 'off',
                                  }}
                                />
                              </TabsContent>
                            </Tabs>
                          ) : (
                            <div className="flex items-center justify-center h-full">
                              {selectedConflict ? <p>{t('dialog.mergeSvn.binaryFile')}</p> : <p>{t('dialog.mergeSvn.selectConflict')}</p>}
                            </div>
                          )}
                        </div>
                      )}
                    </ResizablePanel>
                  </ResizablePanelGroup>
                </CardContent>
              </Card>
              <div className="flex justify-center gap-2 mt-4">
                {selectedConflict?.isRevisionConflict ? (
                  <Button variant={variant} onClick={() => resolveConflict('working')}>
                    Resolve Conflict
                  </Button>
                ) : (
                  selectedConflict && (
                    <>
                      <Button variant={variant} onClick={() => resolveConflict('mine')}>
                        {t('dialog.mergeSvn.useMine')}
                      </Button>
                      <Button variant={variant} onClick={() => resolveConflict('theirs')}>
                        {t('dialog.mergeSvn.useTheirs')}
                      </Button>
                      <Button variant={variant} onClick={() => resolveConflict('base')}>
                        {t('dialog.mergeSvn.useBase')}
                      </Button>
                    </>
                  )
                )}
              </div>
            </TabsContent>

            <TabsContent value="complete" className="flex-1 flex flex-col">
              <ResizablePanelGroup direction="vertical" className="flex-1 gap-2">
                <ResizablePanel defaultSize={40} minSize={30}>
                  <Card className="flex-1 h-full p-2 pt-0">
                    <CardContent className="h-full p-2">
                      <div className="h-full flex flex-col">
                        <Label className="pb-2">{t('dialog.mergeSvn.changedFiles')}</Label>
                        <div className="flex flex-col border rounded-md overflow-auto h-full">
                          <ScrollArea className="h-full w-full">
                            {changedFiles.length > 0 ? (
                              <Table>
                                <TableBody>
                                  {changedFiles.map((file, index) => (
                                    <TableRow key={index} className="hover:bg-muted/50">
                                      <TableCell className="py-0.5">
                                        <span className="truncate">{file}</span>
                                      </TableCell>
                                    </TableRow>
                                  ))}
                                </TableBody>
                              </Table>
                            ) : (
                              <p className="text-sm">{t('dialog.mergeSvn.noChangedFiles')}</p>
                            )}
                          </ScrollArea>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </ResizablePanel>
                <ResizableHandle withHandle className="bg-transparent" />
                <ResizablePanel defaultSize={60} minSize={30}>
                  <Card className="flex-1 h-full p-2 pt-0">
                    <CardContent className="h-full p-2">
                      <div className="h-full flex flex-col">
                        <Label htmlFor="commit-message">{t('dialog.mergeSvn.commitMessage')}</Label>
                        <Textarea
                          id="commit-message"
                          value={commitMessage}
                          onChange={e => setCommitMessage(e.target.value)}
                          placeholder={t('placeholder.commitMessage')}
                          className="flex-1 mt-2"
                        />
                      </div>
                    </CardContent>
                  </Card>
                </ResizablePanel>
              </ResizablePanelGroup>
              <div className="flex justify-center mt-4">
                <Button
                  className={`relative ${isLoading ? 'border-effect' : ''} ${isLoading ? 'cursor-progress' : ''}`}
                  variant={variant}
                  onClick={() => {
                    if (!isLoading) {
                      commitMerge()
                    }
                  }}
                >
                  {isLoading ? <GlowLoader /> : <SendHorizontal className="h-4 w-4" />} {t('common.commit')}
                </Button>
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  )
}
