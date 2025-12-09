"use client"

import type React from "react"

import { useState } from "react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Code2, RotateCcw } from "lucide-react"

type Props = {
  template: string
  onSave: (template: string) => void
  children: React.ReactNode
}

const DEFAULT_TEMPLATE = `You are an expert B2B sales copywriter. Write a personalized cold outreach email.

LEAD INFORMATION:
- Name: {{firstName}} {{lastName}}
- Email: {{email}}
- Company: {{company}}
- Role: {{role}}

GUIDELINES:
1. Keep the email under 150 words
2. Start with a personalized hook based on their role/company
3. Clearly state the value proposition
4. End with a soft call-to-action (no hard sells)
5. Be conversational, not salesy
6. Use their first name only

OUTPUT FORMAT:
Subject: [compelling subject line]

[email body]

---
Generate a cold email for this lead.`

const AVAILABLE_VARIABLES = [
  { name: "firstName", description: "Lead's first name" },
  { name: "lastName", description: "Lead's last name" },
  { name: "email", description: "Lead's email address" },
  { name: "company", description: "Lead's company name" },
  { name: "role", description: "Lead's job title/role" },
]

export function PromptTemplateModal({ template, onSave, children }: Props) {
  const [open, setOpen] = useState(false)
  const [editedTemplate, setEditedTemplate] = useState(template)

  const handleSave = () => {
    onSave(editedTemplate)
    setOpen(false)
  }

  const handleReset = () => {
    setEditedTemplate(DEFAULT_TEMPLATE)
  }

  return (
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
          {/* Available Variables */}
          <div className="space-y-2">
            <p className="text-xs font-medium text-muted-foreground">Available Variables</p>
            <div className="flex flex-wrap gap-1.5">
              {AVAILABLE_VARIABLES.map((v) => (
                <Badge
                  key={v.name}
                  variant="secondary"
                  className="font-mono text-xs cursor-pointer hover:bg-primary/20"
                  onClick={() => {
                    setEditedTemplate((prev) => prev + `{{${v.name}}}`)
                  }}
                >
                  {`{{${v.name}}}`}
                </Badge>
              ))}
            </div>
          </div>

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
          <Button variant="ghost" size="sm" onClick={handleReset} className="gap-2">
            <RotateCcw className="h-3.5 w-3.5" />
            Reset to Default
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
  )
}
