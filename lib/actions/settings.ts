"use server";

import { cookies } from "next/headers";

export type AiProvider = "openai" | "gateway";

export async function setAiProvider(provider: AiProvider) {
    const cookieStore = await cookies();
    cookieStore.set("ai_provider", provider, {
        path: "/",
        maxAge: 60 * 60 * 24 * 365, // 1 year
    });
}

export async function getAiProvider(): Promise<AiProvider> {
    const cookieStore = await cookies();
    const provider = cookieStore.get("ai_provider")?.value as AiProvider | undefined;
    return provider || "openai"; // default to current implementation
}
