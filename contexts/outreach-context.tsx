"use client"

import { createContext, useContext, useState, useCallback, useEffect, ReactNode } from "react"
import type { EmailDraft, ImportedLead, OutreachBatch, EmailMetrics, DailyMetric, RecentSentEmail } from "@/types"
import { getAnalyticsData } from "@/app/actions/get-analytics"

const DEFAULT_PROMPT_TEMPLATE = `You are an expert sales copywriter following the Carl Davis XYZ Formula for cold outreach. Every email must follow a 6-component messaging structure designed for natural, conversational, high-converting cold outreach. No exceptions.

THE CARL DAVIS XYZ FORMULA — NON-NEGOTIABLE STRUCTURE
Every email must follow this exact order:
1. Connection
2. Specialty
3. Problem or Desire
4. Value
5. End Result
6. CTA
Do not skip, merge, or reorder.

COMPONENT 1 — CONNECTION
"Hello [Name], I'm Carl Davis with SalesMatter."
- Must reference something real and specific
- Must feel researched
- Must signal this is NOT mass outreach
Valid sources: Company positioning, Partnerships, Press mentions, Product activity, Market behavior.
Rules: 1–2 sentences max. No generic openers. Must feel tailored.

COMPONENT 2 — SPECIALTY
"We specialize in working with [specific role or organization type]…"
SalesMatter positioning examples: media sales leaders, revenue teams running outbound, founders scaling cold email, agencies managing outreach.
Rules: Be precise. Must feel like it describes the prospect exactly.

COMPONENT 3 — PROBLEM OR DESIRE
"…who are experiencing / looking for / need / that…"
SalesMatter problems: low reply rates, inconsistent follow ups, manual personalization, scattered tools, difficulty scaling outbound.
Rules: NOT a question. ONE problem only. Must feel realistic.

COMPONENT 4 — VALUE
"We help them [reduce/increase/improve/grow] [outcome]."
Focus only on outcomes.
Examples: reduce manual outreach effort, increase qualified pipeline, improve reply rates, eliminate inefficiency.
Rules: No features. 1–2 sentences. Must mirror how buyers think.

COMPONENT 5 — END RESULT
"For our clients this has meant…"
Examples: measurable lift in replies, more consistent pipeline, better engagement, fewer missed opportunities.
Rules: Use real or directional outcomes. No fake metrics. Keep concise.

COMPONENT 6 — CTA
"I would like to [action] to [soft outcome]."
Approved CTAs: ask a few questions, review what you are doing, discuss your situation, go through your requirements.
Rules: ONE CTA only. Must be soft. No demo requests.

SUBJECT LINE RULES
- Under 8 words
- No hype or clickbait
Examples: Quick question re [Company] growth, Improving [Company] outreach flow, [Company] pipeline consistency, Question about your outreach.

EMAIL STYLE RULES
- Length: 150–220 words
- Tone: Conversational, operator-level
- Paragraphs: 2–3 sentences max
- Formatting: Plain text
- Language: Simple, no jargon
- Personalization: Minimum 2 real references

SALESMATTER CONTEXT
What it is: AI powered outbound platform
What it does: Manages outreach, personalizes emails at scale, improves reply rates, keeps pipeline consistent
Replaces: spreadsheets, manual writing, disconnected tools

QUALITY CHECKLIST
Every email must pass:
- Correct 6-component structure
- Subject under 8 words
- 2+ personalization points
- 1 clear problem
- Outcome-driven value
- Directional or measurable result
- 1 soft CTA only
- Natural tone, no jargon

FINAL INSTRUCTION
Write like a real person who understands outbound deeply and has done this before.
The email should feel personal, relevant, slightly imperfect, and easy to reply to.
Not polished, corporate, or generic.

GOLD STANDARD EXAMPLES (REFERENCE OUTPUTS)
Use the tone, structure, and quality from these examples:

Example 1 Subject: Quick question re Mediamark growth
Hello Wayne,
I saw how Mediamark continues expanding its footprint across audio and digital, especially with partners like Warner Music Africa and Podcast and Chill. It looks like you are leaning into multi channel audience monetization quite aggressively.
We specialize in working with media sales leaders and commercial teams running multi platform advertising portfolios who are looking to keep outbound conversations consistent while scaling partner acquisition.
We help them reduce manual outreach effort and increase qualified pipeline from outbound.
For our clients this has meant a more consistent flow of brand conversations and a noticeable lift in response rates within the first few weeks.
I would like to ask a few questions about how your team is currently approaching outbound to see if this could be of value to you.

Example 2 Subject: Connecting Mediamark outbound
Hello Wayne,
I came across Mediamark’s positioning as a multi channel sales house bridging advertisers with platforms like Odeeo and VIU. It feels like a model that depends heavily on continuous outreach to keep deal flow active.
We specialize in working with CEOs and revenue leaders in media and digital sales organizations who are looking for more structured outbound systems without losing personalization.
We help them minimize inconsistent follow ups and grow pipeline quality through more relevant outreach.
For most teams this results in more replies from the same volume of emails and fewer missed opportunities over time.
I would like to review what you are currently doing for outbound to see if we might have a reason to speak.`;

const INITIAL_METRICS: EmailMetrics = {
    sent: 0,
    delivered: 0,
    opened: 0,
    clicked: 0,
    replied: 0,
    bounced: 0,
    openRate: 0,
    clickRate: 0,
    replyRate: 0,
    bounceRate: 0,
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
    importLeads: (leads: ImportedLead[]) => void
    toggleLeadSelection: (leadId: string) => void
    selectAllLeads: (selected: boolean) => void
    generateDrafts: () => Promise<void>
    updateDraft: (draftId: string, updates: Partial<EmailDraft>) => void
    sendEmail: (draftId: string) => Promise<void>
    sendBulk: (draftIds: string[]) => Promise<void>
    sendNewEmail: (to: string, subject: string, body: string) => Promise<void>
    deleteDraft: (draftId: string) => void
    regenerateDraft: (draftId: string) => Promise<void>
    regeneratingDraftId: string | null
    regenerateAllDrafts: () => Promise<void>
    regenerateSelectedDrafts: (ids: string[]) => Promise<void>
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
    exportDraftsForReview: (recipientEmail: string, draftIds?: string[]) => Promise<{ success: boolean; message?: string; error?: string }>
    isExporting: boolean
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

    // Initialize from localStorage if available
    const [promptTemplate, setPromptTemplate] = useState(() => {
        if (typeof window !== 'undefined') {
            const saved = localStorage.getItem('salesmatter_prompt_template_v2')
            return saved || DEFAULT_PROMPT_TEMPLATE
        }
        return DEFAULT_PROMPT_TEMPLATE
    })

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
                researchSummary: d.research_summary
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

    // Fetch analytics with proper error handling
    const fetchAnalytics = useCallback(async () => {
        setIsLoadingAnalytics(true)
        setAnalyticsError(null)

        try {
            const data = await getAnalyticsData()
            setMetrics(data.metrics)
            setDailyMetrics(data.dailyMetrics)
            setRecentSentEmails(data.recentSentEmails || [])
            setAnalyticsError(null)
        } catch (error: any) {
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

    // Persist to localStorage whenever it changes
    useEffect(() => {
        if (typeof window !== 'undefined') {
            localStorage.setItem('salesmatter_prompt_template_v2', promptTemplate)
        }
    }, [promptTemplate])

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
                body: JSON.stringify({ leads: selectedLeads, promptTemplate }),
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
    }, [importedLeads, promptTemplate])

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
    const [isExporting, setIsExporting] = useState(false)

    const exportDraftsForReview = useCallback(async (
        recipientEmail: string,
        draftIds?: string[]
    ): Promise<{ success: boolean; message?: string; error?: string }> => {
        // Get drafts to export (either specified IDs or all pending drafts)
        const draftsToExport = draftIds
            ? drafts.filter(d => draftIds.includes(d.id))
            : drafts.filter(d => d.status !== 'sent')

        if (draftsToExport.length === 0) {
            return { success: false, error: 'No drafts to export' }
        }

        setIsExporting(true)

        try {
            const response = await fetch('/api/export-drafts', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    drafts: draftsToExport,
                    recipientEmail,
                }),
            })

            const result = await response.json()

            if (!result.success) {
                return { success: false, error: result.error }
            }

            return { success: true, message: result.message }
        } catch (error: any) {
            console.error('Failed to export drafts:', error)
            return { success: false, error: error.message || 'Failed to export drafts' }
        } finally {
            setIsExporting(false)
        }
    }, [drafts])

    const regenerateDraft = useCallback(async (draftId: string) => {
        const draft = drafts.find((d) => d.id === draftId)
        if (!draft) return

        setRegeneratingDraftId(draftId)

        try {
            // Call the generate API with just this lead
            const leadForRegeneration = {
                id: draft.leadId,
                firstName: draft.lead.firstName,
                lastName: draft.lead.lastName,
                email: draft.lead.email,
                company: draft.lead.company,
                role: draft.lead.role,
                selected: true
            }

            const response = await fetch("/api/generate", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ leads: [leadForRegeneration], promptTemplate, isRegenerate: true }),
            })

            const result = await response.json()
            if (result.error) throw new Error(result.error)

            const newDraft = result.drafts?.[0]
            if (newDraft && newDraft.subject && newDraft.body) {
                // Delete old draft from DB
                await fetch(`/api/drafts/${draftId}`, { method: "DELETE" })

                // Update local state: replace old draft with new one
                setDrafts((prev) => prev.map((d) => {
                    if (d.id === draftId) {
                        return {
                            ...d,
                            id: newDraft.id,
                            subject: newDraft.subject,
                            body: newDraft.body,
                            status: "drafted" as const,
                            researchSummary: newDraft.researchSummary,
                            createdAt: new Date().toISOString()
                        }
                    }
                    return d
                }))
            }
        } catch (error) {
            console.error("Failed to regenerate draft:", error)
        } finally {
            setRegeneratingDraftId(null)
        }
    }, [drafts, promptTemplate])

    const regenerateAllDrafts = useCallback(async () => {
        const pendingDrafts = drafts.filter((d) => d.status !== "sent")
        if (pendingDrafts.length === 0 || isRegeneratingAll) return

        setIsRegeneratingAll(true)
        setRegeneratingAllProgress({ current: 0, total: pendingDrafts.length })

        for (let i = 0; i < pendingDrafts.length; i++) {
            const draft = pendingDrafts[i]
            setRegeneratingAllProgress({ current: i + 1, total: pendingDrafts.length })
            setRegeneratingDraftId(draft.id)

            try {
                const leadForRegeneration = {
                    id: draft.leadId,
                    firstName: draft.lead.firstName,
                    lastName: draft.lead.lastName,
                    email: draft.lead.email,
                    company: draft.lead.company,
                    role: draft.lead.role,
                    selected: true
                }

                const response = await fetch("/api/generate", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ leads: [leadForRegeneration], promptTemplate, isRegenerate: true }),
                })

                const result = await response.json()
                if (result.error) throw new Error(result.error)

                const newDraft = result.drafts?.[0]
                if (newDraft?.subject && newDraft?.body) {
                    await fetch(`/api/drafts/${draft.id}`, { method: "DELETE" })
                    setDrafts((prev) => prev.map((d) => {
                        if (d.id === draft.id) {
                            return {
                                ...d,
                                id: newDraft.id,
                                subject: newDraft.subject,
                                body: newDraft.body,
                                status: "drafted" as const,
                                researchSummary: newDraft.researchSummary,
                                createdAt: new Date().toISOString()
                            }
                        }
                        return d
                    }))
                }
            } catch (error) {
                console.error(`Failed to regenerate draft ${draft.id}:`, error)
            }
        }

        setRegeneratingDraftId(null)
        setIsRegeneratingAll(false)
        setRegeneratingAllProgress(null)
    }, [drafts, promptTemplate, isRegeneratingAll])

    const regenerateSelectedDrafts = useCallback(async (ids: string[]) => {
        if (ids.length === 0 || isRegeneratingAll) return
        const selectedDrafts = drafts.filter((d) => ids.includes(d.id))
        if (selectedDrafts.length === 0) return

        setIsRegeneratingAll(true)
        setRegeneratingAllProgress({ current: 0, total: selectedDrafts.length })

        for (let i = 0; i < selectedDrafts.length; i++) {
            const draft = selectedDrafts[i]
            setRegeneratingAllProgress({ current: i + 1, total: selectedDrafts.length })
            setRegeneratingDraftId(draft.id)

            try {
                const leadForRegeneration = {
                    id: draft.leadId,
                    firstName: draft.lead.firstName,
                    lastName: draft.lead.lastName,
                    email: draft.lead.email,
                    company: draft.lead.company,
                    role: draft.lead.role,
                    selected: true
                }

                const response = await fetch("/api/generate", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ leads: [leadForRegeneration], promptTemplate, isRegenerate: true }),
                })

                const result = await response.json()
                if (result.error) throw new Error(result.error)

                const newDraft = result.drafts?.[0]
                if (newDraft?.subject && newDraft?.body) {
                    await fetch(`/api/drafts/${draft.id}`, { method: "DELETE" })
                    setDrafts((prev) => prev.map((d) => {
                        if (d.id === draft.id) {
                            return {
                                ...d,
                                id: newDraft.id,
                                subject: newDraft.subject,
                                body: newDraft.body,
                                status: "drafted" as const,
                                researchSummary: newDraft.researchSummary,
                                createdAt: new Date().toISOString()
                            }
                        }
                        return d
                    }))
                }
            } catch (error) {
                console.error(`Failed to regenerate draft ${draft.id}:`, error)
            }
        }

        setRegeneratingDraftId(null)
        setIsRegeneratingAll(false)
        setRegeneratingAllProgress(null)
    }, [drafts, promptTemplate, isRegeneratingAll])

    const value = {
        importedLeads,
        drafts,
        currentBatch,
        isDrafting,
        promptTemplate,
        setPromptTemplate,
        importLeads,
        toggleLeadSelection,
        selectAllLeads,
        generateDrafts,
        updateDraft,
        sendEmail,
        sendBulk,
        sendNewEmail,
        deleteDraft,
        regenerateDraft,
        regeneratingDraftId,
        regenerateAllDrafts,
        regenerateSelectedDrafts,
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
        exportDraftsForReview,
        isExporting,
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
