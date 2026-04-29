import type { SupabaseClient } from "@supabase/supabase-js"
import type { DraftVersion } from "@/types"
import { normalizeDraftEmail } from "@/lib/agents/email-output-formatting"

export const MAX_DRAFT_VERSIONS = 5

type DraftSnapshot = {
    subject: string
    body: string
    researchSummary?: string | null
    generatedAt: string
}

type RawVersion = {
    id: string
    subject: string
    body: string
    research_summary: string | null
    generated_at: string
}

/**
 * Append a snapshot of the draft's current content to email_draft_versions,
 * then prune anything older than MAX_DRAFT_VERSIONS.
 *
 * We prune inside the same call so the table never accumulates stale rows for
 * a single draft. If pruning fails we log and continue — the archive itself
 * succeeded, which is the load-bearing operation.
 */
export async function archiveDraftVersion(
    supabase: SupabaseClient,
    draftId: string,
    snapshot: DraftSnapshot,
): Promise<void> {
    const { error: insertError } = await supabase
        .from("email_draft_versions")
        .insert({
            draft_id: draftId,
            subject: snapshot.subject,
            body: snapshot.body,
            research_summary: snapshot.researchSummary ?? null,
            generated_at: snapshot.generatedAt,
        })

    if (insertError) {
        // Don't throw — losing version history shouldn't break the regenerate.
        console.error("Failed to archive draft version:", insertError)
        return
    }

    await pruneDraftVersions(supabase, draftId)
}

export async function pruneDraftVersions(
    supabase: SupabaseClient,
    draftId: string,
    keep: number = MAX_DRAFT_VERSIONS,
): Promise<void> {
    const { data: ids, error } = await supabase
        .from("email_draft_versions")
        .select("id, generated_at")
        .eq("draft_id", draftId)
        .order("generated_at", { ascending: false })

    if (error || !ids) return

    const toDelete = ids.slice(keep).map((v) => v.id)
    if (toDelete.length === 0) return

    const { error: delError } = await supabase
        .from("email_draft_versions")
        .delete()
        .in("id", toDelete)

    if (delError) {
        console.error("Failed to prune draft versions:", delError)
    }
}

export async function listDraftVersions(
    supabase: SupabaseClient,
    draftId: string,
    limit: number = MAX_DRAFT_VERSIONS,
): Promise<DraftVersion[]> {
    const { data, error } = await supabase
        .from("email_draft_versions")
        .select("id, subject, body, research_summary, generated_at")
        .eq("draft_id", draftId)
        .order("generated_at", { ascending: false })
        .limit(limit)

    if (error || !data) return []

    return (data as RawVersion[]).map(toDraftVersion)
}

export function toDraftVersion(row: RawVersion): DraftVersion {
    const normalized = normalizeDraftEmail({
        subject: row.subject,
        body: row.body,
    })

    return {
        id: row.id,
        subject: normalized.subject,
        body: normalized.body,
        generatedAt: row.generated_at,
    }
}
