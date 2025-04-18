import { Button } from '@/components/ui/button'
import { Menubar, MenubarContent, MenubarItem, MenubarMenu, MenubarSeparator, MenubarTrigger } from '@/components/ui/menubar'
import { t } from 'i18next'
import { Download, Minus, RefreshCw, Square, X } from 'lucide-react'
import { InfoDialog } from '../dialogs/AboutDialog'
import { SettingsDialog } from '../dialogs/SettingsDialog'
import { GlowLoader } from '../ui-elements/GlowLoader'
import { RoundIcon } from '../ui-elements/RoundIcon'
import { toast } from 'sonner'
import { useState } from 'react'

interface TitleBarProps {
  isLoading: boolean
  progress: number
}

export const TitleBar = ({ isLoading, progress }: TitleBarProps) => {
  const [checkingUpdate, setCheckingUpdate] = useState(false)

  const handleWindow = (action: string) => {
    window.api.electron.send('window-action', action)
  }

  const checkForUpdates = async () => {
    try {
      setCheckingUpdate(true)
      toast.info(t('Checking for updates...'))

      // Call the electron-updater API
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

  return (
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
          <Menubar className="bg-transparent h-full border-none rounded-none shadow-none">
            <MenubarMenu>
              <MenubarTrigger className="px-2 hover:bg-[var(--hover-bg)] hover:text-[var(--hover-fg)] font-normal h-full flex items-center">{t('menu.info')}</MenubarTrigger>
              <MenubarContent>
                <SettingsDialog />
                <InfoDialog />
              </MenubarContent>
            </MenubarMenu>
            <MenubarMenu>
              <MenubarTrigger className="px-2 hover:bg-[var(--hover-bg)] hover:text-[var(--hover-fg)] font-normal h-full flex items-center">{t('menu.update')}</MenubarTrigger>
              <MenubarContent>
                <MenubarItem
                  onClick={checkForUpdates}
                  disabled={checkingUpdate}
                  className="flex items-center gap-2"
                >
                  <RefreshCw className="h-4 w-4" />
                  {t('Check for Updates')}
                </MenubarItem>
              </MenubarContent>
            </MenubarMenu>
          </Menubar>
        </div>
      </div>
      {/* Center Section (Title) */}
      <Button variant="ghost" className="font-medium text-xs text-gray-200">
        {t('SVN Tool')}
      </Button>
      {/* Right Section (Window Controls) */}
      <div className="flex gap-1" style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}>
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
  )
}
