import { NextResponse } from "next/server";
import { researchLead } from "@/lib/agents/research-agent";
import { draftEmail } from "@/lib/agents/drafting-agent";
import { ImportedLead } from "@/types";

export const dynamic = 'force-dynamic';

export async function GET() {
    const lead: ImportedLead = {
        id: "test",
        firstName: "Wayne",
        lastName: "",
        company: "Media Mark",
        role: "CEO",
        email: "wayne@mediamark.com",
    };

    const userPrompt = "We are introducing SalesMatter, our AI-powered outbound platform, to help them automate personalization and tighten their outreach flow without the manual effort.";

    try {
        const researchResult = await researchLead(lead);

        const emails = [];
        for (let i = 1; i <= 5; i++) {
            const dt = await draftEmail(lead, researchResult.summary, userPrompt);
            emails.push(`SUBJECT: ${dt.subject}\n\n${dt.body}`);
        }

        return NextResponse.json({
            research: researchResult.summary,
            emails: emails
        });
    } catch (e: any) {
        return NextResponse.json({ error: e.message || String(e) }, { status: 500 });
    }
}
