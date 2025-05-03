import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { useAppearanceStore } from '@/stores/useAppearanceStore'
import Editor, { useMonaco } from '@monaco-editor/react'
import { FileCode } from 'lucide-react'
import { useTheme } from 'next-themes'
import { useEffect } from 'react'
import { useTranslation } from 'react-i18next'

interface CodeSnippetDialogProps {
  trigger: React.ReactNode
  title: string
  fileContent: string | null | undefined
  codeSnippet: string | null | undefined
  startLine: number | null | undefined
  endLine: number | null | undefined
}

export const CodeSnippetDialog = ({ trigger, title, fileContent, codeSnippet, startLine, endLine }: CodeSnippetDialogProps) => {
  const { t } = useTranslation()
  const monaco = useMonaco()
  const { resolvedTheme } = useTheme()
  const { themeMode, setThemeMode } = useAppearanceStore()

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
  }, [monaco, themeMode, resolvedTheme])

  window.addEventListener('storage', event => {
    if (event.key === 'ui-settings') {
      const storage = JSON.parse(event.newValue || '{}')
      const html = document.documentElement
      html.classList.remove('dark', 'light')
      html.setAttribute('data-theme-mode', storage.state.themeMode)
      html.setAttribute('data-font-size', storage.state.fontSize)
      html.setAttribute('data-font-family', storage.state.fontFamily)
      html.setAttribute('data-button-variant', storage.state.buttonVariant)
      for (const cls of html.classList) {
        if (cls.startsWith('theme-')) {
          html.classList.remove(cls)
        }
      }
      html.classList.add(storage.state.theme)
      html.classList.add(storage.state.themeMode)
      setThemeMode(storage.state.themeMode)
    }
  })
  const firstSnippetLineNumber = startLine !== null && startLine !== undefined ? Math.max(1, startLine - 5) : 1

  const displayContent = fileContent ?? codeSnippet
  const displayLanguage = 'java'

  return (
    <Dialog>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="flex flex-col h-full sm:max-w-[90vw] max-h-[90vh]">
        <DialogHeader className="p-6 pb-2">
          <DialogTitle className="flex items-center">
            <FileCode className="h-5 w-5 mr-2" />
            {title || t('dialog.spotbugs.codeSnippetTitle', { defaultValue: 'Code Snippet' })}
          </DialogTitle>
        </DialogHeader>
        <div className="flex-1 overflow-hidden px-6 pb-6">
          {' '}
          {/* Thêm padding */}
          {displayContent ? (
            <Editor
              height="100%"
              language={displayLanguage}
              value={displayContent}
              theme={themeMode === 'dark' ? 'custom-dark' : 'custom-light'}
              onMount={(editor, monacoInstance) => {
                if (startLine !== null && startLine !== undefined && endLine !== null && endLine !== undefined) {
                  let highlightStartLine: number
                  let highlightEndLine: number
                  if (fileContent) {
                    highlightStartLine = startLine
                    highlightEndLine = endLine
                  } else {
                    highlightStartLine = Math.max(1, startLine - firstSnippetLineNumber + 1)
                    highlightEndLine = Math.max(1, endLine - firstSnippetLineNumber + 1)
                  }
                  const decorationsCollection = editor.createDecorationsCollection()
                  decorationsCollection.set([
                    {
                      range: new monacoInstance.Range(highlightStartLine, 1, highlightEndLine, 1),
                      options: {
                        isWholeLine: true,
                        className: 'my-line-highlight',
                      },
                    },
                  ])
                  editor.revealLineInCenter(highlightStartLine)
                }
              }}
              options={{
                readOnly: true,
                minimap: { enabled: true },
                scrollBeyondLastLine: false,
                fontSize: 13,
                wordWrap: 'on',
                lineNumbers: fileContent ? 'on' : line => String(line + firstSnippetLineNumber - 1),
                lineNumbersMinChars: 4,
              }}
            />
          ) : (
            <div className="flex items-center justify-center h-full text-muted-foreground p-4">
              {t('dialog.spotbugs.noCodeSnippet', { defaultValue: 'No code snippet available' })}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
