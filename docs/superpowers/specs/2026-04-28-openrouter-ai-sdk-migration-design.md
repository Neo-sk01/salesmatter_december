# OpenRouter + Vercel AI SDK Migration

**Date:** 2026-04-28
**Status:** Approved

## Goal

Replace all direct OpenAI / LangChain LLM calls with OpenRouter accessed through the Vercel AI SDK. The four LLM-using agents (mapping, research, drafting, regeneration) move to a single OpenRouter-backed code path. Tavily web search is unaffected.

## Motivation

The user has OpenRouter credits and wants to consolidate on a single provider. OpenRouter also unlocks per-agent model choice (DeepSeek for email writing, GPT-4o-mini for cheaper utility tasks) without juggling multiple SDKs.

## Decisions

### Single provider, no toggle
The existing `getAiProvider()` cookie-driven toggle (between `openai` and `gateway` modes) is removed. There is one provider path: OpenRouter via `@openrouter/ai-sdk-provider`.

### Model assignment per agent

| Agent | Model | Reason |
|-------|-------|--------|
| Mapping | `openai/gpt-4o-mini` | Cheap structured-output task, deterministic. |
| Research | `openai/gpt-4o-mini` | Cheap summarization of Tavily results. |
| Drafting | `deepseek/deepseek-v3.2` | Higher-quality long-form prose for cold outreach emails. |
| Regeneration | `deepseek/deepseek-v3.2` | Same as drafting, run with higher temperature. |

Models are centralized in `lib/ai/openrouter.ts` so changes are one-line.

### LangChain + Langfuse removed
`@langchain/openai`, `@langfuse/langchain`, `langchain`, and `langfuse` are removed. `@langchain/tavily` (and its peer deps `@langchain/community`, `@langchain/core`) stay because Tavily web search is unaffected by the LLM-provider migration. No tracing replacement is added — Langfuse can be revisited later via AI SDK's `experimental_telemetry` if observability is missed.

## Dependencies

**Add:**
- `ai` (Vercel AI SDK)
- `@openrouter/ai-sdk-provider`

**Remove:**
- `@langchain/openai`
- `@langfuse/langchain`
- `langchain`
- `langfuse`
- `openai`

**Keep:**
- `@langchain/tavily`, `@langchain/community`, `@langchain/core` (Tavily web search)
- `zod` (used as schema input to AI SDK's `generateObject`)

## Environment Variables

**Add:** `OPENROUTER_API_KEY` to `.env.local` and the Vercel project.

**Stop using:** `AI_GATEWAY_API_KEY`, `VERCEL_AI_GATEWAY_URL`. The variables can stay in `.env.local` but no code reads them after the migration.

**Stop requiring:** `OPENAI_API_KEY`. After the migration no code path checks or uses it. The variable can stay in `.env.local` without effect.

`TAVILY_API_KEY` and Supabase keys are unaffected.

## Architecture

```
┌──────────────────────────────────────────────────────────┐
│                    Next.js App Routes                    │
│                                                          │
│   /api/ingest          /api/generate                     │
│   (CSV upload)         (research + draft)                │
└────────┬───────────────────┬────────────────┬────────────┘
         │                   │                │
         ▼                   ▼                ▼
   ┌──────────┐      ┌───────────────┐  ┌──────────────┐
   │ mapping  │      │   research    │  │  drafting /  │
   │  agent   │      │     agent     │  │ regeneration │
   └─────┬────┘      └───┬─────┬─────┘  └──────┬───────┘
         │               │     │               │
         │               │     ▼               │
         │               │  Tavily             │
         │               │   API               │
         │               │                     │
         ▼               ▼                     ▼
   ┌──────────────────────────────────────────────────┐
   │     lib/ai/openrouter.ts  (getModel(role))       │
   └────────────────────────┬─────────────────────────┘
                            │
                            ▼
                ┌──────────────────────┐
                │  Vercel AI SDK (ai)  │
                │ + OpenRouter provider│
                └──────────┬───────────┘
                           ▼
                     openrouter.ai API
```

All LLM calls go through one client module; agents do not import `@openrouter/ai-sdk-provider` or `ai` directly.

## File Changes

### New files

**`lib/ai/openrouter.ts`** — OpenRouter client + per-role model registry.

```ts
import { createOpenRouter } from '@openrouter/ai-sdk-provider';

const openrouter = createOpenRouter({
  apiKey: process.env.OPENROUTER_API_KEY,
});

export type AgentRole = 'mapping' | 'research' | 'drafting' | 'regeneration';

const MODELS: Record<AgentRole, string> = {
  mapping: 'openai/gpt-4o-mini',
  research: 'openai/gpt-4o-mini',
  drafting: 'deepseek/deepseek-v3.2',
  regeneration: 'deepseek/deepseek-v3.2',
};

export const getModel = (role: AgentRole) => openrouter(MODELS[role]);
```

**`lib/ai/errors.ts`** — generalized `AIError` class plus `parseAIError(error)` mapping AI SDK / OpenRouter errors to user-friendly codes. Same shape as the existing `OpenAIError` (`code`, `userMessage`, `retryable`) so the route handler keeps working.

### Modified files

| File | Change |
|------|--------|
| `lib/agents/mapping-agent.ts` | Replace `ChatOpenAI(...).withStructuredOutput(mappingSchema)` with `generateObject({ model: getModel('mapping'), schema: mappingSchema, prompt })`. Replace `OPENAI_API_KEY` env check with `OPENROUTER_API_KEY`. Keep `MappingAgentError`; extend its mapping branches to recognize AI SDK error shapes. |
| `lib/agents/research-agent.ts` | Replace both `openai.chat.completions.create(...)` calls (main path + fallback) with `generateText({ model: getModel('research'), prompt, temperature })`. Drop `getAiProvider` import and the gateway config block. Tavily code untouched. |
| `lib/agents/drafting-agent.ts` | Replace `ChatOpenAI` + `withStructuredOutput` with `generateObject({ model: getModel('drafting'), schema: emailSchema, prompt, temperature: 0.7 })`. Remove Langfuse `CallbackHandler`. Remove gateway config block. Move `OpenAIError` and `parseOpenAIError` out — they live in `lib/ai/errors.ts` as `AIError` / `parseAIError`. `emailSchema` stays exported here (already is). |
| `lib/agents/regeneration-agent.ts` | Same migration as drafting, with `temperature: 0.8` and `getModel('regeneration')`. Imports `emailSchema` from drafting-agent (unchanged) and `parseAIError` from `lib/ai/errors` (new path). |
| `app/api/generate/route.ts` | Change import: `OpenAIError` from `@/lib/agents/drafting-agent` → `AIError` from `@/lib/ai/errors`. Update `instanceof` and field references accordingly. No other logic changes. |
| `app/api/ingest/route.ts` | Line 47: change env check from `OPENAI_API_KEY` to `OPENROUTER_API_KEY`. Update the error-message text to match. |
| `app/api/debug/route.ts` | Line 10: rename `hasOpenAIKey` to `hasOpenRouterKey` and check `OPENROUTER_API_KEY`. |
| `app/settings/page.tsx` | Remove `ProviderSelector` import + usage and the `getAiProvider()` call. Keep the page structure (heading, Danger Zone, Clear Database button). |
| `.env.local` | Add `OPENROUTER_API_KEY=...`. |
| `package.json` | Add/remove dependencies as listed above. |

### Deleted files

- `lib/actions/settings.ts` (no remaining callers after the settings page is updated)
- `app/settings/provider-selector.tsx`

## Data Flow

Inputs and outputs of every agent stay identical, so route handlers and frontend code do not change.

```
CSV upload  ──► /api/ingest ──► mapping-agent          ──► Supabase (leads, processed_files)
                                (gpt-4o-mini)

Generate    ──► /api/generate ──► (per lead, parallel):
                                  research-agent          ──► (Tavily search + gpt-4o-mini summary)
                                  drafting OR regen agent ──► (deepseek-v3.2 → {subject, body})
                                                          ──► Supabase (email_drafts)
                                ──► JSON response with all drafts
```

## Error Handling

`parseAIError(error)` in `lib/ai/errors.ts` maps AI SDK / OpenRouter errors to the existing `AIError` shape consumed by `app/api/generate/route.ts`:

| Trigger | Mapped code | Retryable |
|---------|-------------|-----------|
| HTTP 402 (insufficient credits) | `QUOTA_EXCEEDED` | false |
| HTTP 429 (rate limit) | `RATE_LIMITED` | true |
| HTTP 401 (bad/missing key) | `INVALID_API_KEY` | false |
| HTTP 400 with `context_length` in message | `CONTEXT_TOO_LONG` | false |
| HTTP 408 / 504 (timeout) | `AI_SERVICE_DOWN` | true |
| HTTP 5xx | `AI_SERVICE_DOWN` | true |
| AI SDK `NoObjectGeneratedError` | `AI_ERROR` | true |
| Other / unknown | `AI_ERROR` | true |

The mapping-agent's existing `MappingAgentError` codes (`MISSING_API_KEY`, `TIMEOUT`, `AUTH_ERROR`, `RATE_LIMIT`, `API_ERROR`, `MAPPING_FAILED`) keep their meaning — only the detection logic is rewritten to match AI SDK error shapes.

### Structured-output reliability with DeepSeek

`generateObject` with `deepseek/deepseek-v3.2` runs through OpenRouter's tool-calling / JSON-mode path. DeepSeek-v3.2 supports tool calling, so this is expected to work. If testing reveals frequent `NoObjectGeneratedError` failures, the fallback is `generateText` plus a manual `emailSchema.safeParse(...)` on the response — but the migration starts with `generateObject` and only switches if needed.

## Testing

No automated test framework exists in the project; verification is manual.

1. `npm install` (after dependency changes), then `npm run build` — must compile cleanly.
2. `npm run dev`, then upload a CSV through the UI. Confirm columns are mapped and leads land in Supabase.
3. Trigger a generation on 2–3 leads. Confirm:
   - Research summaries are produced and saved.
   - Drafts have a subject and body.
   - Drafts appear in the drafts list and persist in Supabase.
4. Click "Regenerate" on a draft. Confirm a different variation comes back and replaces the original.
5. Spot-check one draft for tone and structure. DeepSeek-v3.2 writes differently from gpt-4o-mini; significantly off output is a prompt-tuning issue tracked separately, not a migration blocker.
6. Error path: set `OPENROUTER_API_KEY=invalid` in `.env.local`, restart dev server, retry generation, confirm a clear "AI service configuration error" surfaces in the UI.

## Out of scope

- Replacing or augmenting Tavily web search.
- Adding observability (Langfuse OTel, AI SDK `experimental_telemetry`).
- Streaming responses to the frontend (current architecture is request → batch response).
- Re-tuning prompts for DeepSeek's voice. The migration preserves the existing prompts; prompt iteration is a follow-up if the output quality is unsatisfactory.
- Removing `OPENAI_API_KEY` / AI Gateway env vars from `.env.local`. They become unused but stay until cleanup.
