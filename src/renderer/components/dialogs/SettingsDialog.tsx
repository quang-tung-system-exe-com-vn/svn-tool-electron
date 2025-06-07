'use client'
import toast from '@/components/ui-elements/Toast'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import logger from '@/services/logger'
import {
  ALargeSmall,
  Bell,
  Cloud,
  Database,
  FileCode,
  Folder,
  HelpCircle,
  KeyRound,
  Languages,
  LayoutGrid,
  Lock,
  Mail,
  Network,
  Palette,
  Pencil,
  Plus,
  RefreshCw,
  Settings,
  Trash2,
  TypeOutline,
  User,
  Webhook,
} from 'lucide-react'
import type { Theme } from 'main/store/AppearanceStore'
import { useCallback, useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import Joyride, { ACTIONS, type CallBackProps, STATUS, type Step } from 'react-joyride'

import { useAppearanceStore } from '../../stores/useAppearanceStore'
import { useCodingRuleStore } from '../../stores/useCodingRuleStore'
import { useConfigurationStore } from '../../stores/useConfigurationStore'
import { useMailServerStore } from '../../stores/useMailServerStore'
import { useSourceFolderStore } from '../../stores/useSourceFolderStore'
import { useWebhookStore } from '../../stores/useWebhookStore'
import { BUTTON_VARIANTS, FONT_FAMILIES, FONT_SIZES, LANGUAGES, THEMES } from '../shared/constants'
import { JoyrideTooltip } from '../tooltips/joyride-tooltip'
import { AddOrEditCodingRuleDialog } from './AddOrEditCodingRuleDialog'
import { AddOrEditSourceFolderDialog } from './AddOrEditSourceFolderDialog'
import { AddOrEditWebhookDialog } from './AddOrEditWebhookDialog'

interface SettingsDialogProps {
  open?: boolean
  onOpenChange?: (open: boolean) => void
}

export function SettingsDialog({ open, onOpenChange }: SettingsDialogProps) {
  const { theme, setTheme, themeMode, setThemeMode, fontSize, setFontSize, fontFamily, setFontFamily, buttonVariant, setButtonVariant, language, setLanguage } =
    useAppearanceStore()
  const [isDarkMode, setIsDarkMode] = useState(document.documentElement.classList.contains('dark'))
  const { t, i18n } = useTranslation()

  const {
    openaiApiKey,
    svnFolder,
    sourceFolder,
    emailPL,
    webhookMS,
    codingRule,
    oneDriveClientId,
    oneDriveClientSecret,
    oneDriveRefreshToken,
    startOnLogin,
    showNotifications,
    enableMailNotification,
    enableTeamsNotification,
    setFieldConfiguration,
    saveConfigurationConfig,
    loadConfigurationConfig,
  } = useConfigurationStore()

  const { smtpServer, port, email, password, setFieldMailServer, saveMailServerConfig, loadMailServerConfig } = useMailServerStore()
  const { webhookList, loadWebhookConfig, addWebhook, deleteWebhook, updateWebhook } = useWebhookStore()
  const { codingRuleList, loadCodingRuleConfig, addCodingRule, deleteCodingRule, updateCodingRule } = useCodingRuleStore()
  const { sourceFolderList, loadSourceFolderConfig, addSourceFolder, deleteSourceFolder, updateSourceFolder } = useSourceFolderStore()
  const [webhookDialogOpen, setWebhookDialogOpen] = useState(false)
  const [editWebhookDialogOpen, setEditWebhookDialogOpen] = useState(false)
  const [codingRuleDialogOpen, setCodingRuleDialogOpen] = useState(false)
  const [editCodingRuleDialogOpen, setEditCodingRuleDialogOpen] = useState(false)
  const [sourceFolderDialogOpen, setSourceFolderDialogOpen] = useState(false)
  const [editSourceFolderDialogOpen, setEditSourceFolderDialogOpen] = useState(false)
  const [webhookName, setWebhookName] = useState('')
  const [webhookUrl, setWebhookUrl] = useState('')
  const [codingRuleName, setCodingRuleName] = useState('')
  const [codingRuleContent, setCodingRuleContent] = useState('')
  const [sourceFolderName, setSourceFolderName] = useState('')
  const [sourceFolderPath, setSourceFolderPath] = useState('')
  const [runTour, setRunTour] = useState(false)
  const [steps, setTourSteps] = useState<Step[]>([])
  const [activeTab, setActiveTab] = useState('appearance')

  useEffect(() => {
    if (language && i18n.language !== language) {
      i18n.changeLanguage(language)
    }
  }, [language, i18n])

  useEffect(() => {
    if (open) {
      loadWebhookConfig()
      loadCodingRuleConfig()
      loadConfigurationConfig()
      loadMailServerConfig()
      loadSourceFolderConfig()
      setIsDarkMode(themeMode === 'dark')
    }
  }, [open, loadWebhookConfig, loadCodingRuleConfig, loadConfigurationConfig, loadMailServerConfig, loadSourceFolderConfig, themeMode])

  useEffect(() => {
    const tourSteps: Step[] = [
      {
        target: '#settings-tab-appearance',
        content: t('joyride.settings.appearanceTab'),
        placement: 'bottom',
        disableBeacon: true,
      },
      {
        target: '#settings-language-card',
        content: t('joyride.settings.language'),
        placement: 'right',
      },
      {
        target: '#settings-theme-card',
        content: t('joyride.settings.theme'),
        placement: 'right',
      },
      {
        target: '#settings-dark-mode-switch',
        content: t('joyride.settings.darkMode'),
        placement: 'left',
      },
      {
        target: '#settings-font-family-card',
        content: t('joyride.settings.fontFamily'),
        placement: 'left',
      },
      {
        target: '#settings-font-size-card',
        content: t('joyride.settings.fontSize'),
        placement: 'left',
      },
      {
        target: '#settings-button-variant-card',
        content: t('joyride.settings.buttonVariant'),
        placement: 'top',
      },
      {
        target: '#settings-tab-configuration',
        content: t('joyride.settings.configurationTab'),
        placement: 'bottom',
      },
      {
        target: '#settings-openai-key',
        content: t('joyride.settings.openaiApiKey'),
        placement: 'bottom',
      },
      {
        target: '#settings-svn-folder',
        content: t('joyride.settings.svnFolder'),
        placement: 'bottom',
      },
      {
        target: '#settings-source-folder',
        content: t('joyride.settings.sourceFolder'),
        placement: 'bottom',
      },
      {
        target: '#settings-email-pl',
        content: t('joyride.settings.emailPL'),
        placement: 'bottom',
      },
      {
        target: '#settings-webhook-ms',
        content: t('joyride.settings.webhookMS'),
        placement: 'top',
      },
      {
        target: '#settings-start-on-login',
        content: t('joyride.settings.startOnLogin'),
        placement: 'top',
      },
      {
        target: '#settings-show-notifications',
        content: t('joyride.settings.showNotifications'),
        placement: 'top',
      },
      {
        target: '#settings-tab-mailserver',
        content: t('joyride.settings.mailserverTab'),
        placement: 'bottom',
      },
      {
        target: '#settings-smtp-server',
        content: t('joyride.settings.smtpServer'),
        placement: 'bottom',
      },
      {
        target: '#settings-port',
        content: t('joyride.settings.port'),
        placement: 'bottom',
      },
      {
        target: '#settings-mail-email',
        content: t('joyride.settings.mailEmail'),
        placement: 'bottom',
      },
      {
        target: '#settings-mail-password',
        content: t('joyride.settings.mailPassword'),
        placement: 'top',
      },
      {
        target: '#settings-tab-onedrive',
        content: t('joyride.settings.onedriveTab'),
        placement: 'bottom',
      },
      {
        target: '#settings-onedrive-client-id',
        content: t('joyride.settings.onedriveClientId'),
        placement: 'bottom',
      },
      {
        target: '#settings-onedrive-client-secret',
        content: t('joyride.settings.onedriveClientSecret'),
        placement: 'bottom',
      },
      {
        target: '#settings-onedrive-refresh-token',
        content: t('joyride.settings.onedriveRefreshToken'),
        placement: 'top',
      },
    ]
    setTourSteps(tourSteps)
  }, [t])

  const handleAddWebhook = async () => {
    if (!webhookName.trim() || !webhookUrl.trim()) {
      return
    }
    const newWebhook = {
      name: webhookName,
      url: webhookUrl,
    }
    const result = await addWebhook(newWebhook)
    if (result) {
      setWebhookName('')
      setWebhookUrl('')
      setWebhookDialogOpen(false)
      setFieldConfiguration('webhookMS', webhookUrl)
    }
  }

  const handleUpdateWebhook = async () => {
    if (!webhookName.trim() || !webhookUrl.trim()) {
      return
    }
    const updatedWebhook = {
      name: webhookName,
      url: webhookUrl,
    }
    const result = await updateWebhook(updatedWebhook)
    if (result) {
      setEditWebhookDialogOpen(false)
    }
  }

  const handleAddCodingRule = async () => {
    if (!codingRuleName.trim() || !codingRuleContent.trim()) {
      return
    }
    const newCodingRule = {
      name: codingRuleName,
      content: codingRuleContent,
    }
    const result = await addCodingRule(newCodingRule)
    if (result) {
      setCodingRuleName('')
      setCodingRuleContent('')
      setCodingRuleDialogOpen(false)
      setFieldConfiguration('codingRule', newCodingRule.name)
    }
  }

  const handleUpdateCodingRule = async () => {
    if (!codingRuleName.trim() || !codingRuleContent.trim()) {
      return
    }
    const updatedRule = {
      name: codingRuleName,
      content: codingRuleContent,
    }
    const result = await updateCodingRule(updatedRule)
    if (result) {
      setEditCodingRuleDialogOpen(false)
    }
  }

  const handleDeleteWebhook = async (name: string) => {
    deleteWebhook(name)
    setFieldConfiguration('webhookMS', '')
  }

  const handleDeleteCodingRule = async (name: string) => {
    deleteCodingRule(name)
    setFieldConfiguration('codingRule', '')
  }

  const handleSaveConfigurationConfig = async () => {
    try {
      await saveConfigurationConfig()
      toast.success(t('toast.configSaved'))
    } catch (err) {
      logger.error('Failed to save configuration:', err)
      toast.error(t('toast.configSaveFailed'))
    }
  }

  const handleSaveMailServerConfig = async () => {
    try {
      await saveMailServerConfig()
      toast.success(t('toast.configSaved'))
    } catch (err) {
      logger.error('Failed to save mail server configuration:', err)
      toast.error(t('toast.configSaveFailed'))
    }
  }

  const handleSaveOneDriveConfig = async () => {
    try {
      await saveConfigurationConfig()
      toast.success(t('toast.configSaved'))
    } catch (err) {
      logger.error('Failed to save OneDrive configuration:', err)
      toast.error(t('toast.configSaveFailed'))
    }
  }

  const handleDarkModeToggle = (checked: boolean) => {
    setIsDarkMode(checked)

    const html = document.documentElement
    html.classList.remove('dark', 'light')
    if (checked) {
      html.classList.add('dark')
      setThemeMode('dark')
    } else {
      html.classList.add('light')
      setThemeMode('light')
    }
  }

  const handleJoyrideCallback = useCallback(
    (data: CallBackProps) => {
      const { status, type, step, action } = data
      const finishedStatuses: string[] = [STATUS.FINISHED, STATUS.SKIPPED]
      if (type === 'step:before') {
        if (step.target === '#settings-tab-configuration' && activeTab !== 'configuration') {
          setActiveTab('configuration')
        } else if (step.target === '#settings-tab-mailserver' && activeTab !== 'mailserver') {
          setActiveTab('mailserver')
        } else if (step.target === '#settings-tab-onedrive' && activeTab !== 'onedrive') {
          setActiveTab('onedrive')
        } else if (step.target === '#settings-tab-appearance' && activeTab !== 'appearance') {
          setActiveTab('appearance')
        }
      }
      if (finishedStatuses.includes(status) || action === ACTIONS.CLOSE) {
        setRunTour(false)
      }
    },
    [setActiveTab, activeTab] // Dependencies seem correct
  )

  const startTour = () => {
    setRunTour(true)
  }

  const handleAddSourceFolder = async () => {
    if (!sourceFolderName.trim() || !sourceFolderPath.trim()) {
      return
    }
    const newSourceFolder = {
      name: sourceFolderName,
      path: sourceFolderPath,
    }
    const result = await addSourceFolder(newSourceFolder)
    if (result) {
      setSourceFolderName('')
      setSourceFolderPath('')
      setSourceFolderDialogOpen(false)
      setFieldConfiguration('sourceFolder', sourceFolderPath)
    }
  }

  const handleUpdateSourceFolder = async () => {
    if (!sourceFolderName.trim() || !sourceFolderPath.trim()) {
      return
    }
    const updatedSourceFolder = {
      name: sourceFolderName,
      path: sourceFolderPath,
    }
    const result = await updateSourceFolder(updatedSourceFolder)
    if (result) {
      setEditSourceFolderDialogOpen(false)
    }
  }

  const handleDeleteSourceFolder = async (name: string) => {
    deleteSourceFolder(name)
    setFieldConfiguration('sourceFolder', '')
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <Joyride
        steps={steps}
        run={runTour}
        continuous
        showSkipButton
        disableCloseOnEsc={true}
        callback={handleJoyrideCallback}
        spotlightPadding={0}
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
      <DialogContent onPointerDownOutside={e => e.preventDefault()} onEscapeKeyDown={e => e.preventDefault()} className="sm:max-w-2xl">
        <DialogHeader>
          <div className="flex items-center">
            <DialogTitle>{t('title.settings')}</DialogTitle>
            <Button variant="ghost" size="icon" onClick={startTour} aria-label={t('common.startTour') || 'Start Tour'}>
              <HelpCircle className="h-5 w-5" />
            </Button>
          </div>
          <DialogDescription>{t('settings.description')}</DialogDescription>
        </DialogHeader>
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger id="settings-tab-appearance" value="appearance" className="flex items-center">
              <Palette />
              {t('settings.tab.appearance')}
            </TabsTrigger>
            <TabsTrigger id="settings-tab-configuration" value="configuration" className="flex items-center">
              <Settings />
              {t('settings.tab.configuration')}
            </TabsTrigger>
            <TabsTrigger id="settings-tab-mailserver" value="mailserver" className="flex items-center">
              <Mail />
              {t('settings.tab.mailserver')}
            </TabsTrigger>
            <TabsTrigger id="settings-tab-onedrive" value="onedrive" className="flex items-center">
              <Cloud />
              {t('settings.tab.onedrive') || 'OneDrive'}
            </TabsTrigger>
          </TabsList>

          {/* Appearance Tab */}
          <TabsContent value="appearance">
            <div className="grid grid-cols-2 gap-4 space-y-4">
              {/* Left side */}
              <div className="space-y-4">
                {/* Language Selector */}
                <Card id="settings-language-card" className="gap-2 py-4 rounded-md">
                  <CardHeader>
                    <CardTitle className="flex flex-row gap-2">
                      <Languages className="w-5 h-5" />
                      {t('settings.language')}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <Select value={language} onValueChange={value => setLanguage(value as any)}>
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder={t('settings.selectLanguage')} />
                      </SelectTrigger>
                      <SelectContent>
                        {LANGUAGES.map(({ code, label }) => (
                          <SelectItem key={code} value={code}>
                            {label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </CardContent>
                </Card>

                {/* Theme Selector */}
                <Card id="settings-theme-card" className="gap-2 py-4 rounded-md">
                  <CardHeader>
                    <CardTitle className="flex flex-row gap-2">
                      <Palette className="w-5 h-5" />
                      <div className="flex items-center justify-between w-full">
                        {t('settings.theme')}
                        <div id="settings-dark-mode-switch" className="flex items-center space-x-2">
                          <Label className="cursor-pointer" htmlFor="dark-mode">
                            {t('settings.darkMode')}
                          </Label>
                          <Switch id="dark-mode" checked={isDarkMode} onCheckedChange={handleDarkModeToggle} />
                        </div>
                      </div>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <Select value={theme} onValueChange={value => setTheme(value as Theme)}>
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder={t('settings.selectTheme')} />
                      </SelectTrigger>
                      <SelectContent>
                        {THEMES.map((themeName: string) => (
                          <SelectItem key={themeName} value={themeName}>
                            {themeName
                              .replace(/^theme-/, '')
                              .replace(/-/g, ' ')
                              .replace(/^./, c => c.toUpperCase())}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </CardContent>
                </Card>
              </div>

              {/* Right side */}
              <div className="space-y-4">
                {/* Font Family Selector */}
                <Card id="settings-font-family-card" className="gap-2 py-4 rounded-md">
                  <CardHeader>
                    <CardTitle className="flex flex-row gap-2">
                      <TypeOutline className="w-5 h-5" />
                      {t('settings.fontFamily')}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <Select value={fontFamily} onValueChange={value => setFontFamily(value as any)}>
                      <SelectTrigger className="w-full" style={{ fontFamily: `var(--font-${fontFamily})` }}>
                        <SelectValue placeholder={t('settings.selectFont')} />
                      </SelectTrigger>
                      <SelectContent>
                        {FONT_FAMILIES.map((f: string) => (
                          <SelectItem key={f} value={f} style={{ fontFamily: `var(--font-${f})` }}>
                            {f.charAt(0).toUpperCase() + f.slice(1).replace(/-/g, ' ')}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </CardContent>
                </Card>

                {/* Font Size Selector */}
                <Card id="settings-font-size-card" className="gap-2 py-4 rounded-md">
                  <CardHeader>
                    <CardTitle className="flex flex-row gap-2">
                      <ALargeSmall className="w-5 h-5" />
                      {t('settings.fontSize.title')}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-3 gap-2">
                      {FONT_SIZES.map(size => (
                        <Button
                          key={size}
                          variant={buttonVariant}
                          className={fontSize === size ? 'ring-1 ring-offset-2 ring-primary font-medium' : 'font-normal'}
                          onClick={() => setFontSize(size)}
                        >
                          {t(`settings.fontSize.${size}`)}
                        </Button>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>

            {/* Bottom */}
            {/* Button Variant Selector */}
            <Card id="settings-button-variant-card" className="gap-2 py-4 mb-4 rounded-md">
              <CardHeader>
                <CardTitle>{t('settings.buttonVariant')}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-3 gap-2">
                  {BUTTON_VARIANTS.map(v => (
                    <Button
                      key={v}
                      variant={v}
                      className={buttonVariant === v ? 'ring-1 ring-offset-2 ring-primary font-medium' : 'font-normal'}
                      onClick={() => setButtonVariant(v)}
                    >
                      {v.charAt(0).toUpperCase() + v.slice(1)}
                    </Button>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Configuration Tab */}
          <TabsContent value="configuration">
            <Card className="gap-2 py-4 rounded-md">
              {/* <CardHeader className="pb-2">
                <CardTitle>{t('settings.tab.configuration')}</CardTitle>
                <CardDescription>{t('settings.configuration.description')}</CardDescription>
              </CardHeader> */}
              <CardContent className="space-y-4">
                {/* OpenAI API Key */}
                <div id="settings-openai-key" className="space-y-3">
                  <Label className="flex items-center gap-2">
                    <KeyRound className="w-4 h-4" /> {t('settings.configuration.openaiApiKey')}
                  </Label>
                  <Input
                    type="password"
                    placeholder={t('settings.configuration.openaiApiKeyPlaceholder')}
                    value={openaiApiKey}
                    onChange={e => setFieldConfiguration('openaiApiKey', e.target.value)}
                  />
                </div>

                {/* SVN Folder */}
                <div id="settings-svn-folder" className="space-y-3">
                  <Label className="flex items-center gap-2">
                    <Folder className="w-4 h-4" /> {t('settings.configuration.svnFolder')}
                  </Label>
                  <div className="flex items-center space-x-2">
                    <Input
                      type="text"
                      placeholder={t('settings.configuration.svnFolderPlaceholder')}
                      value={svnFolder}
                      onChange={e => setFieldConfiguration('svnFolder', e.target.value)}
                    />
                    <Button
                      variant={buttonVariant}
                      onClick={async () => {
                        const folder = await window.api.system.select_folder()
                        if (folder) setFieldConfiguration('svnFolder', folder)
                      }}
                    >
                      {t('settings.configuration.chooseFolder')}
                    </Button>
                  </div>
                </div>

                {/* Source Folder */}
                <div id="settings-source-folder" className="space-y-3">
                  <Label className="flex items-center gap-2">
                    <Folder className="w-4 h-4" /> {t('settings.configuration.sourceFolder')}
                  </Label>
                  <div className="flex items-center justify-between gap-2">
                    <Select value={sourceFolder} onValueChange={value => setFieldConfiguration('sourceFolder', value)}>
                      <SelectTrigger className="border rounded-md w-full">
                        <SelectValue placeholder={t('settings.configuration.selectSourceFolder')} />
                      </SelectTrigger>
                      <SelectContent>
                        {sourceFolderList.map(folder => (
                          <SelectItem key={folder.name} value={folder.path}>
                            {folder.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>

                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={() => {
                          setSourceFolderName('')
                          setSourceFolderPath('')
                          setSourceFolderDialogOpen(true)
                        }}
                      >
                        <Plus className="h-4 w-4" />
                      </Button>
                      {sourceFolder && (
                        <>
                          <Button
                            variant="outline"
                            size="icon"
                            onClick={() => {
                              const folder = sourceFolderList.find(f => f.path === sourceFolder)
                              if (folder) {
                                setSourceFolderName(folder.name)
                                setSourceFolderPath(folder.path)
                                setEditSourceFolderDialogOpen(true)
                              }
                            }}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="outline"
                            size="icon"
                            onClick={() => {
                              const folder = sourceFolderList.find(f => f.path === sourceFolder)
                              if (folder) {
                                handleDeleteSourceFolder(folder.name)
                              }
                            }}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Add Source Folder Dialog */}
                  <AddOrEditSourceFolderDialog
                    open={sourceFolderDialogOpen}
                    onOpenChange={setSourceFolderDialogOpen}
                    isEditMode={false}
                    folderName={sourceFolderName}
                    folderPath={sourceFolderPath}
                    setFolderName={setSourceFolderName}
                    setFolderPath={setSourceFolderPath}
                    onAdd={handleAddSourceFolder}
                    onUpdate={() => {}}
                  />
                  {/* Edit Source Folder Dialog */}
                  {editSourceFolderDialogOpen && (
                    <AddOrEditSourceFolderDialog
                      open={editSourceFolderDialogOpen}
                      onOpenChange={setEditSourceFolderDialogOpen}
                      isEditMode={true}
                      folderName={sourceFolderName}
                      folderPath={sourceFolderPath}
                      setFolderName={setSourceFolderName}
                      setFolderPath={setSourceFolderPath}
                      onUpdate={handleUpdateSourceFolder}
                      onAdd={() => {}}
                    />
                  )}
                </div>

                {/* Email PL */}
                <div id="settings-email-pl" className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Label className="flex items-center gap-2">
                      <Mail className="w-4 h-4" /> {t('settings.configuration.emailPL')}
                    </Label>
                    <div className="flex items-center space-x-2">
                      <Label htmlFor="enable-mail-notification" className="cursor-pointer">
                        {t('settings.configuration.receiveMailNotification')}
                      </Label>
                      <Switch
                        id="enable-mail-notification"
                        checked={enableMailNotification}
                        onCheckedChange={checked => setFieldConfiguration('enableMailNotification', checked)}
                      />
                    </div>
                  </div>
                  <Input type="email" placeholder={t('settings.configuration.emailPlaceholder')} value={emailPL} onChange={e => setFieldConfiguration('emailPL', e.target.value)} />
                </div>

                {/* Webhook MS */}
                <div id="settings-webhook-ms" className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Label className="mr-2 flex items-center gap-2">
                      <Webhook className="w-4 h-4" /> {t('settings.configuration.webhookMS')}
                    </Label>
                    <div className="flex items-center space-x-2">
                      <Label htmlFor="enable-teams-notification" className="cursor-pointer">
                        {t('settings.configuration.receiveTeamsNotification')}
                      </Label>
                      <Switch
                        id="enable-teams-notification"
                        checked={enableTeamsNotification}
                        onCheckedChange={checked => setFieldConfiguration('enableTeamsNotification', checked)}
                      />
                    </div>
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    <Select value={webhookMS} onValueChange={value => setFieldConfiguration('webhookMS', value)}>
                      <SelectTrigger className="border rounded-md w-full">
                        <SelectValue placeholder={t('settings.configuration.selectWebhook')} />
                      </SelectTrigger>
                      <SelectContent>
                        {webhookList.map(webhook => (
                          <SelectItem key={webhook.name} value={webhook.url}>
                            {webhook.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>

                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={() => {
                          setWebhookName('')
                          setWebhookUrl('')
                          setWebhookDialogOpen(true)
                        }}
                      >
                        <Plus className="h-4 w-4" />
                      </Button>
                      {webhookMS && (
                        <>
                          <Button
                            variant="outline"
                            size="icon"
                            onClick={() => {
                              const webhook = webhookList.find(w => w.url === webhookMS)
                              if (webhook) {
                                setWebhookName(webhook.name)
                                setWebhookUrl(webhook.url)
                                setEditWebhookDialogOpen(true)
                              }
                            }}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button variant="outline" size="icon" onClick={() => handleDeleteWebhook(webhookList.find(w => w.url === webhookMS)?.name || '')}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Add Webhook Dialog */}
                  <AddOrEditWebhookDialog
                    open={webhookDialogOpen}
                    onOpenChange={setWebhookDialogOpen}
                    isEditMode={false}
                    webhookName={webhookName}
                    webhookUrl={webhookUrl}
                    setWebhookName={setWebhookName}
                    setWebhookUrl={setWebhookUrl}
                    onAdd={handleAddWebhook}
                    onUpdate={() => {}}
                  />
                  {/* Edit Webhook Dialog */}
                  {editWebhookDialogOpen && (
                    <AddOrEditWebhookDialog
                      open={editWebhookDialogOpen}
                      onOpenChange={setEditWebhookDialogOpen}
                      isEditMode={true}
                      webhookName={webhookName}
                      webhookUrl={webhookUrl}
                      setWebhookName={setWebhookName}
                      setWebhookUrl={setWebhookUrl}
                      onUpdate={handleUpdateWebhook}
                      onAdd={() => {}}
                    />
                  )}
                </div>

                {/* Coding Rule */}
                <div id="settings-coding-rule" className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Label className="mr-2 flex items-center gap-2">
                      <FileCode className="w-4 h-4" /> {t('settings.configuration.codingRule', 'Coding Rule')}
                    </Label>
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    <Select value={codingRule} onValueChange={value => setFieldConfiguration('codingRule', value)}>
                      <SelectTrigger className="border rounded-md w-full">
                        <SelectValue placeholder={t('settings.configuration.selectCodingRule')} />
                      </SelectTrigger>
                      <SelectContent>
                        {codingRuleList.map(rule => (
                          <SelectItem key={rule.name} value={rule.name}>
                            {rule.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>

                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={() => {
                          setCodingRuleName('')
                          setCodingRuleContent('')
                          setCodingRuleDialogOpen(true)
                        }}
                      >
                        <Plus className="h-4 w-4" />
                      </Button>
                      {codingRule && (
                        <>
                          <Button
                            variant="outline"
                            size="icon"
                            onClick={() => {
                              const rule = codingRuleList.find(r => r.name === codingRule)
                              if (rule) {
                                setCodingRuleName(rule.name)
                                setCodingRuleContent(rule.content)
                                setEditCodingRuleDialogOpen(true)
                              }
                            }}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button variant="outline" size="icon" onClick={() => handleDeleteCodingRule(codingRule)}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Add Dialog */}
                  <AddOrEditCodingRuleDialog
                    open={codingRuleDialogOpen}
                    onOpenChange={setCodingRuleDialogOpen}
                    isEditMode={false}
                    ruleName={codingRuleName}
                    ruleContent={codingRuleContent}
                    setRuleName={setCodingRuleName}
                    setRuleContent={setCodingRuleContent}
                    onAdd={handleAddCodingRule}
                    onUpdate={() => {}} // No-op for add mode
                  />
                  {/* Edit Dialog */}
                  {editCodingRuleDialogOpen && (
                    <AddOrEditCodingRuleDialog
                      open={editCodingRuleDialogOpen}
                      onOpenChange={setEditCodingRuleDialogOpen}
                      isEditMode={true}
                      ruleName={codingRuleName}
                      ruleContent={codingRuleContent}
                      setRuleName={setCodingRuleName}
                      setRuleContent={setCodingRuleContent}
                      onUpdate={handleUpdateCodingRule}
                      onAdd={() => {}} // No-op for edit mode
                    />
                  )}
                </div>

                {/* Start on Login Switch */}
                <div id="settings-start-on-login" className="flex items-center justify-between space-x-2 py-1">
                  <Label htmlFor="start-on-login" className="flex items-center gap-2 cursor-pointer">
                    <LayoutGrid className="w-4 h-4" /> {t('settings.configuration.startOnLogin')}
                  </Label>
                  <Switch id="start-on-login" checked={startOnLogin} onCheckedChange={checked => setFieldConfiguration('startOnLogin', checked)} />
                </div>

                {/* Show SVN Notifications Switch */}
                <div id="settings-show-notifications" className="flex items-center justify-between space-x-2 py-1">
                  <Label htmlFor="show-notifications" className="flex items-center gap-2 cursor-pointer">
                    <Bell className="w-4 h-4" /> {t('settings.configuration.showNotifications')}
                  </Label>
                  <Switch id="show-notifications" checked={showNotifications} onCheckedChange={checked => setFieldConfiguration('showNotifications', checked)} />
                </div>
              </CardContent>
              <CardFooter className="flex justify-center pt-2">
                <Button variant={buttonVariant} onClick={handleSaveConfigurationConfig}>
                  {t('common.save')}
                </Button>
              </CardFooter>
            </Card>
          </TabsContent>

          {/* Mail Server Configuration Tab */}
          <TabsContent value="mailserver">
            <Card className="gap-2 py-4 rounded-md">
              {/* <CardHeader className="pb-2">
                <CardTitle>{t('settings.tab.mailserver')}</CardTitle>
                <CardDescription>{t('settings.mailserver.description')}</CardDescription>
              </CardHeader> */}
              <CardContent className="space-y-4">
                <div id="settings-smtp-server" className="space-y-3">
                  <Label className="flex items-center gap-2">
                    <Database className="w-4 h-4" /> {t('settings.mailserver.smtpServer')}
                  </Label>
                  <Input
                    type="text"
                    value={smtpServer}
                    onChange={e => setFieldMailServer('smtpServer', e.target.value)}
                    placeholder={t('settings.mailserver.smtpServerPlaceholder')}
                  />
                </div>
                <div id="settings-port" className="space-y-3">
                  <Label className="flex items-center gap-2">
                    <Network className="w-4 h-4" /> {t('settings.mailserver.port')}
                  </Label>
                  <Input type="text" value={port} onChange={e => setFieldMailServer('port', e.target.value)} placeholder={t('settings.mailserver.portPlaceholder')} />
                </div>
                <div id="settings-mail-email" className="space-y-3">
                  <Label className="flex items-center gap-2">
                    <Mail className="w-4 h-4" /> {t('settings.mailserver.email')}
                  </Label>
                  <Input type="email" value={email} onChange={e => setFieldMailServer('email', e.target.value)} placeholder={t('settings.mailserver.emailPlaceholder')} />
                </div>
                <div id="settings-mail-password" className="space-y-3">
                  <Label className="flex items-center gap-2">
                    <Lock className="w-4 h-4" /> {t('settings.mailserver.password')}
                  </Label>
                  <Input
                    type="password"
                    value={password}
                    onChange={e => setFieldMailServer('password', e.target.value)}
                    placeholder={t('settings.mailserver.passwordPlaceholder')}
                  />
                </div>
                <div className="flex justify-center pt-2">
                  <Button variant={buttonVariant} onClick={handleSaveMailServerConfig}>
                    {t('common.save')}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* OneDrive Configuration Tab */}
          <TabsContent value="onedrive">
            <Card className="gap-2 py-4 rounded-md">
              {/* <CardHeader className="pb-2">
                <CardTitle>{t('settings.tab.onedrive')}</CardTitle>
                <CardDescription>{t('settings.onedrive.description')}</CardDescription>
              </CardHeader> */}
              <CardContent className="space-y-4">
                <div id="settings-onedrive-client-id" className="space-y-3">
                  <Label className="flex items-center gap-2">
                    <User className="w-4 h-4" /> {t('settings.onedrive.clientId')}
                  </Label>
                  <Input
                    type="text"
                    value={oneDriveClientId}
                    onChange={e => setFieldConfiguration('oneDriveClientId', e.target.value)}
                    placeholder={t('settings.onedrive.clientIdPlaceholder')}
                  />
                </div>
                {/* Client Secret */}
                <div id="settings-onedrive-client-secret" className="space-y-3">
                  <Label className="flex items-center gap-2">
                    <Lock className="w-4 h-4" /> {t('settings.onedrive.clientSecret')}
                  </Label>
                  <Input
                    type="password"
                    value={oneDriveClientSecret}
                    onChange={e => setFieldConfiguration('oneDriveClientSecret', e.target.value)}
                    placeholder={t('settings.onedrive.clientSecretPlaceholder')}
                  />
                </div>
                {/* Refresh Token */}
                <div id="settings-onedrive-refresh-token" className="space-y-3">
                  <Label className="flex items-center gap-2">
                    <RefreshCw className="w-4 h-4" /> {t('settings.onedrive.refreshToken')}
                  </Label>
                  <Input
                    type="password"
                    value={oneDriveRefreshToken}
                    onChange={e => setFieldConfiguration('oneDriveRefreshToken', e.target.value)}
                    placeholder={t('settings.onedrive.refreshTokenPlaceholder')}
                  />
                </div>
              </CardContent>
              <CardFooter className="flex justify-center pt-2">
                <Button variant={buttonVariant} onClick={handleSaveOneDriveConfig}>
                  {t('common.save')}
                </Button>
              </CardFooter>
            </Card>
          </TabsContent>
        </Tabs>

        <DialogFooter className="mt-4">
          <DialogClose asChild>
            <Button variant={buttonVariant}>{t('common.close')}</Button>
          </DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
