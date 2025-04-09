import "./lib/i18n";
import ReactDom from "react-dom/client";
import React from "react";

import { AppRoutes } from "./routes";
import { ThemeProvider } from "@/components/ThemeProvider";

import "./globals.css";

ReactDom.createRoot(document.querySelector("app") as HTMLElement).render(
  <React.StrictMode>
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
      <AppRoutes />
    </ThemeProvider>
  </React.StrictMode>
);
