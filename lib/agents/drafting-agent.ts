
import { ChatOpenAI } from "@langchain/openai";
import { ImportedLead } from "@/types";
import { z } from "zod";
import { CallbackHandler } from "@langfuse/langchain";
import { getAiProvider } from "@/lib/actions/settings";

const emailSchema = z.object({
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
function parseOpenAIError(error: any): OpenAIError {
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
        temperature: 0.7,
        callbacks: [handler],
        ...(gatewayConfig && { configuration: gatewayConfig })
    });

    const structuredModel = model.withStructuredOutput(emailSchema);

    const fullPrompt = `
    You are an expert sales copywriter.
    
    User Prompt / Instructions:
    ${userPrompt}

    Lead Info:
    - Name: ${lead.firstName} ${lead.lastName}
    - Company: ${lead.company}
    - Role: ${lead.role}
    
    Research Summary:
    ${researchSummary}
    
    Task: Write a cold outreach email based on the above.
    The email must end with the following signature precisely (do not add any extra names or sign-offs):

    Carl Davis
    Burn Media Group
  `;

    try {
        const result = await structuredModel.invoke(fullPrompt);
        return result;
    } catch (error: any) {
        console.error("OpenAI API error:", error);
        throw parseOpenAIError(error);
    }
}
