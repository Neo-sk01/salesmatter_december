"use client"

import { useState, useCallback } from "react"
import { DashboardShell } from "@/components/dashboard-shell"
import { FileDropZone } from "@/components/outreach/file-drop-zone"
import { LeadSelectionTable } from "@/components/outreach/lead-selection-table"
import { PromptTemplateModal } from "@/components/outreach/prompt-template-modal"
import { OnboardingGuide } from "@/components/onboarding-guide"
import { Button } from "@/components/ui/button"
import { useOutreach } from "@/hooks/use-outreach"
import { ArrowRight, Sparkles, Loader2, Code2, Users, CheckCircle2 } from "lucide-react"
import type { ImportedLead } from "@/types"
import Link from "next/link"

function parseFile(file: File): Promise<ImportedLead[]> {
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve([
        {
          id: "i1",
          firstName: "Alice",
          lastName: "Johnson",
          email: "alice@burnmediagroup.com",
          company: "Burn Media Group",
          role: "CTO",
          selected: true,
        },
        {
          id: "i2",
          firstName: "Bob",
          lastName: "Smith",
          email: "bob@mambaonline.com",
          company: "MambaOnline",
          role: "CEO",
          selected: true,
        },
        {
          id: "i3",
          firstName: "Carol",
          lastName: "White",
          email: "carol@capetown.co.za",
          company: "Cape Town",
          role: "VP Sales",
          selected: true,
        },
        {
          id: "i4",
          firstName: "David",
          lastName: "Brown",
          email: "david@burnmediagroup.com",
          company: "Burn Media Group",
          role: "Director",
          selected: true,
        },
        {
          id: "i5",
          firstName: "Eve",
          lastName: "Davis",
          email: "eve@mambaonline.com",
          company: "MambaOnline",
          role: "Manager",
          selected: true,
        },
      ])
    }, 800)
  })
}

export default function LeadsPage() {
  const {
    importedLeads,
    drafts,
    isDrafting,
    promptTemplate,
    setPromptTemplate,
    importLeads,
    toggleLeadSelection,
    selectAllLeads,
    generateDrafts,
    resetFlow,
    showOnboarding,
    setShowOnboarding,
  } = useOutreach()

  const [isParsing, setIsParsing] = useState(false)
  const [showSuccess, setShowSuccess] = useState(false)

  const handleFileAccepted = useCallback(
    async (file: File) => {
      setIsParsing(true)
      const leads = await parseFile(file)
      importLeads(leads)
      setIsParsing(false)
    },
    [importLeads],
  )

  const handleGenerateDrafts = useCallback(async () => {
    await generateDrafts()
    setShowSuccess(true)
    setTimeout(() => setShowSuccess(false), 3000)
  }, [generateDrafts])

  const selectedCount = importedLeads.filter((l) => l.selected).length
  const hasLeads = importedLeads.length > 0
  const pendingDrafts = drafts.filter((d) => d.status !== "sent")

  return (
    <DashboardShell>
      <div className="flex flex-col h-full">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border bg-card">
          <div>
            <h1 className="text-lg font-semibold text-foreground">Lead List</h1>
            <p className="text-sm text-muted-foreground">
              {hasLeads
                ? `${importedLeads.length} leads imported · ${selectedCount} selected`
                : "Import and manage your outreach leads"}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <PromptTemplateModal template={promptTemplate} onSave={setPromptTemplate}>
              <Button variant="outline" size="sm" className="gap-2 bg-transparent">
                <Code2 className="h-4 w-4" />
                View Prompt
              </Button>
            </PromptTemplateModal>
          </div>
        </div>

        {showSuccess && (
          <div className="mx-6 mt-4 flex items-center gap-2 rounded-lg bg-emerald-50 border border-emerald-200 px-4 py-3 text-sm text-emerald-700 animate-in fade-in slide-in-from-top-2 duration-300">
            <CheckCircle2 className="h-4 w-4" />
            Drafts generated successfully!
            <Link
              href="/drafts"
              className="ml-auto text-emerald-700 hover:text-emerald-800 font-medium flex items-center gap-1"
            >
              View Drafts <ArrowRight className="h-3 w-3" />
            </Link>
          </div>
        )}

        {/* Main Content */}
        <div className="flex-1 overflow-y-auto p-6">
          <div className="max-w-4xl mx-auto space-y-6">
            {showOnboarding && <OnboardingGuide onDismiss={() => setShowOnboarding(false)} />}

            {/* File Drop Zone */}
            <FileDropZone onFileAccepted={handleFileAccepted} />

            {isParsing && (
              <div className="flex items-center justify-center gap-2 py-6 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                Parsing your file...
              </div>
            )}

            {/* Lead Selection Table */}
            {hasLeads && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="rounded-lg bg-primary/10 p-2">
                      <Users className="h-4 w-4 text-primary" />
                    </div>
                    <div>
                      <h2 className="text-base font-medium text-foreground">Imported Leads</h2>
                      <p className="text-xs text-muted-foreground">Select which leads to generate emails for</p>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={resetFlow}
                    className="text-muted-foreground hover:text-foreground"
                  >
                    Clear All
                  </Button>
                </div>

                <LeadSelectionTable leads={importedLeads} onToggle={toggleLeadSelection} onSelectAll={selectAllLeads} />

                <div className="flex justify-end pt-2">
                  <Button
                    onClick={handleGenerateDrafts}
                    disabled={selectedCount === 0 || isDrafting}
                    className="gap-2"
                    size="lg"
                  >
                    {isDrafting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                    {isDrafting ? "Generating..." : `Generate ${selectedCount} Drafts`}
                    {!isDrafting && <ArrowRight className="h-4 w-4" />}
                  </Button>
                </div>
              </div>
            )}

            {/* Link to Drafts if drafts exist */}
            {pendingDrafts.length > 0 && !hasLeads && (
              <div className="flex items-center justify-center py-10 border border-dashed border-border rounded-xl bg-muted/20">
                <div className="text-center">
                  <div className="rounded-full bg-primary/10 p-3 mx-auto mb-3 w-fit">
                    <Sparkles className="h-5 w-5 text-primary" />
                  </div>
                  <p className="text-sm text-foreground font-medium mb-1">
                    {pendingDrafts.length} draft{pendingDrafts.length !== 1 ? "s" : ""} ready
                  </p>
                  <p className="text-xs text-muted-foreground mb-4">Review and send your personalized emails</p>
                  <Link href="/drafts">
                    <Button className="gap-2">
                      View Drafts
                      <ArrowRight className="h-4 w-4" />
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
