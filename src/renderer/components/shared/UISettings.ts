import { create } from "zustand";
import { persist } from "zustand/middleware";
import { useTheme } from "next-themes";

export type Theme = "light" | "dark" | "system";
export type FontSize = "small" | "medium" | "large";
export type FontFamily = "sans" | "serif" | "mono";
export type ButtonVariant =
  | "default"
  | "outline"
  | "ghost"
  | "link"
  | "destructive"
  | "secondary";
export type Language = "en" | "vi" | "ja";

interface UISettings {
  theme: Theme;
  fontSize: FontSize;
  fontFamily: FontFamily;
  buttonVariant: ButtonVariant;
  language: Language;
  panelHeight: number;
  setTheme: (theme: Theme) => void;
  setFontSize: (size: FontSize) => void;
  setFontFamily: (font: FontFamily) => void;
  setButtonVariant: (variant: ButtonVariant) => void;
  setLanguage: (language: Language) => void;
  setPanelHeight: (height: number) => void;
}

const useStore = create<UISettings>()(
  persist(
    (set) => ({
      theme: "system",
      fontSize: "medium",
      fontFamily: "sans",
      buttonVariant: "default",
      language: "en",
      panelHeight: 150,
      setTheme: (theme) => set({ theme }),
      setFontSize: (size) => {
        document.documentElement.setAttribute("data-font-size", size);
        set({ fontSize: size });
      },
      setFontFamily: (font) => {
        document.documentElement.setAttribute("data-font-family", font);
        set({ fontFamily: font });
      },
      setButtonVariant: (variant) => {
        document.documentElement.setAttribute("data-button-variant", variant);
        set({ buttonVariant: variant });
      },
      setLanguage: (language) => set({ language }),
      setPanelHeight: (height) => {
        set({ panelHeight: height });
      },
    }),
    {
      name: "ui-settings",
    }
  )
);

export const useUISettings = () => {
  const { setTheme } = useTheme();
  const store = useStore();
  const setThemeWrapper = (theme: Theme) => {
    setTheme(theme);
    store.setTheme(theme);
  };
  return { ...store, setTheme: setThemeWrapper };
};

export const useButtonVariant = () => useStore((state) => state.buttonVariant);
export const usePanelHeight = () => useStore((state) => state.panelHeight);
