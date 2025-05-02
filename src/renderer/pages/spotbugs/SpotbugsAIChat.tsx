'use client'
import { LANGUAGES } from '@/components/shared/constants'
import toast from '@/components/ui-elements/Toast'
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import logger from '@/services/logger'
import { useAppearanceStore } from '@/stores/useAppearanceStore'
import { FileCode, Loader2 } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import type { BugInstance } from './constants'

interface SourceLineOption {
  label: string
  value: string
  sourceLine: {
    classname: string
    start: number | null
    end: number | null
    sourcefile: string
    codeSnippet?: string
  }
}

export const SpotbugsAIChat = ({
  bug,
  isLoading: isParentLoading,
  filePaths,
  selectedSourceLineKey = '',
}: {
  bug: BugInstance | null
  isLoading: boolean
  filePaths: string[]
  selectedSourceLineKey?: string
}) => {
  const { t } = useTranslation()
  const { language } = useAppearanceStore()
  const [aiResponse, setAiResponse] = useState('')
  const [isAiLoading, setIsAiLoading] = useState(false)
  const [userQuery, setUserQuery] = useState('')
  const [sourceLineOptions, setSourceLineOptions] = useState<SourceLineOption[]>([])
  const [selectedSourceLine, setSelectedSourceLine] = useState<string>('')
  const [codeSnippets, setCodeSnippets] = useState<Record<string, string>>({})

  useEffect(() => {
    setAiResponse('')
    setUserQuery('')
    setIsAiLoading(false)
    setSourceLineOptions([])
    setSelectedSourceLine('')
    setCodeSnippets({})

    if (bug?.sourceLines && bug.sourceLines.length > 0) {
      loadSourceLineOptions(bug)
    }

    // Nếu có selectedSourceLineKey, cập nhật selectedSourceLine
    if (selectedSourceLineKey && sourceLineOptions.some(option => option.value === selectedSourceLineKey)) {
      setSelectedSourceLine(selectedSourceLineKey)
    }
  }, [bug])

  const loadSourceLineOptions = async (bug: BugInstance | null) => {
    if (!bug || !bug.sourceLines) return
    if (!bug.sourceLines || bug.sourceLines.length === 0) return

    const options: SourceLineOption[] = []
    const snippets: Record<string, string> = {}

    for (const sourceLine of bug.sourceLines) {
      if (!sourceLine.start || !sourceLine.end || !sourceLine.sourcefile) continue

      const start = sourceLine.start || 0
      const end = sourceLine.end || 0
      const optionValue = `${sourceLine.classname}:${start}-${end}`
      const optionLabel = `${sourceLine.sourcefile} (${start}-${end})`

      // Đọc code snippet cho source line này
      const codeSnippet = await getCodeSnippet(sourceLine.sourcefile, start, end)

      options.push({
        label: optionLabel,
        value: optionValue,
        sourceLine: {
          ...sourceLine,
          codeSnippet,
        },
      })

      snippets[optionValue] = codeSnippet || ''
    }

    setSourceLineOptions(options)
    setCodeSnippets(snippets)

    // Chọn source line đầu tiên nếu có
    if (options.length > 0) {
      setSelectedSourceLine(options[0].value)
    }
  }

  const getCodeSnippet = async (sourceFile: string, startLine: number, endLine: number): Promise<string> => {
    try {
      // Tìm đường dẫn file tương ứng trong filePaths
      const matchingFilePath = filePaths.find(filePath => filePath.endsWith(sourceFile) || sourceFile.endsWith(filePath))

      if (matchingFilePath) {
        logger.info(`Reading file from filePaths: ${matchingFilePath}`)

        const fileContent = await window.api.system.read_file(matchingFilePath)
        if (fileContent && typeof fileContent === 'string') {
          const lines = fileContent.split('\n')

          // Trừ đi 5 dòng ở start line và thêm 5 dòng ở end line để có cái nhìn tổng quan hơn
          const startIdx = Math.max(0, startLine - 6) // -1 (0-based) - 5 (context)
          const endIdx = Math.min(lines.length - 1, endLine + 4) // -1 (0-based) + 5 (context)
          return lines.slice(startIdx, endIdx + 1).join('\n')
        }
      } else {
        logger.error(`No matching file found in filePaths for ${sourceFile}`)
      }
    } catch (fileError) {
      logger.error('Error reading source file:', fileError)
    }
    return ''
  }

  const handleExplainError = async () => {
    if (!bug) return
    setIsAiLoading(true)
    setAiResponse('')
    try {
      const languageName = LANGUAGES.find(lang => lang.code === language)?.label || 'English'
      const selectedOption = sourceLineOptions.find(option => option.value === selectedSourceLine)
      if (!selectedOption) {
        throw new Error('No source line selected')
      }

      const { classname, sourcefile, start, end } = selectedOption.sourceLine
      const codeSnippet = codeSnippets[selectedSourceLine] || ''

      const prompt = `Explain the following SpotBugs issue. Bug type: "${bug.type}", Category: "${bug.category}", Priority: ${bug.priority}, Message: "${bug.longMessage}\n\n".
      ${codeSnippet ? `Code from file ${sourcefile} (lines ${start}-${end}):\n\`\`\`\n${codeSnippet}\n\`\`\`` : `Unable to retrieve code from file "${sourcefile}".`}\n\n
      Provide a concise explanation and suggest possible solutions in ${languageName}.`

      logger.debug('Prompt for AI:', prompt)
      const response = await window.api.openai.chat(prompt)
      setAiResponse(response || t('dialog.spotbugs.ai.noResponse'))
    } catch (error) {
      logger.error('AI explanation error:', error)
      setAiResponse(t('dialog.spotbugs.ai.error'))
      toast.error(t('toast.aiError'))
    } finally {
      setIsAiLoading(false)
    }
  }

  const handleCustomQuery = async () => {
    if (!bug || !userQuery.trim()) return
    setIsAiLoading(true)
    setAiResponse('')
    try {
      const languageName = LANGUAGES.find(lang => lang.code === language)?.label || 'English'
      const selectedOption = sourceLineOptions.find(option => option.value === selectedSourceLine)
      if (!selectedOption) {
        throw new Error('No source line selected')
      }

      const { classname, sourcefile, start, end } = selectedOption.sourceLine
      const codeSnippet = codeSnippets[selectedSourceLine] || ''

      const prompt = `Regarding the SpotBugs issue (Type: "${bug.type}", File: "${sourcefile}", Line: ${start}, Message: "${bug.longMessage}"), the user asks: "${userQuery}\n\n".
      ${codeSnippet ? `Code from file ${sourcefile} (lines ${start}-${end}):\n\`\`\`\n${codeSnippet}\n\`\`\`` : `Unable to retrieve code from file "${sourcefile}".`}\n\n
      Please answer in ${languageName}.`

      const response = await window.api.openai.chat(prompt)
      setAiResponse(response || t('dialog.spotbugs.ai.noResponse'))
    } catch (error) {
      logger.error('AI custom query error:', error)
      setAiResponse(t('dialog.spotbugs.ai.error'))
      toast.error(t('toast.aiError'))
    } finally {
      setIsAiLoading(false)
    }
  }

  const handleSourceLineChange = (value: string) => {
    setSelectedSourceLine(value)
  }

  if (isParentLoading || !bug) {
    return <div className="p-4 text-center text-muted-foreground">{isParentLoading ? t('message.loading') : t('message.selectIssueToUseAI')}</div>
  }

  const selectedOption = sourceLineOptions.find(option => option.value === selectedSourceLine)

  return (
    <ScrollArea className="h-full p-4">
      <div className="space-y-4">
        {sourceLineOptions.length > 0 && (
          <div className="space-y-2">
            <Label htmlFor="source-line-select">Chọn Source Line</Label>
            <Select value={selectedSourceLine} onValueChange={handleSourceLineChange}>
              <SelectTrigger id="source-line-select">
                <SelectValue placeholder="Chọn source line" />
              </SelectTrigger>
              <SelectContent>
                {sourceLineOptions.map(option => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        {selectedOption && (
          <div className="space-y-2">
            <Label>Class</Label>
            <div className="text-sm font-mono p-2 bg-muted rounded-md">{selectedOption.sourceLine.classname}</div>

            <Label>Code Snippet</Label>
            <Accordion type="single" collapsible className="w-full">
              <AccordionItem value="code-snippet">
                <AccordionTrigger className="text-sm font-medium">
                  <div className="flex items-center">
                    <FileCode className="h-4 w-4 mr-2" />
                    Xem Code Snippet
                  </div>
                </AccordionTrigger>
                <AccordionContent>
                  <div className="border rounded-md bg-slate-950 dark:bg-slate-900 overflow-hidden">
                    <div className="p-3 overflow-x-auto">
                      {codeSnippets[selectedSourceLine] ? (
                        <div className="font-mono text-xs">
                          {codeSnippets[selectedSourceLine].split('\n').map((line, i) => (
                            <div key={i} className="flex">
                              <div className="text-slate-500 w-10 text-right pr-2 select-none border-r border-slate-700 mr-3">
                                {selectedOption?.sourceLine.start !== null ? Math.max(1, selectedOption.sourceLine.start - 5) + i : i + 1}
                              </div>
                              <div className="text-slate-200 dark:text-slate-300 whitespace-pre">{line || ' '}</div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="text-slate-400 p-2">Không có code snippet</div>
                      )}
                    </div>
                  </div>
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </div>
        )}

        <Button onClick={handleExplainError} disabled={isAiLoading} size="sm">
          {isAiLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {t('dialog.spotbugs.ai.explainButton')}
        </Button>

        <div className="mt-4 space-y-2">
          <Label htmlFor="custom-query">{t('dialog.spotbugs.ai.customQueryLabel')}</Label>
          <Textarea id="custom-query" value={userQuery} onChange={e => setUserQuery(e.target.value)} placeholder={t('dialog.spotbugs.ai.customQueryPlaceholder')} rows={3} />
          <Button onClick={handleCustomQuery} disabled={isAiLoading || !userQuery.trim()} size="sm">
            {isAiLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {t('dialog.spotbugs.ai.sendQueryButton')}
          </Button>
        </div>

        {isAiLoading && !aiResponse && (
          <div className="flex items-center justify-center p-4">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        )}

        {aiResponse && (
          <div className="mt-4 space-y-2 rounded-md border bg-muted/50 p-4">
            <h5 className="font-semibold">{t('dialog.spotbugs.ai.responseTitle')}</h5>
            <p className="text-sm whitespace-pre-wrap">{aiResponse}</p>
          </div>
        )}
      </div>
    </ScrollArea>
  )
}
