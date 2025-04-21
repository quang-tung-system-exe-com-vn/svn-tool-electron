import type { BrowserWindow, IpcMainInvokeEvent } from 'electron'

import type { registerRoute } from 'lib/electron-router-dom'

export type BrowserWindowOrNull = Electron.BrowserWindow | null

type Route = Parameters<typeof registerRoute>[0]

export interface WindowProps extends Electron.BrowserWindowConstructorOptions {
  id: Route['id']
  query?: Route['query']
}

export interface WindowCreationByIPC {
  channel: string
  window(): BrowserWindowOrNull
  callback(window: BrowserWindow, event: IpcMainInvokeEvent): void
}

export interface PaginationInfo {
  limit: number;
  offset: number;
  totalEntries: number;
  suggestedStartDate?: string | null; // Add this line
}

export interface SVNResponse {
  status: 'success' | 'error';
  message?: string;
  data?: any; // Có thể là string (cho log), hoặc object (cho statistics)
  pagination?: PaginationInfo;
}
