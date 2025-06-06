import ReactDom from 'react-dom/client'
import './lib/i18n'

import { ThemeProvider } from '@/components/provider/ThemeProvider'
import { Toaster } from '@/components/ui/sonner'
import { AppRoutes } from './routes/routes'

import './fonts.css'
import './globals.css'

ReactDom.createRoot(document.querySelector('app') as HTMLElement).render(
  // <React.StrictMode>
  <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
    <AppRoutes />
    <Toaster position="top-center" />
  </ThemeProvider>
  // </React.StrictMode>
)
