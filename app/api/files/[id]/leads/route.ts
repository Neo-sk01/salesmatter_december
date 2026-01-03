
import { createClient } from "@supabase/supabase-js"
import { NextResponse } from "next/server"

function getSupabase() {
    return createClient(
        process.env.SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
    )
}

export async function GET(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    const { id } = await params
    const supabase = getSupabase()

    try {
        // Determine if 'id' is a file_id or we want direct lead access.
        // The route is /api/files/[id]/leads, so 'id' is the FILE ID.
        // We want to fetch all leads for this file.

        const { data: leads, error } = await supabase
            .from("leads")
            .select("*")
            .eq("file_id", id)
            .order("created_at", { ascending: false })

        if (error) throw error

        return NextResponse.json({ leads })
    } catch (error: any) {
        console.error("Error fetching leads:", error)
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}

export async function POST(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    const { id } = await params // file_id
    const { action, lead } = await request.json()
    const supabase = getSupabase()

    try {
        let resultLeads = []

        if (action === "add") {
            const newLead = { ...lead, file_id: id }
            const { data, error } = await supabase.from('leads').insert(newLead).select().single()
            if (error) throw error
            // Return all leads or just the new one?
            // The UI expects the updated LIST. Optimally we return just the one, but let's stick to contract: return list?
            // Actually, returning full list is safer for sync.
        } else if (action === "update") {
            const { id: leadId, ...updates } = lead
            const { error } = await supabase.from('leads').update(updates).eq('id', leadId)
            if (error) throw error
        } else if (action === "delete") {
            const { error } = await supabase.from('leads').delete().eq('id', lead.id)
            if (error) throw error
        } else {
            return NextResponse.json({ error: "Invalid action" }, { status: 400 })
        }

        // Fetch updated list to return
        const { data: leads, error: fetchError } = await supabase
            .from("leads")
            .select("*")
            .eq("file_id", id)
            .order("created_at", { ascending: false })

        if (fetchError) throw fetchError

        return NextResponse.json({ success: true, leads })

    } catch (error: any) {
        console.error("Error updating leads:", error)
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}
