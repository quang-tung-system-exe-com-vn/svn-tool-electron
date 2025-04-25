import toast from '@/components/ui-elements/Toast'
import { Button } from '@/components/ui/button'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import logger from '@/services/logger'
import { CircleArrowDown, Download, Eraser, FileText, Info, LifeBuoy, Minus, Settings2, Square, SquareArrowDown, X } from 'lucide-react'
import { IPC } from 'main/constants'
import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { toast as sonner } from 'sonner'
import { InfoDialog } from '../dialogs/AboutDialog'
import { CleanDialog } from '../dialogs/CleanDialog'
import { NewRevisionDialog } from '../dialogs/NewRevisionDialog'
import { SettingsDialog } from '../dialogs/SettingsDialog'
import { SupportFeedbackDialog } from '../dialogs/SupportFeedbackDialog'
import type { SvnStatusCode } from '../shared/constants'
import { useButtonVariant } from '../stores/useAppearanceStore'
import { GlowLoader } from '../ui-elements/GlowLoader'

interface TitleBarProps {
  isLoading: boolean
  tableRef: any
}
type SvnInfo = {
  author: string
  revision: string
  date: string
  curRevision: string
  commitMessage: string
  changedFiles: { status: SvnStatusCode; path: string }[]
}

export const TitleBar = ({ isLoading, tableRef }: TitleBarProps) => {
  const { t } = useTranslation()
  const variant = useButtonVariant()
  const [showSettings, setShowSettings] = useState(false)
  const [showInfo, setShowInfo] = useState(false)
  const [showClean, setShowClean] = useState(false)
  const [showSvnUpdateDialog, setShowSvnUpdateDialog] = useState(false)
  const [showSupportFeedback, setShowSupportFeedback] = useState(false)

  const [status, setStatus] = useState('')
  const [appVersion, setAppVersion] = useState<string>('')

  const [svnInfo, setSvnInfo] = useState<SvnInfo>({ author: '', revision: '', date: '', curRevision: '', commitMessage: '', changedFiles: [] })
  const [hasSvnUpdate, setHasSvnUpdate] = useState(false)

  const handleWindow = (action: string) => {
    window.api.electron.send('window-action', action)
  }

  useEffect(() => {
    const handler = (_event: any, data: any) => {
      setStatus(data.status)
      logger.info(data)
      if (data.status === 'available') {
        if (data.version) {
          setAppVersion(`v${data.version}`)
        }
      }
    }
    window.api.on('updater:status', handler)
    return () => {
      window.api.removeAllListeners('updater:status')
    }
  }, [])

  useEffect(() => {
    const checkAppUpdates = async () => {
      try {
        const result = await window.api.updater.check_for_updates()
        if (result.status === 'available' && result.version) {
          setAppVersion(`v${result.version}`)
        }
      } catch (error) {
        logger.error('Error checking for app updates:', error)
      }
    }
    const checkSvnUpdates = async () => {
      try {
        const { status, data, message } = await window.api.svn.info('.')
        if (status === 'success') {
          logger.info(data)
          setHasSvnUpdate(true)
          setSvnInfo(data)
          setShowSvnUpdateDialog(true)
        } else if (status === 'no-change') {
          logger.info('Không có thay đổi')
          setHasSvnUpdate(false)
          setSvnInfo(data)
        } else {
          logger.error('Lỗi SVN:', message)
        }
      } catch (error) {
        logger.error('Error checking for SVN updates:', error)
      }
    }
    checkAppUpdates()
    checkSvnUpdates()
    const interval = setInterval(() => {
      checkAppUpdates()
      checkSvnUpdates()
    }, 300000) // Check every 5 minutes
    return () => clearInterval(interval)
  }, [])

  const showUpdateToast = (version?: string) => {
    sonner.custom(
      id => (
        <div className="bg-card p-4 rounded-lg shadow-lg border max-w-md">
          <h3 className="flex flex-row gap-2 items-center font-semibold mb-2">
            <Download className="w-4 h-4" />
            {t('dialog.updateApp.title')}
          </h3>
          <p className="mb-2 text-[0.85rem]">{t('dialog.updateApp.appVersion', { 0: version })}</p>
          <div className="flex justify-end gap-2 pt-5">
            <Button variant={variant} size="sm" onClick={() => sonner.dismiss(id)}>
              {t('common.cancel')}
            </Button>
            <Button
              variant={variant}
              size="sm"
              onClick={async () => {
                try {
                  await window.api.updater.install_updates()
                } catch (error) {
                  toast.error(error)
                }
                sonner.dismiss(id)
              }}
            >
              {t('common.install')}
            </Button>
          </div>
        </div>
      ),
      {
        duration: Number.POSITIVE_INFINITY,
        position: 'top-center',
      }
    )
  }

  const checkForUpdates = async () => {
    if (status === 'downloaded') {
      showUpdateToast(appVersion)
    } else {
      toast.info(t('toast.isLatestVersion'))
    }
  }

  const openSettingsDialog = () => {
    setShowSettings(true)
  }

  const openInfoDialog = () => {
    setShowInfo(true)
  }

  const openCleanDialog = () => {
    setShowClean(true)
  }

  const openShowLogWindow = () => {
    if (!isLoading) {
      window.api.electron.send(IPC.WINDOW.SHOW_LOG, '.')
    }
  }

  const openSupportFeedbackDialog = () => {
    setShowSupportFeedback(true)
  }

  const openSvnUpdateDialog = () => {
    setShowSvnUpdateDialog(true)
  }

  const handleSvnUpdate = () => {
    toast.info(t('Updating SVN...'))
    window.api.svn
      .update()
      .then(result => {
        if (result.status === 'success') {
          setShowSvnUpdateDialog(false)
          setHasSvnUpdate(false)
          toast.success(t('SVN updated successfully'))
        } else {
          toast.error(result.message)
        }
      })
      .catch((error: Error) => {
        toast.error(error.message || 'Error updating SVN')
      })
  }

  const handleCurRevisionUpdate = (revision: string) => {
    setSvnInfo(prev => ({
      ...prev,
      curRevision: revision,
    }))
  }

  return (
    <>
      {/* Dialogs */}
      <SettingsDialog open={showSettings} onOpenChange={setShowSettings} />
      <InfoDialog open={showInfo} onOpenChange={setShowInfo} />
      <CleanDialog open={showClean} onOpenChange={setShowClean} />
      <SupportFeedbackDialog open={showSupportFeedback} onOpenChange={setShowSupportFeedback} />
      <NewRevisionDialog
        open={showSvnUpdateDialog}
        onOpenChange={setShowSvnUpdateDialog}
        svnInfo={svnInfo}
        onUpdate={handleSvnUpdate}
        hasSvnUpdate={hasSvnUpdate}
        onCurRevisionUpdate={handleCurRevisionUpdate}
      />
      <div
        className="flex items-center justify-between h-8 text-sm select-none"
        style={
          {
            WebkitAppRegion: 'drag',
            backgroundColor: 'var(--main-bg)',
            color: 'var(--main-fg)',
          } as React.CSSProperties
        }
      >
        {/* Left Section (Menu) */}
        <div className="flex items-center h-full">
          <div className="w-15 h-6 flex justify-center pt-1.5 pl-1">
            {isLoading ? <GlowLoader className="w-10 h-4" /> : <img src="icon.png" alt="icon" draggable="false" className="w-10 h-3.5 dark:brightness-160" />}
          </div>
          <div className="flex items-center h-full" style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}>
            <div className="flex items-center gap-1 pt-0.5">
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="link"
                    size="sm"
                    onClick={openSettingsDialog}
                    className="shadow-none focus-visible:ring-0 focus-visible:ring-offset-0 hover:bg-muted transition-colors rounded-sm h-[25px] w-[25px]"
                  >
                    <Settings2 strokeWidth={1.25} absoluteStrokeWidth size={15} className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>{t('title.settings')}</TooltipContent>
              </Tooltip>

              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="link"
                    size="sm"
                    onClick={openInfoDialog}
                    className="shadow-none focus-visible:ring-0 focus-visible:ring-offset-0 hover:bg-muted transition-colors rounded-sm h-[25px] w-[25px]"
                  >
                    <Info strokeWidth={1.25} absoluteStrokeWidth size={15} className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>{t('title.about')}</TooltipContent>
              </Tooltip>

              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="link"
                    size="sm"
                    onClick={checkForUpdates}
                    className="shadow-none focus-visible:ring-0 focus-visible:ring-offset-0 hover:bg-muted transition-colors rounded-sm h-[25px] w-[25px] relative"
                  >
                    <CircleArrowDown strokeWidth={1.25} absoluteStrokeWidth size={15} className="h-4 w-4" />
                    {status === 'downloaded' && <span className="absolute top-0 right-0 h-2 w-2 rounded-full bg-red-500" />}
                  </Button>
                </TooltipTrigger>
                <TooltipContent>{status === 'downloaded' ? t('title.checkForUpdate1', { 0: appVersion }) : t('title.checkForUpdate')}</TooltipContent>
              </Tooltip>

              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="link"
                    size="sm"
                    onClick={openSupportFeedbackDialog}
                    className="shadow-none focus-visible:ring-0 focus-visible:ring-offset-0 hover:bg-muted transition-colors rounded-sm h-[25px] w-[25px]"
                  >
                    <LifeBuoy strokeWidth={1.25} absoluteStrokeWidth size={15} className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>{t('title.supportFeedback')}</TooltipContent>
              </Tooltip>
            </div>
          </div>
        </div>

        {/* Right Section (Window Controls) */}
        <div className="flex gap-1 items-center justify-center h-full" style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}>
          <div className="flex items-center gap-1 pt-0.5">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="link"
                  size="sm"
                  onClick={openSvnUpdateDialog}
                  className="shadow-none focus-visible:ring-0 focus-visible:ring-offset-0 hover:bg-muted transition-colors rounded-sm h-[25px] w-[25px] relative"
                >
                  <SquareArrowDown strokeWidth={1.25} absoluteStrokeWidth size={15} className="h-4 w-4" />
                  {hasSvnUpdate && <span className="absolute top-0 right-0 h-2 w-2 rounded-full bg-red-500" />}
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                {hasSvnUpdate ? t('title.updateSvn1', { 0: svnInfo?.revision, 1: svnInfo?.curRevision }) : t('title.updateSvn', { 0: svnInfo?.revision })}
              </TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="link"
                  size="sm"
                  onClick={openCleanDialog}
                  className="shadow-none focus-visible:ring-0 focus-visible:ring-offset-0 hover:bg-muted transition-colors rounded-sm h-[25px] w-[25px]"
                >
                  <Eraser strokeWidth={1.25} absoluteStrokeWidth size={15} className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>{t('title.cleanSvn')}</TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="link"
                  size="sm"
                  onClick={openShowLogWindow}
                  className="shadow-none focus-visible:ring-0 focus-visible:ring-offset-0 hover:bg-muted transition-colors rounded-sm h-[25px] w-[25px]"
                >
                  <FileText strokeWidth={1.25} absoluteStrokeWidth size={15} className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>{t('title.showLogsSvn')}</TooltipContent>
            </Tooltip>
          </div>
          <button onClick={() => handleWindow('minimize')} className="w-10 h-8 flex items-center justify-center hover:bg-[var(--hover-bg)] hover:text-[var(--hover-fg)]">
            <Minus size={15.5} strokeWidth={1} absoluteStrokeWidth />
          </button>
          <button onClick={() => handleWindow('maximize')} className="w-10 h-8 flex items-center justify-center hover:bg-[var(--hover-bg)] hover:text-[var(--hover-fg)]">
            <Square size={14.5} strokeWidth={1} absoluteStrokeWidth />
          </button>
          <button onClick={() => handleWindow('close')} className="w-10 h-8 flex items-center justify-center hover:bg-red-600 hover:text-white">
            <X size={20} strokeWidth={1} absoluteStrokeWidth />
          </button>
        </div>
      </div>
    </>
  )
}
