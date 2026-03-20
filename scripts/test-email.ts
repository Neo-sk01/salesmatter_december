import { loadEnvConfig } from "@next/env";
import { researchLead } from "../lib/agents/research-agent";
import { draftEmail } from "../lib/agents/drafting-agent";
import { ImportedLead } from "../types";

// Load Next.js environment variables (.env.local, .env, etc)
loadEnvConfig(process.cwd());

export async function runTest() {
    const lead: ImportedLead = {
        id: "test",
        firstName: "Wayne",
        lastName: "",
        company: "Media Mark",
        role: "CEO",
        email: "wayne@mediamark.com",
    };

    const userPrompt = "We want to partner on a native content ad campaign reaching our UHNW executives.";

    console.log("-----------------------------------------");
    console.log(`Running research for ${lead.firstName} at ${lead.company}...`);
    console.log("-----------------------------------------");
    
    const researchResult = await researchLead(lead);

    console.log("Research Summary obtained:");
    console.log(researchResult.summary);
    
    console.log("\n=========================================");
    console.log("GENERATING 5 TEST EMAILS");
    console.log("=========================================\n");

    for (let i = 1; i <= 5; i++) {
        console.log(`\n\n--- Email Draft ${i} ---`);
        try {
            const dt = await draftEmail(lead, researchResult.summary, userPrompt);
            console.log(`SUBJECT: ${dt.subject}\n`);
            console.log(dt.body);
            console.log("--------------------------");
        } catch (e: any) {
            console.error(`Error generating email ${i}:`, e);
        }
    }
}

runTest().then(() => {
    console.log("\nDone!");
    process.exit(0);
}).catch(err => {
    console.error("Fatal error:", err);
    process.exit(1);
});
