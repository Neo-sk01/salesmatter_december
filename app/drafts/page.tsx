"use client"

import { useState } from "react"
import { DashboardShell } from "@/components/dashboard-shell"
import { DraftsList } from "@/components/outreach/drafts-list"
import { PromptTemplateModal } from "@/components/outreach/prompt-template-modal"
import { FileSelectorModal } from "@/components/outreach/file-selector-modal"
import { Button } from "@/components/ui/button"
import { ErrorBanner, LoadingSkeleton } from "@/components/ui/error-banner"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { DRAFTING_MODEL_OPTIONS, type DraftingModelId } from "@/lib/ai/models"
import { useOutreach } from "@/hooks/use-outreach"
import { Code2, FileEdit, ArrowRight, Sparkles, FolderOpen, Loader2, RotateCcw, Cpu, Trash2, AlertTriangle } from "lucide-react"
import Link from "next/link"
import { toast } from "sonner"

export default function DraftsPage() {
  const {
    drafts,
    promptTemplate,
    setPromptTemplate,
    selectedModel,
    setSelectedModel,
    updateDraft,
    sendEmail,
    sendBulk,
    deleteDraft,
    clearDrafts,
    regenerateDraft,
    regeneratingDraftId,
    regenerateAllDrafts,
    regenerateSelectedDrafts,
    restoreDraftVersion,
    isRegeneratingAll,
    regeneratingAllProgress,
    // Loading and error states
    isLoadingDrafts,
    draftsError,
    retryLoadDrafts,
  } = useOutreach()

  const pendingDrafts = drafts.filter((d) => d.status !== "sent")
  const reviewedCount = drafts.filter((d) => d.status === "reviewed").length

  const [isClearing, setIsClearing] = useState(false)

  const handleClearDrafts = async () => {
    setIsClearing(true)
    const result = await clearDrafts()
    setIsClearing(false)
    if (result.success) {
      toast.success(
        result.deleted === 0
          ? "No drafts to clear."
          : `Cleared ${result.deleted} draft${result.deleted === 1 ? "" : "s"}.`,
      )
    } else {
      toast.error("Could not clear drafts. Please try again.")
    }
  }

  return (
    <DashboardShell>
      <div className="flex flex-col h-full">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border bg-card">
          <div>
            <h1 className="text-lg font-semibold text-foreground">Email Drafts</h1>
            <p className="text-sm text-muted-foreground">
              {isLoadingDrafts ? (
                <span className="flex items-center gap-2">
                  <Loader2 className="h-3 w-3 animate-spin" />
                  Loading drafts...
                </span>
              ) : (
                <>
                  {pendingDrafts.length} draft{pendingDrafts.length !== 1 ? "s" : ""} pending
                  {reviewedCount > 0 && <span className="text-primary"> · {reviewedCount} reviewed</span>}
                </>
              )}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <div
              className="flex items-center gap-1.5 pr-1"
              title={`Drafting model: ${DRAFTING_MODEL_OPTIONS[selectedModel].slug}`}
            >
              <Cpu className="h-4 w-4 text-muted-foreground" />
              <Select
                value={selectedModel}
                onValueChange={(v) => setSelectedModel(v as DraftingModelId)}
                disabled={isRegeneratingAll}
              >
                <SelectTrigger className="h-8 w-[180px] font-mono text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {(Object.keys(DRAFTING_MODEL_OPTIONS) as DraftingModelId[]).map((id) => (
                    <SelectItem key={id} value={id} className="font-mono text-xs">
                      <div className="flex flex-col">
                        <span>{DRAFTING_MODEL_OPTIONS[id].label}</span>
                        <span className="text-[10px] text-muted-foreground">
                          {DRAFTING_MODEL_OPTIONS[id].slug}
                        </span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
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
              <Button
                variant="outline"
                size="sm"
                className="gap-2 bg-transparent text-amber-600 border-amber-200 hover:bg-amber-50 hover:text-amber-700"
                onClick={regenerateAllDrafts}
                disabled={isRegeneratingAll}
                title="Regenerate all pending drafts with fresh research"
              >
                {isRegeneratingAll ? (
                  <>
                    <RotateCcw className="h-4 w-4 animate-spin" />
                    {regeneratingAllProgress
                      ? `Regenerating ${regeneratingAllProgress.current} / ${regeneratingAllProgress.total}`
                      : "Regenerating..."}
                  </>
                ) : (
                  <>
                    <RotateCcw className="h-4 w-4" />
                    Regenerate All
                  </>
                )}
              </Button>
            )}
            {pendingDrafts.length > 0 && (
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    className="gap-2 bg-transparent text-destructive border-destructive/30 hover:bg-destructive/10 hover:text-destructive"
                    disabled={isClearing || isRegeneratingAll}
                    title="Delete all pending drafts"
                  >
                    <Trash2 className="h-4 w-4" />
                    {isClearing ? "Clearing..." : "Clear Drafts"}
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle className="flex items-center gap-2">
                      <AlertTriangle className="h-5 w-5 text-destructive" />
                      Clear all pending drafts?
                    </AlertDialogTitle>
                    <AlertDialogDescription>
                      This will permanently delete {pendingDrafts.length} pending draft
                      {pendingDrafts.length === 1 ? "" : "s"}. Sent emails will not be affected. This action cannot be undone.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel disabled={isClearing}>Cancel</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={handleClearDrafts}
                      disabled={isClearing}
                      className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                    >
                      {isClearing ? "Clearing..." : "Yes, clear drafts"}
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            )}
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
          <div className="max-w-[61.6rem] mx-auto space-y-6">
            {/* Error Banner */}
            {draftsError && (
              <ErrorBanner
                message={draftsError.message}
                code={draftsError.code}
                retryable={draftsError.retryable}
                onRetry={retryLoadDrafts}
              />
            )}

            {/* Loading State */}
            {isLoadingDrafts && !draftsError && (
              <div className="space-y-4">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="rounded-lg border border-border bg-card p-4">
                    <LoadingSkeleton className="h-24" />
                  </div>
                ))}
              </div>
            )}

            {/* Content */}
            {!isLoadingDrafts && !draftsError && (
              <>
                {pendingDrafts.length > 0 ? (
                  <DraftsList
                    drafts={pendingDrafts}
                    onUpdate={updateDraft}
                    onSend={sendEmail}
                    onSendBulk={sendBulk}
                    onDelete={deleteDraft}
                    onRegenerate={regenerateDraft}
                    onRegenerateSelected={regenerateSelectedDrafts}
                    onRestoreVersion={restoreDraftVersion}
                    regeneratingId={regeneratingDraftId}
                    isRegeneratingAll={isRegeneratingAll}
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
                      <Link href="/dashboard">
                        <Button className="gap-2">
                          <Sparkles className="h-4 w-4" />
                          Import New Leads
                        </Button>
                      </Link>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </DashboardShell>
  )
}
