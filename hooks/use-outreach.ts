"use client"

import { useState, useCallback } from "react"
import type { EmailDraft, ImportedLead, OutreachBatch, EmailMetrics, DailyMetric } from "@/types"

const DEFAULT_PROMPT_TEMPLATE = `You are an expert B2B sales copywriter. Write a personalized cold outreach email.

LEAD INFORMATION:
- Name: {{firstName}} {{lastName}}
- Email: {{email}}
- Company: {{company}}
- Role: {{role}}

GUIDELINES:
1. Keep the email under 150 words
2. Start with a personalized hook based on their role/company
3. Clearly state the value proposition
4. End with a soft call-to-action (no hard sells)
5. Be conversational, not salesy
6. Use their first name only

OUTPUT FORMAT:
Subject: [compelling subject line]

[email body]

---
Generate a cold email for this lead.`

const MOCK_DRAFTS: EmailDraft[] = [
  {
    id: "draft-1",
    leadId: "lead-1",
    lead: {
      id: "lead-1",
      firstName: "Shaylen",
      lastName: "Padayachee",
      email: "shaylenp@ozow.com",
      company: "Ozow",
      role: "Head of Marketing",
      segment: "Enterprise",
      status: "New",
      lastActivity: "2 hours ago",
    },
    subject: "Quick question about Ozow's growth strategy",
    body: `Hi Shaylen,

I've been following Ozow's impressive growth in the payments space - you're really changing how South Africans transact.

As Head of Marketing, I imagine you're always looking for ways to reach new B2B customers efficiently. We've helped fintech companies like yours increase their outbound reply rates by 40% through personalized, AI-driven campaigns.

Would you be open to a quick 15-minute chat this week to see if we might be a fit?

Best,
Neil`,
    status: "drafted",
    createdAt: new Date(Date.now() - 3600000).toISOString(),
  },
  {
    id: "draft-2",
    leadId: "lead-2",
    lead: {
      id: "lead-2",
      firstName: "Michael",
      lastName: "Thomson",
      email: "michael@snapscan.co.za",
      company: "SnapScan",
      role: "Head of Marketing",
      segment: "Enterprise",
      status: "New",
      lastActivity: "3 hours ago",
    },
    subject: "Loved what SnapScan did with QR payments",
    body: `Hi Michael,

SnapScan pioneered QR payments in SA - that's no small feat. As someone leading marketing there, you know how competitive the space has become.

I work with fintech marketing leaders to scale their outbound efforts without scaling headcount. Our clients typically see 3x more qualified meetings booked per month.

Curious if this resonates? Happy to share some specific examples from similar companies.

Cheers,
Neil`,
    status: "drafted",
    createdAt: new Date(Date.now() - 7200000).toISOString(),
  },
  {
    id: "draft-3",
    leadId: "lead-3",
    lead: {
      id: "lead-3",
      firstName: "Jessica",
      lastName: "Fowlds",
      email: "Jessica.fowlds@zapper.co.za",
      company: "Zapper",
      role: "Head of Marketing & Comms",
      segment: "Enterprise",
      status: "New",
      lastActivity: "4 hours ago",
    },
    subject: "Zapper + smarter outreach?",
    body: `Hi Jessica,

Running Marketing & Comms at Zapper must keep you busy - especially with how fast the mobile payments market is evolving.

I wanted to reach out because we've been helping B2B marketing leaders automate their cold outreach while keeping it personal. The result? More replies, less time spent on manual follow-ups.

Would love to share how this could work for Zapper. Open to a brief call?

Best,
Neil`,
    status: "drafted",
    createdAt: new Date(Date.now() - 10800000).toISOString(),
  },
  {
    id: "draft-4",
    leadId: "lead-4",
    lead: {
      id: "lead-4",
      firstName: "Dewald",
      lastName: "Potgieter",
      email: "dewald@flutterwave.com",
      company: "Flutterwave",
      role: "VP President of Sales",
      segment: "Enterprise",
      status: "New",
      lastActivity: "5 hours ago",
    },
    subject: "Scale Flutterwave's outbound across Africa",
    body: `Hi Dewald,

Flutterwave's pan-African expansion is impressive - building payment infrastructure across the continent is no easy task.

As VP of Sales, I imagine pipeline generation across multiple markets is a constant focus. We help sales leaders like you run localized outreach at scale, with AI that adapts messaging for each market.

Would you be interested in seeing how we've helped other pan-African fintechs?

Best regards,
Neil`,
    status: "drafted",
    createdAt: new Date(Date.now() - 14400000).toISOString(),
  },
  {
    id: "draft-5",
    leadId: "lead-5",
    lead: {
      id: "lead-5",
      firstName: "Lucia",
      lastName: "Malapane",
      email: "lmalapane@tymebank.co.za",
      company: "TymeBank",
      role: "Senior Marketing Manager",
      segment: "Enterprise",
      status: "New",
      lastActivity: "6 hours ago",
    },
    subject: "TymeBank's digital-first approach + outbound",
    body: `Hi Lucia,

TymeBank's growth has been remarkable - proving that digital-first banking resonates with South Africans.

As Senior Marketing Manager, you're likely exploring new channels to reach business customers. We specialize in helping digital banks generate B2B leads through intelligent, personalized outreach campaigns.

Would a quick 15-minute call be useful to explore this?

Warm regards,
Neil`,
    status: "drafted",
    createdAt: new Date(Date.now() - 18000000).toISOString(),
  },
  {
    id: "draft-6",
    leadId: "lead-6",
    lead: {
      id: "lead-6",
      firstName: "Andrew",
      lastName: "Watkins-Ball",
      email: "andrew.watkins-ball@jumo.world",
      company: "Jumo",
      role: "Founder & Group CEO",
      segment: "Enterprise",
      status: "Contacted",
      lastActivity: "1 day ago",
    },
    subject: "Congrats on Jumo's Series B",
    body: `Hi Andrew,

Building Jumo from the ground up to serve millions across Africa and Asia is truly inspiring. Your focus on financial inclusion is making a real impact.

I wanted to briefly introduce a tool we've built that helps founders like you automate top-of-funnel outreach without losing the personal touch. Several fintech CEOs have found it valuable for partnership and BD efforts.

Worth a quick conversation?

Best,
Neil`,
    status: "sent",
    sentAt: new Date(Date.now() - 86400000).toISOString(),
    createdAt: new Date(Date.now() - 172800000).toISOString(),
  },
  {
    id: "draft-7",
    leadId: "lead-7",
    lead: {
      id: "lead-7",
      firstName: "Peter",
      lastName: "O'Toole",
      email: "peter.otoole@cellulant.io",
      company: "Cellulant",
      role: "Group CEO",
      segment: "Enterprise",
      status: "Contacted",
      lastActivity: "2 days ago",
    },
    subject: "Cellulant's pan-African vision",
    body: `Hi Peter,

Cellulant's work connecting businesses across 35 African countries is exactly the kind of infrastructure the continent needs. Congratulations on what you've built.

I lead a team that helps enterprise sales teams scale their outbound across multiple markets. Given Cellulant's geographic footprint, I thought there might be some synergies.

Would you be open to a brief intro call?

Best regards,
Neil`,
    status: "sent",
    sentAt: new Date(Date.now() - 172800000).toISOString(),
    createdAt: new Date(Date.now() - 259200000).toISOString(),
  },
]

const MOCK_METRICS: EmailMetrics = {
  sent: 127,
  delivered: 124,
  opened: 89,
  clicked: 34,
  replied: 23,
  bounced: 3,
  openRate: 71.8,
  clickRate: 27.4,
  replyRate: 18.5,
  bounceRate: 2.4,
}

const MOCK_DAILY_METRICS: DailyMetric[] = [
  { date: "Nov 25", sent: 12, opened: 8, replied: 2 },
  { date: "Nov 26", sent: 15, opened: 11, replied: 3 },
  { date: "Nov 27", sent: 18, opened: 14, replied: 4 },
  { date: "Nov 28", sent: 14, opened: 10, replied: 3 },
  { date: "Nov 29", sent: 20, opened: 15, replied: 5 },
  { date: "Nov 30", sent: 16, opened: 12, replied: 3 },
  { date: "Dec 1", sent: 22, opened: 17, replied: 4 },
]

export function useOutreach() {
  const [importedLeads, setImportedLeads] = useState<ImportedLead[]>([])
  const [drafts, setDrafts] = useState<EmailDraft[]>(MOCK_DRAFTS)
  const [currentBatch, setCurrentBatch] = useState<OutreachBatch | null>(null)
  const [isDrafting, setIsDrafting] = useState(false)
  const [promptTemplate, setPromptTemplate] = useState(DEFAULT_PROMPT_TEMPLATE)
  const [metrics] = useState<EmailMetrics>(MOCK_METRICS)
  const [dailyMetrics] = useState<DailyMetric[]>(MOCK_DAILY_METRICS)
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
          id: d.leadId + "-draft-" + Date.now(),
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
          // Store research notes if needed in the future, e.g. in a 'metadata' field
        }
      })

      setDrafts((prev) => [...newDrafts, ...prev])
      setCurrentBatch((prev) => (prev ? { ...prev, status: "ready", draftedCount: newDrafts.length } : null))
      setImportedLeads([])
    } catch (error) {
      console.error("Failed to generate drafts:", error)
      // Ideally show a toast here
    } finally {
      setIsDrafting(false)
    }
  }, [importedLeads, promptTemplate])

  const updateDraft = useCallback((draftId: string, updates: Partial<EmailDraft>) => {
    setDrafts((prev) => prev.map((d) => (d.id === draftId ? { ...d, ...updates } : d)))
  }, [])

  const sendEmail = useCallback(async (draftId: string) => {
    setDrafts((prev) =>
      prev.map((d) => (d.id === draftId ? { ...d, status: "sent", sentAt: new Date().toISOString() } : d)),
    )
  }, [])

  const sendBulk = useCallback(async (draftIds: string[]) => {
    for (const id of draftIds) {
      await new Promise((resolve) => setTimeout(resolve, 200))
      setDrafts((prev) =>
        prev.map((d) => (d.id === id ? { ...d, status: "sent", sentAt: new Date().toISOString() } : d)),
      )
    }
  }, [])

  const deleteDraft = useCallback((draftId: string) => {
    setDrafts((prev) => prev.filter((d) => d.id !== draftId))
  }, [])

  const resetFlow = useCallback(() => {
    setImportedLeads([])
    setCurrentBatch(null)
  }, [])

  return {
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
    deleteDraft,
    resetFlow,
    metrics,
    dailyMetrics,
    showOnboarding,
    setShowOnboarding,
  }
}
