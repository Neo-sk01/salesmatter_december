import type React from "react"
import { AppSidebar } from "./app-sidebar"

export function DashboardShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-screen bg-background">
      <AppSidebar />
      <main className="flex-1 overflow-y-auto bg-muted/20">{children}</main>
    </div>
  )
}
