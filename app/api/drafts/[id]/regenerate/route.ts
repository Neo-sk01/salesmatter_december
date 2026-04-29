import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"
import { researchLead } from "@/lib/agents/research-agent"
import { regenerateEmail } from "@/lib/agents/regeneration-agent"
import { AIError } from "@/lib/ai/errors"
import { isDraftingModelId } from "@/lib/ai/models"
import { archiveDraftVersion, listDraftVersions } from "@/lib/db/draft-versions"
import type { ImportedLead } from "@/types"

function getSupabase() {
    return createClient(
        process.env.SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
    )
}

/**
 * POST /api/drafts/[id]/regenerate
 *
 * Replaces the previous regenerate flow (which inserted a new draft and
 * deleted the old one). The draft id is now stable across regenerations —
 * the prior subject/body/research go into email_draft_versions before the
 * row is updated in place.
 */
export async function POST(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> },
) {
    const { id } = await params
    const supabase = getSupabase()

    let body: { promptTemplate?: string; modelId?: string }
    try {
        body = await req.json()
    } catch {
        body = {}
    }

    const promptTemplate = body.promptTemplate ?? ""
    const resolvedModelId = isDraftingModelId(body.modelId) ? body.modelId : undefined

    try {
        // 1. Fetch the existing draft + its joined lead
        const { data: existing, error: fetchError } = await supabase
            .from("email_drafts")
            .select(`
                id,
                lead_id,
                subject,
                body,
                research_summary,
                created_at,
                leads (
                    id,
                    first_name,
                    last_name,
                    email,
                    company,
                    role
                )
            `)
            .eq("id", id)
            .single()

        if (fetchError || !existing) {
            return NextResponse.json(
                { error: "Draft not found" },
                { status: 404 },
            )
        }

        const lead = Array.isArray(existing.leads) ? existing.leads[0] : existing.leads
        if (!lead) {
            return NextResponse.json(
                { error: "Lead for this draft is missing" },
                { status: 422 },
            )
        }

        const leadForResearch: ImportedLead = {
            id: lead.id,
            firstName: lead.first_name,
            lastName: lead.last_name,
            email: lead.email,
            company: lead.company,
            role: lead.role,
            selected: true,
        }

        // 2. Run research + drafting BEFORE archiving so we don't pollute
        //    history with a new version when the model call fails.
        const research = await researchLead(leadForResearch)
        const newDraft = await regenerateEmail(
            leadForResearch,
            research.summary,
            promptTemplate,
            resolvedModelId,
        )
        const researchPayload = JSON.stringify(research)

        // 3. Archive the OLD content as a previous version.
        await archiveDraftVersion(supabase, id, {
            subject: existing.subject,
            body: existing.body,
            researchSummary: existing.research_summary,
            generatedAt: existing.created_at,
        })

        // 4. Update the draft row in place. created_at is bumped so the UI
        //    sorts the regenerated draft to the top, matching the prior
        //    "delete + insert" behavior.
        const nowIso = new Date().toISOString()
        const { data: updated, error: updateError } = await supabase
            .from("email_drafts")
            .update({
                subject: newDraft.subject,
                body: newDraft.body,
                status: "drafted",
                research_summary: researchPayload,
                created_at: nowIso,
            })
            .eq("id", id)
            .select()
            .single()

        if (updateError || !updated) {
            return NextResponse.json(
                { error: updateError?.message || "Failed to update draft" },
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
        console.error("Failed to regenerate draft:", error)

        if (error instanceof AIError) {
            return NextResponse.json(
                {
                    error: error.userMessage,
                    errorCode: error.code,
                    retryable: error.retryable,
                },
                { status: 503 },
            )
        }

        const message = error instanceof Error ? error.message : "Internal server error"
        return NextResponse.json({ error: message }, { status: 500 })
    }
}
