import { ChatOpenAI } from "@langchain/openai";
import { ImportedLead } from "@/types";
import { CallbackHandler } from "@langfuse/langchain";
import { getAiProvider } from "@/lib/actions/settings";
import { emailSchema, parseOpenAIError } from "./drafting-agent";

export async function regenerateEmail(
    lead: ImportedLead,
    researchSummary: string,
    userPrompt: string
) {
    const handler = new CallbackHandler({
        userId: "system",
    });

    const provider = await getAiProvider();

    const gatewayConfig = provider === "gateway" ? {
        baseURL: process.env.VERCEL_AI_GATEWAY_URL || "https://gateway.ai.vercel.com/v1/workspace/project/openai",
        defaultHeaders: process.env.AI_GATEWAY_API_KEY ? {
            "Authorization": `Bearer ${process.env.AI_GATEWAY_API_KEY}`
        } : undefined
    } : undefined;

    const model = new ChatOpenAI({
        modelName: "gpt-4o-mini",
        temperature: 0.8, // Slightly higher temperature for more variation
        callbacks: [handler],
        ...(gatewayConfig && { configuration: gatewayConfig })
    });

    const structuredModel = model.withStructuredOutput(emailSchema);

    // Provide the single source of truth template for structural inspiration
    const REFERENCE_EXAMPLE = `
    === REFERENCE EXAMPLE ===
    Subject: Quick question re [Company] growth
    Hello Wayne,
    I read your recent article “Digital transformation: Shaping Mediamark for the future” with real interest. Turning a legacy media sales house into an agile organisation that scales without increasing resources is exactly the kind of bold leadership that sets Mediamark apart, especially with your 21M+ digital reach and growing audio/streaming portfolio.
    At SalesMatter we help CEOs in media sales do precisely that with outbound: we automate personalised outreach at scale while keeping it human and targeted.
    Our clients consistently see:
    •  30% higher meeting rates
    •  2× more qualified opportunities in their pipeline
    …all without adding extra sales or marketing headcount.
    I’d love to share how we’ve helped other media owners achieve similar efficiency gains during periods of rapid change. Would you have 15 minutes next week to explore whether this could support Mediamark’s next growth phase?
    Best regards,
    Carl Davis
    Founder, SalesMatter
    carl@salesmatter.co.za
    +27 74 172 5891
    === END REFERENCE EXAMPLE ===
    `;

    const customFieldsText = Object.entries(lead.customFields || {})
        .filter(([_, v]) => v !== undefined && v !== null && v !== "")
        .map(([k, v]) => `- ${k}: ${v}`)
        .join("\n    ");

    const fullPrompt = `
    ${userPrompt}

    ---

    IMPORTANT TASK: You are REGENERATING an outreach email. You must provide a DIFFERENT variation with a fresh feel, while keeping the core structure, voice, and length similar to the previous iterations.
    
    You MUST use the structural template from the example below as the SINGLE SOURCE OF TRUTH for the tone, cadence, and flow. 
    Adapt the specific details (like company names, research points, and target audience nuances) to fit the prospect's actual data and the research summary below.
    
    ${REFERENCE_EXAMPLE}

    ---

    Prospect Details:
    - Name: ${lead.firstName} ${lead.lastName}
    - Company: ${lead.company}
    - Role: ${lead.role}
    ${lead.linkedinUrl ? `- LinkedIn: ${lead.linkedinUrl}` : ""}
    ${lead.companyUrl ? `- Company Website: ${lead.companyUrl}` : ""}
    ${customFieldsText ? customFieldsText : ""}
    
    Research Summary for Personalization:
    ${researchSummary}
    
    Task: Write the subject line and body of the cold outreach email incorporating the research summary.
    The email must end precisely with the signature:
    Carl Davis
    Founder, SalesMatter
    carl@salesmatter.co.za
    `;

    try {
        const result = await structuredModel.invoke(fullPrompt);
        return result;
    } catch (error: any) {
        console.error("OpenAI API error:", error);
        throw parseOpenAIError(error);
    }
}
