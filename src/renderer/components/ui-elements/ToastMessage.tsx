import { Button } from '@/components/ui/button'
import chalk from 'chalk'
import { t } from 'i18next'
import { Copy } from 'lucide-react'
import type React from 'react'
import { useState } from 'react'
import { toast } from 'sonner'

interface ToastMessageProps {
  message: string
  type?: 'success' | 'info' | 'warning' | 'error'
}

const ToastMessage: React.FC<ToastMessageProps> = ({ message, type }) => {
  const handleCopy = () => {
    navigator.clipboard.writeText(message ?? '')
  }

  return (
    <div className="flex justify-between items-center">
      <div className="whitespace-pre-wrap text-[var(--foreground)]">{message}</div>
      {type === 'error' && (
        <div className="flex justify-end mt-1">
          <CustomTooltip content="Copy to clipboard">
            <Button variant="link" size="icon" title="Copy to clipboard" onClick={handleCopy}>
              <Copy />
            </Button>
          </CustomTooltip>
        </div>
      )}
    </div>
  )
}

const ToastMessageFunctions = {
  success: (message: string) => {
    console.log(chalk.green.bold('[SUCCESS]'), message)
    toast(t('toast.success'), {
      description: <ToastMessage message={message} type="success" />,
      className: 'toast-success',
    })
  },

  info: (message: string) => {
    console.log(chalk.cyan.bold('[INFO]'), message)
    toast(t('toast.info'), {
      description: <ToastMessage message={message} type="info" />,
      className: 'toast-info',
    })
  },

  warning: (message: string) => {
    console.log(chalk.yellow.bold('[WARNING]'), message)
    toast(t('toast.warning'), {
      description: <ToastMessage message={message} type="warning" />,
      className: 'toast-warning',
    })
  },

  error: (message: any) => {
    console.log(chalk.red.bold('[ERROR]'), message)
    toast(t('toast.error'), {
      description: <ToastMessage message={message} type="error" />,
      className: 'toast-error',
    })
  },
}

interface CustomTooltipProps {
  content: React.ReactNode
  children: React.ReactNode
}

const CustomTooltip: React.FC<CustomTooltipProps> = ({ content, children }) => {
  const [visible, setVisible] = useState(false)

  return (
    <div className="relative inline-block" onMouseEnter={() => setVisible(true)} onMouseLeave={() => setVisible(false)}>
      {children}
      {visible && (
        <div className="absolute z-[999999] bottom-full left-1/2 -translate-x-1/2 mb-2 w-max max-w-xs px-3 py-1.5 text-xs text-white bg-gray-800 rounded-md transition-opacity duration-200">
          {content}
          <div className="absolute left-1/2 bottom-[-4px] -translate-x-1/2 w-2.5 h-2.5 bg-gray-800 rotate-45" />
        </div>
      )}
    </div>
  )
}

export default ToastMessageFunctions
