import { LANGUAGES } from '@/components/shared/constants'
import { useAppearanceStore } from '@/components/stores/useAppearanceStore'
import { OverlayLoader } from '@/components/ui-elements/OverlayLoader'
import toast from '@/components/ui-elements/Toast'
import { ScrollArea } from '@/components/ui/scroll-area'
import i18n from '@/lib/i18n'
import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { CheckCodingRulesToolbar } from './CheckCodingRulesToolbar'

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

export function CheckCodingRules() {
  const { language } = useAppearanceStore()
  const { t } = useTranslation()
  const [isLoading, setIsLoading] = useState(false)
  const [selectedFiles, setSelectedFiles] = useState([])
  const [result, setResult] = useState('')

  useEffect(() => {
    const handler = (_event: any, data: any) => {
      setSelectedFiles(data.selectedFiles)
      handleRefresh(data.selectedFiles)
    }
    window.api.on('load-diff-data', handler)
  }, [])

  const handleRefresh = async (selectedFiles: any[]) => {
    if (selectedFiles.length === 0) {
      toast.warning(t('message.noFilesWarning'))
      return
    }
    const languageName = LANGUAGES.find(lang => lang.code === language)?.label || 'English'
    setIsLoading(true)
    const result = await window.api.svn.get_diff(selectedFiles)
    const { status, message, data } = result
    if (status === 'success') {
      const params = {
        type: 'CHECK_VIOLATIONS',
        values: {
          diff_content: data,
          language: languageName,
        },
      }
      const openai_result = await window.api.openai.send_message(params)
      setResult(openai_result)
      setIsLoading(false)
      toast.success(t('toast.checkSuccess'))
    } else {
      toast.error(message)
      setIsLoading(false)
    }
  }

  return (
    <div className="flex h-screen w-full">
      <div className="flex flex-col flex-1 w-full">
        <CheckCodingRulesToolbar isLoading={isLoading} onRefresh={() => handleRefresh(selectedFiles)} />
        <div className="p-4 space-y-4 flex-1 h-full flex flex-col">
          <div className="flex-1 border rounded-md overflow-hidden">
            <ScrollArea className="h-full">
              <OverlayLoader isLoading={isLoading} />
              {result ? (
                <div className="p-4 prose prose-sm dark:prose-invert max-w-none">
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>{result}</ReactMarkdown>
                </div>
              ) : (
                <div className="p-4 text-sm">{t('dialog.codingRules.noResults')}</div>
              )}
            </ScrollArea>
          </div>
        </div>
      </div>
    </div>
  )
}
