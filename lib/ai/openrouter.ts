import { createOpenRouter } from '@openrouter/ai-sdk-provider';

if (!process.env.OPENROUTER_API_KEY) {
  console.warn(
    '[lib/ai/openrouter] OPENROUTER_API_KEY is not set. LLM calls will fail at runtime.',
  );
}

const openrouter = createOpenRouter({
  apiKey: process.env.OPENROUTER_API_KEY ?? '',
});

export type AgentRole = 'mapping' | 'research' | 'drafting' | 'regeneration';

const MODELS: Record<AgentRole, string> = {
  mapping: 'openai/gpt-4o-mini',
  research: 'openai/gpt-4o-mini',
  drafting: 'deepseek/deepseek-v3.2',
  regeneration: 'deepseek/deepseek-v3.2',
};

export const getModel = (role: AgentRole) => openrouter(MODELS[role]);
