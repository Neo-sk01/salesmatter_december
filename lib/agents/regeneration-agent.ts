import { generateObject } from 'ai';
import { ImportedLead } from '@/types';
import { getModel } from '@/lib/ai/openrouter';
import { parseAIError } from '@/lib/ai/errors';
import { emailSchema } from './drafting-agent';
import { loadEmailTemplate } from '@/lib/utils/email-template-loader';

export async function regenerateEmail(
    lead: ImportedLead,
    researchSummary: string,
    userPrompt: string,
) {
    const referenceTemplate = loadEmailTemplate();

    const customFieldsText = Object.entries(lead.customFields || {})
        .filter(([_, v]) => v !== undefined && v !== null && v !== '')
        .map(([k, v]) => `- ${k}: ${v}`)
        .join('\n    ');

    const fullPrompt = `
    ${userPrompt}

    ---

    IMPORTANT TASK: You are REGENERATING an outreach email. You must provide a DIFFERENT variation with a fresh feel, while keeping the core structure, voice, and length similar to the previous iterations.

    You MUST use the following reference email as the SINGLE SOURCE OF TRUTH for the tone, cadence, flow, KPIs, and footer.
    Adapt the specific details (like company names, research points, and target audience nuances) to fit the prospect's actual data and the research summary below.

    === REFERENCE EMAIL (SINGLE SOURCE OF TRUTH) ===
    ${referenceTemplate}
    === END REFERENCE EMAIL ===

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
    The email must mirror the KPIs (bullet-point metrics) and end with the EXACT same closing signature and footer as the reference email above.
    `;

    try {
        const { object } = await generateObject({
            model: getModel('regeneration'),
            schema: emailSchema,
            prompt: fullPrompt,
            temperature: 0.8,
        });
        return object;
    } catch (error) {
        console.error('AI regeneration error:', error);
        throw parseAIError(error);
    }
}
