import type { Lead } from "@/types"

const mockLeads: Lead[] = [
  {
    id: "1",
    firstName: "Sarah",
    lastName: "Chen",
    email: "sarah.chen@techcorp.com",
    company: "TechCorp Inc",
    role: "VP of Sales",
    segment: "Enterprise",
    status: "Qualified",
    lastActivity: "2 hours ago",
  },
  {
    id: "2",
    firstName: "Michael",
    lastName: "Roberts",
    email: "m.roberts@growthio.com",
    company: "Growth.io",
    role: "Head of Marketing",
    segment: "Mid-Market",
    status: "Contacted",
    lastActivity: "1 day ago",
  },
  {
    id: "3",
    firstName: "Emily",
    lastName: "Watson",
    email: "emily@startuplab.co",
    company: "StartupLab",
    role: "CEO",
    segment: "SMB",
    status: "New",
    lastActivity: "Just now",
  },
  {
    id: "4",
    firstName: "David",
    lastName: "Kim",
    email: "dkim@enterprise.net",
    company: "Enterprise Solutions",
    role: "CTO",
    segment: "Enterprise",
    status: "Replied",
    lastActivity: "3 hours ago",
  },
  {
    id: "5",
    firstName: "Jessica",
    lastName: "Taylor",
    email: "jessica.t@saasflow.com",
    company: "SaaSFlow",
    role: "Director of Ops",
    segment: "Mid-Market",
    status: "Contacted",
    lastActivity: "5 days ago",
  },
  {
    id: "6",
    firstName: "Alex",
    lastName: "Johnson",
    email: "alex@innovate.io",
    company: "Innovate Labs",
    role: "Product Manager",
    segment: "SMB",
    status: "Unsubscribed",
    lastActivity: "1 week ago",
  },
]

export function useLeads() {
  return {
    leads: mockLeads,
    isLoading: false,
    error: null,
  }
}
