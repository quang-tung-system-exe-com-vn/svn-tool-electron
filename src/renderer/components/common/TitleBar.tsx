import { Button } from '@/components/ui/button'
import { Menubar, MenubarContent, MenubarMenu, MenubarTrigger } from '@/components/ui/menubar'
import { t } from 'i18next'
import { Minus, Square, X } from 'lucide-react'
import { InfoDialog } from '../dialogs/AboutDialog'
import { SettingsDialog } from '../dialogs/SettingsDialog'
import { GlowLoader } from '../shared/GlowLoader'
import { RoundIcon } from '../shared/RoundIcon'

interface TitleBarProps {
  isLoading: boolean
  progress: number
}

export const TitleBar = ({ isLoading, progress }: TitleBarProps) => {
  const handleWindow = (action: string) => {
    window.api.electron.send('window-action', action)
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
          </Menubar>
        </div>
      </div>
      {/* Center Section (Title) */}
      <Button variant="ghost" className="font-medium text-xs text-gray-500">
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
