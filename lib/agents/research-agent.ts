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

    // Build LinkedIn context for prompt
    const linkedinContext = lead.linkedinUrl
        ? `- LinkedIn Profile: ${lead.linkedinUrl}`
        : "";

    const searchQuery = `${lead.company} ${lead.firstName} ${lead.lastName} ${lead.role} recent news`;
    const linkedinQuery = lead.linkedinUrl
        ? ` Also search for information from their LinkedIn profile: ${lead.linkedinUrl}`
        : "";

    const prompt = `
    You are a researcher preparing context for cold outreach.

    Prospect:
    - Name: ${lead.firstName} ${lead.lastName}
    - Company: ${lead.company}
    - Role: ${lead.role}
    ${linkedinContext}
    
    Please search for: "${searchQuery}"${linkedinQuery}
    
    Task: Based on your web search results, write a focused 150-word summary of this person/company.
    Focus on:
    - Recent news, announcements, or achievements
    - Company initiatives or product launches
    - Personal professional updates or thought leadership
    - LinkedIn profile insights (if available)
    - Anything that could serve as a conversation hook
    
    Be factual and specific where possible. Include relevant details from your search results.
  `;

    console.log("Using GPT-4o-mini web search for:", searchQuery);

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
