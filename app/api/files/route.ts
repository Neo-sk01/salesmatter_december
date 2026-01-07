
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function GET(req: NextRequest) {
    const supabaseUrl = process.env.SUPABASE_URL!;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    try {
        const { data, error } = await supabase
            .from("processed_files")
            .select("id, filename, description, row_count, file_size_bytes, status, created_at")
            .order("created_at", { ascending: false });

        if (error) {
            throw error;
        }

        return NextResponse.json({ files: data });
    } catch (error: any) {
        console.error("Error fetching files:", JSON.stringify(error, null, 2));
        return NextResponse.json(
            {
                error: error.message || "Failed to fetch files",
                details: error.details || null,
                hint: error.hint || null,
                code: error.code || null
            },
            { status: 500 }
        );
    }
}
