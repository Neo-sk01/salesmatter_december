import type { Lead } from "@/types"

const mockLeads: Lead[] = []

export function useLeads() {
  return {
    leads: mockLeads,
    isLoading: false,
    error: null,
  }
}
