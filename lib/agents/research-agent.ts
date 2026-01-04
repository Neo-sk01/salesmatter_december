
import { ChatOpenAI } from "@langchain/openai";
import { TavilySearch } from "@langchain/tavily";
import { ImportedLead } from "@/types";
import { CallbackHandler } from "langfuse-langchain";

export async function researchLead(lead: ImportedLead): Promise<string> {
    const handler = new CallbackHandler({
        userId: "system",
    });

    // Initialize Tavily search tool
    const tavilyApiKey = process.env.TAVILY_API_KEY;

    let searchResults = "";

    if (tavilyApiKey) {
        try {
            const searchTool = new TavilySearch({
                tavilyApiKey: tavilyApiKey,
                maxResults: 5,
            });

            // Build search query, including LinkedIn URL if available
            let searchQuery = `${lead.company} ${lead.firstName} ${lead.lastName} ${lead.role} recent news`;
            if (lead.linkedinUrl) {
                searchQuery += ` site:linkedin.com OR ${lead.linkedinUrl}`;
            }

            const results = await searchTool.invoke({ query: searchQuery });
            searchResults = typeof results === 'string' ? results : JSON.stringify(results);
        } catch (err) {
            console.error("Tavily search failed:", err);
            searchResults = "No external search results available.";
        }
    } else {
        console.warn("TAVILY_API_KEY not set. Using model's internal knowledge only.");
        searchResults = "No external search results available (API key not configured).";
    }

    const model = new ChatOpenAI({
        modelName: "gpt-4o-mini",
        temperature: 0,
        callbacks: [handler],
    });

    // Build LinkedIn context for prompt
    const linkedinContext = lead.linkedinUrl
        ? `- LinkedIn Profile: ${lead.linkedinUrl}`
        : "";

    const prompt = `
    You are a researcher preparing context for cold outreach.

    Prospect:
    - Name: ${lead.firstName} ${lead.lastName}
    - Company: ${lead.company}
    - Role: ${lead.role}
    ${linkedinContext}
    
    Search Results:
    ${searchResults}
    
    Task: Write a focused 150-word summary of this person/company based on the search results above.
    Focus on:
    - Recent news, announcements, or achievements
    - Company initiatives or product launches
    - Personal professional updates or thought leadership
    - LinkedIn profile insights (if available)
    - Anything that could serve as a conversation hook
    
    If the search results are limited, supplement with general knowledge about the company/industry.
    Be factual and specific where possible.
  `;

    const response = await model.invoke(prompt);
    return response.content.toString();
}
