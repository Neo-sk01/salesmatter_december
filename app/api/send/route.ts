
import { NextRequest, NextResponse } from "next/server";
import { sendEmail } from "@/lib/services/everlytic";
import { insertEmailEvent } from "@/lib/db/email-events-db";
import { createClient } from "@supabase/supabase-js";
import type { CanonicalEmailEvent } from "@/types/email-analytics";

function getSupabase() {
    return createClient(
        process.env.SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
    )
}

export interface EmailDraft {
    id?: string;
    leadId?: string;
    email: string;
    subject: string;
    body: string;
}

export async function POST(req: NextRequest) {
    try {
        const { drafts } = await req.json();

        if (!drafts || !Array.isArray(drafts)) {
            return NextResponse.json(
                { error: "Drafts array is required" },
                { status: 400 }
            );
        }

        // Send emails in parallel
        const results = await Promise.all(
            drafts.map(async (draft: EmailDraft) => {
                try {
                    // ── Guard: skip if already sent ──────────────────────────
                    if (draft.id) {
                        const supabase = getSupabase();
                        const { data: existing } = await supabase
                            .from("email_drafts")
                            .select("status")
                            .eq("id", draft.id)
                            .single();

                        if (existing?.status === "sent") {
                            console.log(`[send-api] Skipping already-sent draft ${draft.id} (${draft.email})`);
                            return {
                                id: draft.id,
                                leadId: draft.leadId,
                                email: draft.email,
                                status: "already_sent",
                                error: null,
                            };
                        }
                    }
                    // ────────────────────────────────────────────────────────

                    const result = await sendEmail({
                        to: draft.email,
                        subject: draft.subject,
                        body: draft.body,
                    });

                    const supabase = getSupabase();

                    if (draft.id) {
                        await supabase.from("email_drafts").update({
                            status: result.success ? "sent" : "failed",
                            sent_at: result.success ? new Date().toISOString() : null
                        }).eq("id", draft.id);
                    }

                    // If email was sent successfully, insert a "sent" event for analytics
                    if (result.success) {
                        const messageId = result.details?.message_id ||
                            result.details?.data?.message_id ||
                            `local-${Date.now()}-${Math.random().toString(36).substring(7)}`;

                        const sentEvent: CanonicalEmailEvent = {
                            provider: "everlytic",
                            eventType: "sent",
                            email: draft.email,
                            messageId: messageId,
                            campaignId: draft.id || null,
                            templateId: null,
                            occurredAt: new Date(),
                            rawPayload: {
                                source: "api_send",
                                subject: draft.subject,
                                details: result.details
                            }
                        };

                        const idempotencyKey = `sent-${messageId}-${draft.email}`;

                        const insertResult = await insertEmailEvent(sentEvent, idempotencyKey);
                        if (insertResult.inserted) {
                            console.log(`[send-api] Inserted sent event for ${draft.email}`);
                        }
                    }

                    return {
                        id: draft.id,
                        leadId: draft.leadId,
                        email: draft.email,
                        status: result.success ? "sent" : "failed",
                        error: result.error,
                        details: result.details,
                    };
                } catch (err) {
                    console.error(`Failed to send email to ${draft.email}:`, err);
                    return {
                        leadId: draft.leadId,
                        email: draft.email,
                        status: "failed",
                        error: err instanceof Error ? err.message : "Unknown error",
                    };
                }
            })
        );

        const successCount = results.filter((r) => r.status === "sent").length;
        const failedCount = results.filter((r) => r.status === "failed").length;
        const skippedCount = results.filter((r) => r.status === "already_sent").length;


        return NextResponse.json({
            results,
            summary: {
                total: drafts.length,
                sent: successCount,
                failed: failedCount,
                skipped: skippedCount,
            },
        });
    } catch (error) {
        console.error("Error sending emails:", error);
        return NextResponse.json(
            { error: "Internal server error" },
            { status: 500 }
        );
    }
}
