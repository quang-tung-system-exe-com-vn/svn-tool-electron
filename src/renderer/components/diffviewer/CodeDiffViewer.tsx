import i18n from '@/lib/i18n'
import { DiffEditor, type DiffOnMount, useMonaco } from '@monaco-editor/react'
import { useTheme } from 'next-themes'
import { useEffect, useState } from 'react'
import { OverlayLoader } from '../ui-elements/OverlayLoader'
import { DiffFooterBar } from './DiffFooterBar'
import { DiffToolbar } from './DiffToolbar'

window.addEventListener('storage', event => {
  if (event.key === 'ui-settings') {
    const storage = JSON.parse(event.newValue || '{}')
    const html = document.documentElement
    html.classList.remove('dark', 'light')
    html.setAttribute('data-theme-mode', storage.state.themeMode)
    html.setAttribute('data-font-size', storage.state.fontSize)
    html.setAttribute('data-font-family', storage.state.fontFamily)
    html.setAttribute('data-button-variant', storage.state.buttonVariant)
    i18n.changeLanguage(storage.state.language)
    for (const cls of html.classList) {
      if (cls.startsWith('theme-')) {
        html.classList.remove(cls)
      }
    }
    html.classList.add(storage.state.theme)
    html.classList.add(storage.state.themeMode)
  }
})

export function CodeDiffViewer() {
  const monaco = useMonaco()
  const { resolvedTheme } = useTheme()
  const [originalCode, setOriginalCode] = useState('')
  const [modifiedCode, setModifiedCode] = useState('')
  const [filePath, setFilePath] = useState('')
  const [language, setLanguage] = useState('javascript')
  const [cursorPosition, setCursorPosition] = useState({ line: 1, column: 1 })
  const [isLoading, setIsLoading] = useState(false)

  const getExtension = (filePath: string): string => {
    const fileName = filePath.split('/').pop() || ''
    const lastDotIndex = fileName.lastIndexOf('.')
    if (lastDotIndex === -1) return ''
    return fileName.slice(lastDotIndex + 1).toLowerCase()
  }

  const detectLanguage = (filePath: string): string => {
    const ext = getExtension(filePath)
    switch (ext) {
      case 'abap':
        return 'abap'
      case 'apex':
        return 'apex'
      case 'azcli':
        return 'azcli'
      case 'bat':
      case 'cmd':
        return 'bat'
      case 'c':
      case 'h':
        return 'c'
      case 'cpp':
      case 'cc':
      case 'cxx':
      case 'hpp':
      case 'hxx':
        return 'cpp'
      case 'csharp':
      case 'cs':
        return 'csharp'
      case 'css':
        return 'css'
      case 'dart':
        return 'dart'
      case 'dockerfile':
      case 'docker':
        return 'dockerfile'
      case 'fsharp':
      case 'fs':
      case 'fsi':
      case 'fsx':
        return 'fsharp'
      case 'go':
        return 'go'
      case 'graphql':
      case 'gql':
        return 'graphql'
      case 'handlebars':
      case 'hbs':
        return 'handlebars'
      case 'html':
      case 'htm':
        return 'html'
      case 'ini':
        return 'ini'
      case 'java':
        return 'java'
      case 'javascript':
      case 'js':
        return 'javascript'
      case 'typescript':
      case 'ts':
        return 'typescript'
      case 'json':
      case 'jsonc':
        return 'json'
      case 'jsx':
        return 'javascript'
      case 'tsx':
        return 'typescript'
      case 'kotlin':
      case 'kt':
        return 'kotlin'
      case 'less':
        return 'less'
      case 'lua':
        return 'lua'
      case 'markdown':
      case 'md':
        return 'markdown'
      case 'mysql':
        return 'mysql'
      case 'objective-c':
      case 'm':
        return 'objective-c'
      case 'perl':
      case 'pl':
        return 'perl'
      case 'pgsql':
        return 'pgsql'
      case 'php':
        return 'php'
      case 'plaintext':
      case 'txt':
        return 'plaintext'
      case 'powershell':
      case 'ps1':
        return 'powershell'
      case 'python':
      case 'py':
        return 'python'
      case 'r':
        return 'r'
      case 'ruby':
      case 'rb':
        return 'ruby'
      case 'rust':
      case 'rs':
        return 'rust'
      case 'scss':
        return 'scss'
      case 'shell':
      case 'sh':
      case 'bash':
        return 'shell'
      case 'sql':
        return 'sql'
      case 'swift':
        return 'swift'
      case 'vb':
        return 'vb'
      case 'xml':
      case 'xsd':
      case 'svg':
        return 'xml'
      case 'yaml':
      case 'yml':
        return 'yaml'
      default:
        return 'plaintext'
    }
  }

  useEffect(() => {
    const handler = (_event: any, { filePath }: any) => {
      setFilePath(filePath)
      setLanguage(detectLanguage(filePath))
    }
    window.api.on('load-diff-data', handler)
  }, [])

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

    const selectedTheme = resolvedTheme === 'dark' ? 'custom-dark' : 'custom-light'
    monaco.editor.setTheme(selectedTheme)
    handleRefresh()
  }, [monaco, resolvedTheme])

  const handleEditorMount: DiffOnMount = (editor, monaco) => {
    const modifiedEditor = editor.getModifiedEditor()
    const originalEditor = editor.getOriginalEditor()
    modifiedEditor.onDidChangeCursorPosition(event => {
      const { lineNumber, column } = event.position
      setCursorPosition({ line: lineNumber, column })
    })
    originalEditor.onDidChangeCursorPosition(event => {
      const { lineNumber, column } = event.position
      setCursorPosition({ line: lineNumber, column })
    })
  }

  // Toolbar actions
  const handleRefresh = async () => {
    try {
      setIsLoading(true)
      const originalCode = await window.api.svn.cat(filePath)
      const modifiedCode = await window.api.system.read_file(filePath)
      setOriginalCode(originalCode.data)
      setModifiedCode(modifiedCode)
    } catch (error) {
      console.error('Error loading file for diff:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleSwap = () => {
    setOriginalCode(modifiedCode)
    setModifiedCode(originalCode)
  }

  return (
    <div className="flex flex-col w-full h-full">
      <OverlayLoader isLoading={isLoading} />
      <DiffToolbar onRefresh={handleRefresh} onSwapSides={handleSwap} isLoading={isLoading} />
      <div className="flex-1 overflow-hidden">
        <DiffEditor
          height="100%"
          language={language}
          original={originalCode}
          modified={modifiedCode}
          theme={resolvedTheme === 'dark' ? 'custom-dark' : 'custom-light'}
          onMount={handleEditorMount}
          options={{
            readOnly: false,
            fontSize: 12,
            fontFamily: 'Fira Code, JetBrains Mono, monospace',
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
          }}
        />
      </div>
      <DiffFooterBar language={language} setLanguage={setLanguage} cursorPosition={cursorPosition} />
    </div>
  )
}
