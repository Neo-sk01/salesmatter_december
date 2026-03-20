import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

function getSupabase() {
    return createClient(
        process.env.SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
    );
}

export async function POST(req: NextRequest) {
    try {
        const supabase = getSupabase();

        const subject = `Wayne, scaling Mediamark's outreach without adding headcount – inspired by your digital transformation piece`;

        const body = `Hello Wayne,

I read your recent article "Digital transformation: Shaping Mediamark for the future" with real interest. Turning a legacy media sales house into an agile organisation that scales without increasing resources is exactly the kind of bold leadership that sets Mediamark apart, especially with your 21M+ digital reach and growing audio/streaming portfolio.

At SalesMatter we help CEOs in media sales do precisely that with outbound: we automate personalised outreach at scale while keeping it human and targeted.

Our clients consistently see:
•  30% higher meeting rates
•  2× more qualified opportunities in their pipeline

…all without adding extra sales or marketing headcount.

I'd love to share how we've helped other media owners achieve similar efficiency gains during periods of rapid change. Would you have 15 minutes next week to explore whether this could support Mediamark's next growth phase?

Best regards,
Carl Davis
Founder, SalesMatter
carl@salesmatter.co.za
+27 74 172 5891`;

        const { data, error } = await supabase
            .from("email_drafts")
            .insert({
                subject,
                body,
                status: "drafted",
                research_summary: JSON.stringify({
                    summary: "Manually created reference draft based on Carl Davis gold standard email template.",
                    sources: [],
                }),
            })
            .select()
            .single();

        if (error) {
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        return NextResponse.json({ success: true, draft: data });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
