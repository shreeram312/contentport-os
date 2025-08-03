'use client'

import { useEffect, useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from './ui/dialog'
import DuolingoButton from './ui/duolingo-button'
import DuolingoCheckbox from './ui/duolingo-checkbox'
import { Icons } from './icons'

interface TweetPostConfirmationDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onConfirm: () => void
  onCancel?: () => void
  isPosting?: boolean
}

export default function TweetPostConfirmationDialog({
  open,
  onOpenChange,
  onConfirm,
  onCancel,
  isPosting = false,
}: TweetPostConfirmationDialogProps) {
  const [skipPostConfirmation, setSkipPostConfirmation] = useState(false)

  useEffect(() => {
    setSkipPostConfirmation(localStorage.getItem('skipPostConfirmation') === 'true')
  }, [])

  const toggleSkipConfirmation = (checked: boolean) => {
    setSkipPostConfirmation(checked)
    if (checked) {
      localStorage.setItem('skipPostConfirmation', 'true')
    } else {
      localStorage.removeItem('skipPostConfirmation')
    }
  }

  const handleConfirm = () => {
    onOpenChange(false)
    onConfirm()
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">Post to Twitter</DialogTitle>
        </DialogHeader>
        <div className="">
          <p className="text-base text-muted-foreground mb-4">
            This will post to Twitter. Continue?
          </p>
          <DuolingoCheckbox
            id="skip-post-confirmation"
            label="Don't show this again"
            checked={skipPostConfirmation}
            onChange={(e) => toggleSkipConfirmation(e.target.checked)}
          />
        </div>
        <div className="flex justify-end gap-3">
          <DuolingoButton
            variant="secondary"
            size="sm"
            onClick={() => {
              onOpenChange(false)
              onCancel?.()
            }}
          >
            Cancel
          </DuolingoButton>
          <DuolingoButton size="sm" onClick={handleConfirm} disabled={isPosting}>
            <Icons.twitter className="size-4 mr-2" />
            {isPosting ? 'Posting...' : 'Post Now'}
          </DuolingoButton>
        </div>
      </DialogContent>
    </Dialog>
  )
}
