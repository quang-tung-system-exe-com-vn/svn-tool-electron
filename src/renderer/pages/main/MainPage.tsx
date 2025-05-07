'use client'
import { LANGUAGES } from '@/components/shared/constants'
import { JoyrideTooltip } from '@/components/tooltips/joyride-tooltip'
import { GlowLoader } from '@/components/ui-elements/GlowLoader'
import { OverlayLoader } from '@/components/ui-elements/OverlayLoader'
import toast from '@/components/ui-elements/Toast'
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from '@/components/ui/resizable'
import { Switch } from '@/components/ui/switch'
import { Textarea } from '@/components/ui/textarea'
import { DataTable } from '@/pages/main/DataTable'
import { TitleBar } from '@/pages/main/TitleBar'
import logger from '@/services/logger'
import { useAppearanceStore, useButtonVariant } from '@/stores/useAppearanceStore'
import { useHistoryStore } from '@/stores/useHistoryStore'
import { motion } from 'framer-motion'
import { Bug, CheckCircle, CircleAlert, Languages, Palette, PlayCircle, SendHorizontal, Sparkles } from 'lucide-react' // Added icons
import { IPC } from 'main/constants'
import type { Language } from 'main/store/AppearanceStore'
import { useCallback, useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import Joyride, { type CallBackProps, STATUS, type Step } from 'react-joyride'

export function MainPage() {
  const { language, setLanguage } = useAppearanceStore()
  const { t } = useTranslation()
  const variant = useButtonVariant()
  const { addHistory } = useHistoryStore()
  const [isLoadingGenerate, setLoadingGenerate] = useState(false)
  const [isLoadingCommit, setLoadingCommit] = useState(false)
  const tableRef = useRef<any>(null)
  const commitMessageRef = useRef<HTMLTextAreaElement>(null)
  const referenceIdRef = useRef<HTMLInputElement>(null)
  const commitMessage = useRef('')
  const referenceId = useRef('')
  const isAnyLoading = isLoadingGenerate || isLoadingCommit
  const [runTour, setRunTour] = useState(false)
  const [showWelcomeDialog, setShowWelcomeDialog] = useState(false)
  const [hasCompletedTour, setHasCompletedTour] = useState(false)
  const [showTourIconForLastStep, setShowTourIconForLastStep] = useState(false)

  const { themeMode, setThemeMode } = useAppearanceStore()
  const [isDarkMode, setIsDarkMode] = useState(themeMode === 'dark')

  useEffect(() => {
    setIsDarkMode(themeMode === 'dark')
  }, [themeMode])

  const handleDarkModeToggle = (checked: boolean) => {
    setIsDarkMode(checked)
    const newMode = checked ? 'dark' : 'light'
    setThemeMode(newMode)
    const html = document.documentElement
    html.classList.remove('dark', 'light')
    html.classList.add(newMode)
  }

  const steps: Step[] = [
    {
      target: '#settings-button',
      content: t('joyride.titlebar.settings'),
      disableBeacon: true,
    },
    {
      target: '#about-button',
      content: t('joyride.titlebar.about'),
    },
    {
      target: '#support-button',
      content: t('joyride.titlebar.support'),
    },
    {
      target: '#history-button',
      content: t('joyride.titlebar.history'),
    },
    {
      target: '#app-update-button',
      content: t('joyride.titlebar.appUpdate'),
    },
    {
      target: '#svn-update-button',
      content: t('joyride.titlebar.svnUpdate'),
    },
    {
      target: '#svn-clean-button',
      content: t('joyride.titlebar.svnClean'),
    },
    {
      target: '#svn-log-button',
      content: t('joyride.titlebar.svnLog'),
    },
    {
      target: '#changed-files-table',
      content: t('joyride.main.step1'),
      disableBeacon: true,
    },
    {
      target: '#reference-id-input',
      content: t('joyride.main.referenceId'),
    },
    {
      target: '#commit-message-area',
      content: t('joyride.main.step2'),
    },
    {
      target: '#generate-button',
      content: t('joyride.main.step3'),
    },
    {
      target: '#check-button',
      content: t('joyride.main.step4'),
    },
    {
      target: '#spotbugs-button',
      content: t('joyride.main.step5'),
    },
    {
      target: '#commit-button',
      content: t('joyride.main.step6'),
    },
    {
      target: '#start-tour-button',
      content: t('joyride.titlebar.startTour'),
      disableBeacon: true,
    },
  ]

  const handleJoyrideCallback = useCallback((data: CallBackProps) => {
    const { status, type, action, index, size } = data
    const finishedStatuses: string[] = [STATUS.FINISHED, STATUS.SKIPPED]
    if (index === size - 2) {
      setShowTourIconForLastStep(true)
    } else if (index < size - 2) {
      setShowTourIconForLastStep(false)
    }
    if (finishedStatuses.includes(status)) {
      setRunTour(false)
      localStorage.setItem('has-completed-tour', 'true')
      setHasCompletedTour(true)
      setShowWelcomeDialog(false)
      setShowTourIconForLastStep(false)
    }
  }, [])

  const handleCommitMessage = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    commitMessage.current = e.target.value
  }

  const handleReferenceId = (e: React.ChangeEvent<HTMLInputElement>) => {
    referenceId.current = e.target.value
  }

  const generateCommitMessage = async () => {
    const selectedRows = tableRef.current.table?.getSelectedRowModel().rows ?? []
    const selectedFiles = selectedRows.map((row: { original: { filePath: any; status: any } }) => ({
      filePath: row.original.filePath,
      status: row.original.status,
    }))
    if (selectedFiles.length === 0) {
      toast.warning(t('message.noFilesWarning'))
      return
    }
    const languageName = LANGUAGES.find(lang => lang.code === language)?.label || 'English'
    setLoadingGenerate(true)
    const result = await window.api.svn.get_diff(selectedFiles)
    const { status, message, data } = result
    if (status === 'success') {
      const diffContent = data.diffContent ? data.diffContent : 'No modifications found.'
      const deletedFilesList = data.deletedFiles?.length > 0 ? data.deletedFiles.map((f: any) => `- ${f}`).join('\n') : []
      const params = {
        type: 'GENERATE_COMMIT',
        values: {
          diff_content: diffContent,
          language: languageName,
          deletedFiles: deletedFilesList,
        },
      }
      const openai_result = await window.api.openai.send_message(params)
      if (commitMessageRef.current) {
        commitMessageRef.current.value = openai_result
        logger.info(commitMessageRef.current.value)
      }
      addHistory({ message: openai_result, date: new Date().toISOString() })
      toast.success(t('toast.generateSuccess'))
      setLoadingGenerate(false)
    } else {
      toast.error(message)
      if (commitMessageRef.current) {
        commitMessageRef.current.value = message ?? ''
      }
      setLoadingGenerate(false)
    }
  }

  const checkViolations = async () => {
    const selectedRows = tableRef.current.table?.getSelectedRowModel().rows ?? []
    const selectedFiles = selectedRows.map((row: { original: { filePath: any; status: any } }) => ({
      filePath: row.original.filePath,
      status: row.original.status,
    }))
    window.api.electron.send(IPC.WINDOW.CHECK_CODING_RULES, selectedFiles)
  }

  const commitCode = async () => {
    if (!commitMessageRef.current?.value) {
      toast.warning(t('message.commitMessageWarning'))
      return
    }
    const selectedRows = tableRef.current.table?.getSelectedRowModel().rows ?? []
    const selectedFiles = selectedRows.map((row: { original: { filePath: any; status: any } }) => ({
      filePath: row.original.filePath,
      status: row.original.status,
    }))
    if (selectedFiles.length === 0) {
      toast.warning(t('message.noFilesWarning'))
      return
    }

    // Tạo commit message với reference id
    const refId = referenceIdRef.current?.value || ''
    const finalCommitMessage = refId ? `${refId}\n${commitMessageRef.current?.value}` : commitMessageRef.current?.value

    setLoadingCommit(true)
    const result = await window.api.svn.commit(finalCommitMessage, '', selectedFiles)
    const { status, message } = result

    if (status === 'success') {
      setLoadingCommit(false)
      toast.success(t('toast.commitSuccess'))
      if (tableRef.current) {
        tableRef.current.reloadData()
        setTimeout(() => {
          tableRef.current.table.toggleAllPageRowsSelected(false)
        }, 0)
      }
      if (commitMessageRef.current) {
        commitMessageRef.current.value = ''
      }
      if (referenceIdRef.current) {
        referenceIdRef.current.value = ''
        referenceId.current = ''
      }
    } else {
      toast.error(message)
      setLoadingCommit(false)
    }
  }

  const openWelcomeDialogAgain = () => {
    localStorage.setItem('has-completed-tour', 'false')
    setHasCompletedTour(false)
    setShowWelcomeDialog(true)
  }

  useEffect(() => {
    const completed = localStorage.getItem('has-completed-tour') === 'true'
    setHasCompletedTour(completed)
    if (!completed) {
      const timer = setTimeout(() => {
        setShowWelcomeDialog(true)
      }, 500)
      return () => clearTimeout(timer)
    }
  }, [])

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault()
        event.stopPropagation()
      }
    }
    window.addEventListener('keydown', handleKeyDown, true)
    return () => {
      window.removeEventListener('keydown', handleKeyDown, true)
    }
  }, [])

  return (
    <div className="flex h-screen w-full">
      {/* Main Content */}
      <div className="flex flex-col flex-1 w-full">
        {/* Title Bar */}
        <TitleBar
          isLoading={isLoadingGenerate || isLoadingCommit}
          onTourIconClick={openWelcomeDialogAgain}
          hasCompletedTour={hasCompletedTour}
          showTourIconForLastStep={showTourIconForLastStep} // Pass new state
        />
        {/* Content */}
        <div className="p-4 space-y-4 flex-1 flex flex-col">
          <ResizablePanelGroup direction="vertical" className="rounded-md border">
            <ResizablePanel id="changed-files-table" minSize={25} defaultSize={50}>
              <DataTable ref={tableRef} />
            </ResizablePanel>
            <ResizableHandle />
            <ResizablePanel className="p-2 mb-[20px]" minSize={25} defaultSize={50}>
              <div className="relative overflow-hidden h-full flex flex-col">
                <div className="mb-2">
                  <Input
                    id="reference-id-input"
                    placeholder={t('placeholder.referenceId')}
                    className="w-100"
                    onChange={handleReferenceId}
                    ref={referenceIdRef}
                    spellCheck={false}
                  />
                </div>
                <div className="h-full relative">
                  <OverlayLoader isLoading={isLoadingGenerate} />
                  <Textarea
                    id="commit-message-area"
                    placeholder={t('placeholder.commitMessage')}
                    className="w-full h-full flex-1 resize-none"
                    onChange={handleCommitMessage}
                    ref={commitMessageRef}
                    spellCheck={false}
                  />
                </div>
              </div>
              <span className="absolute flex flex-row text-xs py-[5px] gap-2">
                <CircleAlert className="w-4 h-4 text-yellow-600 dark:text-yellow-400" />
                {t('message.aiContentWarning')}
              </span>
            </ResizablePanel>
          </ResizablePanelGroup>

          {/* Footer Buttons */}
          <div className="flex justify-center gap-2">
            <Button
              id="generate-button"
              className={`relative ${isLoadingGenerate ? 'border-effect' : ''} ${isAnyLoading ? 'cursor-progress' : ''}`}
              variant={variant}
              onClick={() => {
                if (!isAnyLoading) {
                  generateCommitMessage()
                }
              }}
            >
              {isLoadingGenerate ? <GlowLoader /> : <Sparkles className="h-4 w-4" />} {t('common.generate')}
            </Button>

            <Button
              id="check-button"
              className={`relative ${isAnyLoading ? 'cursor-progress' : ''}`}
              variant={variant}
              onClick={() => {
                if (!isAnyLoading) {
                  checkViolations()
                }
              }}
            >
              <CheckCircle className="h-4 w-4" /> {t('common.check')}
            </Button>
            <Button
              id="spotbugs-button"
              className={`relative ${isAnyLoading ? 'cursor-progress' : ''}`}
              variant={variant}
              onClick={() => {
                if (!isAnyLoading) {
                  const selectedRows = tableRef.current.table?.getSelectedRowModel().rows ?? []
                  const selectedFiles = selectedRows
                    .filter((row: any) => {
                      const filePath = row.original.filePath
                      return filePath.endsWith('.java')
                    })
                    .map((row: any) => row.original.filePath)
                  if (selectedFiles.length === 0) {
                    toast.warning(t('toast.leastOneJavaFile'))
                    return
                  }
                  window.api.electron.send(IPC.WINDOW.SPOTBUGS, selectedFiles)
                }
              }}
            >
              <Bug className="h-4 w-4" /> {t('SpotBugs')}
            </Button>
            <Button
              id="commit-button"
              className={`relative ${isLoadingCommit ? 'border-effect' : ''} ${isAnyLoading ? 'cursor-progress' : ''}`}
              variant={variant}
              onClick={() => {
                if (!isAnyLoading) {
                  commitCode()
                }
              }}
            >
              {isLoadingCommit ? <GlowLoader /> : <SendHorizontal className="h-4 w-4" />} {t('common.commit')}
            </Button>
          </div>
        </div>
        <Joyride
          steps={steps}
          run={runTour}
          continuous
          showSkipButton
          disableCloseOnEsc={true}
          callback={handleJoyrideCallback}
          spotlightPadding={-0.5}
          styles={{
            options: {
              arrowColor: 'var(--card)',
              backgroundColor: 'var(--card)',
              overlayColor: 'rgba(0, 0, 0, 0.5)',
              primaryColor: 'var(--primary)',
              spotlightShadow: '0 0 0 2px var(--primary)',
              textColor: 'var(--card-foreground)',
              zIndex: 10000,
            },
            tooltip: {
              borderRadius: 'calc(var(--radius) - 2px)',
              boxShadow: '0px 4px 16px rgba(0,0,0,0.1)',
            },
            tooltipContainer: {
              fontSize: '0.875rem',
              textAlign: 'left',
            },
            tooltipContent: {},
            tooltipTitle: {},
            tooltipFooter: {},
            buttonNext: {
              backgroundColor: 'var(--primary)',
              color: 'var(--primary-foreground)',
              borderRadius: 'calc(var(--radius) - 2px)',
              fontSize: '0.875rem',
            },
            buttonBack: {
              color: 'var(--secondary-foreground)',
              borderRadius: 'calc(var(--radius) - 2px)',
              fontSize: '0.875rem',
              marginRight: '0.5rem',
            },
            buttonSkip: {
              color: 'var(--muted-foreground)',
              borderRadius: 'calc(var(--radius) - 2px)',
              fontSize: '0.875rem',
            },
            buttonClose: {
              borderRadius: 'calc(var(--radius) - 2px)',
              color: 'var(--muted-foreground)',
            },
            spotlight: {
              borderRadius: 'calc(var(--radius) - 2px)',
              boxShadow: '0 0 20px rgba(0, 0, 0, 0.5)',
            },
            overlay: {},
            overlayLegacy: {},
            overlayLegacyCenter: {},
            beacon: {
              width: 25,
              height: 25,
            },
            beaconInner: {},
            beaconOuter: {},
            tooltipFooterSpacer: {},
          }}
          locale={{
            back: t('common.back'),
            close: t('common.close'),
            last: t('common.finish'),
            next: t('common.next'),
            skip: t('common.skip'),
          }}
          tooltipComponent={JoyrideTooltip}
        />
        {/* Welcome Dialog */}
        <AlertDialog open={showWelcomeDialog} onOpenChange={setShowWelcomeDialog}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle className="text-center text-xl font-semibold">{t('welcome.title')}</AlertDialogTitle>
            </AlertDialogHeader>
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.5, ease: 'easeOut' }}
              className="flex flex-col items-center gap-4 my-4"
            >
              <div className="w-24 h-24">
                <img src="logo.png" alt="App Logo" className="w-full h-full object-contain dark:brightness-125" />
              </div>

              <div className="flex flex-col sm:flex-row items-center justify-center gap-10">
                {/* Language Switcher */}
                <div className="flex items-center gap-2 rounded-md border px-4 pr-1 h-[40px]">
                  <Languages className="w-4 h-4 text-muted-foreground" />
                  {LANGUAGES.map(lang => (
                    <Button
                      key={lang.code}
                      variant={language === lang.code ? 'secondary' : 'ghost'}
                      size="sm"
                      onClick={() => setLanguage(lang.code as Language)}
                      aria-label={`Switch to ${lang.label}`}
                    >
                      {lang.code === 'en' && <div className="emoji">🇬🇧</div>}
                      {lang.code === 'ja' && <div className="emoji">🇯🇵</div>}
                      {lang.code === 'vi' && <div className="emoji">🇻🇳</div>}
                    </Button>
                  ))}
                </div>

                {/* Dark Mode Switch */}
                <div className="flex items-center gap-2 rounded-md border px-4 py-1 h-[40px]">
                  <Palette className="w-4 h-4 text-muted-foreground" />
                  <Switch id="dark-mode-tooltip" checked={isDarkMode} onCheckedChange={handleDarkModeToggle} />
                </div>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2, duration: 0.4 }}
              className="text-sm text-muted-foreground text-center py-4"
            >
              {t('welcome.description')}
            </motion.div>
            <AlertDialogFooter>
              <AlertDialogCancel
                onClick={() => {
                  localStorage.setItem('has-completed-tour', 'true')
                  setHasCompletedTour(true)
                  setShowWelcomeDialog(false)
                }}
              >
                {t('common.close')}
              </AlertDialogCancel>
              <AlertDialogAction
                onClick={() => {
                  setShowWelcomeDialog(false)
                  setTimeout(() => {
                    setRunTour(true)
                  }, 100)
                }}
              >
                <PlayCircle className="h-4 w-4 mr-2" />
                {t('common.startTour')}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  )
}
