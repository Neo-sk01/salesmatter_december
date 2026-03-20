
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

    const regenerateInstructions = isRegenerate ? `
    IMPORTANT: You are REGENERATING this email. Please provide a DIFFERENT variation from the standard output.
    You MUST use one of the structural styles from the following examples as inspiration for the tone and flow.
    Adapt the specific details (like company names, research points, and target audience nuances) to fit the prospect's actual data and the research summary provided, but follow the cadence and structure of these examples closely.
    
    Example 1:
    Subject: Quick question re [Company Name] growth
    Hello [Prospect Name],
    I saw how [Company Name] continues expanding its footprint across audio and digital, especially with partners like Warner Music Africa and Podcast and Chill. It looks like you are leaning into multi channel audience monetization quite aggressively.
    We specialize in working with media sales leaders and commercial teams running multi platform advertising portfolios who are looking to keep outbound conversations consistent while scaling partner acquisition.
    We help them reduce manual outreach effort and increase qualified pipeline from outbound.
    For our clients this has meant a more consistent flow of brand conversations and a noticeable lift in response rates within the first few weeks.
    I would like to ask a few questions about how your team is currently approaching outbound to see if this could be of value to you.

    Example 2:
    Subject: Connecting [Company Name] outbound
    Hello [Prospect Name],
    I came across [Company Name]’s positioning as a multi channel sales house bridging advertisers with platforms like Odeeo and VIU. It feels like a model that depends heavily on continuous outreach to keep deal flow active.
    We specialize in working with CEOs and revenue leaders in media and digital sales organizations who are looking for more structured outbound systems without losing personalization.
    We help them minimize inconsistent follow ups and grow pipeline quality through more relevant outreach.
    For most teams this results in more replies from the same volume of emails and fewer missed opportunities over time.
    I would like to review what you are currently doing for outbound to see if we might have a reason to speak.

    Example 3:
    Subject: Improving [Company Name] outreach flow
    Hello [Prospect Name],
    I saw an article discussing [Company Name]’s evolution into a more integrated digital and audio sales business. It looks like your team is constantly opening new conversations with brands across different channels.
    We specialize in working with commercial teams in media and advertising environments who are experiencing challenges maintaining consistent outreach as volume increases.
    We help them consolidate their outreach process and increase reply rates without adding more manual work.
    For our clients this has resulted in a measurable improvement in engagement and a more stable pipeline within the first 30 to 60 days.
    I would like to discuss your situation briefly to see if this could be useful for your team.

    Example 4:
    Subject: Question about your outreach
    Hello [Prospect Name],
    I noticed [Company Name] represents a wide mix of platforms from content to audio and digital networks. That usually means your team is constantly balancing new outreach with maintaining existing advertiser relationships.
    We specialize in working with revenue teams managing high volume outbound across multiple offerings who want to keep communication relevant at scale.
    We help them reduce inefficiency in outreach workflows and increase engagement from prospective partners.
    What this typically means is a stronger pipeline and more consistent responses without increasing effort significantly.
    I would like to ask a few questions about how you are currently managing this to see if we have options worth taking a look at.

    Example 5:
    Subject: [Company Name] pipeline consistency
    Hello [Prospect Name],
    I understand [Company Name] works across multiple brands and audience channels, which likely requires ongoing outbound to keep advertiser conversations moving. It seems like a space where consistency really matters.
    We specialize in working with media and digital sales teams who are looking to improve how they manage outbound without relying on scattered tools.
    We help them reduce missed follow ups and increase conversion from initial outreach into real conversations.
    For many teams this results in a noticeable increase in qualified pipeline and better visibility across their outreach efforts.
    I would like to go through your requirements for outbound to see if I could provide you with some useful information.
    ` : "";

    const fullPrompt = `
    ${userPrompt}

    ---

    Prospect Details:
    - Name: ${lead.firstName} ${lead.lastName}
    - Company: ${lead.company}
    - Role: ${lead.role}
    
    Research Summary for Personalization:
    ${researchSummary}
    
    ${regenerateInstructions}

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
