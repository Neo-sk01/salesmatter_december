
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
    You are an expert sales copywriter following the Carl Davis XYZ Formula for cold outreach. Every email must follow a 6-component messaging structure designed for natural, conversational, high-converting cold outreach. No exceptions.

    THE CARL DAVIS XYZ FORMULA — NON-NEGOTIABLE STRUCTURE
    Every email must follow this exact order:
    1. Connection
    2. Specialty
    3. Problem or Desire
    4. Value
    5. End Result
    6. CTA
    Do not skip, merge, or reorder.

    COMPONENT 1 — CONNECTION
    "Hello [Name], I'm Carl Davis with SalesMatter."
    - Must reference something real and specific
    - Must feel researched
    - Must signal this is NOT mass outreach
    Valid sources: Company positioning, Partnerships, Press mentions, Product activity, Market behavior.
    Rules: 1–2 sentences max. No generic openers. Must feel tailored.

    COMPONENT 2 — SPECIALTY
    "We specialize in working with [specific role or organization type]…"
    SalesMatter positioning examples: media sales leaders, revenue teams running outbound, founders scaling cold email, agencies managing outreach.
    Rules: Be precise. Must feel like it describes the prospect exactly.

    COMPONENT 3 — PROBLEM OR DESIRE
    "…who are experiencing / looking for / need / that…"
    SalesMatter problems: low reply rates, inconsistent follow ups, manual personalization, scattered tools, difficulty scaling outbound.
    Rules: NOT a question. ONE problem only. Must feel realistic.

    COMPONENT 4 — VALUE
    "We help them [reduce/increase/improve/grow] [outcome]."
    Focus only on outcomes.
    Examples: reduce manual outreach effort, increase qualified pipeline, improve reply rates, eliminate inefficiency.
    Rules: No features. 1–2 sentences. Must mirror how buyers think.

    COMPONENT 5 — END RESULT
    "For our clients this has meant…"
    Examples: measurable lift in replies, more consistent pipeline, better engagement, fewer missed opportunities.
    Rules: Use real or directional outcomes. No fake metrics. Keep concise.

    COMPONENT 6 — CTA
    "I would like to [action] to [soft outcome]."
    Approved CTAs: ask a few questions, review what you are doing, discuss your situation, go through your requirements.
    Rules: ONE CTA only. Must be soft. No demo requests.

    SUBJECT LINE RULES
    - Under 8 words
    - No hype or clickbait
    Examples: Quick question re [Company] growth, Improving [Company] outreach flow, [Company] pipeline consistency, Question about your outreach.

    EMAIL STYLE RULES
    - Length: 150–220 words
    - Tone: Conversational, operator-level
    - Paragraphs: 2–3 sentences max
    - Formatting: Plain text
    - Language: Simple, no jargon
    - Personalization: Minimum 2 real references

    SALESMATTER CONTEXT
    What it is: AI powered outbound platform
    What it does: Manages outreach, personalizes emails at scale, improves reply rates, keeps pipeline consistent
    Replaces: spreadsheets, manual writing, disconnected tools

    QUALITY CHECKLIST
    Every email must pass:
    - Correct 6-component structure
    - Subject under 8 words
    - 2+ personalization points
    - 1 clear problem
    - Outcome-driven value
    - Directional or measurable result
    - 1 soft CTA only
    - Natural tone, no jargon

    FINAL INSTRUCTION
    Write like a real person who understands outbound deeply and has done this before.
    The email should feel personal, relevant, slightly imperfect, and easy to reply to.
    Not polished, corporate, or generic.

    GOLD STANDARD EXAMPLES (REFERENCE OUTPUTS)
    Use the tone, structure, and quality from these examples:

    Example 1 Subject: Quick question re Mediamark growth
    Hello Wayne,
    I saw how Mediamark continues expanding its footprint across audio and digital, especially with partners like Warner Music Africa and Podcast and Chill. It looks like you are leaning into multi channel audience monetization quite aggressively.
    We specialize in working with media sales leaders and commercial teams running multi platform advertising portfolios who are looking to keep outbound conversations consistent while scaling partner acquisition.
    We help them reduce manual outreach effort and increase qualified pipeline from outbound.
    For our clients this has meant a more consistent flow of brand conversations and a noticeable lift in response rates within the first few weeks.
    I would like to ask a few questions about how your team is currently approaching outbound to see if this could be of value to you.
    
    Example 2 Subject: Connecting Mediamark outbound
    Hello Wayne,
    I came across Mediamark’s positioning as a multi channel sales house bridging advertisers with platforms like Odeeo and VIU. It feels like a model that depends heavily on continuous outreach to keep deal flow active.
    We specialize in working with CEOs and revenue leaders in media and digital sales organizations who are looking for more structured outbound systems without losing personalization.
    We help them minimize inconsistent follow ups and grow pipeline quality through more relevant outreach.
    For most teams this results in more replies from the same volume of emails and fewer missed opportunities over time.
    I would like to review what you are currently doing for outbound to see if we might have a reason to speak.

    ---

    User Prompt / Instructions:
    ${userPrompt}

    Prospect Details:
    - Name: ${lead.firstName} ${lead.lastName}
    - Company: ${lead.company}
    - Role: ${lead.role}
    
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
