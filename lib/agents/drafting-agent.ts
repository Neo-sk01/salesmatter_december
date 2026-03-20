
import { ChatOpenAI } from "@langchain/openai";
import { ImportedLead } from "@/types";
import { z } from "zod";
import { CallbackHandler } from "@langfuse/langchain";
import { getAiProvider } from "@/lib/actions/settings";

export const emailSchema = z.object({
    subject: z.string().describe("The subject line of the email"),
    body: z.string().describe("The main body content of the email"),
});

// Custom error class for OpenAI-specific errors
export class OpenAIError extends Error {
    code: string;
    userMessage: string;
    retryable: boolean;

    constructor(code: string, userMessage: string, retryable: boolean = false) {
        super(userMessage);
        this.name = 'OpenAIError';
        this.code = code;
        this.userMessage = userMessage;
        this.retryable = retryable;
    }
}

// Parse OpenAI errors into user-friendly messages
export function parseOpenAIError(error: any): OpenAIError {
    const errorMessage = error?.message || error?.error?.message || '';
    const errorCode = error?.code || error?.error?.code || '';
    const errorType = error?.type || error?.error?.type || '';

    // Quota exceeded
    if (errorCode === 'insufficient_quota' || errorMessage.includes('exceeded your current quota')) {
        return new OpenAIError(
            'QUOTA_EXCEEDED',
            'AI service quota exceeded. Please check your OpenAI billing or contact the administrator to add credits.',
            false
        );
    }

    // Rate limit
    if (errorCode === 'rate_limit_exceeded' || errorType === 'rate_limit_exceeded' || errorMessage.includes('rate limit')) {
        return new OpenAIError(
            'RATE_LIMITED',
            'Too many requests. Please wait a moment and try again.',
            true
        );
    }

    // Invalid API key
    if (errorCode === 'invalid_api_key' || errorMessage.includes('Incorrect API key') || errorMessage.includes('invalid_api_key')) {
        return new OpenAIError(
            'INVALID_API_KEY',
            'AI service configuration error. Please contact the administrator.',
            false
        );
    }

    // Context length exceeded
    if (errorCode === 'context_length_exceeded' || errorMessage.includes('maximum context length')) {
        return new OpenAIError(
            'CONTEXT_TOO_LONG',
            'The input is too long for the AI to process. Try with fewer leads or shorter content.',
            false
        );
    }

    // Server errors
    if (errorMessage.includes('server_error') || errorMessage.includes('503') || errorMessage.includes('502')) {
        return new OpenAIError(
            'AI_SERVICE_DOWN',
            'AI service is temporarily unavailable. Please try again in a few minutes.',
            true
        );
    }

    // Default/unknown error
    return new OpenAIError(
        'AI_ERROR',
        'Failed to generate email. Please try again.',
        true
    );
}

export async function draftEmail(
    lead: ImportedLead,
    researchSummary: string,
    userPrompt: string,
    isRegenerate: boolean = false
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
        temperature: 0.7,
        callbacks: [handler],
        ...(gatewayConfig && { configuration: gatewayConfig })
    });

    const structuredModel = model.withStructuredOutput(emailSchema);

    const customFieldsText = Object.entries(lead.customFields || {})
        .filter(([_, v]) => v !== undefined && v !== null && v !== "")
        .map(([k, v]) => `- ${k}: ${v}`)
        .join("\n    ");

    const fullPrompt = `
    ${userPrompt}

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
    
    You MUST use this exact example as the SINGLE SOURCE OF TRUTH for your structure, voice, and tone. Adapt the specific details (like the person's name, company, and research points) but mirror this layout exactly:
    
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

    try {
        const result = await structuredModel.invoke(fullPrompt);
        return result;
    } catch (error: any) {
        console.error("OpenAI API error:", error);
        throw parseOpenAIError(error);
    }
}
