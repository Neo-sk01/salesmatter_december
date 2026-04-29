"use server"

import { loadColdEmailSkill } from "@/lib/agents/prompts/skill-loader"

export async function getDefaultPromptTemplate(): Promise<string> {
    return loadColdEmailSkill()
}
