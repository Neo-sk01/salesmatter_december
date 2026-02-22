"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Checkbox } from "@/components/ui/checkbox"
import { Textarea } from "@/components/ui/textarea"
import { Input } from "@/components/ui/input"
import { Send, Pencil, Trash2, Check, X, ChevronDown, ChevronUp, Mail, Building2, User, Search, RefreshCw, Clock } from "lucide-react"
import { format } from "date-fns"
import { ResearchModal } from "@/components/outreach/research-modal"
import { Shimmer } from "@/components/ai-elements/shimmer"
import { cn } from "@/lib/utils"
import type { EmailDraft } from "@/types"

type Props = {
  draft: EmailDraft
  isSelected: boolean
  onSelect: (id: string, selected: boolean) => void
  onUpdate: (id: string, updates: Partial<EmailDraft>) => void
  onSend: (id: string) => void
  onDelete: (id: string) => void
  onEdit: () => void
  onRegenerate?: (id: string) => void
  isRegenerating?: boolean
}

const statusConfig = {
  pending: { label: "Pending", color: "bg-muted text-muted-foreground" },
  drafted: { label: "Draft", color: "bg-primary/10 text-primary" },
  reviewed: { label: "Reviewed", color: "bg-amber-100 text-amber-700" },
  sent: { label: "Sent", color: "bg-emerald-100 text-emerald-700" },
  failed: { label: "Failed", color: "bg-red-100 text-red-700" },
}

export function EmailDraftCard({ draft, isSelected, onSelect, onSend, onDelete, onEdit, onRegenerate, isRegenerating }: Props) {
  const [isExpanded, setIsExpanded] = useState(false)

  // Auto-expand to show shimmer on body when regenerating
  useEffect(() => {
    if (isRegenerating) {
      setIsExpanded(true)
    }
  }, [isRegenerating])


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
            <div className="flex items-center gap-1 text-[11px] text-muted-foreground ml-auto">
              <Clock className="h-3 w-3" />
              {format(new Date(draft.createdAt), "h:mm a")}
            </div>
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

          <div className="mt-2 space-y-1 w-full max-w-full overflow-hidden">
            <div className="flex items-center gap-1 text-xs text-muted-foreground w-full">
              <Mail className="h-3 w-3 flex-shrink-0" />
              <span className="truncate">{draft.lead.email}</span>
            </div>
            {!isExpanded && (
              <div className="text-xs text-muted-foreground truncate w-full flex gap-1">
                <span className="font-medium text-foreground flex-shrink-0">Subject:</span>
                <div className="min-w-0 flex-1 truncate">
                  {isRegenerating ? (
                    <Shimmer as="span" className="truncate">{draft.subject}</Shimmer>
                  ) : (
                    <span className="truncate">{draft.subject}</span>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="flex items-center gap-0.5 flex-shrink-0">
          <ResearchModal draft={draft}>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-muted-foreground hover:text-primary hover:bg-primary/10"
              title="View research"
            >
              <Search className="h-3.5 w-3.5" />
            </Button>
          </ResearchModal>
          {!isSent && (
            <>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={onEdit}
                title="Edit draft"
              >
                <Pencil className="h-3.5 w-3.5" />
              </Button>
              {onRegenerate && !isSent && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-muted-foreground hover:text-amber-600 hover:bg-amber-50"
                  onClick={() => onRegenerate(draft.id)}
                  disabled={isRegenerating}
                  title="Regenerate draft with fresh research"
                >
                  <RefreshCw className={cn("h-3.5 w-3.5", isRegenerating && "animate-spin text-amber-500")} />
                </Button>
              )}
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
      {isExpanded && (
        <div className="px-4 pb-4 pt-0 w-full overflow-hidden">
          <div className="space-y-3 border-t border-border/50 pt-3 mt-1 w-full">
            <div className="w-full">
              <p className="text-xs text-muted-foreground mb-0.5">Subject</p>
              {isRegenerating ? (
                <Shimmer as="p" className="text-sm block w-full">
                  {draft.subject}
                </Shimmer>
              ) : (
                <p className="text-sm text-foreground">{draft.subject}</p>
              )}
            </div>
            <div className="w-full">
              <p className="text-xs text-muted-foreground mb-0.5">Body</p>
              {isRegenerating ? (
                <Shimmer as="p" className="text-sm leading-relaxed whitespace-pre-wrap block w-full">
                  {draft.body}
                </Shimmer>
              ) : (
                <p className="text-sm whitespace-pre-wrap text-foreground/85 leading-relaxed">{draft.body}</p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
