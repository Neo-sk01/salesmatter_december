
import { ChatOpenAI } from "@langchain/openai";
import { ImportedLead } from "@/types";
import { CallbackHandler } from "@langfuse/langchain";

export interface ResearchResult {
    summary: string;
    sources: { title: string; url: string }[];
}

export async function researchLead(lead: ImportedLead): Promise<ResearchResult> {
    const handler = new CallbackHandler({
        userId: "system",
    });

    const tavilyApiKey = process.env.TAVILY_API_KEY;
    let searchContext = "";
    let sources: { title: string; url: string }[] = [];

    if (tavilyApiKey) {
        try {
            const searchQuery = `${lead.company} ${lead.firstName} ${lead.lastName} ${lead.role} recent news`;
            // Add LinkedIn site search if URL is available
            const finalQuery = lead.linkedinUrl
                ? `${searchQuery} OR site:linkedin.com ${lead.linkedinUrl}`
                : searchQuery;

            console.log("Searching Tavily:", finalQuery);

            const response = await fetch("https://api.tavily.com/search", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    api_key: tavilyApiKey,
                    query: finalQuery,
                    search_depth: "basic",
                    include_answer: false,
                    include_images: false,
                    include_raw_content: false,
                    max_results: 5,
                }),
            });

            if (!response.ok) {
                throw new Error(`Tavily API error: ${response.status} ${response.statusText}`);
            }

            const data = await response.json();

            if (data.results && Array.isArray(data.results)) {
                sources = data.results.map((r: any) => ({
                    title: r.title,
                    url: r.url
                }));

                searchContext = data.results
                    .map((r: any) => `Title: ${r.title}\nURL: ${r.url}\nContent: ${r.content}`)
                    .join("\n\n");
            }

        } catch (err) {
            console.error("Tavily search failed:", err);
            searchContext = "No external search results available due to an error.";
        }
    } else {
        console.warn("TAVILY_API_KEY not set. Using model's internal knowledge only.");
        searchContext = "No external search results available (API key not configured).";
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
    ${searchContext}
    
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

    return {
        summary: response.content.toString(),
        sources: sources
    };
}
