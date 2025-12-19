
import { NextRequest, NextResponse } from "next/server";
import { sendEmail } from "@/lib/services/everlytic";

export interface EmailDraft {
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
                    const result = await sendEmail({
                        to: draft.email,
                        subject: draft.subject,
                        body: draft.body,
                    });

                    return {
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

        return NextResponse.json({
            results,
            summary: {
                total: drafts.length,
                sent: successCount,
                failed: failedCount,
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
