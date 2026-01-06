"use client"

import { DashboardShell } from "@/components/dashboard-shell"
import { DraftsList } from "@/components/outreach/drafts-list"
import { PromptTemplateModal } from "@/components/outreach/prompt-template-modal"
import { FileSelectorModal } from "@/components/outreach/file-selector-modal"
import { Button } from "@/components/ui/button"
import { useOutreach } from "@/hooks/use-outreach"
import { Code2, FileEdit, ArrowRight, Sparkles, FolderOpen } from "lucide-react"
import Link from "next/link"

export default function DraftsPage() {
  const { drafts, promptTemplate, setPromptTemplate, updateDraft, sendEmail, sendBulk, deleteDraft, regenerateDraft, regeneratingDraftId } = useOutreach()

  const pendingDrafts = drafts.filter((d) => d.status !== "sent")
  const reviewedCount = drafts.filter((d) => d.status === "reviewed").length

  return (
    <DashboardShell>
      <div className="flex flex-col h-full">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border bg-card">
          <div>
            <h1 className="text-lg font-semibold text-foreground">Email Drafts</h1>
            <p className="text-sm text-muted-foreground">
              {pendingDrafts.length} draft{pendingDrafts.length !== 1 ? "s" : ""} pending
              {reviewedCount > 0 && <span className="text-primary"> · {reviewedCount} reviewed</span>}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <FileSelectorModal>
              <Button variant="outline" size="sm" className="gap-2 bg-transparent">
                <FolderOpen className="h-4 w-4" />
                Select from Files
              </Button>
            </FileSelectorModal>
            <PromptTemplateModal template={promptTemplate} onSave={setPromptTemplate}>
              <Button variant="outline" size="sm" className="gap-2 bg-transparent">
                <Code2 className="h-4 w-4" />
                View Prompt
              </Button>
            </PromptTemplateModal>
            {pendingDrafts.length > 0 && (
              <Link href="/send">
                <Button size="sm" className="gap-2">
                  Ready to Send
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
            )}
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 overflow-y-auto p-6">
          <div className="max-w-4xl mx-auto space-y-6">
            {pendingDrafts.length > 0 ? (
              <DraftsList
                drafts={pendingDrafts}
                onUpdate={updateDraft}
                onSend={sendEmail}
                onSendBulk={sendBulk}
                onDelete={deleteDraft}
                onRegenerate={regenerateDraft}
                regeneratingId={regeneratingDraftId}
              />
            ) : (
              <div className="flex flex-col items-center justify-center py-20 border border-dashed border-border rounded-xl bg-muted/20">
                <div className="rounded-full bg-primary/10 p-4 mb-4">
                  <FileEdit className="h-8 w-8 text-primary" />
                </div>
                <h3 className="text-base font-medium text-foreground mb-1">No drafts yet</h3>
                <p className="text-sm text-muted-foreground mb-6 text-center max-w-xs">
                  Import your leads or select from saved files to generate personalized email drafts
                </p>
                <div className="flex items-center gap-3">
                  <FileSelectorModal>
                    <Button variant="outline" className="gap-2">
                      <FolderOpen className="h-4 w-4" />
                      Select from Files
                    </Button>
                  </FileSelectorModal>
                  <Link href="/">
                    <Button className="gap-2">
                      <Sparkles className="h-4 w-4" />
                      Import New Leads
                    </Button>
                  </Link>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </DashboardShell>
  )
}
