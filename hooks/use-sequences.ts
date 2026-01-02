import type { Campaign, Task } from "@/types"

const mockCampaigns: Campaign[] = []

const mockTasks: Task[] = []

export function useSequences() {
  return {
    campaigns: mockCampaigns,
    tasks: mockTasks,
    isLoading: false,
    error: null,
  }
}
