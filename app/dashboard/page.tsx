"use client"

import { useState, useCallback } from "react"
import { DashboardShell } from "@/components/dashboard-shell"
import { FileDropZone } from "@/components/outreach/file-drop-zone"
import { LeadSelectionTable } from "@/components/outreach/lead-selection-table"
import { PromptTemplateModal } from "@/components/outreach/prompt-template-modal"
import { OnboardingGuide } from "@/components/onboarding-guide"
import { Button } from "@/components/ui/button"
import { ErrorBanner } from "@/components/ui/error-banner"
import { Reasoning, ReasoningTrigger } from "@/components/ai-elements/reasoning"
import { Badge } from "@/components/ui/badge"
import { DRAFTING_MODEL_OPTIONS } from "@/lib/ai/models"
import { useOutreach } from "@/hooks/use-outreach"
import { ArrowRight, Sparkles, Loader2, Code2, Users, CheckCircle2, Cpu } from "lucide-react"
import type { ImportedLead } from "@/types"
import Link from "next/link"
import { toast } from "sonner"
import { MappingResult } from "@/lib/agents/mapping-agent"

class ImportError extends Error {
  description?: string
  code?: string
  constructor(message: string, description?: string, code?: string) {
    super(message)
    this.name = "ImportError"
    this.description = description
    this.code = code
  }
}

export default function LeadsPage() {
  const {
    importedLeads,
    drafts,
    isDrafting,
    promptTemplate,
    setPromptTemplate,
    selectedModel,
    importLeads,
    toggleLeadSelection,
    selectAllLeads,
    generateDrafts,
    resetFlow,
    showOnboarding,
    setShowOnboarding,
    generationError,
    clearGenerationError,
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

        let ingestRes: Response
        try {
          ingestRes = await fetch("/api/ingest", {
            method: "POST",
            body: formData,
          })
        } catch (networkErr) {
          throw new ImportError(
            "Couldn't reach the server",
            "Check your internet connection and try again.",
          )
        }

        // Server-side validation / parse / DB errors come through with structured shape
        if (!ingestRes.ok) {
          const payload = await ingestRes.json().catch(() => null)
          const serverError = payload?.error
          throw new ImportError(
            serverError?.message || `Server returned ${ingestRes.status}`,
            serverError?.details,
            serverError?.code,
          )
        }

        const result = await ingestRes.json()

        // New flow: server stored leads, fetch them by fileId
        if (result.fileId) {
          setMappingStatus("Loading processed leads...")

          let leads: any[] | null = null
          try {
            const leadsRes = await fetch(`/api/files/${result.fileId}/leads`)
            if (!leadsRes.ok) {
              throw new ImportError(
                "Couldn't load processed leads",
                "The file uploaded but we couldn't read it back. Try uploading again.",
              )
            }
            const body = await leadsRes.json()
            leads = body.leads ?? null
          } catch (err) {
            if (err instanceof ImportError) throw err
            throw new ImportError(
              "Couldn't load processed leads",
              "Network error while loading leads. Try again.",
            )
          }

          if (leads && leads.length > 0) {
            const mappedLeads: ImportedLead[] = leads.map((l: any) => {
              const { id, first_name, firstName, last_name, lastName, email, company, role, linkedin_url, linkedinUrl, company_url, companyUrl, created_at, updated_at, ...rest } = l;
              return {
                id: l.id,
                firstName: l.first_name || l.firstName || "",
                lastName: l.last_name || l.lastName || "",
                email: l.email || "",
                company: l.company || "",
                role: l.role || "",
                linkedinUrl: l.linkedin_url || l.linkedinUrl || "",
                companyUrl: l.company_url || l.companyUrl || "",
                selected: true,
                customFields: rest,
              };
            })
            importLeads(mappedLeads)
            toast.success(
              `Imported ${mappedLeads.length} lead${mappedLeads.length === 1 ? "" : "s"}`,
              result.skippedRows
                ? { description: `Skipped ${result.skippedRows} row${result.skippedRows === 1 ? "" : "s"} with missing or invalid email.` }
                : undefined,
            )
            return
          }

          // fileId present but zero leads — fall through to empty-file error below
        }

        // Legacy fallback: client-side mapping when server returned raw rows
        const { data } = result
        if (data && data.length > 0) {
          setMappingStatus("Identifying columns with AI...")
          const headers = Object.keys(data[0])
          const mapRes = await fetch("/api/map", {
            method: "POST",
            body: JSON.stringify({ headers, sampleRows: data.slice(0, 5) }),
          })
          if (!mapRes.ok) {
            throw new ImportError(
              "Column mapping failed",
              "We couldn't figure out which columns are which. Make sure your file has clear headers like 'email', 'name', 'company'.",
            )
          }
          const { mapping }: { mapping: MappingResult } = await mapRes.json()

          setMappingStatus("Mapping data...")
          const mappedLeads: ImportedLead[] = data.map((row: any, idx: number) => {
            const mappedValues = new Set([
              mapping.firstName, mapping.lastName, mapping.email,
              mapping.company, mapping.role, mapping.linkedin, mapping.companyUrl
            ].filter(Boolean));
            const customFields: Record<string, any> = {};
            for (const [key, value] of Object.entries(row)) {
              if (!mappedValues.has(key)) {
                customFields[key] = value;
              }
            }

            return {
              id: `lead-${Date.now()}-${idx}`,
              firstName: mapping.firstName ? (row[mapping.firstName] || "") : "",
              lastName: mapping.lastName ? (row[mapping.lastName] || "") : "",
              email: mapping.email ? (row[mapping.email] || "") : "",
              company: mapping.company ? (row[mapping.company] || "") : "",
              role: mapping.role ? (row[mapping.role] || "") : "",
              linkedinUrl: mapping.linkedin ? (row[mapping.linkedin] || "") : "",
              companyUrl: mapping.companyUrl ? (row[mapping.companyUrl] || "") : "",
              selected: true,
              customFields,
            }
          }).filter((l: ImportedLead) => l.email)

          if (mappedLeads.length === 0) {
            throw new ImportError(
              "No leads with email addresses found",
              `We parsed ${data.length} row${data.length === 1 ? "" : "s"} but none had a recognizable email column. Check that your file has an email column with valid addresses.`,
            )
          }

          importLeads(mappedLeads)
          toast.success(
            `Imported ${mappedLeads.length} lead${mappedLeads.length === 1 ? "" : "s"}`,
            mappedLeads.length < data.length
              ? { description: `Skipped ${data.length - mappedLeads.length} row${data.length - mappedLeads.length === 1 ? "" : "s"} with missing email.` }
              : undefined,
          )
          return
        }

        // Reached here: server returned 200 but the file produced no leads
        throw new ImportError(
          "No leads found in this file",
          "The file uploaded successfully but we couldn't extract any leads. Make sure it's a CSV or Excel file with at least an email column and one valid row.",
        )
      } catch (error) {
        console.error("Import failed:", error)
        if (error instanceof ImportError) {
          toast.error(error.message, {
            description: error.description,
          })
        } else {
          toast.error("Failed to import file", {
            description: error instanceof Error ? error.message : "Something unexpected went wrong. Try again.",
          })
        }
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

        {/* Generation Error Banner */}
        {generationError && (
          <div className="mx-6 mt-4">
            <ErrorBanner
              message={generationError.message}
              code={generationError.code}
              retryable={generationError.retryable}
              onRetry={generationError.retryable ? generateDrafts : undefined}
              onDismiss={clearGenerationError}
            />
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

                {/* Pro Tip Banner */}
                <div className="flex items-start gap-3 rounded-lg bg-blue-50 border border-blue-200 px-4 py-3 text-sm">
                  <Sparkles className="h-4 w-4 text-blue-600 mt-0.5 flex-shrink-0" />
                  <div className="text-blue-800">
                    <span className="font-semibold">Pro tip:</span> Include <span className="font-medium">Company URL</span> and <span className="font-medium">LinkedIn Profile</span> columns in your CSV for significantly better research results. Our AI will search these sources directly to find the most relevant and personalized information for your outreach.
                  </div>
                </div>

                {isDrafting && (
                  <div className="rounded-lg border border-border bg-card px-4 py-3 flex items-center justify-between gap-3">
                    <Reasoning isStreaming={isDrafting} className="flex-1 min-w-0 mb-0">
                      <ReasoningTrigger />
                    </Reasoning>
                    <Badge
                      variant="secondary"
                      className="shrink-0 gap-1.5 font-mono text-[10px] uppercase tracking-wide"
                      title={`AI model: ${DRAFTING_MODEL_OPTIONS[selectedModel].slug}`}
                    >
                      <Cpu className="h-3 w-3" />
                      {DRAFTING_MODEL_OPTIONS[selectedModel].label}
                    </Badge>
                  </div>
                )}

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
