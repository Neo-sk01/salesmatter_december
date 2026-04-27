import { generateObject } from 'ai';
import { z } from 'zod';
import { ImportedLead } from '@/types';
import { getModel } from '@/lib/ai/openrouter';
import { parseAIError } from '@/lib/ai/errors';
import { loadEmailTemplate } from '@/lib/utils/email-template-loader';

export const emailSchema = z.object({
    subject: z.string().describe('The subject line of the email'),
    body: z.string().describe('The main body content of the email'),
});

export async function draftEmail(
    lead: ImportedLead,
    researchSummary: string,
    userPrompt: string,
    _isRegenerate: boolean = false,
) {
    const referenceTemplate = loadEmailTemplate();

    const customFieldsText = Object.entries(lead.customFields || {})
        .filter(([_, v]) => v !== undefined && v !== null && v !== '')
        .map(([k, v]) => `- ${k}: ${v}`)
        .join('\n    ');

    const fullPrompt = `
    ${userPrompt}

    ---

    Prospect Details:
    - Name: ${lead.firstName} ${lead.lastName}
    - Company: ${lead.company}
    - Role: ${lead.role}
    ${lead.linkedinUrl ? `- LinkedIn: ${lead.linkedinUrl}` : ''}
    ${lead.companyUrl ? `- Company Website: ${lead.companyUrl}` : ''}
    ${customFieldsText ? customFieldsText : ''}

    Research Summary for Personalization:
    ${researchSummary}

    Task: Write the subject line and body of the cold outreach email incorporating the research summary.

    You MUST use the following reference email as the SINGLE SOURCE OF TRUTH for your structure, voice, tone, KPIs, and footer. Adapt the specific details (like the person's name, company, and research points) but mirror the layout, bullet-point KPIs, and closing signature EXACTLY:

    === REFERENCE EMAIL (SINGLE SOURCE OF TRUTH) ===
    ${referenceTemplate}
    === END REFERENCE EMAIL ===
    `;

    try {
        const { object } = await generateObject({
            model: getModel('drafting'),
            schema: emailSchema,
            prompt: fullPrompt,
            temperature: 0.7,
        });
        return object;
    } catch (error) {
        console.error('AI drafting error:', error);
        throw parseAIError(error);
    }
}
