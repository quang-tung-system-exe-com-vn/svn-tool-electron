import './lib/i18n'
import ReactDom from 'react-dom/client'
import React from 'react'

import { AppRoutes } from './routes/routes'
import { ThemeProvider } from '@/components/provider/ThemeProvider'
import { Toaster } from '@/components/ui/sonner'

import './globals.css'

ReactDom.createRoot(document.querySelector('app') as HTMLElement).render(
  <React.StrictMode>
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
      <AppRoutes />
      <Toaster />
    </ThemeProvider>
  </React.StrictMode>
)
