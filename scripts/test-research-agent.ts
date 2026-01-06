
import * as dotenv from "dotenv";
dotenv.config({ path: ".env.local" });
import { researchLead } from "../lib/agents/research-agent";
import { ImportedLead } from "../types";

// Mock lead
const testLead: ImportedLead = {
    id: "test-id",
    firstName: "Satya",
    lastName: "Nadella",
    email: "satya@microsoft.com", // Dummy
    company: "Microsoft",
    role: "CEO",
    selected: true,
    linkedinUrl: "https://www.linkedin.com/in/satyanadella"
};

async function testResearch() {
    console.log("Testing researchLead...");
    try {
        const result = await researchLead(testLead);
        console.log("Summary:", result.summary.substring(0, 100) + "...");
        console.log("Sources count:", result.sources.length);
        if (result.sources.length > 0) {
            console.log("First Source:", result.sources[0]);
        }

        // Test JSON stringify aspect usually done in route
        const payload = JSON.stringify(result);
        console.log("JSON Payload length:", payload.length);
    } catch (e) {
        console.error("Test failed:", e);
    }
}

testResearch();
