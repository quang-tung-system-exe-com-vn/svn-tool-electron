import Store from 'electron-store'

export type Theme = 'light' | 'dark' | 'system'
export type FontSize = 'small' | 'medium' | 'large'
export type FontFamily = 'sans' | 'serif' | 'mono'
export type ButtonVariant = 'default' | 'outline' | 'ghost' | 'link' | 'destructive' | 'secondary'
export type Language = 'en' | 'vi' | 'ja'

export type AppearanceSchema = {
  theme: Theme
  fontSize: FontSize
  fontFamily: FontFamily
  buttonVariant: ButtonVariant
  language: Language
  panelHeight: number
}

const appearanceStore = new Store<AppearanceSchema>({
  name: 'appearance-settings',
  defaults: {
    theme: 'system',
    fontSize: 'medium',
    fontFamily: 'sans',
    buttonVariant: 'default',
    language: 'en',
    panelHeight: 150,
  },
})

export default appearanceStore
