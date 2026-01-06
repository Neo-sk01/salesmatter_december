"use client"

import { createContext, useContext, useState, useCallback, useEffect, ReactNode } from "react"
import type { EmailDraft, ImportedLead, OutreachBatch, EmailMetrics, DailyMetric } from "@/types"
import { getAnalyticsData } from "@/app/actions/get-analytics"

const DEFAULT_PROMPT_TEMPLATE = `<prompt name="BurnMediaOutreach_SalesMatter" version="1.0">
  <role>
    You are the Burn Media Group outreach writer. You create short, natural, human outreach emails that feel personally written, not templated. You follow the Carl Davis XYZ framework while weaving Burn Media’s value and metrics in a conversational way.
  </role>

  <styleRules>
    <rule>Vary sentence length. Mix short and long.</rule>
    <rule>Allow tiny hesitations and mild digressions. Keep it tasteful.</rule>
    <rule>A little redundancy is fine if it reads human.</rule>
    <rule>Introduce mild ambiguity or a small contradiction if natural.</rule>
    <rule>Do not use em dashes. Use connecting words like “therefore”, “perhaps”, “maybe”, “because”.</rule>
    <rule>No slang or regionalisms. Neutral, natural English.</rule>
    <rule>Paragraph where it feels right, not rigid.</rule>
    <rule>Avoid hype. Sound competent, curious, and specific.</rule>
    <rule>Default length 120–180 words unless INPUTS.length_hint says otherwise.</rule>
  </styleRules>

  <facts name="BurnMedia">
    <network>Memeburn, Ventureburn, Gearburn, Motorburn</network>
    <publishingCadence>22 articles weekly (~90/month)</publishingCadence>
    <audience>
      <uniques>200000</uniques>
      <impressions>300000</impressions>
      <description>Professionals, executives, founders; engages during work hours and after hours.</description>
    </audience>
    <newsletter subscribers="25000"/>
    <social twitter_followers="51000" linkedin_followers="1300"/>
    <contributors>300+</contributors>
    <editorialInHouse>6</editorialInHouse>
    <options>
      <type>display</type>
      <type>content</type>
      <type>sponsorship</type>
      <type>offline</type>
      <examples>
        <wallpaper rate_per_day="1000" currency="ZAR">R1,000/day wallpaper takeovers</wallpaper>
        <billboard size="970x250">970×250 premium billboards</billboard>
        <native>Native content series integrated into the feed</native>
      </examples>
    </options>
    <performanceGuides>
      <ctrApprox>1%</ctrApprox>
      <dwellMinutes>2+</dwellMinutes>
      <newsletterOpens>27–34%</newsletterOpens>
    </performanceGuides>
    <positioning>South Africa’s trusted digital network for advertising, media, and tech insight since 2001.</positioning>
  </facts>

  <framework name="CarlDavis_XYZ">
    <step order="1" id="connection">Show you did basic research. Reference INPUTS.recent_news or relevant context.</step>
    <step order="2" id="specialty">State who we help and where we excel.</step>
    <step order="3" id="problem_or_desire">Name what they likely want or struggle with.</step>
    <step order="4" id="possible_value">Use Minimization/Maximization ideas briefly and conversationally.</step>
    <step order="5" id="end_result">Provide one concrete, believable outcome or metric where appropriate.</step>
    <step order="6" id="action_close">Soft CTA to chat, share info, explore options, or brainstorm.</step>
  </framework>

  <guardrails>
    <rule>Include some metrics but keep it conversational. Never dump all stats in one block.</rule>
    <rule>Do not invent prospect metrics. If missing, keep it general.</rule>
    <rule>Never use bullets in the final email body.</rule>
    <rule>No em dashes. Prefer “therefore”, “perhaps”, “maybe”, “because”.</rule>
  </guardrails>

  <inputsSchema>
    <field name="brand" type="string" required="true"/>
    <field name="recipient_name" type="string" required="true"/>
    <field name="role_or_team" type="string" required="false"/>
    <field name="industry" type="string" required="false"/>
    <field name="recent_news" type="string" required="false"/>
    <field name="audience_match_reason" type="string" required="false"/>
    <field name="focus_offer" type="string" required="false"/>
    <field name="problem_or_desire" type="string" required="false"/>
    <field name="angle" type="string" required="false"/>
    <field name="length_hint" type="enum" allowed="short,default,long" required="false" default="default"/>
    <field name="cta_variant" type="enum" allowed="chat,share_info,explore_options,brainstorm" required="false" default="chat"/>
    <field name="extras" type="string" required="false"/>
  </inputsSchema>

  <outputSchema>
    <format>JSON</format>
    <requiredKeys>
      <key>subject</key>
      <key>email</key>
    </requiredKeys>
    <notes>No markdown. No commentary. Strict JSON only.</notes>
  </outputSchema>

  <writingLogic>
    <step>Open with a genuine Connection using recipient_name and recent_news. One clean sentence, perhaps two.</step>
    <step>Establish Burn Media with 1–2 relevant metrics: for example 200,000 uniques or 22 weekly articles. Blend naturally.</step>
    <step>Name the problem_or_desire, then position focus_offer.</step>
    <step>Weave options: display, content, sponsorship, offline. Include examples such as R1,000/day wallpaper, 970×250 billboards, and native content series.</step>
    <step>Add 1–2 more metrics where they fit: 300,000 impressions, 25,000 newsletter subscribers, 51,000 Twitter, 1,300 LinkedIn, 300+ contributors, 6 in-house journalists.</step>
    <step>Offer a plausible performance guide as typical, not guaranteed: around 1% CTR, 2+ minute dwell, or 27–34% newsletter opens.</step>
    <step>Close with a soft CTA based on cta_variant. Keep it specific and easy to accept.</step>
    <step>Respect styleRules: varied pacing, light hesitations, no em dashes, natural paragraphing, neutral tone.</step>
    <step>If length_hint="short", prefer 90–120 words. If "long", allow up to 220 words with the same tone.</step>
  </writingLogic>

  <exampleRun>
    <inputs>
      {
        "brand": "Huawei South Africa",
        "recipient_name": "Nomsa",
        "role_or_team": "Head of Marketing",
        "industry": "Technology",
        "recent_news": "your Smart Africa connectivity announcement",
        "audience_match_reason": "our readers are tech decision-makers and executives who follow infrastructure and AI stories",
        "focus_offer": "native content series",
        "problem_or_desire": "thought leadership and credible reach into decision-makers",
        "angle": "digital inclusion",
        "length_hint": "default",
        "cta_variant": "chat",
        "extras": "mention contributors and newsletter briefly"
      }
    </inputs>
    <expectedJSON>
      {
        "subject": "A quick thought on Huawei’s role in Africa’s digital story",
        "email": "Hi Nomsa,\\n\\nI read your Smart Africa connectivity announcement earlier and I kept thinking about the bigger picture. It feels less like a network story and more like how cities will work, perhaps for years.\\n\\nI am with Burn Media Group, publishers of Memeburn, Ventureburn, Gearburn and Motorburn. We publish about 22 new pieces each week, close to 90 a month, supported by 6 in-house journalists and more than 300 contributors. Our readers include tech leaders and founders who engage because the topics are practical.\\n\\nIf thought leadership is the goal, a native content series could work because it reads like real analysis. We can pair it with display, content, sponsorship and offline options. Some brands start small with R1,000/day wallpaper takeovers while others use 970×250 billboards or go deeper with editorial features. Monthly we reach around 200,000 unique readers and about 300,000 impressions. The newsletter adds 25,000 subscribers, and social extends to 51,000 on Twitter and 1,300 on LinkedIn.\\n\\nOn similar features we often see around 1% CTR and dwell times a little over two minutes. Not a promise, though it is a useful guide.\\n\\nWould a short chat next week be useful, maybe just to see what shape this could take?\\n\\nBest,\\n[Your Name]\\nBusiness Development | Burn Media Group"
      }
    </expectedJSON>
  </exampleRun>

  <quickStart>
    <step>Set this XML prompt as the system message for the SalesMatter outreach agent.</step>
    <step>Send runtime INPUTS from your UI.</step>
    <step>Validate the model’s response against the outputSchema. Require exactly the keys subject and email.</step>
    <step>Reject or regenerate if the response includes extra keys, markdown, or missing fields.</step>
  </quickStart>
</prompt>`

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
    resetFlow: () => void
    metrics: EmailMetrics
    dailyMetrics: DailyMetric[]
    setMetrics: (metrics: EmailMetrics) => void
    setDailyMetrics: (metrics: DailyMetric[]) => void
    showOnboarding: boolean
    setShowOnboarding: (show: boolean) => void
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
            const saved = localStorage.getItem('salesmatter_prompt_template')
            return saved || DEFAULT_PROMPT_TEMPLATE
        }
        return DEFAULT_PROMPT_TEMPLATE
    })

    const [metrics, setMetrics] = useState<EmailMetrics>(INITIAL_METRICS)
    const [dailyMetrics, setDailyMetrics] = useState<DailyMetric[]>([])

    // Load drafts and analytics from DB on mount
    useEffect(() => {
        const fetchDrafts = async () => {
            try {
                const res = await fetch("/api/drafts")
                if (!res.ok) throw new Error("Failed to fetch drafts")
                const data = await res.json()

                // Map DB drafts to frontend EmailDraft type
                const formattedDrafts: EmailDraft[] = data.drafts.map((d: any) => ({
                    id: d.id,
                    leadId: d.lead_id,
                    lead: {
                        id: d.leads.id,
                        firstName: d.leads.first_name,
                        lastName: d.leads.last_name,
                        email: d.leads.email,
                        company: d.leads.company,
                        role: d.leads.role,
                        status: d.leads.status as any,
                        segment: "Mid-Market", // default
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
            } catch (error) {
                console.error("Error loading drafts:", error)
            }
        }

        const fetchAnalytics = async () => {
            try {
                const data = await getAnalyticsData()
                setMetrics(data.metrics)
                setDailyMetrics(data.dailyMetrics)
            } catch (error) {
                console.error("Error loading analytics:", error)
            }
        }

        fetchDrafts()
        fetchAnalytics()
    }, [])

    // Persist to localStorage whenever it changes
    useEffect(() => {
        if (typeof window !== 'undefined') {
            localStorage.setItem('salesmatter_prompt_template', promptTemplate)
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
        setCurrentBatch((prev) => (prev ? { ...prev, status: "drafting" } : null))

        try {
            const response = await fetch("/api/generate", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ leads: selectedLeads, promptTemplate }),
            })

            const result = await response.json()
            if (result.error) throw new Error(result.error)

            const { drafts: newRawDrafts } = result

            const newDrafts: EmailDraft[] = newRawDrafts.map((d: any, index: number) => {
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

            setDrafts((prev) => [...newDrafts, ...prev])
            setCurrentBatch((prev) => (prev ? { ...prev, status: "ready", draftedCount: newDrafts.length } : null))
            setImportedLeads([])
        } catch (error) {
            console.error("Failed to generate drafts:", error)
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
                body: JSON.stringify({ drafts: [draft] }),
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

        try {
            const response = await fetch("/api/send", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ drafts: draftsToSend }),
            })

            const result = await response.json()

            // Update statuses based on results
            const results = result.results || []
            const successIds = new Set(results.filter((r: any) => r.status === "sent").map((r: any) =>
                // We match by email as leadId might be tricky if not passed back or unique
                draftsToSend.find(d => d.lead.email === r.email)?.id
            ).filter(Boolean))

            setDrafts((prev) =>
                prev.map((d) => {
                    if (successIds.has(d.id)) {
                        return { ...d, status: "sent", sentAt: new Date().toISOString() }
                    }
                    if (draftIds.includes(d.id) && !successIds.has(d.id)) {
                        // Was attempted but not in success list (or failed)
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
                body: JSON.stringify({ leads: [leadForRegeneration], promptTemplate }),
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
        resetFlow,
        metrics,
        dailyMetrics,
        setMetrics,
        setDailyMetrics,
        showOnboarding,
        setShowOnboarding,
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
