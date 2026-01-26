import OpenAI from "openai";
import { TavilySearch } from "@langchain/tavily";
import { ImportedLead } from "@/types";

export interface ResearchResult {
    summary: string;
    sources: { title: string; url: string }[];
}

export async function researchLead(lead: ImportedLead): Promise<ResearchResult> {
    const openai = new OpenAI({
        apiKey: process.env.OPENAI_API_KEY,
    });

    const tavilyApiKey = process.env.TAVILY_API_KEY;
    if (!tavilyApiKey) {
        throw new Error("TAVILY_API_KEY not found in environment");
    }

    // Build context strings for the prompt
    const linkedinContext = lead.linkedinUrl
        ? `- LinkedIn Profile: ${lead.linkedinUrl}`
        : "";

    const companyUrlContext = lead.companyUrl
        ? `- Company Website: ${lead.companyUrl}`
        : "";

    // Build search queries for Tavily
    const searchQueries: string[] = [
        `${lead.company} company news announcements`,
        `${lead.firstName} ${lead.lastName} ${lead.company} ${lead.role}`,
    ];

    if (lead.companyUrl) {
        searchQueries.push(`site:${lead.companyUrl} about products services`);
    }

    if (lead.linkedinUrl) {
        searchQueries.push(`${lead.firstName} ${lead.lastName} LinkedIn professional`);
    }

    console.log("Using Tavily search with queries:");
    searchQueries.forEach((q, i) => console.log(`  ${i + 1}. ${q}`));

    try {
        // Initialize Tavily search tool
        const searchTool = new TavilySearch({
            tavilyApiKey: tavilyApiKey,
            maxResults: 5,
        });

        // Perform searches and collect results
        const allResults: { title: string; url: string; content: string }[] = [];
        const sources: { title: string; url: string }[] = [];

        for (const query of searchQueries) {
            try {
                const result = await searchTool.invoke({ query });

                // Parse the result (Tavily returns a JSON string)
                let parsedResult;
                if (typeof result === "string") {
                    try {
                        parsedResult = JSON.parse(result);
                    } catch {
                        // If parsing fails, use the raw string
                        allResults.push({ title: query, url: "", content: result });
                        continue;
                    }
                } else {
                    parsedResult = result;
                }

                // Extract results from Tavily response
                if (Array.isArray(parsedResult)) {
                    for (const item of parsedResult) {
                        allResults.push({
                            title: item.title || "",
                            url: item.url || "",
                            content: item.content || item.snippet || "",
                        });
                        if (item.url) {
                            sources.push({
                                title: item.title || item.url,
                                url: item.url,
                            });
                        }
                    }
                } else if (parsedResult.results && Array.isArray(parsedResult.results)) {
                    for (const item of parsedResult.results) {
                        allResults.push({
                            title: item.title || "",
                            url: item.url || "",
                            content: item.content || item.snippet || "",
                        });
                        if (item.url) {
                            sources.push({
                                title: item.title || item.url,
                                url: item.url,
                            });
                        }
                    }
                }
            } catch (searchError) {
                console.warn(`Search query failed: ${query}`, searchError);
            }
        }

        console.log(`Tavily search completed. Found ${allResults.length} results from ${sources.length} sources`);

        // Deduplicate sources by URL
        const uniqueSources = sources.filter(
            (source, index, self) => index === self.findIndex((s) => s.url === source.url)
        );

        // Compile search results into context for GPT
        const searchContext = allResults
            .map((r) => `[${r.title}]\n${r.content}`)
            .join("\n\n---\n\n");

        // Use GPT-4o-mini to summarize the search results
        const summaryPrompt = `
You are a researcher preparing context for cold outreach. Based on the web search results provided, write a focused summary.

Prospect Details:
- Name: ${lead.firstName} ${lead.lastName}
- Company: ${lead.company}
- Role: ${lead.role}
${linkedinContext}
${companyUrlContext}

WEB SEARCH RESULTS:
${searchContext || "No search results found."}

Write a focused 150-word summary that includes:
- Recent company news, announcements, or achievements
- Company initiatives, products, or services
- Information about ${lead.firstName} ${lead.lastName} - their role, professional updates, or thought leadership
- Any conversation hooks that would be relevant for cold outreach

Be factual and specific. Only include information that appears in the search results above.
If no relevant information was found, state that clearly and provide general context based on the role/industry.
`;

        const summaryResponse = await openai.chat.completions.create({
            model: "gpt-4o-mini",
            temperature: 0.3,
            messages: [
                {
                    role: "user",
                    content: summaryPrompt,
                },
            ],
        });

        const summary = summaryResponse.choices[0]?.message?.content || "No summary generated";

        console.log("Tavily research completed successfully");

        return {
            summary,
            sources: uniqueSources,
        };
    } catch (error) {
        console.error("Tavily search failed:", error);

        // Fallback to basic completion without web search
        console.log("Falling back to basic GPT-4o-mini without web search");

        const fallbackResponse = await openai.chat.completions.create({
            model: "gpt-4o-mini",
            temperature: 0,
            messages: [
                {
                    role: "user",
                    content: `
                        You are a researcher preparing context for cold outreach.

                        Prospect:
                        - Name: ${lead.firstName} ${lead.lastName}
                        - Company: ${lead.company}
                        - Role: ${lead.role}
                        ${linkedinContext}
                        ${companyUrlContext}
                        
                        Task: Write a focused 150-word summary of this person/company based on your knowledge.
                        Focus on:
                        - Known information about the company
                        - Industry context and typical roles
                        - Anything that could serve as a conversation hook
                        
                        Be factual and specific where possible. If you don't have specific information,
                        focus on general industry knowledge that might be relevant.
                    `,
                },
            ],
        });

        return {
            summary: fallbackResponse.choices[0]?.message?.content || "No summary generated",
            sources: [],
        };
    }
}
