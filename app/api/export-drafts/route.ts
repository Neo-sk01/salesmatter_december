import { NextRequest, NextResponse } from "next/server";
import { sendEmail } from "@/lib/services/everlytic";

interface DraftForExport {
    id: string;
    lead: {
        firstName: string;
        lastName: string;
        email: string;
        company: string;
        role: string;
    };
    subject: string;
    body: string;
    status: string;
    createdAt: string;
    researchSummary?: string;
}

interface ExportRequest {
    drafts: DraftForExport[];
    recipientEmail: string;
}

/**
 * Format drafts into a minimal, clean HTML email for human review
 */
function formatDraftsAsHtml(drafts: DraftForExport[]): string {
    const draftsHtml = drafts.map((draft, index) => {
        const researchSection = draft.researchSummary
            ? `
                <div style="margin: 16px 0; padding: 12px; background-color: #f9fafb; border-left: 3px solid #e5e7eb; font-size: 14px; color: #4b5563;">
                    <strong style="color: #374151; display: block; margin-bottom: 4px;">Research Context:</strong>
                    ${draft.researchSummary}
                </div>
            `
            : '';

        const statusColor = draft.status === 'sent' ? '#059669' : '#d97706';

        return `
            <div style="padding: 24px 0; border-bottom: 1px solid #e5e7eb;">
                <div style="display: flex; justify-content: space-between; align-items: baseline; margin-bottom: 12px;">
                    <h2 style="margin: 0; font-size: 18px; font-weight: 600; color: #111827;">
                        ${index + 1}. ${draft.lead.firstName} ${draft.lead.lastName}
                    </h2>
                    <span style="font-size: 12px; font-weight: 500; color: ${statusColor}; text-transform: uppercase; letter-spacing: 0.05em;">
                        ${draft.status}
                    </span>
                </div>

                <div style="font-size: 14px; color: #6b7280; margin-bottom: 16px; line-height: 1.5;">
                    <div>${draft.lead.company} • ${draft.lead.role}</div>
                    <a href="mailto:${draft.lead.email}" style="color: #6b7280; text-decoration: none;">${draft.lead.email}</a>
                </div>

                ${researchSection}

                <div style="margin-top: 16px;">
                    <div style="font-size: 14px; font-weight: 600; color: #374151; margin-bottom: 8px;">
                        Subject: <span style="font-weight: 400;">${draft.subject}</span>
                    </div>
                    <div style="font-size: 15px; color: #1f2937; line-height: 1.6; white-space: pre-wrap; font-family: ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">${draft.body}</div>
                </div>
            </div>
        `;
    }).join('');

    return `
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="font-family: ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #ffffff; color: #1f2937; margin: 0; padding: 20px; line-height: 1.5;">
            <div style="max-width: 680px; margin: 0 auto;">
                <div style="padding-bottom: 24px; border-bottom: 2px solid #111827; margin-bottom: 8px;">
                    <h1 style="margin: 0; font-size: 24px; font-weight: 700; color: #111827;">Draft Review</h1>
                    <p style="margin: 8px 0 0 0; color: #6b7280; font-size: 14px;">
                        ${drafts.length} drafts ready for review • ${new Date().toLocaleDateString()}
                    </p>
                </div>

                ${draftsHtml}

                <div style="padding-top: 32px; font-size: 12px; color: #9ca3af; text-align: center;">
                    Sent via SalesMatter
                </div>
            </div>
        </body>
        </html>
    `;
}

export async function POST(req: NextRequest) {
    try {
        const body: ExportRequest = await req.json();
        const { drafts, recipientEmail } = body;

        if (!drafts || drafts.length === 0) {
            return NextResponse.json(
                { success: false, error: "No drafts to export" },
                { status: 400 }
            );
        }

        if (!recipientEmail || !recipientEmail.includes("@")) {
            return NextResponse.json(
                { success: false, error: "Invalid recipient email" },
                { status: 400 }
            );
        }

        // Format drafts as HTML email
        const htmlContent = formatDraftsAsHtml(drafts);

        // Send via Everlytic
        const result = await sendEmail({
            to: recipientEmail,
            subject: `📬 Email Drafts for Review (${drafts.length} draft${drafts.length !== 1 ? 's' : ''})`,
            body: htmlContent,
        });

        if (!result.success) {
            console.error("Failed to send export email:", result.error);
            return NextResponse.json(
                {
                    success: false,
                    error: result.error || "Failed to send export email"
                },
                { status: 500 }
            );
        }

        return NextResponse.json({
            success: true,
            message: `Successfully exported ${drafts.length} drafts to ${recipientEmail}`,
            details: result.details,
        });

    } catch (error: any) {
        console.error("Export drafts error:", error);
        return NextResponse.json(
            {
                success: false,
                error: error.message || "An unexpected error occurred"
            },
            { status: 500 }
        );
    }
}
