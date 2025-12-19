
import { NextRequest, NextResponse } from "next/server";
import { researchLead } from "@/lib/agents/research-agent";
import { draftEmail } from "@/lib/agents/drafting-agent";
import { sendEmail } from "@/lib/services/everlytic";
import { ImportedLead } from "@/types";

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
                    const summary = await researchLead(lead);

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

                    return {
                        leadId: lead.id,
                        subject: draft.subject,
                        body: draft.body,
                        status: sendImmediately
                            ? (sendResult?.success ? "sent" : "failed")
                            : "drafted",
                        researchSummary: summary, // Optional: return research to UI if needed
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
