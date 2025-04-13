import { Menubar, MenubarContent, MenubarItem, MenubarMenu, MenubarTrigger } from '@/components/ui/menubar'
import { t } from 'i18next'
import { Minus, Sparkles, Square, X } from 'lucide-react'
import { InfoDialog } from '../dialogs/AboutDialog'
import { SettingsDialog } from '../dialogs/SettingsDialog'

export const TitleBar = () => {
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
        <Sparkles className="w-10 h-4" />
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
              <MenubarTrigger className="px-2 hover:bg-[var(--hover-bg)] hover:text-[var(--hover-fg)] font-normal h-full flex items-center">{t('menu.logs')}</MenubarTrigger>
              <MenubarContent>
                <MenubarItem>{t('menu.showLogs')}</MenubarItem>
                <MenubarItem>{t('menu.clearLogs')}</MenubarItem>
              </MenubarContent>
            </MenubarMenu>
          </Menubar>
        </div>
      </div>
      {/* Center Section (Title) */}
      {/* <Label className="font-medium text-xs text-gray-500">
        {t("SVN Tool")}
      </Label> */}
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
