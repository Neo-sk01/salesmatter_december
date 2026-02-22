"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { EmailDraftCard } from "./email-draft-card"
import { EditDraftDialog } from "./edit-draft-dialog"
import { Send, CheckSquare, Square, Loader2, FileDown, Mail, X, Check } from "lucide-react"
import { isToday, isYesterday, subDays, isAfter, format } from "date-fns"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion"
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

  // Filtering & Sorting State
  const [searchQuery, setSearchQuery] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")
  const [sortOrder, setSortOrder] = useState("newest")

  // Filter, Sort, and Group active drafts
  const pendingDrafts = [...drafts]
    .filter((d) => d.status !== "sent")
    .filter((d) => {
      // 1. Status Filter
      if (statusFilter !== "all" && d.status !== statusFilter) return false;

      // 2. Search Filter
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        const leadName = `${d.lead.firstName} ${d.lead.lastName}`.toLowerCase();
        const company = d.lead.company?.toLowerCase() || "";
        const subject = d.subject?.toLowerCase() || "";

        if (!leadName.includes(query) && !company.includes(query) && !subject.includes(query)) {
          return false;
        }
      }
      return true;
    })
    .sort((a, b) => {
      // 3. Sort Order
      if (sortOrder === "oldest") {
        return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
      }
      if (sortOrder === "name-asc") {
        return a.lead.firstName.localeCompare(b.lead.firstName);
      }
      if (sortOrder === "company-asc") {
        return (a.lead.company || "").localeCompare(b.lead.company || "");
      }
      // default: newest
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });

  const groupedDrafts = () => {
    const groups: Record<string, EmailDraft[]> = {
      "Today": [],
      "Yesterday": [],
      "Previous 7 Days": [],
      "Older": []
    };

    const now = new Date();
    const sevenDaysAgo = subDays(now, 7);

    pendingDrafts.forEach((draft) => {
      const date = new Date(draft.createdAt);
      if (isToday(date)) {
        groups["Today"].push(draft);
      } else if (isYesterday(date)) {
        groups["Yesterday"].push(draft);
      } else if (isAfter(date, sevenDaysAgo)) {
        groups["Previous 7 Days"].push(draft);
      } else {
        groups["Older"].push(draft);
      }
    });

    // Remove empty groups
    return Object.entries(groups).filter(([_, items]) => items.length > 0);
  };

  const activeGroups = groupedDrafts();

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

  // Determine which accordion items to open by default
  const defaultAccordionValues = ["Today", "Yesterday"];

  return (
    <div className="space-y-4">
      {/* Filtering and Sorting Bar */}
      <div className="flex flex-col sm:flex-row gap-3 items-center bg-card p-3 rounded-lg border border-border sticky top-0 z-20 shadow-sm">
        <div className="relative flex-1 w-full">
          <Mail className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            type="text"
            placeholder="Search leads, companies, or subjects..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 h-9 w-full"
          />
        </div>
        <div className="flex flex-row gap-2 w-full sm:w-auto">
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="h-9 w-[130px]">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="drafted">Drafted</SelectItem>
              <SelectItem value="reviewed">Reviewed</SelectItem>
              <SelectItem value="failed">Failed</SelectItem>
            </SelectContent>
          </Select>
          <Select value={sortOrder} onValueChange={setSortOrder}>
            <SelectTrigger className="h-9 w-[150px]">
              <SelectValue placeholder="Sort by" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="newest">Newest First</SelectItem>
              <SelectItem value="oldest">Oldest First</SelectItem>
              <SelectItem value="name-asc">Lead Name (A-Z)</SelectItem>
              <SelectItem value="company-asc">Company (A-Z)</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

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

      {/* Draft Groups as Accordions */}
      {activeGroups.length > 0 ? (
        <Accordion type="multiple" defaultValue={defaultAccordionValues} className="space-y-4">
          {activeGroups.map(([groupName, groupDrafts]) => (
            <AccordionItem value={groupName} key={groupName} className="border rounded-lg bg-card px-4 shadow-sm">
              <AccordionTrigger className="hover:no-underline py-3">
                <div className="flex items-center gap-2">
                  <h3 className="font-semibold text-foreground text-sm">
                    {groupName}
                  </h3>
                  <Badge variant="secondary" className="font-normal text-xs px-1.5 py-0">
                    {groupDrafts.length}
                  </Badge>
                </div>
              </AccordionTrigger>
              <AccordionContent className="pt-2 pb-4 border-t">
                <div className="space-y-2">
                  {groupDrafts.map((draft) => (
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
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      ) : (
        <div className="flex flex-col items-center justify-center py-10 text-center rounded-lg border border-dashed border-border bg-muted/20">
          <Mail className="h-8 w-8 text-muted-foreground/50 mb-3" />
          <h3 className="text-sm font-medium text-foreground">No drafts found</h3>
          <p className="text-xs text-muted-foreground mt-1 max-w-sm">
            {searchQuery || statusFilter !== 'all'
              ? "Try adjusting your search query or filters to find what you're looking for."
              : "You don't have any pending drafts."}
          </p>
          {(searchQuery || statusFilter !== 'all') && (
            <Button
              variant="outline"
              size="sm"
              className="mt-4"
              onClick={() => {
                setSearchQuery("");
                setStatusFilter("all");
              }}
            >
              Clear Filters
            </Button>
          )}
        </div>
      )}

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

