"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { EmailDraftCard } from "./email-draft-card"
import { EditDraftDialog } from "./edit-draft-dialog"
import { Send, CheckSquare, Square, Loader2 } from "lucide-react"
import type { EmailDraft } from "@/types"

type Props = {
  drafts: EmailDraft[]
  onUpdate: (id: string, updates: Partial<EmailDraft>) => void
  onSend: (id: string) => void
  onSendBulk: (ids: string[]) => Promise<void>
  onDelete: (id: string) => void
}

export function DraftsList({ drafts, onUpdate, onSend, onSendBulk, onDelete }: Props) {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [isSending, setIsSending] = useState(false)
  const [editingDraft, setEditingDraft] = useState<EmailDraft | null>(null)

  const pendingDrafts = drafts.filter((d) => d.status !== "sent")

  const handleSelect = (id: string, selected: boolean) => {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (selected) {
        next.add(id)
      } else {
        next.delete(id)
      }
      return next
    })
  }

  const handleSelectAll = () => {
    if (selectedIds.size === pendingDrafts.length) {
      setSelectedIds(new Set())
    } else {
      setSelectedIds(new Set(pendingDrafts.map((d) => d.id)))
    }
  }

  const handleSendSelected = async () => {
    if (selectedIds.size === 0) return
    setIsSending(true)
    await onSendBulk(Array.from(selectedIds))
    setSelectedIds(new Set())
    setIsSending(false)
  }

  return (
    <div className="space-y-3">
      {/* Bulk Actions - only show for pending */}
      {pendingDrafts.length > 0 && (
        <div className="flex items-center justify-between rounded-lg border border-border bg-card p-3">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" onClick={handleSelectAll} className="gap-2 h-8">
              {selectedIds.size === pendingDrafts.length ? (
                <CheckSquare className="h-4 w-4" />
              ) : (
                <Square className="h-4 w-4" />
              )}
              {selectedIds.size === pendingDrafts.length ? "Deselect All" : "Select All"}
            </Button>
            {selectedIds.size > 0 && (
              <Badge variant="secondary" className="font-normal">
                {selectedIds.size} selected
              </Badge>
            )}
          </div>
          <Button
            onClick={handleSendSelected}
            disabled={selectedIds.size === 0 || isSending}
            size="sm"
            className="gap-2"
          >
            {isSending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            Send {selectedIds.size > 0 ? `(${selectedIds.size})` : "Selected"}
          </Button>
        </div>
      )}

      {/* Draft Cards */}
      <div className="space-y-2">
        {drafts.map((draft) => (
          <EmailDraftCard
            key={draft.id}
            draft={draft}
            isSelected={selectedIds.has(draft.id)}
            onSelect={handleSelect}
            onUpdate={onUpdate}
            onSend={onSend}
            onDelete={onDelete}
            onEdit={() => setEditingDraft(draft)}
          />
        ))}
      </div>

      <EditDraftDialog
        draft={editingDraft}
        open={!!editingDraft}
        onOpenChange={(open) => !open && setEditingDraft(null)}
        onSave={onUpdate}
        onSend={onSend}
      />

      {drafts.length === 0 && (
        <div className="flex flex-col items-center justify-center py-8 text-center rounded-lg border border-dashed border-border">
          <Send className="h-6 w-6 text-muted-foreground mb-2" />
          <p className="text-sm text-muted-foreground">No emails here</p>
        </div>
      )}
    </div>
  )
}
