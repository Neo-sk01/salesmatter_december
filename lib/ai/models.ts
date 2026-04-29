export type AgentRole = 'mapping' | 'research' | 'drafting' | 'regeneration';

export const MODELS: Record<AgentRole, string> = {
  mapping: 'openai/gpt-4o-mini',
  research: 'openai/gpt-4o-mini',
  drafting: 'deepseek/deepseek-v3.2',
  regeneration: 'deepseek/deepseek-v3.2',
};

/**
 * User-toggleable models for drafting + regeneration. Each entry maps a UI id
 * to its display label and the OpenRouter slug. Verify the slug against
 * https://openrouter.ai/models when changing — bad slugs surface only at
 * generation time.
 */
export type DraftingModelId = 'gpt-5.5' | 'opus-4.7' | 'deepseek-3.7';

export const DRAFTING_MODEL_OPTIONS: Record<
  DraftingModelId,
  { label: string; slug: string }
> = {
  'gpt-5.5': { label: 'GPT-5.5', slug: 'openai/gpt-5.5' },
  'opus-4.7': { label: 'Claude Opus 4.7', slug: 'anthropic/claude-opus-4.7' },
  'deepseek-3.7': { label: 'DeepSeek 3.7', slug: 'deepseek/deepseek-v3.2' },
};

export const DEFAULT_DRAFTING_MODEL: DraftingModelId = 'deepseek-3.7';

export function isDraftingModelId(value: unknown): value is DraftingModelId {
  return typeof value === 'string' && value in DRAFTING_MODEL_OPTIONS;
}
