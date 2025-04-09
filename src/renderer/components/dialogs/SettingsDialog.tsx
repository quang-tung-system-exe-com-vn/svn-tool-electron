"use client";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogClose,
} from "@/components/ui/dialog";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select"; // Import từ thư viện shadcn/ui

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { useTranslation } from "react-i18next";
import { useEffect, useState } from "react";
import { useUISettings } from "../shared/UISettings";

export function SettingsDialog() {
  const {
    theme,
    setTheme,
    fontSize,
    setFontSize,
    fontFamily,
    setFontFamily,
    buttonVariant,
    setButtonVariant,
    language,
    setLanguage,
  } = useUISettings();

  const { t, i18n } = useTranslation();

  useEffect(() => {
    i18n.changeLanguage(language);
  }, [language, i18n]);

  const FONT_SIZES = ["small", "medium", "large"] as const;
  const FONT_FAMILIES = ["sans", "serif", "mono"] as const;
  const BUTTON_VARIANTS = [
    "default",
    "secondary",
    "destructive",
    "outline",
    "ghost",
    "link",
  ] as const;
  const LANGUAGES = [
    { code: "en", label: "English" },
    { code: "vi", label: "Tiếng Việt" },
    { code: "ja", label: "日本語" },
  ];

  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const handleOpenDialog = () => {
    setIsDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setIsDialogOpen(false);
  };

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button
          variant="ghost"
          className="w-full justify-start p-2 h-8 font-normal"
        >
          {t("menu.settings")}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{t("menu.settings")}</DialogTitle>
          <DialogDescription>{t("settings.description")}</DialogDescription>
        </DialogHeader>
        <Tabs defaultValue="appearance" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="appearance">
              {t("settings.tab.appearance")}
            </TabsTrigger>
            <TabsTrigger value="configuration">
              {t("settings.tab.configuration")}
            </TabsTrigger>
            <TabsTrigger value="mailserver">
              {t("settings.tab.mailserver")}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="appearance">
            <div className="grid grid-cols-2 gap-4 space-y-4">
              {/* Left side */}
              <div className="space-y-4">
                {/* Language Selector */}
                <Card className="gap-2 py-4">
                  <CardHeader>
                    <CardTitle>{t("settings.language")}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-3 gap-2">
                      {LANGUAGES.map(({ code, label }) => (
                        <Button
                          key={code}
                          variant={buttonVariant}
                          className={
                            language === code
                              ? "ring-1 ring-offset-2 ring-primary font-medium"
                              : "font-normal"
                          }
                          onClick={() => setLanguage(code as any)}
                        >
                          {label}
                        </Button>
                      ))}
                    </div>
                  </CardContent>
                </Card>
                {/* Theme Selector */}
                <Card className="gap-2 py-4">
                  <CardHeader>
                    <CardTitle>{t("settings.theme")}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-3 gap-2">
                      {["light", "dark", "system"].map((t) => (
                        <Button
                          key={t}
                          variant={buttonVariant}
                          className={
                            theme === t
                              ? "ring-1 ring-offset-2 ring-primary font-medium"
                              : "font-normal"
                          }
                          onClick={() => setTheme(t as any)}
                        >
                          {t.charAt(0).toUpperCase() + t.slice(1)}
                        </Button>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Right side */}
              <div className="space-y-4">
                {/* Font Family Selector */}
                <Card className="gap-2 py-4">
                  <CardHeader>
                    <CardTitle>{t("settings.fontFamily")}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-3 gap-2">
                      {FONT_FAMILIES.map((f) => (
                        <Button
                          key={f}
                          variant={buttonVariant}
                          className={
                            fontFamily === f
                              ? "ring-1 ring-offset-2 ring-primary font-medium"
                              : "font-normal"
                          }
                          style={{ fontFamily: `var(--font-${f})` }}
                          onClick={() => setFontFamily(f)}
                        >
                          {t(`fontFamily.${f}`)}
                        </Button>
                      ))}
                    </div>
                  </CardContent>
                </Card>
                {/* Font Size Selector */}
                <Card className="gap-2 py-4">
                  <CardHeader>
                    <CardTitle>{t("settings.fontSize")}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-3 gap-2">
                      {FONT_SIZES.map((size) => (
                        <Button
                          key={size}
                          variant={buttonVariant}
                          className={
                            fontSize === size
                              ? "ring-1 ring-offset-2 ring-primary font-medium"
                              : "font-normal"
                          }
                          onClick={() => setFontSize(size)}
                        >
                          {t(`fontSize.${size}`)}
                        </Button>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>

            {/* Bottom */}
            {/* Button Variant Selector */}
            <Card className="gap-2 py-4">
              <CardHeader>
                <CardTitle>{t("settings.buttonVariant")}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-3 gap-2">
                  {BUTTON_VARIANTS.map((v) => (
                    <Button
                      key={v}
                      variant={v}
                      className={
                        buttonVariant === v
                          ? "ring-1 ring-offset-2 ring-primary font-medium"
                          : "font-normal"
                      }
                      onClick={() => setButtonVariant(v)}
                    >
                      {v.charAt(0).toUpperCase() + v.slice(1)}
                    </Button>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="configuration">
            <Card className="gap-2 py-4">
              <CardHeader className="pb-2">
                <CardTitle>Configuration</CardTitle>
                <CardDescription>
                  Configure your project settings.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* OpenAI API Key */}
                <div className="space-y-1">
                  <Label>OpenAI API Key</Label>
                  <Input type="text" placeholder="Enter your OpenAI API Key" />
                </div>

                {/* SVN Folder */}
                <div className="space-y-1">
                  <Label>SVN Folder</Label>
                  <div className="flex items-center space-x-2">
                    <Input type="text" placeholder="Select SVN folder" />
                    <Button
                      variant={buttonVariant}
                      onClick={() => {
                        /* Handle folder selection */
                      }}
                    >
                      Choose Folder
                    </Button>
                  </div>
                </div>

                {/* Source Folder */}
                <div className="space-y-1">
                  <Label>Source Folder</Label>
                  <div className="flex items-center space-x-2">
                    <Input type="text" placeholder="Select source folder" />
                    <Button
                      variant={buttonVariant}
                      onClick={() => {
                        /* Handle folder selection */
                      }}
                    >
                      Choose Folder
                    </Button>
                  </div>
                </div>

                {/* Email PL */}
                <div className="space-y-1">
                  <Label>Email PL</Label>
                  <Input type="email" placeholder="Enter email address" />
                </div>

                {/* Webhook MS */}
                <div className="space-y-1">
                  <Label className="mr-2">Webhook MS</Label>{" "}
                  <div className="flex items-center justify-between gap-2">
                    <Select>
                      <SelectTrigger className="border rounded-md w-full">
                        <SelectValue placeholder="Select Webhook" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="webhook1">Webhook 1</SelectItem>
                        <SelectItem value="webhook2">Webhook 2</SelectItem>
                        <SelectItem value="webhook3">Webhook 3</SelectItem>
                      </SelectContent>
                    </Select>
                    <Button variant={buttonVariant} onClick={handleOpenDialog}>
                      Add New Webhook
                    </Button>
                  </div>
                </div>
              </CardContent>
              <CardFooter className="flex justify-center pt-2">
                <Button variant={buttonVariant}>Save changes</Button>
              </CardFooter>
            </Card>
          </TabsContent>

          <TabsContent value="mailserver">
            <Card className="gap-2 py-4">
              <CardHeader className="pb-2">
                <CardTitle>Mail Server Configuration</CardTitle>
                <CardDescription>
                  Configure your mail server settings.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* SMTP Server Input */}
                <div className="space-y-1">
                  <Label>SMTP Server</Label>
                  <Input type="text" placeholder="Enter your SMTP server" />
                </div>
                {/* Port Input */}
                <div className="space-y-1">
                  <Label>Port</Label>
                  <Input type="text" placeholder="Enter SMTP port" />
                </div>
                {/* Email Input */}
                <div className="space-y-1">
                  <Label>Email</Label>
                  <Input type="email" placeholder="Enter your email address" />
                </div>
                {/* Password Input */}
                <div className="space-y-1">
                  <Label>Password</Label>
                  <Input type="password" placeholder="Enter your password" />
                </div>
                {/* Button to Save Settings */}
                <div className="flex justify-center pt-2">
                  <Button variant={buttonVariant}>Save changes</Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        <DialogFooter className="mt-4">
          <DialogClose asChild>
            <Button variant={buttonVariant}>{t("common.close")}</Button>
          </DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
