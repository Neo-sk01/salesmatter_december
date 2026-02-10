"use client"

import { useState } from "react"
import { DashboardShell } from "@/components/dashboard-shell"
import { DraftsList } from "@/components/outreach/drafts-list"
import { Button } from "@/components/ui/button"
import { useOutreach } from "@/hooks/use-outreach"
import { ComposeEmailDialog } from "@/components/outreach/compose-email-dialog"
import { Send, CheckCircle2, Zap, FileEdit, Plus } from "lucide-react"
import Link from "next/link"
import { toast } from "sonner"

export default function SendPage() {
  const { drafts, updateDraft, sendEmail, sendBulk, deleteDraft, sendNewEmail, exportDraftsForReview, isExporting } = useOutreach()
  const [lastSent, setLastSent] = useState<string | null>(null)
  const [isComposeOpen, setIsComposeOpen] = useState(false)

  const pendingDrafts = drafts.filter((d) => d.status !== "sent")
  const sentDrafts = drafts.filter((d) => d.status === "sent")

  const handleSendEmail = (id: string) => {
    const draft = drafts.find((d) => d.id === id)
    sendEmail(id)
    if (draft) {
      setLastSent(`${draft.lead.firstName} ${draft.lead.lastName}`)
      setTimeout(() => setLastSent(null), 3000)
    }
  }

  const handleSendNewEmail = async (to: string, subject: string, body: string) => {
    try {
      await sendNewEmail(to, subject, body)
      setLastSent(to)
      toast.success("Email sent!", { description: `Email sent to ${to}` })
      setTimeout(() => setLastSent(null), 3000)
    } catch (error: any) {
      console.error("Failed to send email", error)
      toast.error("Failed to send email", {
        description: error?.message || "Please check the email details and try again."
      })
      throw error // Re-throw so dialog knows send failed
    }
  }

  return (
    <DashboardShell>
      <div className="flex flex-col h-full">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border bg-card">
          <div>
            <h1 className="text-lg font-semibold text-foreground">Send Emails</h1>
            <p className="text-sm text-muted-foreground">
              {pendingDrafts.length} ready to send · {sentDrafts.length} sent
            </p>
          </div>
          {pendingDrafts.length > 0 && (
            <div className="flex items-center gap-2">
              <Button variant="outline" onClick={() => setIsComposeOpen(true)} className="gap-2">
                <Plus className="h-4 w-4" />
                Compose
              </Button>
              <Button onClick={() => sendBulk(pendingDrafts.map((d) => d.id))} className="gap-2">
                <Zap className="h-4 w-4" />
                Send All ({pendingDrafts.length})
              </Button>
            </div>
          )}
          {pendingDrafts.length === 0 && (
            <Button variant="outline" onClick={() => setIsComposeOpen(true)} className="gap-2">
              <Plus className="h-4 w-4" />
              Compose
            </Button>
          )}
        </div>

        {lastSent && (
          <div className="mx-6 mt-4 flex items-center gap-2 rounded-lg bg-emerald-50 border border-emerald-200 px-4 py-3 text-sm text-emerald-700 animate-in fade-in slide-in-from-top-2 duration-300">
            <CheckCircle2 className="h-4 w-4" />
            Email sent to {lastSent}
          </div>
        )}

        {/* Main Content */}
        <div className="flex-1 overflow-y-auto p-6">
          <div className="max-w-4xl mx-auto space-y-8">
            {/* Pending Drafts */}
            {pendingDrafts.length > 0 ? (
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <div className="h-2 w-2 rounded-full bg-primary animate-pulse" />
                  <h2 className="text-base font-medium text-foreground">Ready to Send</h2>
                </div>
                <DraftsList
                  drafts={pendingDrafts}
                  onUpdate={updateDraft}
                  onSend={handleSendEmail}
                  onSendBulk={sendBulk}
                  onDelete={deleteDraft}
                  onExport={exportDraftsForReview}
                  isExporting={isExporting}
                />
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-20 border border-dashed border-border rounded-xl bg-muted/20">
                <div className="rounded-full bg-primary/10 p-4 mb-4">
                  <Send className="h-8 w-8 text-primary" />
                </div>
                <h3 className="text-base font-medium text-foreground mb-1">No emails ready to send</h3>
                <p className="text-sm text-muted-foreground mb-6 text-center max-w-xs">
                  Review and edit your drafts, then come back here to send
                </p>
                <Link href="/drafts">
                  <Button variant="outline" className="gap-2 bg-transparent">
                    <FileEdit className="h-4 w-4" />
                    View Drafts
                  </Button>
                </Link>
              </div>
            )}

            {/* Sent Emails */}
            {sentDrafts.length > 0 && (
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                  <h2 className="text-base font-medium text-foreground">Successfully Sent</h2>
                  <span className="text-xs text-muted-foreground">({sentDrafts.length})</span>
                </div>
                <div className="opacity-60 hover:opacity-100 transition-opacity">
                  <DraftsList
                    drafts={sentDrafts}
                    onUpdate={updateDraft}
                    onSend={handleSendEmail}
                    onSendBulk={sendBulk}
                    onDelete={deleteDraft}
                  />
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      <ComposeEmailDialog
        open={isComposeOpen}
        onOpenChange={setIsComposeOpen}
        onSend={handleSendNewEmail}
      />
    </DashboardShell>
  )
}
