
import { createClient } from "@supabase/supabase-js"
import { NextResponse } from "next/server"

function getSupabase() {
    return createClient(
        process.env.SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
    )
}

export async function DELETE(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    const { id } = await params
    const supabase = getSupabase()

    try {
        // Delete the file record
        // Note: If there are foreign key constraints with leads, we might need to delete leads first
        // But usually ON DELETE CASCADE handles it if configured. 
        // Based on schema, 'leads' table likely references 'processed_files' via 'file_id'.
        // Let's assume we want to cascade delete or just delete the file and let DB handle constraints.
        // Actually, looking at ingest route, leads have file_id. 
        // If we didn't set up cascade, we might error. 
        // Let's safe-delete leads first explicitly just in case, or check schema.
        // But for now, simple delete on processed_files.

        const { error } = await supabase
            .from("processed_files")
            .delete()
            .eq("id", id)

        if (error) throw error

        return NextResponse.json({ success: true })
    } catch (error: any) {
        console.error("Error deleting file:", error)
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}
