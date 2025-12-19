
import { NextRequest, NextResponse } from "next/server";
import Papa from "papaparse";
import * as XLSX from "xlsx";

export async function POST(req: NextRequest) {
    try {
        const formData = await req.formData();
        const file = formData.get("file") as File;

        if (!file) {
            return NextResponse.json({ error: "No file provided" }, { status: 400 });
        }

        const buffer = await file.arrayBuffer();
        const fileType = file.name.split(".").pop()?.toLowerCase();

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

        return NextResponse.json({ data });
    } catch (error) {
        console.error("Error processing file:", error);
        return NextResponse.json(
            { error: "Failed to process file" },
            { status: 500 }
        );
    }
}
