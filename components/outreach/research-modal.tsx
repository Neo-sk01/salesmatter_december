"use client"

import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Search, User, Building2, Briefcase, Mail, Sparkles } from "lucide-react"
import type { EmailDraft } from "@/types"

interface ResearchModalProps {
    draft: EmailDraft
    children?: React.ReactNode
}

export function ResearchModal({ draft, children }: ResearchModalProps) {
    const { lead, researchSummary } = draft

    return (
        <Dialog>
            <DialogTrigger asChild>
                {children || (
                    <Button variant="ghost" size="sm" className="gap-2">
                        <Search className="h-4 w-4" />
                        View Research
                    </Button>
                )}
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[80vh]">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <Sparkles className="h-5 w-5 text-primary" />
                        Lead Research Summary
                    </DialogTitle>
                    <DialogDescription>
                        AI-generated research summary using Tavily web search
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-6">
                    {/* Lead Info Card */}
                    <div className="rounded-lg border bg-muted/30 p-4">
                        <h3 className="font-medium mb-3 text-sm text-muted-foreground uppercase tracking-wide">
                            Lead Details
                        </h3>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="flex items-center gap-2">
                                <User className="h-4 w-4 text-muted-foreground" />
                                <div>
                                    <p className="text-sm font-medium">
                                        {lead.firstName} {lead.lastName}
                                    </p>
                                    <p className="text-xs text-muted-foreground">Name</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-2">
                                <Mail className="h-4 w-4 text-muted-foreground" />
                                <div>
                                    <p className="text-sm font-medium">{lead.email}</p>
                                    <p className="text-xs text-muted-foreground">Email</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-2">
                                <Building2 className="h-4 w-4 text-muted-foreground" />
                                <div>
                                    <p className="text-sm font-medium">{lead.company || "N/A"}</p>
                                    <p className="text-xs text-muted-foreground">Company</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-2">
                                <Briefcase className="h-4 w-4 text-muted-foreground" />
                                <div>
                                    <p className="text-sm font-medium">{lead.role || "N/A"}</p>
                                    <p className="text-xs text-muted-foreground">Role</p>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Research Summary */}
                    <div className="space-y-3">
                        <div className="flex items-center justify-between">
                            <h3 className="font-medium text-sm text-muted-foreground uppercase tracking-wide">
                                Research Summary
                            </h3>
                            <Badge variant="secondary" className="text-xs">
                                ~150 words
                            </Badge>
                        </div>
                        <div className="h-[250px] rounded-lg border bg-card p-4 overflow-y-auto">
                            {researchSummary ? (
                                <p className="text-sm leading-relaxed whitespace-pre-wrap">
                                    {researchSummary}
                                </p>
                            ) : (
                                <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
                                    <Search className="h-8 w-8 mb-2 opacity-50" />
                                    <p className="text-sm">No research summary available</p>
                                    <p className="text-xs">
                                        Research is generated when drafts are created
                                    </p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    )
}
