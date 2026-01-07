import OpenAI from "openai";
import { ImportedLead } from "@/types";

export interface ResearchResult {
    summary: string;
    sources: { title: string; url: string }[];
}

export async function researchLead(lead: ImportedLead): Promise<ResearchResult> {
    const openai = new OpenAI({
        apiKey: process.env.OPENAI_API_KEY,
    });

    // Build context strings for the prompt
    const linkedinContext = lead.linkedinUrl
        ? `- LinkedIn Profile: ${lead.linkedinUrl}`
        : "";

    const companyUrlContext = lead.companyUrl
        ? `- Company Website: ${lead.companyUrl}`
        : "";

    // Build search query components
    const searchComponents: string[] = [
        lead.company,
        `${lead.firstName} ${lead.lastName}`,
        lead.role,
    ];

    // Build explicit search instructions
    const searchInstructions: string[] = [
        `Search for "${lead.company}" company news and information`,
    ];

    if (lead.companyUrl) {
        searchInstructions.push(`Visit and analyze the company website: ${lead.companyUrl}`);
    }

    if (lead.linkedinUrl) {
        searchInstructions.push(`Search for LinkedIn profile information: ${lead.linkedinUrl}`);
    }

    searchInstructions.push(
        `Search for "${lead.firstName} ${lead.lastName}" at "${lead.company}" - recent news, updates, or professional activity`
    );

    const prompt = `
    You are a researcher preparing context for cold outreach. Use web search to gather accurate, current information.

    Prospect Details:
    - Name: ${lead.firstName} ${lead.lastName}
    - Company: ${lead.company}
    - Role: ${lead.role}
    ${linkedinContext}
    ${companyUrlContext}

    SEARCH INSTRUCTIONS (please perform these searches):
    ${searchInstructions.map((s, i) => `${i + 1}. ${s}`).join('\n    ')}

    After searching, write a focused 150-word summary that includes:
    - Recent company news, announcements, or achievements
    - Company initiatives, products, or services (especially from their website if provided)
    - Information about ${lead.firstName} ${lead.lastName} - their role, professional updates, or thought leadership
    - LinkedIn profile insights (if URL was provided)
    - Any conversation hooks that would be relevant for cold outreach

    Be factual and specific. Cite specific details from your search results.
    If a company URL was provided, prioritize information from their official website.
  `;

    console.log("Using GPT-4o-mini web search with enhanced query:");
    console.log("  - Company:", lead.company);
    if (lead.companyUrl) console.log("  - Company URL:", lead.companyUrl);
    if (lead.linkedinUrl) console.log("  - LinkedIn:", lead.linkedinUrl);

    try {
        // Use OpenAI's Responses API with web search tool
        const response = await openai.responses.create({
            model: "gpt-4o-mini",
            tools: [{ type: "web_search_preview" }],
            input: prompt,
        });

        // Extract the summary from the response
        let summary = "";
        const sources: { title: string; url: string }[] = [];

        // Process the response output items
        for (const item of response.output) {
            if (item.type === "message") {
                // Extract text content from message
                for (const content of item.content) {
                    if (content.type === "output_text") {
                        summary = content.text;

                        // Extract annotations (citations) if available
                        if ('annotations' in content && Array.isArray(content.annotations)) {
                            for (const annotation of content.annotations) {
                                if ('type' in annotation && annotation.type === "url_citation") {
                                    const urlAnnotation = annotation as { type: string; title?: string; url: string };
                                    sources.push({
                                        title: urlAnnotation.title || urlAnnotation.url,
                                        url: urlAnnotation.url,
                                    });
                                }
                            }
                        }
                    }
                }
            }
        }

        console.log("GPT-4o-mini web search completed successfully");
        console.log(`Found ${sources.length} sources`);

        return {
            summary: summary || "No summary generated",
            sources: sources,
        };
    } catch (error) {
        console.error("GPT-4o-mini web search failed:", error);

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
