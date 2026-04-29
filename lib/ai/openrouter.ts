import { createOpenRouter } from '@openrouter/ai-sdk-provider';
import {
  DRAFTING_MODEL_OPTIONS,
  MODELS,
  type AgentRole,
  type DraftingModelId,
} from './models';

export type { AgentRole };

if (!process.env.OPENROUTER_API_KEY) {
  console.warn(
    '[lib/ai/openrouter] OPENROUTER_API_KEY is not set. LLM calls will fail at runtime.',
  );
}

const openrouter = createOpenRouter({
  apiKey: process.env.OPENROUTER_API_KEY ?? '',
});

export const getModel = (role: AgentRole) => openrouter(MODELS[role]);

/**
 * Resolve a user-selected drafting model id (from the dashboard toggle) to an
 * OpenRouter model instance. Falls back to the registered drafting/regeneration
 * model when the id is missing or unknown.
 */
export const getDraftingModel = (id: DraftingModelId | undefined, role: 'drafting' | 'regeneration' = 'drafting') => {
  if (id && DRAFTING_MODEL_OPTIONS[id]) {
    return openrouter(DRAFTING_MODEL_OPTIONS[id].slug);
  }
  return openrouter(MODELS[role]);
};
