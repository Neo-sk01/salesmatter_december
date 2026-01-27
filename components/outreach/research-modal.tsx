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

                <div className="space-y-5 overflow-y-auto pr-2 -mr-2">
                    {/* Lead Info */}
                    <div className="space-y-2">
                        <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                            Lead Details
                        </h3>
                        <div className="grid grid-cols-2 gap-3">
                            <div className="flex items-center gap-2">
                                <User className="h-3.5 w-3.5 text-muted-foreground/70" />
                                <span className="text-sm">{lead.firstName} {lead.lastName}</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <Mail className="h-3.5 w-3.5 text-muted-foreground/70" />
                                <span className="text-sm truncate">{lead.email}</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <Building2 className="h-3.5 w-3.5 text-muted-foreground/70" />
                                <span className="text-sm">{lead.company || "—"}</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <Briefcase className="h-3.5 w-3.5 text-muted-foreground/70" />
                                <span className="text-sm">{lead.role || "—"}</span>
                            </div>
                        </div>
                    </div>

                    <hr className="border-border/50" />

                    {/* Research Summary */}
                    <div className="space-y-2">
                        <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                            Research Summary
                        </h3>
                        <div className="min-h-[120px]">
                            {summaryText ? (
                                <p className="text-sm leading-relaxed whitespace-pre-wrap text-foreground/90">
                                    {summaryText}
                                </p>
                            ) : (
                                <div className="flex flex-col items-center justify-center h-full text-muted-foreground py-6">
                                    <Search className="h-6 w-6 mb-2 opacity-40" />
                                    <p className="text-sm">No research summary available</p>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Sources Section */}
                    {sources.length > 0 && (
                        <>
                            <hr className="border-border/50" />
                            <div className="space-y-2">
                                <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                                    Sources ({sources.length})
                                </h3>
                                <div className="space-y-1.5">
                                    {sources.map((source, i) => (
                                        <a
                                            key={i}
                                            href={source.url}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="block text-sm text-primary hover:underline truncate"
                                        >
                                            {i + 1}. {source.title}
                                        </a>
                                    ))}
                                </div>
                            </div>
                        </>
                    )}
                </div>
            </DialogContent>
        </Dialog>
    )
}
