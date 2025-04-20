import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { EyeOff, FileClock, FileDiff, FileMinus, FilePen, FilePlus, FileQuestion, FileType, FileWarning, FileX } from 'lucide-react'
import { STATUS_COLOR_CLASS_MAP, STATUS_TEXT, type SvnStatusCode } from '../shared/constants'

type Props = {
  code: SvnStatusCode
  className?: string
}

export const StatusIcon = ({ code, className }: Props) => {
  const Icon = STATUS_ICON[code]
  const colorClass = STATUS_COLOR_CLASS_MAP[code] ?? ''
  if (!Icon) return null
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Icon strokeWidth={1.5} className={`${className ?? 'w-4 h-4'} ${colorClass}`} />
      </TooltipTrigger>
      <TooltipContent>{STATUS_TEXT[code]}</TooltipContent>
    </Tooltip>
  )
}

export const STATUS_ICON: Record<SvnStatusCode, React.ElementType> = {
  A: FilePlus,
  M: FilePen,
  D: FileMinus,
  R: FileDiff,
  C: FileWarning,
  X: FileClock,
  I: EyeOff,
  '?': FileQuestion,
  '!': FileX,
  '~': FileType,
}
