"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Checkbox } from "@/components/ui/checkbox"
import { Textarea } from "@/components/ui/textarea"
import { Input } from "@/components/ui/input"
import { Send, Pencil, Trash2, Check, X, ChevronDown, ChevronUp, Mail, Building2, User } from "lucide-react"
import { cn } from "@/lib/utils"
import type { EmailDraft } from "@/types"

type Props = {
  draft: EmailDraft
  isSelected: boolean
  onSelect: (id: string, selected: boolean) => void
  onUpdate: (id: string, updates: Partial<EmailDraft>) => void
  onSend: (id: string) => void
  onDelete: (id: string) => void
}

const statusConfig = {
  pending: { label: "Pending", color: "bg-muted text-muted-foreground" },
  drafted: { label: "Draft", color: "bg-primary/10 text-primary" },
  reviewed: { label: "Reviewed", color: "bg-amber-100 text-amber-700" },
  sent: { label: "Sent", color: "bg-emerald-100 text-emerald-700" },
  failed: { label: "Failed", color: "bg-red-100 text-red-700" },
}

export function EmailDraftCard({ draft, isSelected, onSelect, onUpdate, onSend, onDelete }: Props) {
  const [isExpanded, setIsExpanded] = useState(false)
  const [isEditing, setIsEditing] = useState(false)
  const [editedSubject, setEditedSubject] = useState(draft.subject)
  const [editedBody, setEditedBody] = useState(draft.body)

  const handleSave = () => {
    onUpdate(draft.id, { subject: editedSubject, body: editedBody, status: "reviewed" })
    setIsEditing(false)
  }

  const handleCancel = () => {
    setEditedSubject(draft.subject)
    setEditedBody(draft.body)
    setIsEditing(false)
  }

  const isSent = draft.status === "sent"

  const previewText = draft.body.slice(0, 80).replace(/\n/g, " ") + (draft.body.length > 80 ? "..." : "")

  return (
    <div
      className={cn(
        "rounded-lg border border-border bg-card transition-all",
        isSelected && !isSent && "ring-2 ring-primary ring-offset-1",
        isSent && "opacity-70",
      )}
    >
      {/* Header */}
      <div className="flex items-start gap-3 p-4">
        {!isSent && (
          <Checkbox
            checked={isSelected}
            onCheckedChange={(checked) => onSelect(draft.id, !!checked)}
            className="mt-1"
          />
        )}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-semibold text-sm text-foreground">
              {draft.lead.firstName} {draft.lead.lastName}
            </span>
            <Badge className={cn("text-[10px] px-1.5 py-0 font-medium", statusConfig[draft.status].color)}>
              {statusConfig[draft.status].label}
            </Badge>
          </div>

          <div className="flex items-center gap-3 text-xs text-muted-foreground mt-1">
            <span className="flex items-center gap-1">
              <Building2 className="h-3 w-3" />
              {draft.lead.company}
            </span>
            <span className="flex items-center gap-1">
              <User className="h-3 w-3" />
              {draft.lead.role}
            </span>
          </div>

          <div className="mt-2 space-y-1">
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <Mail className="h-3 w-3 flex-shrink-0" />
              <span className="truncate">{draft.lead.email}</span>
            </div>
            {!isExpanded && (
              <p className="text-xs text-muted-foreground truncate">
                <span className="font-medium text-foreground">Subject:</span> {draft.subject}
              </p>
            )}
          </div>
        </div>

        <div className="flex items-center gap-0.5 flex-shrink-0">
          {!isSent && (
            <>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={() => {
                  setIsEditing(!isEditing)
                  setIsExpanded(true)
                }}
                title="Edit draft"
              >
                <Pencil className="h-3.5 w-3.5" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-primary hover:text-primary hover:bg-primary/10"
                onClick={() => onSend(draft.id)}
                title="Send email"
              >
                <Send className="h-3.5 w-3.5" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                onClick={() => onDelete(draft.id)}
                title="Delete draft"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </>
          )}
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={() => setIsExpanded(!isExpanded)}
            title={isExpanded ? "Collapse" : "Expand"}
          >
            {isExpanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
          </Button>
        </div>
      </div>

      {/* Expanded Content */}
      {(isExpanded || isEditing) && (
        <div className="px-4 pb-4 pt-0">
          <div className="space-y-4 border-t border-border pt-4">
            {isEditing ? (
              <>
                <div>
                  <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Subject</label>
                  <Input
                    value={editedSubject}
                    onChange={(e) => setEditedSubject(e.target.value)}
                    className="h-9 text-sm"
                    placeholder="Email subject..."
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Body</label>
                  <Textarea
                    value={editedBody}
                    onChange={(e) => setEditedBody(e.target.value)}
                    rows={8}
                    className="resize-none text-sm leading-relaxed"
                    placeholder="Email body..."
                  />
                </div>
                <div className="flex justify-end gap-2 pt-2">
                  <Button variant="outline" size="sm" onClick={handleCancel} className="h-8 text-xs bg-transparent">
                    <X className="mr-1.5 h-3 w-3" />
                    Cancel
                  </Button>
                  <Button size="sm" onClick={handleSave} className="h-8 text-xs">
                    <Check className="mr-1.5 h-3 w-3" />
                    Save Changes
                  </Button>
                </div>
              </>
            ) : (
              <>
                <div>
                  <p className="text-xs font-medium text-muted-foreground mb-1">Subject</p>
                  <p className="text-sm font-medium text-foreground">{draft.subject}</p>
                </div>
                <div>
                  <p className="text-xs font-medium text-muted-foreground mb-1">Body</p>
                  <div className="rounded-md bg-muted/30 p-3">
                    <p className="text-sm whitespace-pre-wrap text-foreground/80 leading-relaxed">{draft.body}</p>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
