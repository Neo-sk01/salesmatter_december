
import { NextRequest, NextResponse } from "next/server";
import Papa from "papaparse";
import * as XLSX from "xlsx";
import { createClient } from "@supabase/supabase-js";
import { identifyColumns } from "@/lib/agents/mapping-agent";

// Initialize Supabase Client
export async function POST(req: NextRequest) {
    const supabaseUrl = process.env.SUPABASE_URL!;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    try {
        const formData = await req.formData();
        const file = formData.get("file") as File;

        if (!file) {
            return NextResponse.json({ error: "No file provided" }, { status: 400 });
        }

        const buffer = await file.arrayBuffer();
        const fileType = file.name.split(".").pop()?.toLowerCase();
        const fileSize = file.size;

        let data: any[] = [];

        if (fileType === "csv") {
            const text = new TextDecoder().decode(buffer);
            const result = Papa.parse(text, { header: true, skipEmptyLines: true });
            data = result.data;
        } else if (["xlsx", "xls"].includes(fileType || "")) {
            const workbook = XLSX.read(buffer, { type: "array" });
            const sheetName = workbook.SheetNames[0];
            const sheet = workbook.Sheets[sheetName];
            data = XLSX.utils.sheet_to_json(sheet);
        } else {
            return NextResponse.json(
                { error: "Unsupported file type" },
                { status: 400 }
            );
        }

        // Store file metadata in Supabase (without huge file_data)
        const { data: insertedFile, error } = await supabase
            .from("processed_files")
            .insert({
                filename: file.name,
                file_type: fileType,
                file_size_bytes: fileSize,
                row_count: data.length,
                description: `Imported via web interface on ${new Date().toLocaleDateString()}`,
                status: "ingested",
                file_data: [], // Keep metadata light
            })
            .select()
            .single();

        if (error) {
            console.error("Supabase insert error:", error);
            return NextResponse.json(
                { error: "Failed to save file to database: " + error.message },
                { status: 500 }
            );
        }

        // Map and insert leads using LangChain GPT-4o-mini mapping agent
        if (data.length > 0) {
            const headers = Object.keys(data[0]);
            const sampleRows = data.slice(0, 5);

            // Use LangChain mapping agent with GPT-4o-mini
            const mapping = await identifyColumns(headers, sampleRows);

            const leads = data.map((row: any) => ({
                file_id: insertedFile.id,
                first_name: mapping.firstName ? row[mapping.firstName] || '' : '',
                last_name: mapping.lastName ? row[mapping.lastName] || '' : '',
                email: mapping.email ? row[mapping.email] || '' : '',
                company: mapping.company ? row[mapping.company] || '' : '',
                role: mapping.role ? row[mapping.role] || '' : '',
                linkedin_url: mapping.linkedin ? row[mapping.linkedin] || '' : '',
            })).filter((l: any) => l.email); // Require email

            if (leads.length > 0) {
                const { error: leadsError } = await supabase
                    .from('leads')
                    .insert(leads);

                if (leadsError) {
                    console.error("Failed to insert leads:", leadsError);
                    // Non-fatal: log but continue
                }
            }
        }

        return NextResponse.json({
            success: true,
            fileId: insertedFile.id,
            count: data.length
        });

    } catch (error) {
        console.error("Error processing file:", error);
        return NextResponse.json(
            { error: "Failed to process file" },
            { status: 500 }
        );
    }
}
