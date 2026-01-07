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


import { MappingResult } from "@/lib/agents/mapping-agent"

// ... imports

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
  const [mappingStatus, setMappingStatus] = useState<string | null>(null)

  const handleFileAccepted = useCallback(
    async (file: File) => {
      setIsParsing(true)
      setMappingStatus("Uploading and parsing file...")

      try {
        // 1. Ingest
        const formData = new FormData()
        formData.append("file", file)
        const ingestRes = await fetch("/api/ingest", {
          method: "POST",
          body: formData,
        })
        if (ingestRes.ok) {
          const result = await ingestRes.json()

          if (result.fileId) {
            // New flow: Server-side processed
            setMappingStatus("Loading processed leads...")
            const leadsRes = await fetch(`/api/files/${result.fileId}/leads`)
            const { leads } = await leadsRes.json()

            if (leads && leads.length > 0) {
              const mappedLeads: ImportedLead[] = leads.map((l: any) => ({
                id: l.id,
                firstName: l.first_name || l.firstName || "",
                lastName: l.last_name || l.lastName || "",
                email: l.email || "",
                company: l.company || "",
                role: l.role || "",
                linkedinUrl: l.linkedin_url || l.linkedinUrl || "",
                companyUrl: l.company_url || l.companyUrl || "",
                selected: true,
              }))
              importLeads(mappedLeads)
              return
            }
          }

          // Fallback to legacy client-side flow if data returned
          const { data } = result
          if (data && data.length > 0) {
            // 2. Identify Columns
            setMappingStatus("Identifying columns with AI...")
            const headers = Object.keys(data[0])
            const mapRes = await fetch("/api/map", {
              method: "POST",
              body: JSON.stringify({ headers, sampleRows: data.slice(0, 5) }),
            })
            const { mapping }: { mapping: MappingResult } = await mapRes.json()

            // 3. Transform Data
            setMappingStatus("Mapping data...")
            const mappedLeads: ImportedLead[] = data.map((row: any, idx: number) => ({
              id: `lead-${Date.now()}-${idx}`,
              firstName: row[mapping.firstName] || "",
              lastName: row[mapping.lastName] || "",
              email: row[mapping.email] || "",
              company: row[mapping.company] || "",
              role: row[mapping.role || ""] || "",
              linkedinUrl: row[mapping.linkedin || ""] || "",
              companyUrl: row[mapping.companyUrl || ""] || "",
              selected: true,
            })).filter((l: ImportedLead) => l.email)

            importLeads(mappedLeads)
            return
          }
        }

        throw new Error("No data found in file")
      } catch (error) {
        console.error("Import failed:", error)
        // Ideally show error toast
      } finally {
        setIsParsing(false)
        setMappingStatus(null)
      }
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
                {mappingStatus || "Processing file..."}
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
