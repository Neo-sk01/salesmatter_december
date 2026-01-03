
import { DashboardShell } from "@/components/dashboard-shell"
import { createClient } from "@supabase/supabase-js"
import { notFound } from "next/navigation"
import { FileLeadsManager } from "@/components/files/file-leads-manager"

export default async function FileDetailsPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params

    const supabase = createClient(
        process.env.SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    // Fetch file data server-side
    const { data: file, error } = await supabase
        .from("processed_files")
        .select("*")
        .eq("id", id)
        .single()

    if (error || !file) {
        notFound()
    }

    // Fetch leads from the leads table (linked by file_id)
    const { data: dbLeads, error: leadsError } = await supabase
        .from("leads")
        .select("*")
        .eq("file_id", id)
        .order("created_at", { ascending: false })

    if (leadsError) {
        console.error("Error fetching leads:", leadsError)
    }

    // Map database leads to frontend format
    const leads = (dbLeads || []).map((l: any) => ({
        id: l.id,
        firstName: l.first_name || "",
        lastName: l.last_name || "",
        email: l.email || "",
        company: l.company || "",
        role: l.role || "",
        selected: false
    }))

    return (
        <DashboardShell>
            <div className="flex flex-col h-full bg-background p-6">
                <FileLeadsManager
                    fileId={file.id}
                    initialLeads={leads}
                    filename={file.filename}
                />
            </div>
        </DashboardShell>
    )
}
