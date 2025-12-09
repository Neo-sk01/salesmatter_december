import type { Campaign, Task } from "@/types"

const mockCampaigns: Campaign[] = [
  {
    id: "1",
    name: "Q4 Enterprise Outreach",
    status: "Active",
    nextSendDate: "Today, 2:00 PM",
    sent: 245,
    opens: 89,
    replies: 12,
  },
  {
    id: "2",
    name: "Product Launch - SMB",
    status: "Active",
    nextSendDate: "Tomorrow, 9:00 AM",
    sent: 180,
    opens: 67,
    replies: 8,
  },
  {
    id: "3",
    name: "Re-engagement Series",
    status: "Paused",
    nextSendDate: "—",
    sent: 520,
    opens: 156,
    replies: 23,
  },
]

const mockTasks: Task[] = [
  {
    id: "1",
    type: "follow-up",
    description: "Send follow-up email",
    dueTime: "10:00 AM",
    leadName: "Sarah Chen",
  },
  {
    id: "2",
    type: "enroll",
    description: "Enroll 5 new leads to sequence",
    dueTime: "11:30 AM",
  },
  {
    id: "3",
    type: "review",
    description: "Review AI-generated drafts",
    dueTime: "2:00 PM",
  },
  {
    id: "4",
    type: "follow-up",
    description: "Call scheduled with lead",
    dueTime: "3:30 PM",
    leadName: "David Kim",
  },
]

export function useSequences() {
  return {
    campaigns: mockCampaigns,
    tasks: mockTasks,
    isLoading: false,
    error: null,
  }
}
