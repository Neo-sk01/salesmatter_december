import { generateObject } from 'ai';
import { ImportedLead } from '@/types';
import { getDraftingModel } from '@/lib/ai/openrouter';
import type { DraftingModelId } from '@/lib/ai/models';
import { parseAIError } from '@/lib/ai/errors';
import { emailSchema } from './drafting-agent';
import { normalizeDraftEmail } from './email-output-formatting';
import { loadColdEmailSkill } from './prompts/skill-loader';

export async function regenerateEmail(
    lead: ImportedLead,
    researchSummary: string,
    userPrompt: string,
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
    ${operatorBlock}IMPORTANT TASK: You are REGENERATING an outreach email. Produce a DIFFERENT variation with a fresh angle, while still strictly following the formula in the system prompt. Vary the connection opener, the specialty framing, and the CTA wording. Keep the structure intact.

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

    Task: Write a fresh subject line and body for the cold outreach email, drawing personalization from the research summary above.
    `;

    try {
        const { object } = await generateObject({
            model: getDraftingModel(modelId, 'regeneration'),
            system: systemPrompt,
            schema: emailSchema,
            prompt: fullPrompt,
            temperature: 0.8,
        });
        return normalizeDraftEmail(object);
    } catch (error) {
        console.error('AI regeneration error:', error);
        throw parseAIError(error);
    }
}
