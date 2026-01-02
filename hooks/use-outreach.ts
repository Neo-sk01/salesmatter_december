"use client"

import { useState, useCallback, useEffect } from "react"
import type { EmailDraft, ImportedLead, OutreachBatch, EmailMetrics, DailyMetric } from "@/types"

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

  // Initialize from localStorage if available
  const [promptTemplate, setPromptTemplate] = useState(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('salesmatter_prompt_template')
      return saved || DEFAULT_PROMPT_TEMPLATE
    }
    return DEFAULT_PROMPT_TEMPLATE
  })

  // Persist to localStorage whenever it changes
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('salesmatter_prompt_template', promptTemplate)
    }
  }, [promptTemplate])

  const [metrics] = useState<EmailMetrics>(MOCK_METRICS)
  const [dailyMetrics] = useState<DailyMetric[]>(MOCK_DAILY_METRICS)
  const [showOnboarding, setShowOnboarding] = useState(true)

  const importLeads = useCallback((leads: ImportedLead[]) => {
    setImportedLeads(leads.map((l) => ({ ...l, selected: true })))
    setCurrentBatch({
      id: `batch-\${Date.now()}`,
      name: `Import \${new Date().toLocaleDateString()}`,
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
