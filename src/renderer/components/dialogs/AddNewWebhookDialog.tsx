import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useEffect, useState } from 'react'

interface AddWebhookDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  webhookName: string
  webhookUrl: string
  setWebhookName: (value: string) => void
  setWebhookUrl: (value: string) => void
  onAdd: () => void
}

export function AddWebhookDialog({ open, onOpenChange, webhookName, webhookUrl, setWebhookName, setWebhookUrl, onAdd }: AddWebhookDialogProps) {
  const [errorName, setErrorName] = useState(false)
  const [errorUrl, setErrorUrl] = useState(false)

  useEffect(() => {
    if (open) {
      setWebhookName('')
      setWebhookUrl('')
      setErrorName(false)
      setErrorUrl(false)
    }
  }, [open, setWebhookName, setWebhookUrl])

  const handleAdd = () => {
    const nameValid = webhookName.trim().length > 0
    const urlValid = webhookUrl.trim().length > 0

    setErrorName(!nameValid)
    setErrorUrl(!urlValid)

    if (nameValid && urlValid) {
      onAdd()
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Add New Webhook</DialogTitle>
          <DialogDescription>Enter a name and URL for the webhook you'd like to add.</DialogDescription>
        </DialogHeader>

        <div className="space-y-2">
          <Label>Webhook Name</Label>
          <Input value={webhookName} onChange={e => setWebhookName(e.target.value)} placeholder="Enter webhook name" className={errorName ? 'border-red-500' : ''} />
          {errorName && <p className="text-sm text-red-500">Webhook name is required.</p>}

          <Label>Webhook URL</Label>
          <Input value={webhookUrl} onChange={e => setWebhookUrl(e.target.value)} placeholder="Enter webhook URL" className={errorUrl ? 'border-red-500' : ''} />
          {errorUrl && <p className="text-sm text-red-500">Webhook URL is required.</p>}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleAdd}>Add</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
