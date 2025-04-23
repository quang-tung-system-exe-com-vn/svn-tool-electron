import Store from 'electron-store'

export type Theme = 'theme-default' | 'theme-nord' | 'theme-dracula' | 'theme-solarized' | 'theme-github' | 'theme-monokai' | 'theme-material' | 'theme-gruvbox' | 'theme-catppuccin' | 'theme-tokyo-night' | 'theme-rose-pine'
export type ThemeMode = 'system' | 'light' | 'dark'
export type FontSize = 'small' | 'medium' | 'large'
export type FontFamily = 'sans' | 'serif' | 'mono' | 'roboto' | 'open-sans' | 'lato' | 'montserrat' | 'poppins' | 'raleway' | 'nunito' | 'playfair' | 'merriweather' | 'fira-code' | 'source-code-pro' | 'ubuntu'
export type ButtonVariant = 'default' | 'outline' | 'ghost' | 'link' | 'destructive' | 'secondary'
export type Language = 'en' | 'vi' | 'ja'

export type AppearanceSchema = {
  theme: Theme
  themeMode: ThemeMode
  fontSize: FontSize
  fontFamily: FontFamily
  buttonVariant: ButtonVariant
  language: Language
  panelHeight: number
}

const appearanceStore = new Store<AppearanceSchema>({
  name: 'appearance-settings',
  defaults: {
    theme: 'theme-default',
    themeMode: 'system',
    fontSize: 'medium',
    fontFamily: 'sans',
    buttonVariant: 'default',
    language: 'en',
    panelHeight: 150,
  },
})

export default appearanceStore
