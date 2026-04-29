"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Checkbox } from "@/components/ui/checkbox"
import { Send, Pencil, Trash2, ChevronDown, ChevronUp, Mail, Building2, User, Search, RefreshCw, Clock, History, Eye, RotateCcwSquare, Copy } from "lucide-react"
import { format } from "date-fns"
import { toast } from "sonner"
import { ResearchModal } from "@/components/outreach/research-modal"
import { Shimmer } from "@/components/ai-elements/shimmer"
import { PreviousDraftDialog } from "@/components/outreach/previous-draft-dialog"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import { cn } from "@/lib/utils"
import type { DraftVersion, EmailDraft } from "@/types"

type Props = {
  draft: EmailDraft
  isSelected: boolean
  onSelect: (id: string, selected: boolean) => void
  onUpdate: (id: string, updates: Partial<EmailDraft>) => void
  onSend: (id: string) => void
  onDelete: (id: string) => void
  onEdit: () => void
  onRegenerate?: (id: string) => void
  onRestoreVersion?: (draftId: string, versionId: string) => void
  isRegenerating?: boolean
  disableRegenerate?: boolean
}

const statusConfig = {
  pending: { label: "Pending", color: "bg-muted text-muted-foreground" },
  drafted: { label: "Draft", color: "bg-primary/10 text-primary" },
  reviewed: { label: "Reviewed", color: "bg-amber-100 text-amber-700" },
  sent: { label: "Sent", color: "bg-emerald-100 text-emerald-700" },
  failed: { label: "Failed", color: "bg-red-100 text-red-700" },
}

const MAX_VISIBLE_VERSIONS = 5

function snippet(body: string, length = 140): string {
  const flat = body.replace(/\s+/g, " ").trim()
  return flat.length > length ? `${flat.slice(0, length)}…` : flat
}

export function EmailDraftCard({
  draft,
  isSelected,
  onSelect,
  onSend,
  onDelete,
  onEdit,
  onRegenerate,
  onRestoreVersion,
  isRegenerating,
  disableRegenerate,
}: Props) {
  const [isExpanded, setIsExpanded] = useState(false)
  const [historyOpen, setHistoryOpen] = useState(false)
  const [previewVersion, setPreviewVersion] = useState<DraftVersion | null>(null)
  const [previewIndex, setPreviewIndex] = useState<number>(-1)

  // Auto-expand to show shimmer on body when regenerating
  useEffect(() => {
    if (isRegenerating) {
      setIsExpanded(true)
    }
  }, [isRegenerating])

  const isSent = draft.status === "sent"
  const versions = (draft.previousVersions ?? []).slice(0, MAX_VISIBLE_VERSIONS)
  const hasVersions = versions.length > 0

  const handleCopyVersion = async (version: DraftVersion) => {
    try {
      await navigator.clipboard.writeText(`Subject: ${version.subject}\n\n${version.body}`)
      toast.success("Previous draft copied to clipboard.")
    } catch {
      toast.error("Could not copy to clipboard.")
    }
  }

  const handleRestore = (version: DraftVersion) => {
    if (!onRestoreVersion) return
    onRestoreVersion(draft.id, version.id)
  }

  const openPreview = (version: DraftVersion, index: number) => {
    setPreviewVersion(version)
    setPreviewIndex(index)
  }

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
            aria-label={`Select draft for ${draft.lead.firstName} ${draft.lead.lastName}`}
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
              aria-label="View research"
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
                aria-label="Edit draft"
              >
                <Pencil className="h-3.5 w-3.5" />
              </Button>
              {onRegenerate && !isSent && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-muted-foreground hover:text-amber-600 hover:bg-amber-50"
                  onClick={() => onRegenerate(draft.id)}
                  disabled={isRegenerating || disableRegenerate}
                  title="Regenerate draft with fresh research"
                  aria-label="Regenerate draft"
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
                aria-label="Send email"
              >
                <Send className="h-3.5 w-3.5" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                onClick={() => onDelete(draft.id)}
                title="Delete draft"
                aria-label="Delete draft"
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
            aria-label={isExpanded ? "Collapse draft" : "Expand draft"}
            aria-expanded={isExpanded}
          >
            {isExpanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
          </Button>
        </div>
      </div>

      {/* Expanded Content */}
      {isExpanded && (
        <div className="px-4 pb-4 pt-0 w-full overflow-hidden">
          <div className="space-y-3 border-t border-border/50 pt-3 mt-1 w-full">
            <div className="flex items-center gap-2">
              <Badge variant="secondary" className="bg-primary/10 text-primary font-medium px-2 py-0.5 text-[10px] uppercase tracking-wider">
                Current Draft
              </Badge>
              <span className="text-[11px] text-muted-foreground">
                Generated {format(new Date(draft.createdAt), "MMM d, h:mm a")}
              </span>
            </div>
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

            {/* Previous Drafts */}
            {hasVersions ? (
              <Collapsible open={historyOpen} onOpenChange={setHistoryOpen}>
                <div className="rounded-md border border-border/70 bg-muted/30">
                  <CollapsibleTrigger asChild>
                    <button
                      type="button"
                      aria-expanded={historyOpen}
                      aria-controls={`previous-drafts-${draft.id}`}
                      className="flex w-full items-center justify-between gap-2 rounded-md px-3 py-2 text-left text-xs font-medium text-foreground hover:bg-muted/60 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-1"
                    >
                      <span className="flex items-center gap-2">
                        <History className="h-3.5 w-3.5 text-muted-foreground" />
                        Previous Drafts
                        <Badge variant="secondary" className="font-normal text-[10px] px-1.5 py-0">
                          {versions.length}
                        </Badge>
                      </span>
                      <ChevronDown
                        className={cn(
                          "h-3.5 w-3.5 text-muted-foreground transition-transform",
                          historyOpen && "rotate-180",
                        )}
                      />
                    </button>
                  </CollapsibleTrigger>
                  <CollapsibleContent
                    id={`previous-drafts-${draft.id}`}
                    className="overflow-hidden data-[state=closed]:animate-accordion-up data-[state=open]:animate-accordion-down"
                  >
                    <ul className="space-y-2 px-3 pb-3 pt-1">
                      {versions.map((version, index) => (
                        <li
                          key={version.id}
                          className="rounded-md border border-border/60 bg-card p-3 transition-colors hover:border-primary/40"
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="text-xs font-semibold text-foreground">
                                  Previous Draft {index + 1}
                                </span>
                                <span className="flex items-center gap-1 text-[11px] text-muted-foreground">
                                  <Clock className="h-3 w-3" />
                                  {format(new Date(version.generatedAt), "MMM d, h:mm a")}
                                </span>
                              </div>
                              <p className="mt-1 text-xs font-medium text-foreground/90 truncate">
                                {version.subject}
                              </p>
                              <p className="mt-1 text-xs text-muted-foreground line-clamp-2">
                                {snippet(version.body)}
                              </p>
                            </div>
                          </div>
                          <div className="mt-2 flex flex-wrap items-center gap-1.5">
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-7 gap-1 text-xs px-2"
                              onClick={() => openPreview(version, index)}
                              aria-label={`View previous draft ${index + 1}`}
                            >
                              <Eye className="h-3.5 w-3.5" />
                              View
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-7 gap-1 text-xs px-2 text-primary hover:bg-primary/10"
                              onClick={() => handleRestore(version)}
                              disabled={!onRestoreVersion}
                              aria-label={`Restore previous draft ${index + 1} as current`}
                            >
                              <RotateCcwSquare className="h-3.5 w-3.5" />
                              Restore
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-7 gap-1 text-xs px-2"
                              onClick={() => handleCopyVersion(version)}
                              aria-label={`Copy previous draft ${index + 1}`}
                            >
                              <Copy className="h-3.5 w-3.5" />
                              Copy
                            </Button>
                          </div>
                        </li>
                      ))}
                    </ul>
                  </CollapsibleContent>
                </div>
              </Collapsible>
            ) : (
              <div className="rounded-md border border-dashed border-border/70 bg-muted/20 px-3 py-2 text-[11px] text-muted-foreground">
                No previous drafts yet. Regenerate this email to create a version history.
              </div>
            )}
          </div>
        </div>
      )}

      <PreviousDraftDialog
        open={!!previewVersion}
        onOpenChange={(open) => {
          if (!open) {
            setPreviewVersion(null)
            setPreviewIndex(-1)
          }
        }}
        version={previewVersion}
        versionLabel={previewIndex >= 0 ? `Previous Draft ${previewIndex + 1}` : "Previous Draft"}
        onRestore={() => previewVersion && handleRestore(previewVersion)}
      />
    </div>
  )
}
