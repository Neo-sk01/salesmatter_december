"use client"

import type React from "react"

import { useEffect, useState } from "react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Code2, RotateCcw } from "lucide-react"
import { getDefaultPromptTemplate } from "@/app/actions/get-default-prompt"

type Props = {
  template: string
  onSave: (template: string) => void
  children: React.ReactNode
}

export function PromptTemplateModal({ template, onSave, children }: Props) {
  const [open, setOpen] = useState(false)
  const [editedTemplate, setEditedTemplate] = useState(template)
  const [isResetting, setIsResetting] = useState(false)
  const [resetSuccessOpen, setResetSuccessOpen] = useState(false)

  useEffect(() => {
    if (open) setEditedTemplate(template)
  }, [open, template])

  const handleSave = () => {
    onSave(editedTemplate)
    setOpen(false)
  }

  const handleReset = async () => {
    setIsResetting(true)
    try {
      const skill = await getDefaultPromptTemplate()
      setEditedTemplate(skill)
      onSave(skill)
      setResetSuccessOpen(true)
    } catch (err) {
      console.error('Failed to load default prompt template:', err)
    } finally {
      setIsResetting(false)
    }
  }

  return (
    <>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>{children}</DialogTrigger>
        <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Code2 className="h-5 w-5 text-primary" />
              Cold Outreach Prompt
            </DialogTitle>
            <DialogDescription>
              This prompt is used to generate personalized cold emails for each lead. Customize it to match your tone and
              style.
            </DialogDescription>
          </DialogHeader>

          <div className="flex-1 overflow-hidden flex flex-col gap-4 py-4">
            {/* Template Editor */}
            <div className="flex-1 min-h-0">
              <Textarea
                value={editedTemplate}
                onChange={(e) => setEditedTemplate(e.target.value)}
                className="h-full min-h-[300px] font-mono text-sm resize-none"
                placeholder="Enter your prompt template..."
              />
            </div>
          </div>

          <DialogFooter className="flex items-center justify-between sm:justify-between">
            <Button variant="ghost" size="sm" onClick={handleReset} disabled={isResetting} className="gap-2">
              <RotateCcw className="h-3.5 w-3.5" />
              {isResetting ? "Loading..." : "Reset to Default"}
            </Button>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleSave}>Save Changes</Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={resetSuccessOpen} onOpenChange={setResetSuccessOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Prompt reset</AlertDialogTitle>
            <AlertDialogDescription>
              The default prompt is active for future email generation.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogAction>OK</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
