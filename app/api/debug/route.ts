import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function GET() {
    const diagnostics: Record<string, any> = {
        timestamp: new Date().toISOString(),
        env: {
            hasSupabaseUrl: !!process.env.SUPABASE_URL,
            hasSupabaseKey: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
            hasOpenAIKey: !!process.env.OPENAI_API_KEY,
            supabaseUrlPrefix: process.env.SUPABASE_URL?.substring(0, 30) + "...",
        },
        supabase: null as any,
        error: null as any,
    };

    try {
        // Test Supabase connection
        if (process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY) {
            const supabase = createClient(
                process.env.SUPABASE_URL,
                process.env.SUPABASE_SERVICE_ROLE_KEY
            );

            // Simple query to test connection
            const { data, error } = await supabase
                .from("email_drafts")
                .select("id")
                .limit(1);

            diagnostics.supabase = {
                connected: !error,
                error: error ? { message: error.message, code: error.code, hint: error.hint } : null,
                sampleDataCount: data?.length ?? 0,
            };
        } else {
            diagnostics.supabase = { connected: false, error: "Missing credentials" };
        }
    } catch (err: any) {
        diagnostics.error = {
            message: err.message,
            stack: err.stack?.split("\n").slice(0, 5),
        };
    }

    return NextResponse.json(diagnostics);
}
