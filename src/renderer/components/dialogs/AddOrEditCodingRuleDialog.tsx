'use client'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { useButtonVariant } from '@/stores/useAppearanceStore'
import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'

interface AddOrEditCodingRuleDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  ruleName: string
  ruleContent: string
  setRuleName: (value: string) => void
  setRuleContent: (value: string) => void
  onAdd: () => void
  onUpdate: () => void
  isEditMode?: boolean
}

export function AddOrEditCodingRuleDialog({
  open,
  onOpenChange,
  ruleName,
  ruleContent,
  setRuleName,
  setRuleContent,
  onAdd,
  onUpdate,
  isEditMode = false,
}: AddOrEditCodingRuleDialogProps) {
  const [errorName, setErrorName] = useState(false)
  const [errorContent, setErrorContent] = useState(false)
  const variant = useButtonVariant()
  const { t } = useTranslation()

  useEffect(() => {
    if (open && !isEditMode) {
      setRuleName('')
      setRuleContent('')
      setErrorName(false)
      setErrorContent(false)
    }
  }, [open, isEditMode, setRuleName, setRuleContent])

  const handleSave = () => {
    const nameValid = ruleName.trim().length > 0
    const contentValid = ruleContent.trim().length > 0

    setErrorName(!nameValid)
    setErrorContent(!contentValid)

    if (nameValid && contentValid) {
      if (isEditMode) {
        onUpdate()
      } else {
        onAdd()
      }
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{isEditMode ? t('dialog.editCodingRule.title', 'Edit Coding Rule') : t('dialog.newCodingRule.title', 'Add New Coding Rule')}</DialogTitle>
          <DialogDescription>
            {isEditMode
              ? t('dialog.editCodingRule.description', 'Update the details for the coding rule.')
              : t('dialog.newCodingRule.description', 'Enter the details for the new coding rule.')}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-2">
          <Label>{t('dialog.newCodingRule.name', 'Rule Name')}</Label>
          <Input
            value={ruleName}
            onChange={e => setRuleName(e.target.value)}
            disabled={isEditMode}
            placeholder={t('dialog.newCodingRule.placeholderName', 'e.g., No Console Logs')}
            className={errorName ? 'border-red-500' : ''}
          />
          {errorName && <p className="text-sm text-red-500">{t('dialog.newCodingRule.msgRequiredName', 'Rule name is required.')}</p>}

          <Label>{t('dialog.newCodingRule.content', 'Coding Rules')}</Label>
          <Textarea
            value={ruleContent}
            onChange={e => setRuleContent(e.target.value)}
            placeholder={t('dialog.newCodingRule.placeholderContent', 'Enter the coding rules here...')}
            className={errorContent ? 'border-red-500' : ''}
            rows={10}
            spellCheck={false}
          />
          {errorContent && <p className="text-sm text-red-500">{t('dialog.newCodingRule.msgRequiredContent', 'Coding rules content is required.')}</p>}
        </div>

        <DialogFooter>
          <Button variant={variant} onClick={() => onOpenChange(false)}>
            {t('common.cancel')}
          </Button>
          <Button variant={variant} onClick={handleSave}>
            {isEditMode ? t('common.update', 'Update') : t('common.add')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
