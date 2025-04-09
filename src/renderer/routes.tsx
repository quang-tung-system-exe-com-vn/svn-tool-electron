import { Route } from "react-router-dom";

import { Router } from "lib/electron-router-dom";

// import { MainScreen } from './screens/main'
import { MainPage } from "./pages/MainPage";
import { useEffect } from "react";
import { useUISettings } from "./components/shared/UISettings";
import i18n from "./lib/i18n";

export function AppRoutes() {
  const {
    theme,
    fontSize,
    fontFamily,
    buttonVariant,
    language,
    setTheme,
    setLanguage,
  } = useUISettings();
  useEffect(() => {
    setTheme(theme);
    document.documentElement.setAttribute("data-font-size", fontSize);
    document.documentElement.setAttribute("data-font-family", fontFamily);
    document.documentElement.setAttribute("data-button-variant", buttonVariant);
    setLanguage(language);
    i18n.changeLanguage(language);
  }, [theme, fontSize, fontFamily, buttonVariant, language]);
  return <Router main={<Route path="/" element={<MainPage />} />} />;
}
