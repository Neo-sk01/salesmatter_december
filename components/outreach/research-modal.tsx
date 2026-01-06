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

    // Parse research summary to handle both simple string (legacy) and JSON string (new structured format)
    let summaryText = "";
    let sources: { title: string; url: string }[] = [];

    if (researchSummary) {
        try {
            // Try to parse as JSON first
            if (researchSummary.trim().startsWith("{")) {
                const parsed = JSON.parse(researchSummary);
                if (parsed.summary) {
                    summaryText = parsed.summary;
                    sources = parsed.sources || [];
                } else {
                    // Fallback if JSON but not our expected structure
                    summaryText = researchSummary;
                }
            } else {
                // Not JSON, just plain text
                summaryText = researchSummary;
            }
        } catch (e) {
            // JSON parse failed, assume plain text
            summaryText = researchSummary;
        }
    }

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
            <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <Sparkles className="h-5 w-5 text-primary" />
                        Lead Research Summary
                    </DialogTitle>
                    <DialogDescription>
                        AI-generated research summary using Tavily web search
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-6 overflow-y-auto pr-2 -mr-2">
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
                        <div className="min-h-[150px] rounded-lg border bg-card p-4">
                            {summaryText ? (
                                <p className="text-sm leading-relaxed whitespace-pre-wrap">
                                    {summaryText}
                                </p>
                            ) : (
                                <div className="flex flex-col items-center justify-center h-full text-muted-foreground py-8">
                                    <Search className="h-8 w-8 mb-2 opacity-50" />
                                    <p className="text-sm">No research summary available</p>
                                    <p className="text-xs">
                                        Research is generated when drafts are created
                                    </p>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Sources Section */}
                    {sources.length > 0 && (
                        <div className="space-y-3">
                            <h3 className="font-medium text-sm text-muted-foreground uppercase tracking-wide">
                                Sources
                            </h3>
                            <div className="rounded-lg border bg-muted/20 divide-y">
                                {sources.map((source, i) => (
                                    <div key={i} className="p-3 text-sm flex items-start gap-2">
                                        <div className="min-w-[20px] text-muted-foreground text-xs mt-0.5">
                                            {i + 1}.
                                        </div>
                                        <div>
                                            <a
                                                href={source.url}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="font-medium hover:underline text-primary block truncate max-w-[500px]"
                                            >
                                                {source.title}
                                            </a>
                                            <p className="text-xs text-muted-foreground truncate max-w-[500px]">
                                                {source.url}
                                            </p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            </DialogContent>
        </Dialog>
    )
}
