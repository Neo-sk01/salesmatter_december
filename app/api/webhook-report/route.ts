/**
 * Webhook Report API
 * Returns a comprehensive report of all webhook events stored in Supabase
 */

import { NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

function getSupabase() {
    const url = process.env.SUPABASE_URL
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY
    if (!url || !key) return null
    return createClient(url, key)
}

export interface WebhookReportData {
    totalEvents: number
    uniqueRecipients: number
    eventsByType: Record<string, number>
    recipients: Array<{
        email: string
        events: Record<string, number>
        totalEvents: number
        firstEvent: string
        lastEvent: string
    }>
    dateRange: { from: string | null; to: string | null }
}

export async function GET() {
    try {
        const supabase = getSupabase()
        if (!supabase) {
            return NextResponse.json(
                { error: "Database not configured" },
                { status: 500 }
            )
        }

        const { data: events, error } = await supabase
            .from("email_events")
            .select("event_type, email, occurred_at, message_id")
            .not("email", "eq", "system@internal")
            .order("occurred_at", { ascending: false })
            .limit(1000)

        if (error) {
            console.error("[webhook-report] Query error:", error)
            return NextResponse.json(
                { error: "Failed to query events" },
                { status: 500 }
            )
        }

        const rows = events || []

        // Aggregate by type
        const eventsByType: Record<string, number> = {}
        for (const e of rows) {
            eventsByType[e.event_type] = (eventsByType[e.event_type] || 0) + 1
        }

        // Aggregate by recipient
        const recipientMap = new Map<string, {
            events: Record<string, number>
            totalEvents: number
            first: string
            last: string
        }>()

        for (const e of rows) {
            const existing = recipientMap.get(e.email)
            if (existing) {
                existing.events[e.event_type] = (existing.events[e.event_type] || 0) + 1
                existing.totalEvents++
                if (e.occurred_at < existing.first) existing.first = e.occurred_at
                if (e.occurred_at > existing.last) existing.last = e.occurred_at
            } else {
                recipientMap.set(e.email, {
                    events: { [e.event_type]: 1 },
                    totalEvents: 1,
                    first: e.occurred_at,
                    last: e.occurred_at,
                })
            }
        }

        const recipients = Array.from(recipientMap.entries())
            .map(([email, data]) => ({
                email,
                events: data.events,
                totalEvents: data.totalEvents,
                firstEvent: data.first,
                lastEvent: data.last,
            }))
            .sort((a, b) => b.totalEvents - a.totalEvents)

        const report: WebhookReportData = {
            totalEvents: rows.length,
            uniqueRecipients: recipientMap.size,
            eventsByType,
            recipients,
            dateRange: {
                from: rows.length > 0 ? rows[rows.length - 1].occurred_at : null,
                to: rows.length > 0 ? rows[0].occurred_at : null,
            },
        }

        return NextResponse.json(report)
    } catch (err: any) {
        console.error("[webhook-report] Error:", err)
        return NextResponse.json(
            { error: err?.message || "Internal server error" },
            { status: 500 }
        )
    }
}
