import { Button } from '@/components/ui/button'
import { Calendar } from '@/components/ui/calendar'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { cn } from '@/lib/utils'
import { format } from 'date-fns'
import { BarChart3, CalendarIcon, Minus, RefreshCw, Square, X } from 'lucide-react'
import type React from 'react'
import { useEffect, useState } from 'react'
import type { DateRange } from 'react-day-picker'
import { useTranslation } from 'react-i18next'
import { GlowLoader } from '../ui-elements/GlowLoader'

interface ShowlogProps {
  onRefresh: () => void
  filePath?: string
  isLoading: boolean
  dateRange?: DateRange
  setDateRange?: (range: DateRange | undefined) => void
  onOpenStatistic?: () => void
}

export const ShowlogToolbar: React.FC<ShowlogProps> = ({ onRefresh, filePath, isLoading, dateRange, setDateRange, onOpenStatistic }) => {
  const { t } = useTranslation()
  const handleWindow = (action: string) => {
    window.api.electron.send('window-action', action)
  }
  const [open, setOpen] = useState(false)
  const [date, setDate] = useState<DateRange | undefined>(() => {
    const today = new Date()
    const oneWeekAgo = new Date()
    oneWeekAgo.setDate(today.getDate() - 7)
    return {
      from: oneWeekAgo,
      to: today,
    }
  })
  useEffect(() => {
    if (setDateRange) {
      setDateRange(dateRange)
    }
  }, [dateRange, setDateRange])

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
      <div className="flex items-center h-full">
        <div className="w-15 h-6 flex justify-center pt-1.5 pl-1">
          {isLoading ? <GlowLoader className="w-10 h-4" /> : <img src="icon.png" alt="icon" draggable="false" className="w-10 h-3.5" />}
        </div>
        <div className="flex items-center h-full" style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}>
          <div className="flex items-center gap-1 pt-0.5">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="link"
                  disabled={isLoading}
                  size="sm"
                  onClick={onRefresh}
                  className="shadow-none focus-visible:ring-0 focus-visible:ring-offset-0 hover:bg-muted transition-colors rounded-sm h-[25px] w-[25px]"
                >
                  <RefreshCw className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>{t('common.refresh')}</TooltipContent>
            </Tooltip>

            {onOpenStatistic && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="link"
                    disabled={isLoading}
                    size="sm"
                    onClick={onOpenStatistic}
                    className="shadow-none focus-visible:ring-0 focus-visible:ring-offset-0 hover:bg-muted transition-colors rounded-sm h-[25px] w-[25px]"
                  >
                    <BarChart3 className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>{t('dialog.statisticSvn.title')}</TooltipContent>
              </Tooltip>
            )}

            {/* Date Range Picker */}
            {setDateRange && (
              <div className="ml-2">
                {/* Thêm state open */}
                {(() => {
                  return (
                    <Popover open={open} onOpenChange={setOpen}>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          size="sm"
                          disabled={isLoading}
                          className={cn('justify-start text-left font-normal h-7 px-2', !dateRange && 'text-muted-foreground')}
                        >
                          <CalendarIcon className="mr-2 h-3 w-3" />
                          {dateRange?.from ? (
                            dateRange.to ? (
                              <>
                                {format(dateRange.from, 'dd/MM/yyyy')} - {format(dateRange.to, 'dd/MM/yyyy')}
                              </>
                            ) : (
                              format(dateRange.from, 'dd/MM/yyyy')
                            )
                          ) : (
                            <span>{t('dialog.statisticSvn.selectPeriodPlaceholder')}</span>
                          )}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar initialFocus mode="range" defaultMonth={dateRange?.from} selected={date} onSelect={setDate} numberOfMonths={2} />
                        <div className="flex justify-end">
                          <Button
                            className="mr-2 mb-3"
                            onClick={() => {
                              setDateRange(date)
                              setOpen(false)
                            }}
                          >
                            Xác nhận
                          </Button>
                        </div>
                      </PopoverContent>
                    </Popover>
                  )
                })()}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Center Section (Title) */}
      <Button variant="ghost" className="font-medium text-xs">
        {filePath !== '.' ? t('dialog.showLogs.titleWithPath', { 0: filePath }) : t('dialog.showLogs.title')}
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
