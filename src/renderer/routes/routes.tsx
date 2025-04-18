import { Navigate, Route, HashRouter as Router, Routes } from 'react-router-dom'

import { useEffect } from 'react'
import { CheckCodingRules } from '../components/checkcodingrule/CheckCodingRules'
import { CodeDiffViewer } from '../components/diffviewer/CodeDiffViewer'
import { ShowLog } from '../components/showlog/ShowLog'
import { SpotBugs } from '../components/spotbugs/SpotBugs'
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
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Navigate to="/main" replace />} />
        <Route path="/main" element={<MainPage />} />
        <Route path="/code-diff-viewer" element={<CodeDiffViewer />} />
        <Route path="/show-log" element={<ShowLog />} />
        <Route path="/spotbugs" element={<SpotBugs />} />
        <Route path="/check-coding-rules" element={<CheckCodingRules />} />
      </Routes>
    </Router>
  )
}
