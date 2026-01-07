
import { createClient } from "@supabase/supabase-js"
import { NextResponse } from "next/server"

function getSupabase() {
    if (!process.env.SUPABASE_URL) {
        console.error("Missing SUPABASE_URL");
    }
    if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
        console.error("Missing SUPABASE_SERVICE_ROLE_KEY");
    }
    return createClient(
        process.env.SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
    )
}

export async function GET() {
    const supabase = getSupabase()

    try {
        const { data: drafts, error } = await supabase
            .from("email_drafts")
            .select(`
        *,
        leads (
            id,
            first_name,
            last_name,
            email,
            company,
            role,
            status
        )
      `)
            .order("created_at", { ascending: false })

        if (error) throw error

        return NextResponse.json({ drafts })
    } catch (error: any) {
        console.error("Error fetching drafts:", error)
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}
