import ToastMessageFunctions from '@/components/ui-elements/ToastMessage'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Trash2 } from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useButtonVariant } from '../stores/useAppearanceStore'
import { OverlayLoader } from '../ui-elements/OverlayLoader'

interface CleanOption {
  id: string
  label: string
  description: string
  checked: boolean
}
interface CleanDialogProps {
  open?: boolean
  onOpenChange?: (open: boolean) => void
}

export function CleanDialog({ open, onOpenChange }: CleanDialogProps) {
  const variant = useButtonVariant()
  const { t } = useTranslation()
  const [isLoading, setIsLoading] = useState(false)
  const [options, setOptions] = useState<CleanOption[]>([
    {
      id: 'externals',
      label: 'Clean up externals',
      description: 'Also clean up externals',
      checked: true,
    },
    {
      id: 'unversioned',
      label: 'Delete unversioned files and directories',
      description: 'Delete all unversioned files and directories from working copy',
      checked: false,
    },
    {
      id: 'ignored',
      label: 'Delete ignored files and directories',
      description: 'Delete all ignored files and directories from working copy',
      checked: false,
    },
    {
      id: 'unused',
      label: 'Delete unused pristine copies',
      description: 'Delete all pristine copies of files that are not referenced in the working copy',
      checked: true,
    },
    {
      id: 'metadata',
      label: 'Clean up working copy status',
      description: 'Refresh the status of the working copy',
      checked: true,
    },
    {
      id: 'locks',
      label: 'Break locks',
      description: 'Break and steal any locks in working copy',
      checked: false,
    },
    {
      id: 'fixTimestamps',
      label: 'Fix timestamps',
      description: 'Fix timestamps of working copy files',
      checked: true,
    },
  ])

  const toggleOption = (id: string) => {
    setOptions(options.map(option => (option.id === id ? { ...option, checked: !option.checked } : option)))
  }

  const handleClean = async () => {
    try {
      setIsLoading(true)
      const selectedOptions = options.filter(option => option.checked).map(option => option.id)
      console.log('Selected clean options:', selectedOptions)
      await window.api.svn.cleanup(selectedOptions)
      ToastMessageFunctions.success(t('SVN cleanup completed successfully'))
    } catch (error) {
      ToastMessageFunctions.error('Error during cleanup')
    } finally {
      setIsLoading(false)
    }
  }

  const handleCancel = () => {
    if (onOpenChange) {
      onOpenChange(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{t('aboutDialog.title')}</DialogTitle>
          <DialogDescription>{t('aboutDialog.description')}</DialogDescription>
        </DialogHeader>
        <div className="space-y-2 text-sm">
          <div className="flex items-center gap-3">
            <Trash2 className="h-6 w-6 text-primary" />
            <h2 className="text-xl font-semibold">{t('SVN Cleanup Options')}</h2>
          </div>

          <div className="border rounded-md p-4 flex-1 overflow-auto">
            <OverlayLoader isLoading={isLoading} />
            <p className="text-muted-foreground mb-4">{t('Select cleanup options for your working copy:')}</p>
            <div className="space-y-4">
              {options.map(option => (
                <div key={option.id} className="flex items-start space-x-2">
                  <Checkbox id={option.id} checked={option.checked} onCheckedChange={() => toggleOption(option.id)} />
                  <div className="grid gap-1.5 leading-none">
                    <label htmlFor={option.id} className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                      {option.label}
                    </label>
                    <p className="text-sm text-muted-foreground">{option.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={handleCancel}>
            {t('Cancel')}
          </Button>
          <Button variant={variant} onClick={handleClean} disabled={isLoading || !options.some(option => option.checked)}>
            {t('Clean')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
