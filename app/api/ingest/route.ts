
import { NextRequest, NextResponse } from "next/server";
import Papa from "papaparse";
import * as XLSX from "xlsx";
import { createClient } from "@supabase/supabase-js";

// Initialize Supabase Client
const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

export async function POST(req: NextRequest) {
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

        // Store file metadata and content in Supabase
        const { data: insertedFile, error } = await supabase
            .from("processed_files")
            .insert({
                filename: file.name,
                file_type: fileType,
                file_size_bytes: fileSize,
                row_count: data.length,
                description: `Imported via web interface on ${new Date().toLocaleDateString()}`,
                status: "ingested",
                file_data: data, // Store parsed JSON directly
            })
            .select()
            .single();

        if (error) {
            console.error("Supabase insert error:", error);
            // Return success with data even if save fails? No, better to fail or warn.
            // For now, fail safely but warn user
            return NextResponse.json(
                { error: "Failed to save file to database: " + error.message },
                { status: 500 }
            );
        }

        return NextResponse.json({
            success: true,
            fileId: insertedFile.id,
            data
        });

    } catch (error) {
        console.error("Error processing file:", error);
        return NextResponse.json(
            { error: "Failed to process file" },
            { status: 500 }
        );
    }
}
