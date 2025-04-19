import { Button } from '@/components/ui/button'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { t } from 'i18next'
import { Eraser, FileText, Info, Minus, RefreshCw, Settings2, Square, SquareArrowDown, X } from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'
import { InfoDialog } from '../dialogs/AboutDialog'
import { CleanDialog } from '../dialogs/CleanDialog'
import { SettingsDialog } from '../dialogs/SettingsDialog'
import { GlowLoader } from '../ui-elements/GlowLoader'
import { RoundIcon } from '../ui-elements/RoundIcon'

interface TitleBarProps {
  isLoading: boolean
  progress: number
  onUpdate?: () => void
  onShowLog?: () => void
}

export const TitleBar = ({ isLoading, progress, onUpdate, onShowLog }: TitleBarProps) => {
  const [checkingUpdate, setCheckingUpdate] = useState(false)
  const [showSettings, setShowSettings] = useState(false)
  const [showInfo, setShowInfo] = useState(false)
  const [showClean, setShowClean] = useState(false)

  const handleWindow = (action: string) => {
    window.api.electron.send('window-action', action)
  }

  const checkForUpdates = async () => {
    try {
      setCheckingUpdate(true)
      toast.info(t('Checking for updates...'))
      const result = await window.api.updater.check_for_updates()
      if (result.updateAvailable) {
        toast.success(t('New version available!'))
      } else {
        toast.info(t('No updates available. You are using the latest version.'))
      }
    } catch (error) {
      console.error('Error checking for updates:', error)
      toast.error(t('Failed to check for updates'))
    } finally {
      setCheckingUpdate(false)
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

  return (
    <>
      {/* Dialogs */}
      <SettingsDialog open={showSettings} onOpenChange={setShowSettings} />
      <InfoDialog open={showInfo} onOpenChange={setShowInfo} />
      <CleanDialog open={showClean} onOpenChange={setShowClean} />
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
        <div className="flex items-center h-full" style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}>
          <div className="w-10 h-6 flex justify-center">{isLoading ? <GlowLoader className="w-8 h-6 py-1" /> : <RoundIcon className="w-8 h-6 py-1" />}</div>
          <div className="flex items-center h-full">
            <div className="flex items-center gap-1 pt-0.5">
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="link"
                    size="sm"
                    onClick={openSettingsDialog}
                    className="shadow-none focus-visible:ring-0 focus-visible:ring-offset-0 hover:bg-muted transition-colors rounded-sm h-[25px] w-[25px]"
                  >
                    <Settings2 strokeWidth={0.75} absoluteStrokeWidth size={15} className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>{t('menu.settings')}</TooltipContent>
              </Tooltip>

              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="link"
                    size="sm"
                    onClick={openInfoDialog}
                    className="shadow-none focus-visible:ring-0 focus-visible:ring-offset-0 hover:bg-muted transition-colors rounded-sm h-[25px] w-[25px]"
                  >
                    <Info strokeWidth={0.75} absoluteStrokeWidth size={15} className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>{t('menu.about')}</TooltipContent>
              </Tooltip>

              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="link"
                    size="sm"
                    onClick={checkForUpdates}
                    disabled={checkingUpdate}
                    className="shadow-none focus-visible:ring-0 focus-visible:ring-offset-0 hover:bg-muted transition-colors rounded-sm h-[25px] w-[25px]"
                  >
                    <RefreshCw strokeWidth={0.75} absoluteStrokeWidth size={15} className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>{t('Check for Updates')}</TooltipContent>
              </Tooltip>
            </div>
          </div>
        </div>
        {/* Center Section (Title) */}
        {/* <Button variant="ghost" className="font-medium text-xs">
          {t('SVN Tool')}
        </Button> */}
        {/* Right Section (Window Controls) */}
        <div className="flex gap-1 items-center justify-center h-full" style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}>
          <div className="flex items-center gap-1 pt-0.5">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="link"
                  size="sm"
                  onClick={onUpdate}
                  className="shadow-none focus-visible:ring-0 focus-visible:ring-offset-0 hover:bg-muted transition-colors rounded-sm h-[25px] w-[25px]"
                >
                  <SquareArrowDown strokeWidth={0.75} absoluteStrokeWidth size={15} className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Update SVN</TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="link"
                  size="sm"
                  onClick={openCleanDialog}
                  className="shadow-none focus-visible:ring-0 focus-visible:ring-offset-0 hover:bg-muted transition-colors rounded-sm h-[25px] w-[25px]"
                >
                  <Eraser strokeWidth={0.75} absoluteStrokeWidth size={15} className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Clean SVN</TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="link"
                  size="sm"
                  onClick={onShowLog}
                  className="shadow-none focus-visible:ring-0 focus-visible:ring-offset-0 hover:bg-muted transition-colors rounded-sm h-[25px] w-[25px]"
                >
                  <FileText strokeWidth={0.75} absoluteStrokeWidth size={15} className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Show Logs SVN</TooltipContent>
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
