import './lib/i18n'
import ReactDom from 'react-dom/client'

import { ThemeProvider } from '@/components/provider/ThemeProvider'
import { Toaster } from '@/components/ui/sonner'
import { AppRoutes } from './routes/routes'

import './globals.css'

ReactDom.createRoot(document.querySelector('app') as HTMLElement).render(
  // <React.StrictMode>
  <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
    <AppRoutes />
    <Toaster position="bottom-center" />
  </ThemeProvider>
  // </React.StrictMode>
)
