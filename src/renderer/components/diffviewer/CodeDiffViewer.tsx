// src/renderer/components/DiffViewer/CodeDiffViewer.tsx

import { DiffEditor, useMonaco } from '@monaco-editor/react'
import { useTheme } from 'next-themes'
import { useEffect, useState } from 'react'
import { DiffFooterBar } from './DiffFooterBar'
import { DiffToolbar } from './DiffToolbar'

export function CodeDiffViewer() {
  const { resolvedTheme } = useTheme()
  const monaco = useMonaco()
  const [originalCode, setOriginalCode] = useState('aaa')
  const [modifiedCode, setModifiedCode] = useState('aabb')
  const [language, setLanguage] = useState('javascript')
  const [cursorPosition, setCursorPosition] = useState({ lineNumber: 1, column: 1 })

  const detectLanguage = (filename: string): string => {
    const ext = filename.split('.').pop()
    switch (ext) {
      case 'ts':
        return 'typescript'
      case 'tsx':
        return 'typescript'
      case 'js':
        return 'javascript'
      case 'py':
        return 'python'
      case 'cpp':
      case 'cc':
      case 'c':
        return 'cpp'
      case 'html':
        return 'html'
      case 'css':
        return 'css'
      case 'json':
        return 'json'
      default:
        return 'plaintext'
    }
  }

  useEffect(() => {
    const handler = (_event: any, { originalCode, modifiedCode, filename }: any) => {
      setOriginalCode(originalCode.data)
      setModifiedCode(modifiedCode)
      if (filename) setLanguage(detectLanguage(filename))
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
        'diffEditor.insertedTextBackground': '#00ff0038',
        'diffEditor.removedTextBackground': '#ff000038',
        'diffEditor.insertedLineBackground': '#00aa0038',
        'diffEditor.removedLineBackground': '#aa000038',
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
  }, [monaco, resolvedTheme])

  const handleEditorMount = (editor: any) => {
    // editor.onDidChangeCursorPosition((e: any) => {
    //   setCursorPosition(e.position)
    // })
  }

  // Toolbar actions
  const handleRefresh = () => {
    // window.api.send('request-latest-diff')
  }

  const handleSwap = () => {
    setOriginalCode(modifiedCode)
    setModifiedCode(originalCode)
  }

  const handleExport = () => {
    // TODO: add real logic
    console.log('Exporting diff')
  }

  const handleImport = () => {
    // TODO: add real logic
    console.log('Importing diff')
  }

  return (
    <div className="flex flex-col w-full h-full">
      <DiffToolbar onRefresh={handleRefresh} onSwapSides={handleSwap} onExport={handleExport} onImport={handleImport} />
      <div className="flex-1 overflow-hidden">
        <DiffEditor
          height="100%"
          language={language}
          original={originalCode}
          modified={modifiedCode}
          theme={resolvedTheme === 'dark' ? 'custom-dark' : 'custom-light'}
          onMount={handleEditorMount}
          options={{
            readOnly: true,
            fontSize: 12,
            fontFamily: 'Fira Code, JetBrains Mono, monospace',
            minimap: { enabled: true },
            automaticLayout: true,
            padding: { top: 12, bottom: 12 },
            lineNumbers: 'on',
            // wordWrap: 'on',
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
            // diffAlgorithm: 'advanced',
          }}
        />
      </div>
      <DiffFooterBar language={language} setLanguage={setLanguage} />
    </div>
  )
}
