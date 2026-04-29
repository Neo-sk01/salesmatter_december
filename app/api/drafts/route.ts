
import { createClient } from "@supabase/supabase-js"
import { NextResponse } from "next/server"
import { MAX_DRAFT_VERSIONS, toDraftVersion } from "@/lib/db/draft-versions"
import { normalizeDraftEmail } from "@/lib/agents/email-output-formatting"

function getSupabase() {
    if (!process.env.SUPABASE_URL) {
        console.error("Missing SUPABASE_URL");
    }
    if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
        console.error("Missing SUPABASE_SERVICE_ROLE_KEY");
    }
    return createClient(
        process.env.SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
    )
}

export async function GET() {
    const supabase = getSupabase()

    try {
        const { data: drafts, error } = await supabase
            .from("email_drafts")
            .select(`
        *,
        leads (
            id,
            first_name,
            last_name,
            email,
            company,
            role,
            status
        )
      `)
            .order("created_at", { ascending: false })

        if (error) throw error

        // Pull all version rows for the returned drafts in a single query and
        // attach them per-draft. We cap per draft on the client to MAX, but
        // also return them ordered newest-first so the UI displays correctly
        // without re-sorting.
        const draftIds = (drafts ?? []).map((d: any) => d.id)
        let versionsByDraft: Record<string, ReturnType<typeof toDraftVersion>[]> = {}

        if (draftIds.length > 0) {
            const { data: versionRows, error: vError } = await supabase
                .from("email_draft_versions")
                .select("id, draft_id, subject, body, research_summary, generated_at")
                .in("draft_id", draftIds)
                .order("generated_at", { ascending: false })

            if (!vError && versionRows) {
                for (const row of versionRows as any[]) {
                    const list = versionsByDraft[row.draft_id] ?? []
                    if (list.length < MAX_DRAFT_VERSIONS) {
                        list.push(toDraftVersion(row))
                        versionsByDraft[row.draft_id] = list
                    }
                }
            }
        }

        const enriched = (drafts ?? []).map((d: any) => {
            const normalized = normalizeDraftEmail({
                subject: d.subject,
                body: d.body,
            })

            return {
                ...d,
                subject: normalized.subject,
                body: normalized.body,
                previous_versions: versionsByDraft[d.id] ?? [],
            }
        })

        return NextResponse.json({ drafts: enriched })
    } catch (error: any) {
        console.error("Error fetching drafts:", JSON.stringify(error, null, 2))
        return NextResponse.json({
            error: error.message || "Unknown error",
            details: error.details || null,
            hint: error.hint || null,
            code: error.code || null
        }, { status: 500 })
    }
}

export async function DELETE(request: Request) {
    const supabase = getSupabase()
    const { searchParams } = new URL(request.url)
    const scope = searchParams.get("scope") ?? "pending"

    try {
        let query = supabase.from("email_drafts").delete()

        if (scope === "pending") {
            query = query.neq("status", "sent")
        } else if (scope === "all") {
            query = query.not("id", "is", null)
        } else {
            return NextResponse.json({ error: `Unknown scope: ${scope}` }, { status: 400 })
        }

        const { data, error } = await query.select("id")

        if (error) throw error

        return NextResponse.json({ success: true, deleted: data?.length ?? 0 })
    } catch (error: any) {
        console.error("Error clearing drafts:", error)
        return NextResponse.json({ error: error.message || "Failed to clear drafts" }, { status: 500 })
    }
}
