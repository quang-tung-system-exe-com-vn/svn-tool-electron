import { Route } from 'react-router-dom'

import { Router } from 'lib/electron-router-dom'

import { useEffect } from 'react'
import { useAppearanceStore } from '../components/stores/useAppearanceStore'
import i18n from '../lib/i18n'
import { MainPage } from '../pages/MainPage'

export function AppRoutes() {
  const { theme, fontSize, fontFamily, buttonVariant, language, setTheme, setLanguage } = useAppearanceStore()
  useEffect(() => {
    setTheme(theme)
    document.documentElement.setAttribute('data-font-size', fontSize)
    document.documentElement.setAttribute('data-font-family', fontFamily)
    document.documentElement.setAttribute('data-button-variant', buttonVariant)
    setLanguage(language)
    i18n.changeLanguage(language)
  }, [theme, fontSize, fontFamily, buttonVariant, language])
  return <Router main={<Route path="/" element={<MainPage />} />} />
}
