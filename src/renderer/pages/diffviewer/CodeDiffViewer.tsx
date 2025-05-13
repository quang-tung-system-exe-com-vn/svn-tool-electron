'use client'
import { OverlayLoader } from '@/components/ui-elements/OverlayLoader'
import toast from '@/components/ui-elements/Toast'
import i18n from '@/lib/i18n'
import logger from '@/services/logger'
import { useAppearanceStore } from '@/stores/useAppearanceStore'
import { DiffEditor, type DiffOnMount, useMonaco } from '@monaco-editor/react'
import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { DiffFooterBar } from './DiffFooterBar'
import { DiffToolbar } from './DiffToolbar'

export function CodeDiffViewer() {
  const monaco = useMonaco()
  const { themeMode } = useAppearanceStore()
  const [originalCode, setOriginalCode] = useState('')
  const [modifiedCode, setModifiedCode] = useState('')
  const [filePath, setFilePath] = useState('')
  const [fileStatus, setFileStatus] = useState('')
  const [revision, setRevision] = useState<string | undefined>(undefined)
  const [currentRevision, setCurrentRevision] = useState<string | undefined>(undefined)
  const [isSwapped, setIsSwapped] = useState(false)
  const [language, setLanguage] = useState('javascript')
  const [cursorPosition, setCursorPosition] = useState({ line: 1, column: 1 })
  const [isLoading, setIsLoading] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const editorRef = useRef<any>(null)
  const { t } = useTranslation()

  const filePathRef = useRef(filePath)
  const modifiedCodeRef = useRef(modifiedCode)
  useEffect(() => {
    modifiedCodeRef.current = modifiedCode
  }, [modifiedCode])
  useEffect(() => {
    filePathRef.current = filePath
  }, [filePath])

  const revisionRef = useRef(revision)
  useEffect(() => {
    revisionRef.current = revision
  }, [revision])

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
      const selectedTheme = storage.state.themeMode === 'dark' ? 'custom-dark' : 'custom-light'
      monaco?.editor.setTheme(selectedTheme)
    }
  })

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
    const handler = (_event: any, { filePath, fileStatus, revision, currentRevision }: any) => {
      setFilePath(filePath)
      setFileStatus(fileStatus)
      setRevision(revision)
      setCurrentRevision(currentRevision)
      setIsSwapped(false)
      setLanguage(detectLanguage(filePath))
      handleRefresh(filePath, fileStatus, revision, currentRevision)
    }
    window.api.on('load-diff-data', handler)

    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault()
        handleSaveFile()
      }
    }

    window.addEventListener('keydown', handleKeyDown)

    return () => {
      window.removeEventListener('keydown', handleKeyDown)
    }
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

    const selectedTheme = themeMode === 'dark' ? 'custom-dark' : 'custom-light'
    monaco.editor.setTheme(selectedTheme)
  }, [monaco, themeMode])

  const handleEditorMount: DiffOnMount = (editor, monaco) => {
    editorRef.current = editor
    const modifiedEditor = editor.getModifiedEditor()
    const originalEditor = editor.getOriginalEditor()

    modifiedEditor.onDidChangeModelContent(event => {
      const newModifiedCode = modifiedEditor.getModel()?.getValue() || ''
      setModifiedCode(newModifiedCode)
    })

    modifiedEditor.onDidChangeCursorPosition(event => {
      const { lineNumber, column } = event.position
      setCursorPosition({ line: lineNumber, column })
    })
    originalEditor.onDidChangeCursorPosition(event => {
      const { lineNumber, column } = event.position
      setCursorPosition({ line: lineNumber, column })
    })
  }

  const onRefresh = async () => {
    setIsSwapped(false)
    handleRefresh(filePath, fileStatus, revision, currentRevision)
  }

  const isSwap = (): boolean => {
    return currentRevision !== undefined && revision !== undefined && Number(currentRevision) < Number(revision)
  }

  const handleRefresh = async (path: string, fileStatus: string, revision?: string, currentRevision?: string) => {
    try {
      const swap = isSwap()
      setIsLoading(true)
      const originalCode = await window.api.svn.cat(path, fileStatus, revision)
      const modifiedCode = currentRevision ? await window.api.svn.cat(path, fileStatus, String(Number(revision) - 1)) : await window.api.system.read_file(path)
      setTimeout(() => {
        if (!currentRevision) {
          setOriginalCode(originalCode.data)
          setModifiedCode(modifiedCode)
        } else {
          if (swap) {
            setOriginalCode(originalCode.data)
            setModifiedCode(modifiedCode.data)
          } else {
            setOriginalCode(modifiedCode.data)
            setModifiedCode(originalCode.data)
          }
        }
      }, 500)
    } catch (error) {
      logger.error('Error loading file for diff:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleSwap = () => {
    setOriginalCode(modifiedCode)
    setModifiedCode(originalCode)
    setIsSwapped(prev => !prev)
  }

  const handleSaveFile = async () => {
    try {
      if (currentRevision) return
      const filePath = filePathRef.current
      if (!filePath || !modifiedCodeRef.current) return
      setIsSaving(true)

      const result = await window.api.system.write_file(filePath, modifiedCodeRef.current)

      if (result.success) {
        toast.success(t('toast.fileSaved', { filePath }))
      } else {
        throw new Error(result.error || 'Unknown error')
      }
    } catch (error) {
      toast.error(t('toast.errorSavingFile'))
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className="flex flex-col w-full h-full">
      <OverlayLoader isLoading={isLoading} />
      <DiffToolbar
        onRefresh={onRefresh}
        onSwapSides={handleSwap}
        onSave={handleSaveFile}
        isLoading={isLoading}
        isSaving={isSaving}
        filePath={filePath}
        disableSave={currentRevision != null}
      />
      <div className="flex px-4 py-1 text-xs text-gray-500 border-b">
        <div className="flex items-center justify-center w-[50%]">
          <span className="border rounded px-2 dark:bg-gray-200 dark:text-gray-600 font-bold">
            {isSwapped ? revision : currentRevision ? Number(revision) - 1 : 'Working Copy'}
          </span>
        </div>
        <div className="flex items-center justify-center w-[50%]">
          <span className="border rounded px-2 dark:bg-gray-200 dark:text-gray-600 font-bold">
            {isSwapped ? (currentRevision ? Number(revision) - 1 : 'Working Copy') : revision}
          </span>
        </div>
      </div>
      <div className="flex-1 overflow-hidden">
        <DiffEditor
          height="100%"
          language={language}
          original={originalCode}
          modified={modifiedCode}
          theme={themeMode === 'dark' ? 'custom-dark' : 'custom-light'}
          onMount={handleEditorMount}
          options={{
            renderWhitespace: 'all',
            readOnly: false,
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
      </div>
      <DiffFooterBar language={language} setLanguage={setLanguage} cursorPosition={cursorPosition} />
    </div>
  )
}
