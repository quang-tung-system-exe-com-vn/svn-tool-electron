import { TitleBar } from '@/components/layout/TitleBar'
import { useButtonVariant } from '@/components/stores/useAppearanceStore'
import { OverlayLoader } from '@/components/ui-elements/OverlayLoader'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Code, RefreshCw } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'

export function CheckCodingRules() {
  const variant = useButtonVariant()
  const { t } = useTranslation()
  const [isLoading, setIsLoading] = useState(false)
  const [text, setText] = useState('')
  const [result, setResult] = useState('')

  useEffect(() => {
    const handler = (_event: any, { text }: { text: string }) => {
      setText(text)
      setIsLoading(true)

      // Simulate API call to check coding rules
      setTimeout(() => {
        // This is a placeholder for the actual coding rules check
        // In a real implementation, this would be replaced with actual analysis
        const sampleResult = `
        Coding Rules Analysis Results:
        ${text.split('\n')[0] || 'Unknown file'}
        `

        setResult(sampleResult)
        setIsLoading(false)
        toast.success('Coding rules analysis completed')
      }, 1500)
    }

    window.api.on('load-diff-data', handler)

    return () => {
      // Clean up event listener
      window.api.on('load-diff-data', () => {})
    }
  }, [])

  const handleRefresh = () => {
    setIsLoading(true)

    // Simulate refreshing the analysis
    setTimeout(() => {
      setIsLoading(false)
      toast.success('Analysis refreshed')
    }, 1000)
  }

  return (
    <div className="flex h-screen w-full">
      <div className="flex flex-col flex-1 w-full">
        <TitleBar isLoading={isLoading} progress={0} />

        <div className="p-4 space-y-4 flex-1 h-full flex flex-col">
          <div className="flex justify-between items-center mb-4">
            <div className="flex items-center gap-3">
              <Code className="h-6 w-6 text-primary" />
              <h2 className="text-xl font-semibold">{t('Coding Rules Analysis')}</h2>
            </div>
            <Button variant={variant} onClick={handleRefresh} className="flex items-center gap-2">
              <RefreshCw className="h-4 w-4" />
              {t('Refresh')}
            </Button>
          </div>

          <div className="flex-1 border rounded-md overflow-hidden">
            <div className="bg-muted p-2 font-medium">Analysis Results</div>
            <ScrollArea className="h-[calc(100%-40px)]">
              <OverlayLoader isLoading={isLoading} />
              <pre className="p-4 whitespace-pre-wrap font-mono text-sm">{result || 'No analysis results yet.'}</pre>
            </ScrollArea>
          </div>
        </div>
      </div>
    </div>
  )
}
