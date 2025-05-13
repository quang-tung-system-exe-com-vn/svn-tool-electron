import { Navigate, Route, HashRouter as Router, Routes } from 'react-router-dom'

import { useEffect } from 'react'
import i18n from '../lib/i18n'
import { CheckCodingRules } from '../pages/checkcodingrule/CheckCodingRules'
import { CommitMessageHistory } from '../pages/commitmessagehistory/CommitMessageHistory'
import { CodeDiffViewer } from '../pages/diffviewer/CodeDiffViewer'
import { MainPage } from '../pages/main/MainPage'
import { MergeSvn } from '../pages/mergesvn/MergeSvn'
import { ShowLog } from '../pages/showlog/ShowLog'
import { SpotBugs } from '../pages/spotbugs/SpotBugs'
import { useAppearanceStore } from '../stores/useAppearanceStore'

export function AppRoutes() {
  const { theme, themeMode, fontSize, fontFamily, buttonVariant, language, setTheme, setThemeMode, setLanguage } = useAppearanceStore()
  useEffect(() => {
    setTheme(theme)
    setThemeMode(themeMode)
    document.documentElement.setAttribute('data-font-size', fontSize)
    document.documentElement.setAttribute('data-font-family', fontFamily)
    document.documentElement.setAttribute('data-button-variant', buttonVariant)
    setLanguage(language)
    i18n.changeLanguage(language)
  }, [theme, themeMode, fontSize, fontFamily, buttonVariant, language])
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Navigate to="/main" replace />} />
        <Route path="/main" element={<MainPage />} />
        <Route path="/code-diff-viewer" element={<CodeDiffViewer />} />
        <Route path="/show-log" element={<ShowLog />} />
        <Route path="/spotbugs" element={<SpotBugs />} />
        <Route path="/check-coding-rules" element={<CheckCodingRules />} />
        <Route path="/commit-message-history" element={<CommitMessageHistory />} />
        <Route path="/merge-svn" element={<MergeSvn />} />
      </Routes>
    </Router>
  )
}
