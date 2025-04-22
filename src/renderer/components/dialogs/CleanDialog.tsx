import ToastMessageFunctions from '@/components/ui-elements/ToastMessage'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import i18n from '@/lib/i18n'
import { Trash2 } from 'lucide-react'
import { useMemo, useState } from 'react'
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
  open: boolean
  onOpenChange?: (open: boolean) => void
}

export function CleanDialog({ open, onOpenChange }: CleanDialogProps) {
  const variant = useButtonVariant()
  const { t } = useTranslation()
  const [isLoading, setIsLoading] = useState(false)
  const optionMeta = useMemo(
    () => ({
      externals: {
        label: t('cleanDialog.options.externals.label'),
        description: t('cleanDialog.options.externals.description'),
      },
      unversioned: {
        label: t('cleanDialog.options.unversioned.label'),
        description: t('cleanDialog.options.unversioned.description'),
      },
      ignored: {
        label: t('cleanDialog.options.ignored.label'),
        description: t('cleanDialog.options.ignored.description'),
      },
      unused: {
        label: t('cleanDialog.options.unused.label'),
        description: t('cleanDialog.options.unused.description'),
      },
      metadata: {
        label: t('cleanDialog.options.metadata.label'),
        description: t('cleanDialog.options.metadata.description'),
      },
      locks: {
        label: t('cleanDialog.options.locks.label'),
        description: t('cleanDialog.options.locks.description'),
      },
      fixTimestamps: {
        label: t('cleanDialog.options.fixTimestamps.label'),
        description: t('cleanDialog.options.fixTimestamps.description'),
      },
    }),
    [t, i18n.language]
  )

  const [checkedOptions, setCheckedOptions] = useState<Record<string, boolean>>({
    externals: true,
    unversioned: false,
    ignored: false,
    unused: true,
    metadata: true,
    locks: false,
    fixTimestamps: true,
  })

  const options = Object.keys(optionMeta).map(id => ({
    id,
    label: optionMeta[id as keyof typeof optionMeta].label,
    description: optionMeta[id as keyof typeof optionMeta].description,
    checked: checkedOptions[id],
  }))

  const toggleOption = (id: string) => {
    setCheckedOptions(prev => ({
      ...prev,
      [id]: !prev[id],
    }))
  }

  const handleCancel = () => {
    if (onOpenChange) {
      onOpenChange(false)
    }
  }

  const handleClean = async () => {
    setIsLoading(true)
    const selectedOptions = options.filter(option => option.checked).map(option => option.id)
    try {
      await window.api.svn.cleanup(selectedOptions)
      if (onOpenChange) {
        onOpenChange(false)
      }
      ToastMessageFunctions.success(t('cleanDialog.cleanSuccess'))
    } catch (error) {
      ToastMessageFunctions.error(t('cleanDialog.cleanError'))
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <Trash2 className="h-6 w-6 text-primary" />
            <DialogTitle>{t('cleanDialog.title')}</DialogTitle>
          </div>
        </DialogHeader>
        <div className="border rounded-md p-4 flex-1 overflow-auto">
          <OverlayLoader isLoading={isLoading} />
          <p className="text-muted-foreground mb-4">{t('cleanDialog.description')}</p>
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
        <DialogFooter>
          <Button variant="outline" onClick={handleCancel}>
            {t('common.cancel')}
          </Button>
          <Button variant={variant} onClick={handleClean} disabled={isLoading || !options.some(option => option.checked)}>
            {t('cleanDialog.clean')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
