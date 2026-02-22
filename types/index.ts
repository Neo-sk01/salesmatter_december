export type Lead = {
  id: string
  firstName: string
  lastName: string
  email: string
  company: string
  role: string
  segment: "Enterprise" | "Mid-Market" | "SMB"
  status: "New" | "Contacted" | "Replied" | "Qualified" | "Unsubscribed"
  lastActivity: string
}

export type Campaign = {
  id: string
  name: string
  status: "Active" | "Paused" | "Draft"
  nextSendDate: string
  sent: number
  opens: number
  replies: number
}

export type Task = {
  id: string
  type: "follow-up" | "enroll" | "review"
  description: string
  dueTime: string
  leadName?: string
}

export type CsvMapping = {
  sourceColumn: string
  targetField: "first_name" | "last_name" | "email" | "company" | "role" | "custom" | ""
}

export type Workspace = {
  id: string
  name: string
  avatar?: string
}

export type EmailDraft = {
  id: string
  leadId: string
  lead: Lead
  subject: string
  body: string
  status: "pending" | "drafted" | "reviewed" | "sent" | "failed"
  createdAt: string
  sentAt?: string
  researchSummary?: string
}

export type OutreachBatch = {
  id: string
  name: string
  status: "importing" | "drafting" | "ready" | "sending" | "completed" | "failed"
  totalLeads: number
  draftedCount: number
  sentCount: number
  createdAt: string
}

export type ImportedLead = {
  id: string
  firstName: string
  lastName: string
  email: string
  company: string
  role: string
  linkedinUrl?: string
  companyUrl?: string
  selected: boolean
}

export type EmailMetrics = {
  sent: number
  delivered: number
  opened: number
  clicked: number
  replied: number
  bounced: number
  openRate: number
  clickRate: number
  replyRate: number
  bounceRate: number
}

export type DailyMetric = {
  date: string
  sent: number
  opened: number
  replied: number
}

export type EmailSendResult = {
  success: boolean
  error?: string
  details?: any
}

export type RecentSentEmail = {
  id: string
  email: string
  subject: string
  sentAt: string
}
