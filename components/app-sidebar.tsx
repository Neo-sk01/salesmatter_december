"use client"

import { usePathname } from "next/navigation"
import Link from "next/link"
import { Users, FileEdit, Send, Settings, ChevronDown, Building2, BarChart3, FileText } from "lucide-react"
import { cn } from "@/lib/utils"

import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { useOutreach } from "@/hooks/use-outreach"

const workspaces = [
  { id: "1", name: "Burn Media Group", initials: "BM" },
  { id: "2", name: "MambaOnline", initials: "MO" },
  { id: "3", name: "Cape Town", initials: "CT" },
]

export function AppSidebar() {
  const pathname = usePathname()
  const { drafts } = useOutreach()

  const pendingDrafts = drafts.filter((d) => d.status === "drafted" || d.status === "reviewed").length
  const sentCount = drafts.filter((d) => d.status === "sent").length

  const navItems = [
    { name: "Leads", href: "/", icon: Users, badge: null },
    { name: "Files", href: "/files", icon: FileText, badge: null },
    { name: "Drafts", href: "/drafts", icon: FileEdit, badge: pendingDrafts > 0 ? pendingDrafts : null },
    { name: "Send", href: "/send", icon: Send, badge: sentCount > 0 ? sentCount : null },
    { name: "Analytics", href: "/analytics", icon: BarChart3, badge: null },
    { name: "Settings", href: "/settings", icon: Settings, badge: null },
  ]

  return (
    <aside className="flex h-screen w-56 flex-col border-r border-border bg-sidebar">
      {/* Logo */}
      <div className="flex items-center gap-2 px-4 py-4 border-b border-border">
        <img src="/salesmatter-logo.svg" alt="SalesMatter" className="h-[2.2rem] w-auto" />
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-2 py-3">
        <ul className="space-y-1">
          {navItems.map((item) => {
            const isActive = pathname === item.href
            return (
              <li key={item.name}>
                <Link
                  href={item.href}
                  className={cn(
                    "flex items-center gap-2.5 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                    isActive
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:bg-accent hover:text-accent-foreground",
                  )}
                >
                  <item.icon className="h-4 w-4" />
                  <span className="flex-1">{item.name}</span>
                  {item.badge !== null && (
                    <span
                      className={cn(
                        "flex h-5 min-w-5 items-center justify-center rounded-full text-[10px] font-semibold px-1.5",
                        isActive ? "bg-primary-foreground/20 text-primary-foreground" : "bg-primary/10 text-primary",
                      )}
                    >
                      {item.badge}
                    </span>
                  )}
                </Link>
              </li>
            )
          })}
        </ul>
      </nav>

      {/* Workspace Switcher */}
      <div className="border-t border-border p-2">
        <DropdownMenu>
          <DropdownMenuTrigger className="flex w-full items-center gap-2 rounded-md px-2 py-2 text-sm font-medium text-foreground hover:bg-accent transition-colors">
            <Avatar className="h-7 w-7">
              <AvatarFallback className="bg-primary/10 text-primary text-xs">BM</AvatarFallback>
            </Avatar>
            <div className="flex-1 text-left">
              <p className="text-xs font-medium">Burn Media Group</p>
            </div>
            <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-48">
            {workspaces.map((workspace) => (
              <DropdownMenuItem key={workspace.id} className="gap-2">
                <Avatar className="h-5 w-5">
                  <AvatarFallback className="bg-primary/10 text-primary text-[10px]">
                    {workspace.initials}
                  </AvatarFallback>
                </Avatar>
                {workspace.name}
              </DropdownMenuItem>
            ))}
            <DropdownMenuItem className="gap-2 text-muted-foreground">
              <Building2 className="h-4 w-4" />
              Create workspace
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </aside>
  )
}
