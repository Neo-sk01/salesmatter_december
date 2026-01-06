
import { NextRequest, NextResponse } from "next/server";
import { researchLead } from "@/lib/agents/research-agent";
import { draftEmail } from "@/lib/agents/drafting-agent";
import { sendEmail } from "@/lib/services/everlytic";
import { ImportedLead } from "@/types";
import { createClient } from "@supabase/supabase-js";

// Lazy init Supabase
function getSupabase() {
    return createClient(
        process.env.SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
    )
}

export async function POST(req: NextRequest) {
    try {
        const { leads, promptTemplate, sendImmediately = false } = await req.json();

        if (!leads || !Array.isArray(leads)) {
            return NextResponse.json(
                { error: "Leads array is required" },
                { status: 400 }
            );
        }

        // Process leads in parallel(ish) - limiting concurrency might be wise in production
        // but for small batches, map is fine.
        const results = await Promise.all(
            leads.map(async (lead: ImportedLead) => {
                try {
                    // 1. Research
                    const researchResult = await researchLead(lead);
                    const summary = researchResult.summary;

                    // 2. Draft
                    const draft = await draftEmail(lead, summary, promptTemplate);

                    // 3. Send (if requested)
                    let sendResult = null;
                    if (sendImmediately) {
                        sendResult = await sendEmail({
                            to: lead.email,
                            subject: draft.subject,
                            body: draft.body,
                        });
                    }

                    const status = sendImmediately
                        ? (sendResult?.success ? "sent" : "failed")
                        : "drafted";

                    // Save to DB
                    const supabase = getSupabase();
                    let draftId = crypto.randomUUID();

                    // Validate lead.id is a valid UUID, otherwise set to null
                    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
                    const leadIdForDb = uuidRegex.test(lead.id) ? lead.id : null;

                    // Store the full research result (summary + sources) as a JSON string
                    // This allows the frontend to parse it and display sources
                    const researchPayload = JSON.stringify(researchResult);

                    const { data: savedDraft, error: saveError } = await supabase
                        .from("email_drafts")
                        .insert({
                            lead_id: leadIdForDb,
                            subject: draft.subject,
                            body: draft.body,
                            status: status,
                            research_summary: researchPayload,
                            sent_at: sendImmediately && sendResult?.success ? new Date().toISOString() : null
                        })
                        .select()
                        .single();

                    if (saveError) {
                        console.error("Failed to save draft:", saveError);
                        // fallback to generated ID
                    } else {
                        draftId = savedDraft.id;
                    }

                    return {
                        id: draftId,
                        leadId: lead.id,
                        subject: draft.subject,
                        body: draft.body,
                        status: status,
                        researchSummary: researchPayload, // Return full payload so sources are available immediately
                        sendResult: sendResult,
                    };
                } catch (err) {
                    console.error(`Failed to process lead ${lead.id}:`, err);
                    return {
                        leadId: lead.id,
                        status: "failed",
                        error: "Failed to generate draft",
                    };
                }
            })
        );

        return NextResponse.json({ drafts: results });
    } catch (error) {
        console.error("Error generating drafts:", error);
        return NextResponse.json(
            { error: "Internal server error" },
            { status: 500 }
        );
    }
}
