// Test script to verify Tavily research functionality
import { TavilySearch } from "@langchain/tavily";
import { ChatOpenAI } from "@langchain/openai";
import * as dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

async function testTavilySearch() {
    console.log("🔍 Testing Tavily Search Integration...\n");

    const tavilyApiKey = process.env.TAVILY_API_KEY;
    const openaiApiKey = process.env.OPENAI_API_KEY;

    if (!tavilyApiKey) {
        console.error("❌ TAVILY_API_KEY not found in environment");
        process.exit(1);
    }

    if (!openaiApiKey) {
        console.error("❌ OPENAI_API_KEY not found in environment");
        process.exit(1);
    }

    console.log("✅ API keys found");

    // Test lead data
    const testLead = {
        firstName: "Elon",
        lastName: "Musk",
        company: "Tesla",
        role: "CEO"
    };

    console.log(`\n📋 Test Lead: ${testLead.firstName} ${testLead.lastName} at ${testLead.company}\n`);

    try {
        // Step 1: Test Tavily Search
        console.log("🔎 Searching with Tavily...");
        const searchTool = new TavilySearch({
            tavilyApiKey: tavilyApiKey,
            maxResults: 3,
        });

        const searchQuery = `${testLead.company} ${testLead.firstName} ${testLead.lastName} ${testLead.role} recent news`;
        console.log(`   Query: "${searchQuery}"`);

        const results = await searchTool.invoke({ query: searchQuery });
        const searchResults = typeof results === 'string' ? results : JSON.stringify(results, null, 2);

        console.log("\n✅ Tavily search successful!");
        console.log("📄 Search Results Preview (first 500 chars):");
        console.log(searchResults.substring(0, 500) + "...\n");

        // Step 2: Test GPT-4o-mini summary
        console.log("🤖 Generating summary with GPT-4o-mini...");
        const model = new ChatOpenAI({
            modelName: "gpt-4o-mini",
            temperature: 0,
        });

        const prompt = `
        You are a researcher preparing context for cold outreach.

        Prospect:
        - Name: ${testLead.firstName} ${testLead.lastName}
        - Company: ${testLead.company}
        - Role: ${testLead.role}
        
        Search Results:
        ${searchResults}
        
        Task: Write a focused 150-word summary of this person/company based on the search results above.
        `;

        const response = await model.invoke(prompt);
        const summary = response.content.toString();

        console.log("\n✅ Summary generated successfully!");
        console.log("\n📝 Research Summary:");
        console.log("─".repeat(50));
        console.log(summary);
        console.log("─".repeat(50));

        console.log("\n🎉 All tests passed! Tavily integration is working.");

    } catch (error) {
        console.error("\n❌ Test failed:", error);
        process.exit(1);
    }
}

testTavilySearch();
