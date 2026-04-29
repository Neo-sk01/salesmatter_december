import { generateObject } from 'ai';
import { z } from 'zod';
import { ImportedLead } from '@/types';
import { getDraftingModel } from '@/lib/ai/openrouter';
import type { DraftingModelId } from '@/lib/ai/models';
import { parseAIError } from '@/lib/ai/errors';
import { loadColdEmailSkill } from './prompts/skill-loader';

export const emailSchema = z.object({
    subject: z.string().describe('The subject line of the email'),
    body: z.string().describe('The main body content of the email'),
});

export async function draftEmail(
    lead: ImportedLead,
    researchSummary: string,
    userPrompt: string,
    _isRegenerate: boolean = false,
    modelId?: DraftingModelId,
) {
    const systemPrompt = loadColdEmailSkill();

    const customFieldsText = Object.entries(lead.customFields || {})
        .filter(([_, v]) => v !== undefined && v !== null && v !== '')
        .map(([k, v]) => `- ${k}: ${v}`)
        .join('\n    ');

    // Only inject operator instructions when they actually differ from the
    // system prompt. The UI's default template mirrors cold-email-skill.md,
    // so without this guard the same content would be sent twice — and a
    // stale localStorage copy would contradict the fresh system prompt.
    const trimmedUserPrompt = userPrompt?.trim() ?? '';
    const operatorBlock =
        trimmedUserPrompt && trimmedUserPrompt !== systemPrompt.trim()
            ? `Operator-level instructions for this batch:\n    ${userPrompt}\n\n    ---\n\n    `
            : '';

    const fullPrompt = `
    ${operatorBlock}Prospect Details:
    - Name: ${lead.firstName} ${lead.lastName}
    - Company: ${lead.company}
    - Role: ${lead.role}
    ${lead.linkedinUrl ? `- LinkedIn: ${lead.linkedinUrl}` : ''}
    ${lead.companyUrl ? `- Company Website: ${lead.companyUrl}` : ''}
    ${customFieldsText ? customFieldsText : ''}

    Research Summary for Personalization:
    ${researchSummary}

    Task: Write the subject line and body of the cold outreach email for this prospect, strictly following the formula in the system prompt. Pull personalization details from the research summary above.
    `;

    try {
        const { object } = await generateObject({
            model: getDraftingModel(modelId, 'drafting'),
            system: systemPrompt,
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
