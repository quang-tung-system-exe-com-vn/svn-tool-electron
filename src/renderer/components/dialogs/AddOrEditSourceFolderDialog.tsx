'use client'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useButtonVariant } from '@/stores/useAppearanceStore'
import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'

interface AddOrEditSourceFolderDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  isEditMode: boolean
  folderName: string
  folderPath: string
  setFolderName: (name: string) => void
  setFolderPath: (path: string) => void
  onAdd: () => void
  onUpdate: () => void
}

export function AddOrEditSourceFolderDialog({
  open,
  onOpenChange,
  isEditMode,
  folderName,
  folderPath,
  setFolderName,
  setFolderPath,
  onAdd,
  onUpdate,
}: AddOrEditSourceFolderDialogProps) {
  const { t } = useTranslation()
  const variant = useButtonVariant()
  const [errorName, setErrorName] = useState(false)
  const [errorPath, setErrorPath] = useState(false)

  useEffect(() => {
    if (open) {
      setErrorName(false)
      setErrorPath(false)
    }
  }, [open])

  const handleSave = () => {
    const nameValid = folderName.trim().length > 0
    const pathValid = folderPath.trim().length > 0
    setErrorName(!nameValid)
    setErrorPath(!pathValid)

    if (nameValid && pathValid) {
      if (isEditMode) {
        onUpdate()
      } else {
        onAdd()
      }
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>{isEditMode ? t('dialog.editSourceFolder') : t('dialog.addSourceFolder')}</DialogTitle>
          <DialogDescription>{isEditMode ? t('dialog.editSourceFolderDesc') : t('dialog.addSourceFolderDesc')}</DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="name" className="text-left">
              {t('common.name')}
            </Label>
            <Input id="name" value={folderName} onChange={e => setFolderName(e.target.value)} className={errorName ? 'border-red-500' : ''} disabled={isEditMode} />
            {errorName && <p className="text-sm text-red-500">{t('dialog.sourcefolder.error.nameRequired')}</p>}
          </div>
          <div className="space-y-2">
            <Label htmlFor="path" className="text-left">
              {t('common.path')}
            </Label>
            <div className="flex gap-2">
              <Input id="path" value={folderPath} onChange={e => setFolderPath(e.target.value)} className={`flex-1 ${errorPath ? 'border-red-500' : ''}`} />
              <Button
                variant="outline"
                onClick={async () => {
                  const folder = await window.api.system.select_folder()
                  if (folder) setFolderPath(folder)
                }}
              >
                {t('common.browse')}
              </Button>
            </div>
            {errorPath && <p className="text-sm text-red-500">{t('dialog.sourcefolder.error.pathRequired')}</p>}
          </div>
        </div>
        <DialogFooter>
          <Button variant={variant} onClick={() => onOpenChange(false)}>
            {t('common.cancel')}
          </Button>
          <Button variant={variant} onClick={handleSave}>
            {isEditMode ? t('common.save') : t('common.add')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
