"use client"

import { useState } from "react"
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import {
    FileBarChart,
    Loader2,
    Mail,
    Eye,
    MousePointer,
    AlertTriangle,
    CheckCircle2,
    Send,
    Download,
} from "lucide-react"
import { cn } from "@/lib/utils"
import type { WebhookReportData } from "@/app/api/webhook-report/route"

const EVENT_TYPE_META: Record<string, { label: string; icon: React.ComponentType<{ className?: string }>; color: string }> = {
    sent: { label: "Sent", icon: Send, color: "text-blue-500" },
    delivered: { label: "Delivered", icon: CheckCircle2, color: "text-green-500" },
    open: { label: "Opened", icon: Eye, color: "text-amber-500" },
    click: { label: "Clicked", icon: MousePointer, color: "text-purple-500" },
    bounce: { label: "Bounced", icon: AlertTriangle, color: "text-red-500" },
    failed: { label: "Failed", icon: AlertTriangle, color: "text-red-400" },
    unsubscribe: { label: "Unsubscribed", icon: Mail, color: "text-gray-500" },
    resubscribe: { label: "Resubscribed", icon: Mail, color: "text-green-400" },
}

function formatDate(dateStr: string) {
    return new Date(dateStr).toLocaleDateString("en-ZA", {
        year: "numeric",
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
    })
}

function EventBadge({ type, count }: { type: string; count: number }) {
    const meta = EVENT_TYPE_META[type] || { label: type, icon: Mail, color: "text-muted-foreground" }
    const Icon = meta.icon
    return (
        <span className={cn(
            "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium bg-muted/60",
            meta.color
        )}>
            <Icon className="h-3 w-3" />
            {meta.label}: {count}
        </span>
    )
}

export function WebhookReportButton({ className }: { className?: string }) {
    const [open, setOpen] = useState(false)
    const [loading, setLoading] = useState(false)
    const [report, setReport] = useState<WebhookReportData | null>(null)
    const [error, setError] = useState<string | null>(null)

    async function fetchReport() {
        setLoading(true)
        setError(null)
        try {
            const res = await fetch("/api/webhook-report")
            if (!res.ok) throw new Error("Failed to fetch report")
            const data = await res.json()
            setReport(data)
        } catch (err: any) {
            setError(err?.message || "Unknown error")
        } finally {
            setLoading(false)
        }
    }

    function handleOpenChange(isOpen: boolean) {
        setOpen(isOpen)
        if (isOpen && !report) {
            fetchReport()
        }
    }

    function downloadCsv() {
        if (!report) return
        const rows = [["Email", "Total Events", ...Object.keys(EVENT_TYPE_META), "First Event", "Last Event"]]
        for (const r of report.recipients) {
            rows.push([
                r.email,
                String(r.totalEvents),
                ...Object.keys(EVENT_TYPE_META).map(t => String(r.events[t] || 0)),
                r.firstEvent,
                r.lastEvent,
            ])
        }
        const csv = rows.map(r => r.join(",")).join("\n")
        const blob = new Blob([csv], { type: "text/csv" })
        const url = URL.createObjectURL(blob)
        const a = document.createElement("a")
        a.href = url
        a.download = `webhook-report-${new Date().toISOString().split("T")[0]}.csv`
        a.click()
        URL.revokeObjectURL(url)
    }

    return (
        <Dialog open={open} onOpenChange={handleOpenChange}>
            <DialogTrigger asChild>
                <Button variant="outline" size="sm" className={cn("gap-1.5", className)}>
                    <FileBarChart className="h-3.5 w-3.5" />
                    Report
                </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2 text-base">
                        <FileBarChart className="h-4 w-4 text-primary" />
                        Webhook Events Report
                    </DialogTitle>
                </DialogHeader>

                {loading && (
                    <div className="flex items-center justify-center py-12 text-muted-foreground">
                        <Loader2 className="h-5 w-5 animate-spin mr-2" />
                        Loading report…
                    </div>
                )}

                {error && (
                    <div className="flex items-center gap-2 text-sm text-red-500 py-4">
                        <AlertTriangle className="h-4 w-4" />
                        {error}
                    </div>
                )}

                {report && !loading && (
                    <div className="flex flex-col gap-4 overflow-y-auto pr-1 -mr-1">
                        {/* Summary Cards */}
                        <div className="grid grid-cols-3 gap-3">
                            <div className="rounded-lg border bg-card p-3 text-center">
                                <p className="text-2xl font-bold text-foreground">{report.totalEvents}</p>
                                <p className="text-[11px] text-muted-foreground mt-0.5">Total Events</p>
                            </div>
                            <div className="rounded-lg border bg-card p-3 text-center">
                                <p className="text-2xl font-bold text-foreground">{report.uniqueRecipients}</p>
                                <p className="text-[11px] text-muted-foreground mt-0.5">Unique Recipients</p>
                            </div>
                            <div className="rounded-lg border bg-card p-3 text-center">
                                <p className="text-2xl font-bold text-foreground">
                                    {Object.keys(report.eventsByType).length}
                                </p>
                                <p className="text-[11px] text-muted-foreground mt-0.5">Event Types</p>
                            </div>
                        </div>

                        {/* Date Range */}
                        {report.dateRange.from && report.dateRange.to && (
                            <p className="text-xs text-muted-foreground">
                                Date range: {formatDate(report.dateRange.from)} → {formatDate(report.dateRange.to)}
                            </p>
                        )}

                        {/* Events by Type */}
                        <div>
                            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
                                Events by Type
                            </h3>
                            <div className="flex flex-wrap gap-1.5">
                                {Object.entries(report.eventsByType)
                                    .sort(([, a], [, b]) => b - a)
                                    .map(([type, count]) => (
                                        <EventBadge key={type} type={type} count={count} />
                                    ))}
                            </div>
                        </div>

                        {/* Recipients Table */}
                        <div>
                            <div className="flex items-center justify-between mb-2">
                                <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                                    Recipients ({report.recipients.length})
                                </h3>
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={downloadCsv}
                                    className="h-7 gap-1 text-xs text-muted-foreground hover:text-foreground"
                                >
                                    <Download className="h-3 w-3" />
                                    CSV
                                </Button>
                            </div>
                            <div className="rounded-lg border overflow-hidden">
                                <div className="max-h-[300px] overflow-y-auto">
                                    <table className="w-full text-xs">
                                        <thead className="bg-muted/50 sticky top-0">
                                            <tr>
                                                <th className="text-left font-medium text-muted-foreground px-3 py-2">Email</th>
                                                <th className="text-left font-medium text-muted-foreground px-3 py-2">Events</th>
                                                <th className="text-right font-medium text-muted-foreground px-3 py-2">Last Activity</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-border">
                                            {report.recipients.map((r) => (
                                                <tr key={r.email} className="hover:bg-muted/30 transition-colors">
                                                    <td className="px-3 py-2 font-medium text-foreground max-w-[200px] truncate">
                                                        {r.email}
                                                    </td>
                                                    <td className="px-3 py-2">
                                                        <div className="flex flex-wrap gap-1">
                                                            {Object.entries(r.events).map(([type, count]) => (
                                                                <EventBadge key={type} type={type} count={count} />
                                                            ))}
                                                        </div>
                                                    </td>
                                                    <td className="px-3 py-2 text-right text-muted-foreground whitespace-nowrap">
                                                        {formatDate(r.lastEvent)}
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </div>

                        {/* Refresh */}
                        <div className="flex justify-end pt-1">
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={fetchReport}
                                disabled={loading}
                                className="h-7 gap-1 text-xs"
                            >
                                {loading ? <Loader2 className="h-3 w-3 animate-spin" /> : <FileBarChart className="h-3 w-3" />}
                                Refresh
                            </Button>
                        </div>
                    </div>
                )}
            </DialogContent>
        </Dialog>
    )
}
