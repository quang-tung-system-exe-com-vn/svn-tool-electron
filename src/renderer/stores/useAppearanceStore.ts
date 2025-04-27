import type { ButtonVariant, FontFamily, FontSize, Language, Theme, ThemeMode } from 'main/store/AppearanceStore'
import { useTheme } from 'next-themes'
import { create } from 'zustand'
import { persist } from 'zustand/middleware'

type AppearanceStore = {
  theme: Theme
  themeMode: ThemeMode
  fontSize: FontSize
  fontFamily: FontFamily
  buttonVariant: ButtonVariant
  language: Language
  panelHeight: number
  setTheme: (theme: Theme) => void
  setThemeMode: (mode: ThemeMode) => void
  setFontSize: (size: FontSize) => void
  setFontFamily: (font: FontFamily) => void
  setButtonVariant: (variant: ButtonVariant) => void
  setLanguage: (language: Language) => void
  setPanelHeight: (height: number) => void
}

const useStore = create<AppearanceStore>()(
  persist(
    set => ({
      theme: 'theme-default',
      themeMode: 'light',
      fontSize: 'medium',
      fontFamily: 'sans',
      buttonVariant: 'default',
      language: 'en',
      panelHeight: 150,
      setTheme: theme => {
        set({ theme })
        const html = document.documentElement;
        for (const cls of html.classList) {
          if (cls.startsWith('theme-')) {
            html.classList.remove(cls);
          }
        }
        html.classList.add(theme);
        window.api.appearance.set('theme', theme)
      },
      setThemeMode: (mode: any) => {
        const html = document.documentElement;
        html.classList.remove('dark', 'light');
        html.classList.add(mode);
        document.documentElement.setAttribute('data-theme-mode', mode)
        set({ themeMode: mode })
        window.api.appearance.set('themeMode', mode)
      },
      setFontSize: size => {
        document.documentElement.setAttribute('data-font-size', size)
        set({ fontSize: size })
        window.api.appearance.set('fontSize', size)
      },
      setFontFamily: font => {
        document.documentElement.setAttribute('data-font-family', font)
        set({ fontFamily: font })
        window.api.appearance.set('fontFamily', font)
      },
      setButtonVariant: variant => {
        document.documentElement.setAttribute('data-button-variant', variant)
        set({ buttonVariant: variant })
        window.api.appearance.set('buttonVariant', variant)
      },
      setLanguage: language => {
        set({ language })
        window.api.appearance.set('language', language)
      },
      setPanelHeight: height => {
        set({ panelHeight: height })
        window.api.appearance.set('panelHeight', height)
      },
    }),
    {
      name: 'ui-settings',
    }
  )
)

export const useAppearanceStore = () => {
  const { setTheme } = useTheme()
  const store = useStore()
  const setThemeWrapper = (theme: Theme) => {
    setTheme(theme)
    store.setTheme(theme)
  }
  return { ...store, setTheme: setThemeWrapper }
}

export const useButtonVariant = () => useStore(state => state.buttonVariant)
export const usePanelHeight = () => useStore(state => state.panelHeight)
