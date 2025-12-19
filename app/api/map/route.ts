
import { NextRequest, NextResponse } from "next/server";
import { identifyColumns } from "@/lib/agents/mapping-agent";

export async function POST(req: NextRequest) {
    try {
        const { headers, sampleRows } = await req.json();

        if (!headers || !sampleRows) {
            return NextResponse.json(
                { error: "Headers and sample rows are required" },
                { status: 400 }
            );
        }

        const mapping = await identifyColumns(headers, sampleRows);
        return NextResponse.json({ mapping });
    } catch (error) {
        console.error("Error mapping columns:", error);
        return NextResponse.json(
            { error: "Failed to map columns" },
            { status: 500 }
        );
    }
}
