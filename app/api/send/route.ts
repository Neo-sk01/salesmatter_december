import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import {
    createCampaign,
    activateCampaign,
    addLeadToCampaign,
    InstantlyError,
} from "@/lib/services/instantly";

export interface DraftPayload {
    id?: string;
    leadId?: string;
    email: string;
    subject: string;
    body: string;
    firstName?: string;
    lastName?: string;
    companyName?: string;
}

const MAX_DRAFTS_PER_BATCH = 100;

function getSupabase() {
    return createClient(
        process.env.SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!,
    );
}

/**
 * Per-batch Instantly send. One campaign per batch, one lead per draft, body
 * personalised via the {{personalization}} variable. Subject is templated to
 * pull {{companyName}} when every draft has it; otherwise we fall back to the
 * first draft's literal subject.
 */
export async function POST(req: NextRequest) {
    let drafts: DraftPayload[];
    try {
        const body = await req.json();
        drafts = body?.drafts;
    } catch {
        return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }

    if (!Array.isArray(drafts) || drafts.length === 0) {
        return NextResponse.json(
            { error: "drafts must be a non-empty array" },
            { status: 400 },
        );
    }
    if (drafts.length > MAX_DRAFTS_PER_BATCH) {
        return NextResponse.json(
            { error: `Batch size exceeds ${MAX_DRAFTS_PER_BATCH}` },
            { status: 400 },
        );
    }

    const allHaveCompany = drafts.every((d) => d.companyName && d.companyName.trim());
    const sequenceSubject = allHaveCompany
        ? "Quick question re {{companyName}}"
        : drafts[0].subject;

    const campaignName = `Salesmatter batch ${new Date().toISOString().slice(0, 19).replace("T", " ")}`;

    let campaignId: string;
    try {
        const campaign = await createCampaign({
            name: campaignName,
            sequenceSubject,
            sequenceBody: "{{personalization}}",
        });
        campaignId = campaign.id;
    } catch (err) {
        const message =
            err instanceof InstantlyError ? err.message : "Failed to create campaign";
        console.error("[send] campaign create failed:", err);
        return NextResponse.json({ error: message }, { status: 502 });
    }

    const supabase = getSupabase();
    const sentAt = new Date().toISOString();

    const results = await Promise.all(
        drafts.map(async (draft) => {
            try {
                const lead = await addLeadToCampaign({
                    campaignId,
                    email: draft.email,
                    firstName: draft.firstName,
                    lastName: draft.lastName,
                    companyName: draft.companyName,
                    personalization: draft.body,
                });

                if (draft.id) {
                    await supabase
                        .from("email_drafts")
                        .update({
                            status: "sent",
                            sent_at: sentAt,
                            instantly_campaign_id: campaignId,
                            instantly_lead_id: lead.id,
                        })
                        .eq("id", draft.id);
                }

                return {
                    id: draft.id,
                    leadId: draft.leadId,
                    email: draft.email,
                    status: "sent" as const,
                    instantlyLeadId: lead.id,
                };
            } catch (err) {
                const message =
                    err instanceof InstantlyError
                        ? err.message
                        : err instanceof Error
                            ? err.message
                            : "Unknown error";
                console.error(`[send] addLead failed for ${draft.email}:`, err);
                return {
                    id: draft.id,
                    leadId: draft.leadId,
                    email: draft.email,
                    status: "failed" as const,
                    error: message,
                };
            }
        }),
    );

    // Activate even if some leads failed — partial sends are still useful.
    try {
        await activateCampaign(campaignId);
    } catch (err) {
        console.error("[send] activate failed:", err);
        return NextResponse.json(
            {
                campaignId,
                results,
                error: "Campaign created but activation failed. Activate manually in Instantly.",
            },
            { status: 502 },
        );
    }

    const sentCount = results.filter((r) => r.status === "sent").length;
    const failedCount = results.length - sentCount;

    return NextResponse.json({
        campaignId,
        results,
        summary: {
            total: drafts.length,
            sent: sentCount,
            failed: failedCount,
            skipped: 0,
        },
    });
}
