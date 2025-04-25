'use client'
import toast from '@/components/ui-elements/Toast'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import logger from '@/services/logger'
import { Cloud, Mail, Palette, Settings } from 'lucide-react'
import type { Theme } from 'main/store/AppearanceStore'
import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'

import { BUTTON_VARIANTS, FONT_FAMILIES, FONT_SIZES, LANGUAGES, THEMES } from '../shared/constants'
import { useAppearanceStore } from '../stores/useAppearanceStore'
import { useConfigurationStore } from '../stores/useConfigurationStore'
import { useMailServerStore } from '../stores/useMailServerStore'
import { useWebhookStore } from '../stores/useWebhookStore'
import { AddWebhookDialog } from './AddNewWebhookDialog'

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
    oneDriveClientId,
    oneDriveTenantId,
    oneDriveClientSecret,
    oneDriveRefreshToken,
    setFieldConfiguration,
    saveConfigurationConfig,
    loadConfigurationConfig,
  } = useConfigurationStore()
  const { smtpServer, port, email, password, setFieldMailServer, saveMailServerConfig, loadMailServerConfig } = useMailServerStore()
  const { webhookList, loadWebhookConfig, addWebhook, deleteWebhook } = useWebhookStore()
  const [nestedDialogOpen, setNestedDialogOpen] = useState(false)
  const [webhookName, setWebhookName] = useState('')
  const [webhookUrl, setWebhookUrl] = useState('')

  useEffect(() => {
    i18n.changeLanguage(language)
  }, [language, i18n])

  useEffect(() => {
    if (open) {
      logger.info('Running load functions...')
      loadWebhookConfig()
      loadConfigurationConfig()
      loadMailServerConfig()
      setIsDarkMode(themeMode === 'dark')
    }
  }, [open])

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
      setNestedDialogOpen(false)
      setFieldConfiguration('webhookMS', webhookUrl)
    }
  }

  const handleDeleteWebhook = async (url: string) => {
    deleteWebhook(url)
    setFieldConfiguration('webhookMS', '')
  }

  const handleSaveConfigurationConfig = async () => {
    try {
      await saveConfigurationConfig()
      toast.success('Configuration saved!')
    } catch (err) {
      toast.error('Failed to save configuration')
    }
  }

  const handleSaveMailServerConfig = async () => {
    try {
      await saveMailServerConfig()
      toast.success('Configuration saved!')
    } catch (err) {
      toast.error('Failed to save configuration')
    }
  }

  const handleSaveOneDriveConfig = async () => {
    try {
      await saveConfigurationConfig()
      toast.success('Configuration saved!')
    } catch (err) {
      toast.error('Failed to save configuration')
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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{t('title.settings')}</DialogTitle>
          <DialogDescription>{t('settings.description')}</DialogDescription>
        </DialogHeader>
        <Tabs defaultValue="appearance" className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="appearance" className="flex items-center">
              <Palette />
              {t('settings.tab.appearance')}
            </TabsTrigger>

            <TabsTrigger value="configuration" className="flex items-center">
              <Settings />
              {t('settings.tab.configuration')}
            </TabsTrigger>

            <TabsTrigger value="mailserver" className="flex items-center">
              <Mail />
              {t('settings.tab.mailserver')}
            </TabsTrigger>

            <TabsTrigger value="onedrive" className="flex items-center">
              <Cloud />
              {t('settings.tab.onedrive') || 'OneDrive'}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="appearance">
            <div className="grid grid-cols-2 gap-4 space-y-4">
              {/* Left side */}
              <div className="space-y-4">
                {/* Language Selector */}
                <Card className="gap-2 py-4">
                  <CardHeader>
                    <CardTitle>{t('settings.language')}</CardTitle>
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
                <Card className="gap-2 py-4">
                  <CardHeader>
                    <CardTitle>
                      <div className="flex items-center justify-between">
                        {t('settings.theme')}
                        <div className="flex items-center space-x-2">
                          <Switch id="dark-mode" checked={isDarkMode} onCheckedChange={handleDarkModeToggle} />
                          <Label className="cursor-pointer" htmlFor="dark-mode">
                            {t('settings.darkMode')}
                          </Label>
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
                        {THEMES.map((t: string) => (
                          <SelectItem key={t} value={t}>
                            {t
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
                <Card className="gap-2 py-4">
                  <CardHeader>
                    <CardTitle>{t('settings.fontFamily')}</CardTitle>
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
                <Card className="gap-2 py-4">
                  <CardHeader>
                    <CardTitle>{t('settings.fontSize.title')}</CardTitle>
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
            <Card className="gap-2 py-4 mb-4">
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

          {/* Configuration */}
          <TabsContent value="configuration">
            <Card className="gap-2 py-4">
              <CardHeader className="pb-2">
                <CardTitle>{t('settings.tab.configuration')}</CardTitle>
                <CardDescription>{t('settings.configuration.description')}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* OpenAI API Key */}
                <div className="space-y-1">
                  <Label>{t('settings.configuration.openaiApiKey')}</Label>
                  <Input
                    type="text"
                    placeholder={t('settings.configuration.openaiApiKeyPlaceholder')}
                    value={openaiApiKey}
                    onChange={e => setFieldConfiguration('openaiApiKey', e.target.value)}
                  />
                </div>

                {/* SVN Folder */}
                <div className="space-y-1">
                  <Label>{t('settings.configuration.svnFolder')}</Label>
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

                <div className="space-y-1">
                  <Label>{t('settings.configuration.sourceFolder')}</Label>
                  <div className="flex items-center space-x-2">
                    <Input
                      type="text"
                      placeholder={t('settings.configuration.sourceFolderPlaceholder')}
                      value={sourceFolder}
                      onChange={e => setFieldConfiguration('sourceFolder', e.target.value)}
                    />
                    <Button
                      variant={buttonVariant}
                      onClick={async () => {
                        const folder = await window.api.system.select_folder()
                        if (folder) setFieldConfiguration('sourceFolder', folder)
                      }}
                    >
                      {t('settings.configuration.chooseFolder')}
                    </Button>
                  </div>
                </div>

                {/* Email PL */}
                <div className="space-y-1">
                  <Label>{t('settings.configuration.emailPL')}</Label>
                  <Input type="email" placeholder={t('settings.configuration.emailPlaceholder')} value={emailPL} onChange={e => setFieldConfiguration('emailPL', e.target.value)} />
                </div>

                {/* Webhook MS */}
                <div className="space-y-1">
                  <Label className="mr-2">{t('settings.configuration.webhookMS')}</Label>
                  <div className="flex items-center justify-between gap-2">
                    <Select value={webhookMS} onValueChange={value => setFieldConfiguration('webhookMS', value)}>
                      <SelectTrigger className="border rounded-md w-full">
                        <SelectValue placeholder={t('settings.configuration.selectWebhook')} />
                      </SelectTrigger>
                      <SelectContent>
                        {webhookList.map(webhook => (
                          <SelectItem key={webhook.url} value={webhook.url}>
                            {webhook.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>

                    <div className="flex gap-2">
                      <Button variant={buttonVariant} onClick={() => setNestedDialogOpen(true)}>
                        {t('settings.configuration.addNewWebhook')}
                      </Button>

                      {webhookMS && (
                        <Button variant="destructive" onClick={() => handleDeleteWebhook(webhookMS)}>
                          {t('common.delete')}
                        </Button>
                      )}
                    </div>
                  </div>

                  {/* AddWebhookDialog Dialog */}
                  <AddWebhookDialog
                    open={nestedDialogOpen}
                    onOpenChange={setNestedDialogOpen}
                    webhookName={webhookName}
                    webhookUrl={webhookUrl}
                    setWebhookName={setWebhookName}
                    setWebhookUrl={setWebhookUrl}
                    onAdd={handleAddWebhook}
                  />
                </div>
              </CardContent>
              <CardFooter className="flex justify-center pt-2">
                <Button variant={buttonVariant} onClick={handleSaveConfigurationConfig}>
                  {t('common.save')}
                </Button>
              </CardFooter>
            </Card>
          </TabsContent>

          {/* Mail Server Configuration */}
          <TabsContent value="mailserver">
            <Card className="gap-2 py-4">
              <CardHeader className="pb-2">
                <CardTitle>{t('settings.tab.mailserver')}</CardTitle>
                <CardDescription>{t('settings.mailserver.description')}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-1">
                  <Label>{t('settings.mailserver.smtpServer')}</Label>
                  <Input
                    type="text"
                    value={smtpServer}
                    onChange={e => setFieldMailServer('smtpServer', e.target.value)}
                    placeholder={t('settings.mailserver.smtpServerPlaceholder')}
                  />
                </div>
                <div className="space-y-1">
                  <Label>{t('settings.mailserver.port')}</Label>
                  <Input type="text" value={port} onChange={e => setFieldMailServer('port', e.target.value)} placeholder={t('settings.mailserver.portPlaceholder')} />
                </div>
                <div className="space-y-1">
                  <Label>{t('settings.mailserver.email')}</Label>
                  <Input type="email" value={email} onChange={e => setFieldMailServer('email', e.target.value)} placeholder={t('settings.mailserver.emailPlaceholder')} />
                </div>
                <div className="space-y-1">
                  <Label>{t('settings.mailserver.password')}</Label>
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

          {/* OneDrive Configuration */}
          <TabsContent value="onedrive">
            <Card className="gap-2 py-4">
              <CardHeader className="pb-2">
                <CardTitle>{t('settings.tab.onedrive')}</CardTitle>
                <CardDescription>{t('settings.onedrive.description')}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-1">
                  <Label>{t('settings.onedrive.clientId')}</Label>
                  <Input
                    type="text"
                    value={oneDriveClientId}
                    onChange={e => setFieldConfiguration('oneDriveClientId', e.target.value)}
                    placeholder={t('settings.onedrive.clientIdPlaceholder')}
                  />
                </div>
                {/* Client Secret */}
                <div className="space-y-1">
                  <Label>{t('settings.onedrive.clientSecret', 'Client Secret')}</Label> {/* Thêm key translation nếu cần */}
                  <Input
                    type="password" // Sử dụng type="password" để ẩn giá trị
                    value={oneDriveClientSecret}
                    onChange={e => setFieldConfiguration('oneDriveClientSecret', e.target.value)}
                    placeholder={t('settings.onedrive.clientSecretPlaceholder', 'Enter Client Secret')}
                  />{' '}
                  {/* Thêm key translation nếu cần */} {/* Đóng thẻ Input đúng cách */}
                </div>
                {/* Refresh Token */}
                <div className="space-y-1">
                  <Label>{t('settings.onedrive.refreshToken')}</Label>
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
