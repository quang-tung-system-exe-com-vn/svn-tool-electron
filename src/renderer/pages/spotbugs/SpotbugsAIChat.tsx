'use client'
import { CodeSnippetDialog } from '@/components/dialogs/CodeSnippetDialog' // Import mới
import { LANGUAGES } from '@/components/shared/constants'
import { GlowLoader } from '@/components/ui-elements/GlowLoader'
import toast from '@/components/ui-elements/Toast'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import logger from '@/services/logger'
import { useAppearanceStore, useButtonVariant } from '@/stores/useAppearanceStore'
import { Bot, FileCode, Loader2 } from 'lucide-react'
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
  const variant = useButtonVariant()
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
      const matchingFilePath = filePaths.find(filePath => filePath.endsWith(sourceFile) || sourceFile.endsWith(filePath))
      if (matchingFilePath) {
        logger.info(`Reading file from filePaths: ${matchingFilePath}`)
        const fileContent = await window.api.system.read_file(matchingFilePath)
        if (fileContent && typeof fileContent === 'string') {
          const lines = fileContent.split('\n')
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
    <div className="absolute inset-0 overflow-y-auto p-2 space-y-2">
      {sourceLineOptions.length > 0 && (
        <div className="space-y-2">
          <Label htmlFor="source-line-select">Chọn Source Line</Label>
          <div className="flex items-center space-x-2">
            <Select value={selectedSourceLine} onValueChange={handleSourceLineChange}>
              <SelectTrigger id="source-line-select" className="flex-grow">
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
            {selectedOption && (
              <CodeSnippetDialog
                trigger={
                  <Button variant="outline" size="icon" title="Xem Code Snippet">
                    <FileCode className="h-4 w-4" />
                  </Button>
                }
                title={`${selectedOption.sourceLine.sourcefile} (${selectedOption.sourceLine.start}-${selectedOption.sourceLine.end})`}
                fileContent={null}
                codeSnippet={codeSnippets[selectedSourceLine]}
                startLine={selectedOption.sourceLine.start}
                endLine={selectedOption.sourceLine.end}
              />
            )}
            <Button
              id="explain-button"
              className={`relative ${isAiLoading ? 'border-effect cursor-progress' : ''}`}
              variant={variant}
              size="icon"
              title={t('dialog.spotbugs.ai.explainButton')}
              onClick={() => {
                if (!isAiLoading) {
                  handleExplainError()
                }
              }}
              disabled={!selectedOption || isAiLoading}
            >
              {isAiLoading ? <GlowLoader /> : <Bot className="h-4 w-4" />}
            </Button>
          </div>
        </div>
      )}
      <div className="mt-4 space-y-2">
        <Label htmlFor="custom-query">{t('dialog.spotbugs.ai.customQueryLabel')}</Label>
        <Textarea
          id="custom-query"
          value={userQuery}
          onChange={e => setUserQuery(e.target.value)}
          spellCheck={false}
          className=""
          placeholder={t('dialog.spotbugs.ai.customQueryPlaceholder')}
          rows={3}
        />
        <Button
          id="generate-button"
          className={`relative ${isAiLoading ? 'border-effect' : ''} ${isAiLoading ? 'cursor-progress' : ''}`}
          variant={variant}
          onClick={() => {
            if (!isAiLoading) {
              handleCustomQuery()
            }
          }}
        >
          {isAiLoading ? <GlowLoader /> : <Bot className="h-4 w-4" />} {t('dialog.spotbugs.ai.sendQueryButton')}
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
          <p className="text-sm whitespace-pre-wrap break-all">{aiResponse}</p>
        </div>
      )}
    </div>
  )
}
