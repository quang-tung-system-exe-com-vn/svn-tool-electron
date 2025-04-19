import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Progress } from '@/components/ui/progress'
import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'

interface UpdaterDialogProps {
  type: 'available' | 'downloaded'
  version?: string
  releaseNotes?: string
  onAction: () => void
  onCancel: () => void
}

export function UpdaterDialog({ type, version, releaseNotes, onAction, onCancel }: UpdaterDialogProps) {
  const { t } = useTranslation()
  const [open, setOpen] = useState(true)
  const [downloadProgress, setDownloadProgress] = useState(0)
  const [isDownloading, setIsDownloading] = useState(false)
  const [isUpdateDownloaded, setIsUpdateDownloaded] = useState(false)

  const handleAction = async () => {
    if (type === 'available') {
      if (!isDownloading && !isUpdateDownloaded) {
        // Start download
        setIsDownloading(true)
        try {
          await window.api.updater.download_update()
        } catch (error) {
          console.error('Error downloading update:', error)
        }
      } else if (isUpdateDownloaded) {
        // Install update
        onAction()
        setOpen(false)
      }
    } else {
      // For 'downloaded' type, just call the original action handler
      onAction()
      setOpen(false)
    }
  }

  const handleCancel = () => {
    onCancel()
    setOpen(false)
  }

  // Check if update is already downloaded when dialog opens
  useEffect(() => {
    const checkDownloadStatus = async () => {
      try {
        const downloaded = await window.api.updater.is_update_downloaded()
        setIsUpdateDownloaded(downloaded)
      } catch (error) {
        console.error('Error checking download status:', error)
      }
    }

    checkDownloadStatus()
    setOpen(true)
  }, [type, version])

  // Set up progress tracking
  useEffect(() => {
    if (type === 'available' && isDownloading && !isUpdateDownloaded) {
      const progressInterval = setInterval(async () => {
        try {
          const progress = await window.api.updater.get_download_progress()
          setDownloadProgress(progress)

          // Check if download completed
          const downloaded = await window.api.updater.is_update_downloaded()
          if (downloaded) {
            setIsUpdateDownloaded(true)
            setIsDownloading(false)
            clearInterval(progressInterval)
          }
        } catch (error) {
          console.error('Error getting download progress:', error)
        }
      }, 1000)

      return () => clearInterval(progressInterval)
    }
  }, [type, isDownloading, isUpdateDownloaded])

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{type === 'available' ? t('Update Available') : t('Update Ready')}</DialogTitle>
          <DialogDescription>
            {type === 'available'
              ? t('A new version ({{version}}) is available!', { version })
              : t('The update has been downloaded. Restart the application to apply the updates.')}
          </DialogDescription>
        </DialogHeader>

        {releaseNotes && (
          <div className="max-h-[200px] overflow-y-auto border rounded p-2 text-sm prose dark:prose-invert">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>{releaseNotes}</ReactMarkdown>
          </div>
        )}

        {type === 'available' && isDownloading && !isUpdateDownloaded && (
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>{t('Downloading update...')}</span>
              <span>{downloadProgress}%</span>
            </div>
            <Progress value={downloadProgress} className="h-2" />
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={handleCancel}>
            {t('Later')}
          </Button>
          <Button onClick={handleAction}>{type === 'available' ? (isUpdateDownloaded ? t('Install') : isDownloading ? t('Downloading...') : t('Download')) : t('Restart')}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
