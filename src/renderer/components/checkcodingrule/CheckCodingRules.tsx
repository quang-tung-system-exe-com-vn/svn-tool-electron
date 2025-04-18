import { useAppearanceStore } from '@/components/stores/useAppearanceStore'
import { OverlayLoader } from '@/components/ui-elements/OverlayLoader'
import { ScrollArea } from '@/components/ui/scroll-area'
import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { LANGUAGES } from '../shared/constants'
import ToastMessageFunctions from '../ui-elements/ToastMessage'
import { CheckCodingRulesToolbar } from './CheckCodingRulesToolbar'

window.addEventListener('storage', event => {
  if (event.key === 'ui-settings') {
    const style = JSON.parse(event.newValue || '{}')
    document.documentElement.setAttribute('data-font-size', style.state.fontSize)
    document.documentElement.setAttribute('data-font-family', style.state.fontFamily)
    document.documentElement.setAttribute('data-button-variant', style.state.buttonVariant)
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
      ToastMessageFunctions.warning(t('message.noFilesWarning'))
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
      ToastMessageFunctions.success(t('toast.checkViolationsSuccess'))
    } else {
      ToastMessageFunctions.error(message)
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
              <pre className="p-4 whitespace-pre-wrap font-mono text-sm">{result || 'No analysis results yet.'}</pre>
            </ScrollArea>
          </div>
        </div>
      </div>
    </div>
  )
}
