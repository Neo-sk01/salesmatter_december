
import { createClient } from "@supabase/supabase-js"
import { NextResponse } from "next/server"

function getSupabase() {
    return createClient(
        process.env.SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
    )
}

export async function PATCH(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    const { id } = await params
    const updates = await request.json()
    const supabase = getSupabase()

    try {
        const { data, error } = await supabase
            .from("email_drafts")
            .update(updates)
            .eq("id", id)
            .select()
            .single()

        if (error) throw error

        return NextResponse.json({ draft: data })
    } catch (error: any) {
        console.error("Error updating draft:", error)
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}

export async function DELETE(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    const { id } = await params
    const supabase = getSupabase()

    try {
        const { error } = await supabase
            .from("email_drafts")
            .delete()
            .eq("id", id)

        if (error) throw error

        return NextResponse.json({ success: true })
    } catch (error: any) {
        console.error("Error deleting draft:", error)
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}
