import { Button } from '@/components/ui/button'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { Download, Eraser, FileText, Info, Minus, RefreshCw, Settings2, Square, SquareArrowDown, X } from 'lucide-react'
import { IPC } from 'main/constants'
import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import { InfoDialog } from '../dialogs/AboutDialog'
import { CleanDialog } from '../dialogs/CleanDialog'
import { SettingsDialog } from '../dialogs/SettingsDialog'
import { GlowLoader } from '../ui-elements/GlowLoader'
import { RoundIcon } from '../ui-elements/RoundIcon'
import ToastMessageFunctions from '../ui-elements/ToastMessage'

interface TitleBarProps {
  isLoading: boolean
  tableRef: any
}

export const TitleBar = ({ isLoading, tableRef }: TitleBarProps) => {
  const { t } = useTranslation()
  const [checkingUpdate, setCheckingUpdate] = useState(false)
  const [showSettings, setShowSettings] = useState(false)
  const [showInfo, setShowInfo] = useState(false)
  const [showClean, setShowClean] = useState(false)
  const [hasSvnUpdate, setHasSvnUpdate] = useState(false)
  const [newVersionInfo, setNewVersionInfo] = useState<string>('')
  const [newRevisionInfo, setNewRevisionInfo] = useState<string>('')
  const [showSvnUpdateDialog, setShowSvnUpdateDialog] = useState(false)
  const [svnRevisionInfo, setSvnRevisionInfo] = useState<string>('')
  const [resetSvnUpdateIndicator, setResetSvnUpdateIndicator] = useState(false)
  const [status, setStatus] = useState('')

  const handleWindow = (action: string) => {
    window.api.electron.send('window-action', action)
  }

  useEffect(() => {
    const handler = (_event: any, data: any) => {
      setStatus(data.status)
      console.log(data)
      if (data.status === 'available') {
        if (data.version) {
          setNewVersionInfo(`v${data.version}`)
        }
      }
    }
    window.api.on('updater:status', handler)
    return () => {
      window.api.removeAllListeners('updater:status')
    }
  }, [])

  const showUpdateToast = (version?: string) => {
    toast.custom(
      id => (
        <div className="bg-card p-4 rounded-lg shadow-lg border max-w-md">
          <h3 className="flex flex-row gap-2 items-center font-semibold mb-2">
            <Download className="w-4 h-4" />
            {t('New Update Available')}
          </h3>
          <p className="mb-2 text-[0.85rem]">
            {t('A new version of the application is available:')} {version && `${version}`}
          </p>
          <div className="flex justify-end gap-2 pt-5">
            <Button variant="outline" size="sm" onClick={() => toast.dismiss(id)}>
              {t('Cancel')}
            </Button>
            <Button
              size="sm"
              onClick={async () => {
                try {
                  await window.api.updater.install_updates()
                } catch (error) {
                  ToastMessageFunctions.error(error)
                }
                toast.dismiss(id)
              }}
            >
              {t('Install')}
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
      showUpdateToast(newVersionInfo)
      return
    }
  }

  const onUpdateSvn = () => {
    if (!isLoading) {
      ToastMessageFunctions.info(t('Updating SVN...'))
      window.api.svn
        .update()
        .then(result => {
          if (result.status === 'success') {
            ToastMessageFunctions.success(t('SVN updated successfully'))
            setResetSvnUpdateIndicator(prev => !prev)
            tableRef.current?.reloadData()
          } else {
            ToastMessageFunctions.error(result.message)
          }
        })
        .catch((error: Error) => {
          ToastMessageFunctions.error(error.message || 'Error updating SVN')
        })
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

  useEffect(() => {
    const checkAppUpdates = async () => {
      try {
        const result = await window.api.updater.check_for_updates()
        if (result.status === 'available' && result.version) {
          setNewVersionInfo(`v${result.version}`)
        }
      } catch (error) {
        console.error('Error checking for app updates:', error)
      }
    }

    // Check for SVN updates
    const checkSvnUpdates = async () => {
      try {
        const localInfo = await window.api.svn.info('.', 'BASE')
        const remoteInfo = await window.api.svn.info('.', 'HEAD')
        if (localInfo?.data < remoteInfo?.data) {
          setHasSvnUpdate(true)
          setNewRevisionInfo(`r${remoteInfo?.data}`)
          setSvnRevisionInfo(`New revision r${remoteInfo.data} available`)
          setShowSvnUpdateDialog(true)
        } else {
          setHasSvnUpdate(false)
          setNewRevisionInfo(`r${localInfo?.data}`)
        }
      } catch (error) {
        console.error('Error checking for SVN updates:', error)
      }
    }

    // Initial check
    checkAppUpdates()
    checkSvnUpdates()

    // Set up interval for periodic checks
    const interval = setInterval(() => {
      checkAppUpdates()
      checkSvnUpdates()
    }, 300000) // Check every 5 minutes

    return () => clearInterval(interval)
  }, [])

  // Reset SVN update indicator when requested
  useEffect(() => {
    if (resetSvnUpdateIndicator) {
      setHasSvnUpdate(false)
    }
  }, [resetSvnUpdateIndicator])

  // Handle SVN update from dialog
  const handleSvnUpdate = () => {
    ToastMessageFunctions.info(t('Updating SVN...'))
    window.api.svn
      .update()
      .then(result => {
        if (result.status === 'success') {
          setShowSvnUpdateDialog(false)
          setHasSvnUpdate(false) // Reset indicator
          setSvnRevisionInfo('') // Clear revision info
          ToastMessageFunctions.success(t('SVN updated successfully'))
        } else {
          ToastMessageFunctions.error(result.message)
        }
      })
      .catch((error: Error) => {
        ToastMessageFunctions.error(error.message || 'Error updating SVN')
      })
  }

  return (
    <>
      {/* Dialogs */}
      <SettingsDialog open={showSettings} onOpenChange={setShowSettings} />
      <InfoDialog open={showInfo} onOpenChange={setShowInfo} />
      <CleanDialog open={showClean} onOpenChange={setShowClean} />
      {/* New Revision Dialog */}
      {showSvnUpdateDialog && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-card p-6 rounded-lg shadow-lg w-100">
            <h3 className="text-lg font-semibold mb-4">{t('New SVN Revision Available')}</h3>
            <p className="mb-6">{svnRevisionInfo}</p>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setShowSvnUpdateDialog(false)}>
                {t('Cancel')}
              </Button>
              <Button onClick={handleSvnUpdate}>{t('Update Now')}</Button>
            </div>
          </div>
        </div>
      )}
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
                    className="shadow-none focus-visible:ring-0 focus-visible:ring-offset-0 hover:bg-muted transition-colors rounded-sm h-[25px] w-[25px] relative"
                  >
                    <RefreshCw strokeWidth={0.75} absoluteStrokeWidth size={15} className="h-4 w-4" />
                    {status === 'downloaded' && <span className="absolute top-0 right-0 h-2 w-2 rounded-full bg-red-500" />}
                  </Button>
                </TooltipTrigger>
                <TooltipContent>{status === 'downloaded' ? t('New update available!') + (newVersionInfo ? ` (${newVersionInfo})` : '') : t('Check for Updates')}</TooltipContent>
              </Tooltip>
            </div>
          </div>
        </div>
        {/* Center Section (Title) */}

        {/* Right Section (Window Controls) */}
        <div className="flex gap-1 items-center justify-center h-full" style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}>
          <div className="flex items-center gap-1 pt-0.5">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="link"
                  size="sm"
                  onClick={onUpdateSvn}
                  className="shadow-none focus-visible:ring-0 focus-visible:ring-offset-0 hover:bg-muted transition-colors rounded-sm h-[25px] w-[25px] relative"
                >
                  <SquareArrowDown strokeWidth={0.75} absoluteStrokeWidth size={15} className="h-4 w-4" />
                  {hasSvnUpdate && <span className="absolute top-0 right-0 h-2 w-2 rounded-full bg-red-500" />}
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                {hasSvnUpdate
                  ? t('New SVN revision available!') + (newRevisionInfo ? ` (${newRevisionInfo})` : '')
                  : t('Update SVN') + (newRevisionInfo ? ` (${newRevisionInfo})` : '')}
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
                  onClick={openShowLogWindow}
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
