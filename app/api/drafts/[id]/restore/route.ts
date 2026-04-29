import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"
import { archiveDraftVersion, listDraftVersions } from "@/lib/db/draft-versions"

function getSupabase() {
    return createClient(
        process.env.SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
    )
}

/**
 * POST /api/drafts/[id]/restore
 * Body: { versionId: string }
 *
 * Swaps the current draft content with a previous version. The previous
 * version row is deleted (it's now current), and the outgoing current is
 * pushed onto the version history. Net history count is preserved.
 */
export async function POST(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> },
) {
    const { id } = await params
    const supabase = getSupabase()

    let body: { versionId?: string }
    try {
        body = await req.json()
    } catch {
        return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 })
    }

    const versionId = body.versionId
    if (!versionId) {
        return NextResponse.json({ error: "versionId is required" }, { status: 400 })
    }

    try {
        // Load both rows in parallel.
        const [draftResult, versionResult] = await Promise.all([
            supabase
                .from("email_drafts")
                .select("id, subject, body, research_summary, created_at")
                .eq("id", id)
                .single(),
            supabase
                .from("email_draft_versions")
                .select("id, draft_id, subject, body, research_summary, generated_at")
                .eq("id", versionId)
                .single(),
        ])

        if (draftResult.error || !draftResult.data) {
            return NextResponse.json({ error: "Draft not found" }, { status: 404 })
        }
        if (versionResult.error || !versionResult.data) {
            return NextResponse.json({ error: "Version not found" }, { status: 404 })
        }
        if (versionResult.data.draft_id !== id) {
            return NextResponse.json(
                { error: "Version does not belong to this draft" },
                { status: 400 },
            )
        }

        const draft = draftResult.data
        const version = versionResult.data

        // 1. Archive the OUTGOING current state into history.
        await archiveDraftVersion(supabase, id, {
            subject: draft.subject,
            body: draft.body,
            researchSummary: draft.research_summary,
            generatedAt: draft.created_at,
        })

        // 2. Delete the version row we're restoring (it's about to BE the
        //    current draft, so keeping it in history would duplicate it).
        await supabase
            .from("email_draft_versions")
            .delete()
            .eq("id", versionId)

        // 3. Update the draft with the restored content.
        const nowIso = new Date().toISOString()
        const { data: updated, error: updateError } = await supabase
            .from("email_drafts")
            .update({
                subject: version.subject,
                body: version.body,
                research_summary: version.research_summary,
                created_at: nowIso,
            })
            .eq("id", id)
            .select()
            .single()

        if (updateError || !updated) {
            return NextResponse.json(
                { error: updateError?.message || "Failed to restore draft" },
                { status: 500 },
            )
        }

        const versions = await listDraftVersions(supabase, id)

        return NextResponse.json({
            draft: {
                id: updated.id,
                leadId: updated.lead_id,
                subject: updated.subject,
                body: updated.body,
                status: updated.status,
                createdAt: updated.created_at,
                researchSummary: updated.research_summary,
            },
            previousVersions: versions,
        })
    } catch (error: unknown) {
        console.error("Failed to restore draft version:", error)
        const message = error instanceof Error ? error.message : "Internal server error"
        return NextResponse.json({ error: message }, { status: 500 })
    }
}
