"use client"

import { createContext, useContext, useState, useCallback, useEffect, ReactNode } from "react"
import { toast } from "sonner"
import type { DraftVersion, EmailDraft, ImportedLead, OutreachBatch, EmailMetrics, DailyMetric, RecentSentEmail } from "@/types"
import { getAnalyticsData } from "@/app/actions/get-instantly-analytics"
import { getDefaultPromptTemplate } from "@/app/actions/get-default-prompt"
import { DEFAULT_DRAFTING_MODEL, isDraftingModelId, type DraftingModelId } from "@/lib/ai/models"

// Version history is now managed server-side by the email_draft_versions table.
// The frontend just trusts whatever previousVersions arrive in API responses.

const PROMPT_TEMPLATE_STORAGE_KEY = 'salesmatter_prompt_template_v9'
const LEGACY_PROMPT_TEMPLATE_STORAGE_KEYS = ['salesmatter_prompt_template_v5', 'salesmatter_prompt_template_v6', 'salesmatter_prompt_template_v7', 'salesmatter_prompt_template_v8']

const INITIAL_METRICS: EmailMetrics = {
    sent: 0,
    delivered: 0,
    opened: 0,
    uniqueOpened: 0,
    clicked: 0,
    uniqueClicked: 0,
    replied: 0,
    uniqueReplied: 0,
    bounced: 0,
    unsubscribed: 0,
    newLeadsContacted: 0,
    totalOpportunities: 0,
    opportunityValue: 0,
    interested: 0,
    meetingsBooked: 0,
    meetingsCompleted: 0,
    closed: 0,
    openRate: 0,
    clickRate: 0,
    replyRate: 0,
    bounceRate: 0,
    unsubscribeRate: 0,
}

interface ErrorState {
    message: string
    code?: string
    retryable: boolean
}

interface OutreachContextType {
    importedLeads: ImportedLead[]
    drafts: EmailDraft[]
    currentBatch: OutreachBatch | null
    isDrafting: boolean
    promptTemplate: string
    setPromptTemplate: (template: string) => void
    selectedModel: DraftingModelId
    setSelectedModel: (model: DraftingModelId) => void
    importLeads: (leads: ImportedLead[]) => void
    toggleLeadSelection: (leadId: string) => void
    selectAllLeads: (selected: boolean) => void
    generateDrafts: () => Promise<void>
    updateDraft: (draftId: string, updates: Partial<EmailDraft>) => void
    sendEmail: (draftId: string) => Promise<void>
    sendBulk: (draftIds: string[]) => Promise<void>
    sendNewEmail: (to: string, subject: string, body: string) => Promise<void>
    deleteDraft: (draftId: string) => void
    clearDrafts: () => Promise<{ success: boolean; deleted: number }>
    regenerateDraft: (draftId: string) => Promise<void>
    regeneratingDraftId: string | null
    regenerateAllDrafts: () => Promise<void>
    regenerateSelectedDrafts: (ids: string[]) => Promise<void>
    restoreDraftVersion: (draftId: string, versionId: string) => void
    isRegeneratingAll: boolean
    regeneratingAllProgress: { current: number; total: number } | null
    resetFlow: () => void
    metrics: EmailMetrics
    dailyMetrics: DailyMetric[]
    recentSentEmails: RecentSentEmail[]
    setMetrics: (metrics: EmailMetrics) => void
    setDailyMetrics: (metrics: DailyMetric[]) => void
    showOnboarding: boolean
    setShowOnboarding: (show: boolean) => void
    // Loading states
    isLoadingDrafts: boolean
    isLoadingAnalytics: boolean
    // Error states
    draftsError: ErrorState | null
    analyticsError: ErrorState | null
    generationError: ErrorState | null
    // Actions
    retryLoadDrafts: () => Promise<void>
    retryLoadAnalytics: () => Promise<void>
    clearErrors: () => void
    clearGenerationError: () => void
}

const OutreachContext = createContext<OutreachContextType | undefined>(undefined)

export function OutreachProvider({ children }: { children: ReactNode }) {
    const [importedLeads, setImportedLeads] = useState<ImportedLead[]>([])
    const [drafts, setDrafts] = useState<EmailDraft[]>([])
    const [currentBatch, setCurrentBatch] = useState<OutreachBatch | null>(null)
    const [isDrafting, setIsDrafting] = useState(false)

    // Initialize from localStorage if available; otherwise the default is
    // hydrated from cold-email-skill.md via a server action below so the .md
    // file stays the single source of truth.
    const [promptTemplate, setPromptTemplate] = useState(() => {
        if (typeof window !== 'undefined') {
            return localStorage.getItem(PROMPT_TEMPLATE_STORAGE_KEY) ?? ''
        }
        return ''
    })

    // Initialized to default so server and client first-render match. The saved
    // value (if any) is loaded from localStorage in a useEffect below.
    const [selectedModel, setSelectedModel] = useState<DraftingModelId>(DEFAULT_DRAFTING_MODEL)
    const [modelHydrated, setModelHydrated] = useState(false)

    const [metrics, setMetrics] = useState<EmailMetrics>(INITIAL_METRICS)
    const [dailyMetrics, setDailyMetrics] = useState<DailyMetric[]>([])
    const [recentSentEmails, setRecentSentEmails] = useState<RecentSentEmail[]>([])

    // Loading and error states
    const [isLoadingDrafts, setIsLoadingDrafts] = useState(true)
    const [isLoadingAnalytics, setIsLoadingAnalytics] = useState(true)
    const [draftsError, setDraftsError] = useState<ErrorState | null>(null)
    const [analyticsError, setAnalyticsError] = useState<ErrorState | null>(null)
    const [generationError, setGenerationError] = useState<ErrorState | null>(null)

    // Clear generation error
    const clearGenerationError = useCallback(() => {
        setGenerationError(null)
    }, [])

    // Helper to parse API errors into user-friendly messages
    const parseError = (error: any, fallback: string): ErrorState => {
        // Network errors (DNS, connection issues)
        if (error?.message?.includes('fetch failed') || error?.message?.includes('ENOTFOUND')) {
            return {
                message: 'Unable to connect to the database. Please check your internet connection.',
                code: 'NETWORK_ERROR',
                retryable: true
            }
        }
        // Timeout errors
        if (error?.message?.includes('timeout') || error?.code === 'ETIMEDOUT') {
            return {
                message: 'Request timed out. The server may be busy.',
                code: 'TIMEOUT',
                retryable: true
            }
        }
        // Server errors
        if (error?.status >= 500 || error?.code === 'INTERNAL_ERROR') {
            return {
                message: 'Server error. Please try again later.',
                code: 'SERVER_ERROR',
                retryable: true
            }
        }
        // Auth errors
        if (error?.status === 401 || error?.status === 403) {
            return {
                message: 'Authentication failed. Please refresh the page.',
                code: 'AUTH_ERROR',
                retryable: false
            }
        }
        // Default
        return {
            message: error?.message || fallback,
            code: error?.code || 'UNKNOWN',
            retryable: true
        }
    }

    // Fetch drafts with proper error handling
    const fetchDrafts = useCallback(async () => {
        setIsLoadingDrafts(true)
        setDraftsError(null)

        try {
            const res = await fetch("/api/drafts")

            if (!res.ok) {
                const errorData = await res.json().catch(() => ({}))
                throw {
                    message: errorData.error || 'Failed to load drafts',
                    code: errorData.code,
                    details: errorData.details,
                    status: res.status
                }
            }

            const data = await res.json()

            // Map DB drafts to frontend EmailDraft type
            const formattedDrafts: EmailDraft[] = (data.drafts || []).map((d: any) => ({
                id: d.id,
                leadId: d.lead_id,
                lead: {
                    id: d.leads?.id,
                    firstName: d.leads?.first_name,
                    lastName: d.leads?.last_name,
                    email: d.leads?.email,
                    company: d.leads?.company,
                    role: d.leads?.role,
                    status: d.leads?.status as any,
                    segment: "Mid-Market",
                    lastActivity: "Imported"
                },
                subject: d.subject,
                body: d.body,
                status: d.status,
                createdAt: d.created_at,
                sentAt: d.sent_at,
                researchSummary: d.research_summary,
                previousVersions: Array.isArray(d.previous_versions) ? d.previous_versions : [],
            }))

            setDrafts(formattedDrafts)
            setDraftsError(null)
        } catch (error: any) {
            console.error("Error loading drafts:", error)
            setDraftsError(parseError(error, 'Failed to load drafts'))
        } finally {
            setIsLoadingDrafts(false)
        }
    }, [])

    const fetchAnalytics = useCallback(async () => {
        setIsLoadingAnalytics(true)
        setAnalyticsError(null)

        try {
            const data = await getAnalyticsData()
            setMetrics(data.metrics)
            setDailyMetrics(data.dailyMetrics)
            setRecentSentEmails(data.recentSentEmails || [])
            setAnalyticsError(null)
        } catch (error: unknown) {
            console.error("Error loading analytics:", error)
            setAnalyticsError(parseError(error, 'Failed to load analytics'))
        } finally {
            setIsLoadingAnalytics(false)
        }
    }, [])

    // Clear all errors
    const clearErrors = useCallback(() => {
        setDraftsError(null)
        setAnalyticsError(null)
    }, [])

    // Load drafts and analytics on mount
    useEffect(() => {
        fetchDrafts()
        fetchAnalytics()
    }, [fetchDrafts, fetchAnalytics])

    // Hydrate the default prompt from cold-email-skill.md (server action) on
    // first mount when the user has no current saved override. The storage key
    // is versioned with the prompt so stale localStorage copies cannot outlive
    // cold-email-skill.md changes.
    useEffect(() => {
        if (typeof window === 'undefined') return
        LEGACY_PROMPT_TEMPLATE_STORAGE_KEYS.forEach((key) => localStorage.removeItem(key))
        if (localStorage.getItem(PROMPT_TEMPLATE_STORAGE_KEY)) return
        let cancelled = false
        getDefaultPromptTemplate()
            .then((skill) => {
                if (!cancelled) setPromptTemplate(skill)
            })
            .catch((err) => console.error('Failed to load default prompt template:', err))
        return () => {
            cancelled = true
        }
    }, [])

    // Persist to localStorage whenever it changes (only after hydration so we
    // don't write the empty initial state).
    useEffect(() => {
        if (typeof window === 'undefined') return
        if (!promptTemplate) return
        localStorage.setItem(PROMPT_TEMPLATE_STORAGE_KEY, promptTemplate)
    }, [promptTemplate])

    // Load saved model after first mount to avoid SSR/client hydration mismatch.
    useEffect(() => {
        const saved = localStorage.getItem('salesmatter_drafting_model')
        if (isDraftingModelId(saved)) {
            setSelectedModel(saved)
        }
        setModelHydrated(true)
    }, [])

    // Persist only after hydration so we don't overwrite the saved value on
    // the first render with the default.
    useEffect(() => {
        if (!modelHydrated) return
        localStorage.setItem('salesmatter_drafting_model', selectedModel)
    }, [selectedModel, modelHydrated])

    const [showOnboarding, setShowOnboarding] = useState(true)

    const importLeads = useCallback((leads: ImportedLead[]) => {
        setImportedLeads(leads.map((l) => ({ ...l, selected: true })))
        setCurrentBatch({
            id: `batch-${Date.now()}`,
            name: `Import ${new Date().toLocaleDateString()}`,
            status: "importing",
            totalLeads: leads.length,
            draftedCount: 0,
            sentCount: 0,
            createdAt: new Date().toISOString(),
        })
    }, [])

    const toggleLeadSelection = useCallback((leadId: string) => {
        setImportedLeads((prev) => prev.map((l) => (l.id === leadId ? { ...l, selected: !l.selected } : l)))
    }, [])

    const selectAllLeads = useCallback((selected: boolean) => {
        setImportedLeads((prev) => prev.map((l) => ({ ...l, selected })))
    }, [])

    const generateDrafts = useCallback(async () => {
        const selectedLeads = importedLeads.filter((l) => l.selected)
        if (selectedLeads.length === 0) return

        setIsDrafting(true)
        setGenerationError(null) // Clear any previous generation error
        setCurrentBatch((prev) => (prev ? { ...prev, status: "drafting" } : null))

        try {
            const response = await fetch("/api/generate", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ leads: selectedLeads, promptTemplate, modelId: selectedModel }),
            })

            const result = await response.json()

            // Check for API-level errors (like quota exceeded)
            if (result.error) {
                setGenerationError({
                    message: result.error,
                    code: result.errorCode || 'API_ERROR',
                    retryable: result.retryable ?? true
                })
                setCurrentBatch((prev) => (prev ? { ...prev, status: "failed" } : null))
                return
            }

            const { drafts: newRawDrafts } = result

            // Filter out failed drafts and only add successful ones
            const successfulDrafts = newRawDrafts.filter((d: any) => d.status !== "failed")

            const newDrafts: EmailDraft[] = successfulDrafts.map((d: any) => {
                const lead = selectedLeads.find((l) => l.id === d.leadId)!
                return {
                    id: d.id, // Use DB ID
                    leadId: lead.id,
                    lead: {
                        ...lead,
                        status: "New",
                        segment: "Mid-Market",
                        lastActivity: "Just now"
                    },
                    subject: d.subject,
                    body: d.body,
                    status: d.status,
                    createdAt: new Date().toISOString(),
                }
            })

            // Check if any individual drafts failed
            const failedDrafts = newRawDrafts.filter((d: any) => d.status === "failed")
            if (failedDrafts.length > 0 && successfulDrafts.length === 0) {
                // All failed - show the error
                const firstError = failedDrafts[0]
                setGenerationError({
                    message: firstError.error || 'Failed to generate drafts',
                    code: firstError.errorCode || 'GENERATION_FAILED',
                    retryable: firstError.retryable ?? true
                })
                setCurrentBatch((prev) => (prev ? { ...prev, status: "failed" } : null))
                return
            }

            setDrafts((prev) => [...newDrafts, ...prev])
            setCurrentBatch((prev) => (prev ? { ...prev, status: "ready", draftedCount: newDrafts.length } : null))
            setImportedLeads([])
        } catch (error: any) {
            console.error("Failed to generate drafts:", error)
            setGenerationError({
                message: error?.message || 'Failed to generate drafts. Please try again.',
                code: 'NETWORK_ERROR',
                retryable: true
            })
            setCurrentBatch((prev) => (prev ? { ...prev, status: "failed" } : null))
        } finally {
            setIsDrafting(false)
        }
    }, [importedLeads, promptTemplate, selectedModel])

    const updateDraft = useCallback(async (draftId: string, updates: Partial<EmailDraft>) => {
        // Optimistic update
        setDrafts((prev) => prev.map((d) => (d.id === draftId ? { ...d, ...updates } : d)))

        try {
            await fetch(`/api/drafts/${draftId}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(updates)
            })
        } catch (error) {
            console.error("Failed to update draft:", error)
            // Revert? For now, just log.
        }
    }, [])

    const sendEmail = useCallback(async (draftId: string) => {
        const draft = drafts.find((d) => d.id === draftId)
        if (!draft) return

        try {
            const response = await fetch("/api/send", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    drafts: [{
                        id: draft.id,
                        leadId: draft.leadId,
                        email: draft.lead.email,
                        subject: draft.subject,
                        body: draft.body,
                        firstName: draft.lead.firstName,
                        lastName: draft.lead.lastName,
                        companyName: draft.lead.company,
                    }]
                }),
            })

            const result = await response.json()
            if (result.error) throw new Error(result.error)

            setDrafts((prev) =>
                prev.map((d) => (d.id === draftId ? { ...d, status: "sent", sentAt: new Date().toISOString() } : d)),
            )
        } catch (error) {
            console.error("Failed to send email:", error)
            setDrafts((prev) =>
                prev.map((d) => (d.id === draftId ? { ...d, status: "failed" } : d)),
            )
        }
    }, [drafts])

    const sendBulk = useCallback(async (draftIds: string[]) => {
        const draftsToSend = drafts.filter((d) => draftIds.includes(d.id))
        if (draftsToSend.length === 0) return

        // Map to the flat shape the /api/send route expects
        const payload = draftsToSend.map((d) => ({
            id: d.id,
            leadId: d.leadId,
            email: d.lead.email,
            subject: d.subject,
            body: d.body,
            firstName: d.lead.firstName,
            lastName: d.lead.lastName,
            companyName: d.lead.company,
        }))

        try {
            const response = await fetch("/api/send", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ drafts: payload }),
            })

            const result = await response.json()

            // Update statuses based on results
            const results = result.results || []
            const successIds = new Set(results.filter((r: any) => r.status === "sent").map((r: any) =>
                draftsToSend.find(d => d.lead.email === r.email)?.id
            ).filter(Boolean))

            setDrafts((prev) =>
                prev.map((d) => {
                    if (successIds.has(d.id)) {
                        return { ...d, status: "sent", sentAt: new Date().toISOString() }
                    }
                    if (draftIds.includes(d.id) && !successIds.has(d.id)) {
                        return { ...d, status: "failed" }
                    }
                    return d
                }),
            )

        } catch (error) {
            console.error("Failed to send bulk emails:", error)
            setDrafts((prev) =>
                prev.map((d) => (draftIds.includes(d.id) ? { ...d, status: "failed" } : d)),
            )
        }
    }, [drafts])

    const deleteDraft = useCallback(async (draftId: string) => {
        setDrafts((prev) => prev.filter((d) => d.id !== draftId))
        try {
            await fetch(`/api/drafts/${draftId}`, { method: "DELETE" })
        } catch (error) {
            console.error("Failed to delete draft:", error)
        }
    }, [])

    const clearDrafts = useCallback(async (): Promise<{ success: boolean; deleted: number }> => {
        const previousDrafts = drafts
        const pendingCount = previousDrafts.filter((d) => d.status !== "sent").length

        // Optimistically remove pending drafts from UI
        setDrafts((prev) => prev.filter((d) => d.status === "sent"))

        try {
            const res = await fetch("/api/drafts?scope=pending", { method: "DELETE" })
            const result = await res.json()
            if (!res.ok || result.error) {
                throw new Error(result.error || `Clear failed (${res.status})`)
            }
            return { success: true, deleted: result.deleted ?? pendingCount }
        } catch (error) {
            console.error("Failed to clear drafts:", error)
            // Restore on failure
            setDrafts(previousDrafts)
            return { success: false, deleted: 0 }
        }
    }, [drafts])

    const sendNewEmail = useCallback(async (to: string, subject: string, body: string) => {
        try {
            // Create a temporary draft object for the API
            const tempDraft = {
                email: to,
                subject,
                body
            }

            const response = await fetch("/api/send", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                // The API expects an array of drafts. 
                // Note: The API interface uses 'email' field, which matches our tempDraft.
                body: JSON.stringify({ drafts: [tempDraft] }),
            })

            const result = await response.json()
            if (result.error) throw new Error(result.error)

            const success = result.results?.[0]?.status === "sent"
            if (!success) throw new Error(result.results?.[0]?.error || "Failed to send email")

            // Optionally, we could add this sent email to the drafts list as a "Sent" item
            // But for now we just return success/failure
        } catch (error) {
            console.error("Failed to send new email:", error)
            throw error // Re-throw so UI can handle it
        }
    }, [])

    const resetFlow = useCallback(() => {
        setImportedLeads([])
        setCurrentBatch(null)
    }, [])

    const [regeneratingDraftId, setRegeneratingDraftId] = useState<string | null>(null)
    const [isRegeneratingAll, setIsRegeneratingAll] = useState(false)
    const [regeneratingAllProgress, setRegeneratingAllProgress] = useState<{ current: number; total: number } | null>(null)

    // Calls POST /api/drafts/[id]/regenerate. The server archives the current
    // content into email_draft_versions, runs research + drafting, and updates
    // the same row in place (so the draft id stays stable).
    const runRegenerate = useCallback(
        async (draftId: string): Promise<boolean> => {
            try {
                const response = await fetch(`/api/drafts/${draftId}/regenerate`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ promptTemplate, modelId: selectedModel }),
                })
                const result = await response.json()
                if (!response.ok || result.error) {
                    throw new Error(result.error || `Regenerate failed (${response.status})`)
                }

                const updated = result.draft
                const previousVersions: DraftVersion[] = Array.isArray(result.previousVersions)
                    ? result.previousVersions
                    : []

                if (updated?.subject && updated?.body) {
                    setDrafts((prev) => prev.map((d) => {
                        if (d.id !== draftId) return d
                        return {
                            ...d,
                            subject: updated.subject,
                            body: updated.body,
                            status: (updated.status ?? "drafted") as EmailDraft["status"],
                            researchSummary: updated.researchSummary ?? d.researchSummary,
                            createdAt: updated.createdAt ?? new Date().toISOString(),
                            previousVersions,
                        }
                    }))
                    return true
                }
                return false
            } catch (error) {
                console.error(`Failed to regenerate draft ${draftId}:`, error)
                return false
            }
        },
        [promptTemplate, selectedModel],
    )

    const regenerateDraft = useCallback(async (draftId: string) => {
        const draft = drafts.find((d) => d.id === draftId)
        if (!draft) return

        setRegeneratingDraftId(draftId)
        const ok = await runRegenerate(draftId)
        setRegeneratingDraftId(null)

        if (ok) {
            toast.success("New draft generated", {
                description: "Previous draft saved to version history.",
            })
        } else {
            toast.error("Could not regenerate draft", { description: "Please try again." })
        }
    }, [drafts, runRegenerate])

    const regenerateAllDrafts = useCallback(async () => {
        const pendingDrafts = drafts.filter((d) => d.status !== "sent")
        if (pendingDrafts.length === 0 || isRegeneratingAll) return

        setIsRegeneratingAll(true)
        setRegeneratingAllProgress({ current: 0, total: pendingDrafts.length })

        let successCount = 0
        for (let i = 0; i < pendingDrafts.length; i++) {
            const draft = pendingDrafts[i]
            setRegeneratingAllProgress({ current: i + 1, total: pendingDrafts.length })
            setRegeneratingDraftId(draft.id)
            const ok = await runRegenerate(draft.id)
            if (ok) successCount += 1
        }

        setRegeneratingDraftId(null)
        setIsRegeneratingAll(false)
        setRegeneratingAllProgress(null)

        if (successCount > 0) {
            toast.success("Drafts regenerated", {
                description: "Previous drafts saved to version history.",
            })
        } else {
            toast.error("Could not regenerate drafts", { description: "Please try again." })
        }
    }, [drafts, isRegeneratingAll, runRegenerate])

    const regenerateSelectedDrafts = useCallback(async (ids: string[]) => {
        if (ids.length === 0 || isRegeneratingAll) return
        const selectedDrafts = drafts.filter((d) => ids.includes(d.id))
        if (selectedDrafts.length === 0) return

        setIsRegeneratingAll(true)
        setRegeneratingAllProgress({ current: 0, total: selectedDrafts.length })

        let successCount = 0
        for (let i = 0; i < selectedDrafts.length; i++) {
            const draft = selectedDrafts[i]
            setRegeneratingAllProgress({ current: i + 1, total: selectedDrafts.length })
            setRegeneratingDraftId(draft.id)
            const ok = await runRegenerate(draft.id)
            if (ok) successCount += 1
        }

        setRegeneratingDraftId(null)
        setIsRegeneratingAll(false)
        setRegeneratingAllProgress(null)

        if (successCount > 0) {
            toast.success("Drafts regenerated", {
                description: `Saved previous version${successCount === 1 ? "" : "s"} to history.`,
            })
        } else {
            toast.error("Could not regenerate drafts", { description: "Please try again." })
        }
    }, [drafts, isRegeneratingAll, runRegenerate])

    const restoreDraftVersion = useCallback(async (draftId: string, versionId: string) => {
        // Optimistic local swap so the UI feels instant; we reconcile against
        // the server response below.
        setDrafts((prev) => prev.map((d) => {
            if (d.id !== draftId) return d
            const target = d.previousVersions?.find((v) => v.id === versionId)
            if (!target) return d
            const archivedCurrent: DraftVersion = {
                id: `optimistic-${draftId}-${Date.now()}`,
                subject: d.subject,
                body: d.body,
                generatedAt: d.createdAt,
            }
            const remaining = (d.previousVersions ?? []).filter((v) => v.id !== versionId)
            return {
                ...d,
                subject: target.subject,
                body: target.body,
                createdAt: new Date().toISOString(),
                previousVersions: [archivedCurrent, ...remaining].slice(0, 5),
            }
        }))

        try {
            const response = await fetch(`/api/drafts/${draftId}/restore`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ versionId }),
            })
            const result = await response.json()
            if (!response.ok || result.error) {
                throw new Error(result.error || `Restore failed (${response.status})`)
            }

            const updated = result.draft
            const previousVersions: DraftVersion[] = Array.isArray(result.previousVersions)
                ? result.previousVersions
                : []

            setDrafts((prev) => prev.map((d) => {
                if (d.id !== draftId) return d
                return {
                    ...d,
                    subject: updated.subject ?? d.subject,
                    body: updated.body ?? d.body,
                    createdAt: updated.createdAt ?? d.createdAt,
                    researchSummary: updated.researchSummary ?? d.researchSummary,
                    previousVersions,
                }
            }))

            toast.success("Previous draft restored as current.")
        } catch (error) {
            console.error("Failed to restore draft version:", error)
            toast.error("Could not restore draft", { description: "Reloading to recover state." })
            // Refetch to recover any divergence between optimistic state and server.
            fetchDrafts()
        }
    }, [fetchDrafts])

    const value = {
        importedLeads,
        drafts,
        currentBatch,
        isDrafting,
        promptTemplate,
        setPromptTemplate,
        selectedModel,
        setSelectedModel,
        importLeads,
        toggleLeadSelection,
        selectAllLeads,
        generateDrafts,
        updateDraft,
        sendEmail,
        sendBulk,
        sendNewEmail,
        deleteDraft,
        clearDrafts,
        regenerateDraft,
        regeneratingDraftId,
        regenerateAllDrafts,
        regenerateSelectedDrafts,
        restoreDraftVersion,
        isRegeneratingAll,
        regeneratingAllProgress,
        resetFlow,
        metrics,
        dailyMetrics,
        recentSentEmails,
        setMetrics,
        setDailyMetrics,
        showOnboarding,
        setShowOnboarding,
        // Loading states
        isLoadingDrafts,
        isLoadingAnalytics,
        // Error states
        draftsError,
        analyticsError,
        generationError,
        // Actions
        retryLoadDrafts: fetchDrafts,
        retryLoadAnalytics: fetchAnalytics,
        clearErrors,
        clearGenerationError,
    }

    return <OutreachContext.Provider value={value}>{children}</OutreachContext.Provider>
}

export function useOutreachContext() {
    const context = useContext(OutreachContext)
    if (context === undefined) {
        throw new Error("useOutreachContext must be used within an OutreachProvider")
    }
    return context
}
