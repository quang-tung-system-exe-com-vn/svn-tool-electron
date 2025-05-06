'use client'
import { InfoDialog } from '@/components/dialogs/AboutDialog'
import { CleanDialog } from '@/components/dialogs/CleanDialog'
import { NewRevisionDialog } from '@/components/dialogs/NewRevisionDialog'
import { SettingsDialog } from '@/components/dialogs/SettingsDialog'
import { SupportFeedbackDialog } from '@/components/dialogs/SupportFeedbackDialog'
import { UpdateDialog } from '@/components/dialogs/UpdateDialog'
import type { SvnStatusCode } from '@/components/shared/constants'
import { GlowLoader } from '@/components/ui-elements/GlowLoader'
import toast from '@/components/ui-elements/Toast'
import { Button } from '@/components/ui/button'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import logger from '@/services/logger'
import { CircleArrowDown, Eraser, FileText, History, Info, LifeBuoy, Minus, PlayCircle, Settings2, Square, SquareArrowDown, X } from 'lucide-react' // Added PlayCircle
import { IPC } from 'main/constants'
import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'

interface TitleBarProps {
  isLoading: boolean
  onTourIconClick: () => void
  hasCompletedTour: boolean
  showTourIconForLastStep: boolean // Add new prop for tour state
}
type SvnInfo = {
  author: string
  revision: string
  date: string
  curRevision: string
  commitMessage: string
  changedFiles: { status: SvnStatusCode; path: string }[]
}

export const TitleBar = ({ isLoading, onTourIconClick, hasCompletedTour, showTourIconForLastStep }: TitleBarProps) => {
  const { t } = useTranslation()
  const [showSettings, setShowSettings] = useState(false)
  const [showInfo, setShowInfo] = useState(false)
  const [showClean, setShowClean] = useState(false)
  const [showSvnUpdateDialog, setShowSvnUpdateDialog] = useState(false)
  const [isSvnDialogManuallyOpened, setIsSvnDialogManuallyOpened] = useState(false)
  const [showSupportFeedback, setShowSupportFeedback] = useState(false)

  const [status, setStatus] = useState('')
  const [appVersion, setAppVersion] = useState<string>('')
  const [newAppVersion, setNewAppVersion] = useState<string>('')
  const [releaseNotes, setReleaseNotes] = useState<string>('')
  const [showUpdateDialog, setShowUpdateDialog] = useState(false)
  const [isUpdateDialogManuallyOpened, setIsUpdateDialogManuallyOpened] = useState(false)
  const [showIconUpdateApp, setShowIconUpdateApp] = useState(false)

  const [svnInfo, setSvnInfo] = useState<SvnInfo>({ author: '', revision: '', date: '', curRevision: '', commitMessage: '', changedFiles: [] })
  const [hasSvnUpdate, setHasSvnUpdate] = useState(false)

  const handleWindow = (action: string) => {
    window.api.electron.send('window-action', action)
  }

  useEffect(() => {
    const handler = (_event: any, data: any) => {
      setStatus(data.status)
      setShowIconUpdateApp(false)
      logger.info(data)
      if (data.status === 'available') {
        setAppVersion(`v${data.currentVersion}`)
        setNewAppVersion(`v${data.version}`)
      }
      if (data.status === 'downloaded') {
        setAppVersion(`v${data.currentVersion}`)
        setNewAppVersion(`v${data.version}`)
        setShowIconUpdateApp(true)
        if (data.releaseNotes) {
          setReleaseNotes(data.releaseNotes)
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
        if (result.releaseNotes) {
          setReleaseNotes(result.releaseNotes)
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
          setIsSvnDialogManuallyOpened(false) // Đây là mở tự động
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

    const appUpdateInterval = setInterval(
      () => {
        checkAppUpdates()
      },
      5 * 60 * 1000 // Check every 5 minutes
    )

    const svnUpdateInterval = setInterval(
      () => {
        checkSvnUpdates()
      },
      5 * 60 * 1000 // Check every 5 minutes
    )

    return () => {
      clearInterval(appUpdateInterval)
      clearInterval(svnUpdateInterval)
    }
  }, [])

  const checkForUpdates = async () => {
    if (status === 'downloaded') {
      // Đánh dấu dialog được mở thủ công
      setIsUpdateDialogManuallyOpened(true)
      setShowUpdateDialog(true)
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

  const openHistoryWindow = () => {
    if (!isLoading) {
      window.api.electron.send(IPC.WINDOW.COMMIT_MESSAGE_HISTORY, undefined)
    }
  }

  const openSvnUpdateDialog = () => {
    // Đánh dấu dialog được mở thủ công
    setIsSvnDialogManuallyOpened(true)
    setShowSvnUpdateDialog(true)
  }

  const handleCurRevisionUpdate = (revision: string) => {
    setSvnInfo(prev => ({
      ...prev,
      curRevision: revision,
    }))
    setShowSvnUpdateDialog(false)
    setHasSvnUpdate(false)
  }

  return (
    <>
      {/* Dialogs */}
      <SettingsDialog open={showSettings} onOpenChange={setShowSettings} />
      <InfoDialog open={showInfo} onOpenChange={setShowInfo} />
      <CleanDialog open={showClean} onOpenChange={setShowClean} />
      <SupportFeedbackDialog open={showSupportFeedback} onOpenChange={setShowSupportFeedback} />
      <UpdateDialog
        open={showUpdateDialog}
        onOpenChange={setShowUpdateDialog}
        currentVersion={appVersion}
        newVersion={newAppVersion}
        releaseNotes={releaseNotes}
        isManuallyOpened={isUpdateDialogManuallyOpened}
      />
      <NewRevisionDialog
        open={showSvnUpdateDialog}
        onOpenChange={setShowSvnUpdateDialog}
        svnInfo={svnInfo}
        hasSvnUpdate={hasSvnUpdate}
        onCurRevisionUpdate={handleCurRevisionUpdate}
        isManuallyOpened={isSvnDialogManuallyOpened}
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
            {isLoading ? <GlowLoader className="w-10 h-4" /> : <img src="logo.png" alt="icon" draggable="false" className="w-10 h-3.5 dark:brightness-130" />}
          </div>
          <div className="flex items-center h-full" style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}>
            <div className="flex items-center gap-1 pt-0.5">
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    id="settings-button"
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
                    id="about-button"
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
                    id="support-button"
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

              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    id="history-button"
                    variant="link"
                    size="sm"
                    onClick={openHistoryWindow}
                    className="shadow-none focus-visible:ring-0 focus-visible:ring-offset-0 hover:bg-muted transition-colors rounded-sm h-[25px] w-[25px]"
                  >
                    <History strokeWidth={1.25} absoluteStrokeWidth size={15} className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>{t('title.historyCommitMessage')}</TooltipContent>
              </Tooltip>

              {(hasCompletedTour || showTourIconForLastStep) && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      id="start-tour-button"
                      variant="link"
                      size="sm"
                      onClick={onTourIconClick}
                      className="shadow-none focus-visible:ring-0 focus-visible:ring-offset-0 hover:bg-muted transition-colors rounded-sm h-[25px] w-[25px]"
                    >
                      <PlayCircle strokeWidth={1.25} absoluteStrokeWidth size={15} className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>{t('title.startTour')}</TooltipContent>
                </Tooltip>
              )}

              {showIconUpdateApp && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      id="app-update-button"
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
              )}
            </div>
          </div>
        </div>

        <div className="flex gap-1 items-center justify-center h-full" style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}>
          <div className="flex items-center gap-1 pt-0.5">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  id="svn-update-button"
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
                  id="svn-clean-button"
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
                  id="svn-log-button"
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
