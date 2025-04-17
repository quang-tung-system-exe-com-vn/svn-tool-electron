// src/renderer/components/DiffToolbar.tsx

import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { t } from 'i18next'
import { Columns, Download, Minus, RotateCw, Square, Upload, X } from 'lucide-react'
import type React from 'react'

interface DiffToolbarProps {
  onRefresh?: () => void
  onSwapSides?: () => void
  onExport?: () => void
  onImport?: () => void
}

export const DiffToolbar: React.FC<DiffToolbarProps> = ({ onRefresh, onSwapSides, onExport, onImport }) => {
  const handleWindow = (action: string) => {
    window.api.electron.send('window-action', action)
  }

  return (
    <div
      className="flex items-center justify-between h-8 text-sm select-none"
      style={
        {
          WebkitAppRegion: 'drag',
          backgroundColor: 'var(--main-bg)',
          color: 'var(--main-fg)',
        } as React.CSSProperties
      }
    >
      <div className="flex items-center h-full" style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="link" size="icon" onClick={onRefresh}>
              <RotateCw className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Refresh Diff</TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="ghost" size="sm" onClick={onSwapSides}>
              <Columns className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Swap Sides</TooltipContent>
        </Tooltip>

        <Separator orientation="vertical" className="h-6" />

        {/* <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="ghost" size="sm" onClick={onExport}>
              <Download className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Export to File</TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="ghost" size="sm" onClick={onImport}>
              <Upload className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Import from File</TooltipContent>
        </Tooltip> */}
      </div>
      {/* Center Section (Title) */}
      <Button variant="ghost" className="font-medium text-xs text-gray-200">
        {t('Diff Viewer')}
      </Button>
      {/* Right Section (Window Controls) */}
      <div className="flex gap-1" style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}>
        <button onClick={() => handleWindow('minimize')} className="w-10 h-8 flex items-center justify-center hover:bg-[var(--hover-bg)] hover:text-[var(--hover-fg)]">
          <Minus size={15.5} strokeWidth={1} absoluteStrokeWidth />
        </button>
        <button onClick={() => handleWindow('maximize')} className="w-10 h-8 flex items-center justify-center hover:bg-[var(--hover-bg)] hover:text-[var(--hover-fg)]">
          <Square size={14.5} strokeWidth={1} absoluteStrokeWidth />
        </button>
        <button onClick={() => handleWindow('close')} className="w-10 h-8 flex items-center justify-center hover:bg-red-600 hover:text-white">
          <X size={20} strokeWidth={1} absoluteStrokeWidth />
        </button>
      </div>
    </div>
  )
}
