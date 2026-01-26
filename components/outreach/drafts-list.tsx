"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { EmailDraftCard } from "./email-draft-card"
import { EditDraftDialog } from "./edit-draft-dialog"
import { Send, CheckSquare, Square, Loader2, FileDown, Mail, X, Check } from "lucide-react"
import type { EmailDraft } from "@/types"

type Props = {
  drafts: EmailDraft[]
  onUpdate: (id: string, updates: Partial<EmailDraft>) => void
  onSend: (id: string) => void
  onSendBulk: (ids: string[]) => Promise<void>
  onDelete: (id: string) => void
  onRegenerate?: (id: string) => void
  regeneratingId?: string | null
  onExport?: (recipientEmail: string, draftIds?: string[]) => Promise<{ success: boolean; message?: string; error?: string }>
  isExporting?: boolean
}

export function DraftsList({
  drafts,
  onUpdate,
  onSend,
  onSendBulk,
  onDelete,
  onRegenerate,
  regeneratingId,
  onExport,
  isExporting
}: Props) {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [isSending, setIsSending] = useState(false)
  const [editingDraft, setEditingDraft] = useState<EmailDraft | null>(null)
  const [showExportInput, setShowExportInput] = useState(false)
  const [exportEmail, setExportEmail] = useState("neosekaleli@carbosoftware.com")
  const [exportMessage, setExportMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

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

  const handleExport = async () => {
    if (!onExport || !exportEmail) return

    setExportMessage(null)

    const result = await onExport(
      exportEmail,
      selectedIds.size > 0 ? Array.from(selectedIds) : undefined
    )

    if (result.success) {
      setExportMessage({ type: 'success', text: result.message || 'Drafts exported successfully!' })
      setShowExportInput(false)
      setTimeout(() => setExportMessage(null), 5000)
    } else {
      setExportMessage({ type: 'error', text: result.error || 'Failed to export drafts' })
    }
  }

  return (
    <div className="space-y-3">
      {/* Export Success/Error Message */}
      {exportMessage && (
        <div className={`flex items-center justify-between rounded-lg border p-3 ${exportMessage.type === 'success'
            ? 'border-green-200 bg-green-50 text-green-800'
            : 'border-red-200 bg-red-50 text-red-800'
          }`}>
          <div className="flex items-center gap-2">
            {exportMessage.type === 'success' ? (
              <Check className="h-4 w-4" />
            ) : (
              <X className="h-4 w-4" />
            )}
            <span className="text-sm">{exportMessage.text}</span>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setExportMessage(null)}
            className="h-6 w-6 p-0"
          >
            <X className="h-3 w-3" />
          </Button>
        </div>
      )}

      {/* Bulk Actions - only show for pending */}
      {pendingDrafts.length > 0 && (
        <div className="flex flex-col gap-3 rounded-lg border border-border bg-card p-3">
          <div className="flex items-center justify-between">
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
            <div className="flex items-center gap-2">
              {/* Export Button */}
              {onExport && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowExportInput(!showExportInput)}
                  disabled={isExporting}
                  className="gap-2"
                >
                  {isExporting ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <FileDown className="h-4 w-4" />
                  )}
                  Export for Review
                </Button>
              )}
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
          </div>

          {/* Export Email Input */}
          {showExportInput && onExport && (
            <div className="flex items-center gap-2 pt-2 border-t border-border">
              <Mail className="h-4 w-4 text-muted-foreground" />
              <Input
                type="email"
                placeholder="Enter email for review..."
                value={exportEmail}
                onChange={(e) => setExportEmail(e.target.value)}
                className="flex-1 h-8"
              />
              <Button
                size="sm"
                onClick={handleExport}
                disabled={!exportEmail || isExporting}
                className="gap-2"
              >
                {isExporting ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Send className="h-4 w-4" />
                )}
                Send {selectedIds.size > 0 ? `${selectedIds.size} Drafts` : 'All Drafts'}
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowExportInput(false)}
                className="h-8 w-8 p-0"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          )}
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
            onRegenerate={onRegenerate}
            isRegenerating={regeneratingId === draft.id}
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

