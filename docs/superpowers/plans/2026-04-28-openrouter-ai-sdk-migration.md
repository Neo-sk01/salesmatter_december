# OpenRouter + Vercel AI SDK Migration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace OpenAI/LangChain LLM calls with OpenRouter via Vercel AI SDK across all four agents (mapping, research, drafting, regeneration), and remove the unused provider toggle.

**Architecture:** Single OpenRouter client lives in `lib/ai/openrouter.ts` and exposes `getModel(role)`; agents call AI SDK's `generateObject` / `generateText` against that model. Errors are mapped to a unified `AIError` in `lib/ai/errors.ts` so the existing API route response shape stays the same. Tavily web search is unaffected.

**Tech Stack:** Next.js 16 / React 19 / TypeScript / Vercel AI SDK (`ai`) / `@openrouter/ai-sdk-provider` / Zod / Supabase. No automated test framework exists in the repo, so verification is `npm run build` plus manual UI walkthroughs.

**Spec:** [docs/superpowers/specs/2026-04-28-openrouter-ai-sdk-migration-design.md](../specs/2026-04-28-openrouter-ai-sdk-migration-design.md)

**Notes for the implementer:**
- This repo has **no** test framework. Each task's "verification" step is `npx tsc --noEmit` for TypeScript correctness or `npm run build` for full Next.js build. End-to-end behavior is validated manually in Task 10.
- Multiple unrelated unstaged changes exist on `main` (an Everlytic → Instantly webhook migration in progress). **Do not touch those files.** Stage only the files listed in each task. Use `git add <specific-files>`, never `git add -A`.
- The user has plenty of OpenRouter credit; the actual `OPENROUTER_API_KEY` value goes in `.env.local` (not in this plan).

---

## File Structure

**New files:**
- `lib/ai/openrouter.ts` — OpenRouter client + `getModel(role)` registry
- `lib/ai/errors.ts` — `AIError` class + `parseAIError(error)` mapper

**Modified files:**
- `lib/agents/mapping-agent.ts`
- `lib/agents/research-agent.ts`
- `lib/agents/drafting-agent.ts`
- `lib/agents/regeneration-agent.ts`
- `app/api/generate/route.ts`
- `app/api/ingest/route.ts`
- `app/api/debug/route.ts`
- `app/settings/page.tsx`
- `package.json` / `package-lock.json`
- `.env.local`

**Deleted files:**
- `lib/actions/settings.ts`
- `app/settings/provider-selector.tsx`

---

## Task 1: Add OpenRouter dependencies and env var

**Files:**
- Modify: `package.json`, `package-lock.json`
- Modify: `.env.local`

- [ ] **Step 1: Install new packages**

Run:
```bash
npm install ai @openrouter/ai-sdk-provider
```

Expected: both packages installed, `package.json` and `package-lock.json` updated. Recent stable versions (e.g. `ai` ^5.x, `@openrouter/ai-sdk-provider` ^1.x) are fine — accept whatever npm resolves.

- [ ] **Step 2: Add `OPENROUTER_API_KEY` to `.env.local`**

Append this line to `.env.local` (the user will paste the actual key value before running anything else):

```
OPENROUTER_API_KEY=
```

If the key is already set, leave it. Do not echo or commit the value.

- [ ] **Step 3: Verify build still works**

Run:
```bash
npm run build
```

Expected: build completes (the dependency additions alone shouldn't break anything; existing OpenAI code still works).

- [ ] **Step 4: Commit**

```bash
git add package.json package-lock.json
git commit -m "chore: add ai and @openrouter/ai-sdk-provider"
```

`.env.local` is gitignored — do not stage it.

---

## Task 2: Create `lib/ai/openrouter.ts`

**Files:**
- Create: `lib/ai/openrouter.ts`

- [ ] **Step 1: Create the file**

Write `lib/ai/openrouter.ts` with this exact content:

```ts
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
```

- [ ] **Step 2: Typecheck**

Run:
```bash
npx tsc --noEmit
```

Expected: no new errors. (Pre-existing errors elsewhere in the repo, if any, are not introduced by this file.)

- [ ] **Step 3: Commit**

```bash
git add lib/ai/openrouter.ts
git commit -m "feat: add openrouter client with per-role model registry"
```

---

## Task 3: Create `lib/ai/errors.ts`

**Files:**
- Create: `lib/ai/errors.ts`

- [ ] **Step 1: Create the file**

Write `lib/ai/errors.ts` with this exact content:

```ts
import { APICallError, NoObjectGeneratedError } from 'ai';

export class AIError extends Error {
  code: string;
  userMessage: string;
  retryable: boolean;

  constructor(code: string, userMessage: string, retryable = false) {
    super(userMessage);
    this.name = 'AIError';
    this.code = code;
    this.userMessage = userMessage;
    this.retryable = retryable;
  }
}

function statusFromError(error: unknown): number | undefined {
  if (APICallError.isInstance(error)) return error.statusCode;
  if (typeof error === 'object' && error !== null) {
    const e = error as { status?: number; statusCode?: number };
    return e.status ?? e.statusCode;
  }
  return undefined;
}

function messageFromError(error: unknown): string {
  if (error instanceof Error) return error.message;
  if (typeof error === 'string') return error;
  return '';
}

export function parseAIError(error: unknown): AIError {
  const status = statusFromError(error);
  const message = messageFromError(error).toLowerCase();

  if (NoObjectGeneratedError.isInstance(error)) {
    return new AIError(
      'AI_ERROR',
      'The AI returned an unexpected response format. Please try again.',
      true,
    );
  }

  if (status === 402 || message.includes('insufficient_quota') || message.includes('insufficient credits')) {
    return new AIError(
      'QUOTA_EXCEEDED',
      'AI service quota exceeded. Please check your OpenRouter billing or contact the administrator to add credits.',
      false,
    );
  }

  if (status === 429 || message.includes('rate limit')) {
    return new AIError(
      'RATE_LIMITED',
      'Too many requests. Please wait a moment and try again.',
      true,
    );
  }

  if (status === 401 || message.includes('invalid api key') || message.includes('unauthorized')) {
    return new AIError(
      'INVALID_API_KEY',
      'AI service configuration error. Please contact the administrator.',
      false,
    );
  }

  if (status === 400 && (message.includes('context') || message.includes('maximum context length'))) {
    return new AIError(
      'CONTEXT_TOO_LONG',
      'The input is too long for the AI to process. Try with fewer leads or shorter content.',
      false,
    );
  }

  if (status === 408 || status === 504 || message.includes('timeout')) {
    return new AIError(
      'AI_SERVICE_DOWN',
      'AI service timed out. Please try again in a few minutes.',
      true,
    );
  }

  if (typeof status === 'number' && status >= 500) {
    return new AIError(
      'AI_SERVICE_DOWN',
      'AI service is temporarily unavailable. Please try again in a few minutes.',
      true,
    );
  }

  return new AIError(
    'AI_ERROR',
    'Failed to generate email. Please try again.',
    true,
  );
}
```

- [ ] **Step 2: Typecheck**

Run:
```bash
npx tsc --noEmit
```

Expected: no new errors. If `APICallError.isInstance` or `NoObjectGeneratedError.isInstance` doesn't exist on the installed `ai` version, replace with `error instanceof APICallError` and `error instanceof NoObjectGeneratedError`. Both APIs are supported across recent AI SDK versions; pick whichever the version has.

- [ ] **Step 3: Commit**

```bash
git add lib/ai/errors.ts
git commit -m "feat: add unified AIError class and parser for AI SDK errors"
```

---

## Task 4: Migrate `lib/agents/mapping-agent.ts` to AI SDK

**Files:**
- Modify: `lib/agents/mapping-agent.ts`

- [ ] **Step 1: Replace the file content**

Overwrite `lib/agents/mapping-agent.ts` with:

```ts
import { generateObject, NoObjectGeneratedError } from 'ai';
import { z } from 'zod';
import { getModel } from '@/lib/ai/openrouter';

const mappingSchema = z.object({
  firstName: z.string().describe('Column name for First Name'),
  lastName: z.string().describe('Column name for Last Name'),
  email: z.string().describe('Column name for Email'),
  company: z.string().describe('Column name for Company Name'),
  linkedin: z.string().nullable().optional().describe('Column name for LinkedIn URL'),
  companyUrl: z.string().nullable().optional().describe('Column name for Company Website URL'),
  role: z.string().nullable().optional().describe('Column name for Job Title / Role'),
});

export type MappingResult = z.infer<typeof mappingSchema>;

export interface MappingError {
  code: string;
  message: string;
  details?: string;
}

export interface MappingResponse {
  success: boolean;
  mapping?: MappingResult;
  error?: MappingError;
  warnings?: string[];
}

function validateMapping(mapping: MappingResult, headers: string[]): string[] {
  const warnings: string[] = [];

  if (!mapping.firstName || !headers.includes(mapping.firstName)) {
    warnings.push(`First name column "${mapping.firstName}" not found in headers`);
  }
  if (!mapping.lastName || !headers.includes(mapping.lastName)) {
    warnings.push(`Last name column "${mapping.lastName}" not found in headers`);
  }
  if (!mapping.email || !headers.includes(mapping.email)) {
    warnings.push(`Email column "${mapping.email}" not found in headers - this is critical for lead processing`);
  }
  if (!mapping.company || !headers.includes(mapping.company)) {
    warnings.push(`Company column "${mapping.company}" not found in headers`);
  }

  return warnings;
}

export async function identifyColumns(
  headers: string[],
  sampleRows: any[],
): Promise<MappingResult> {
  if (!headers || headers.length === 0) {
    throw new MappingAgentError(
      'EMPTY_HEADERS',
      'No column headers found in the file',
      'The file appears to be empty or malformed. Please ensure the first row contains column headers.',
    );
  }

  if (!sampleRows || sampleRows.length === 0) {
    throw new MappingAgentError(
      'EMPTY_DATA',
      'No data rows found in the file',
      'The file contains headers but no data rows. Please ensure there is at least one row of data.',
    );
  }

  if (!process.env.OPENROUTER_API_KEY) {
    throw new MappingAgentError(
      'MISSING_API_KEY',
      'OpenRouter API key not configured',
      'Please ensure OPENROUTER_API_KEY is set in your environment variables.',
    );
  }

  const prompt = `
    You are a data mapping assistant. Match the following CSV headers to the standard fields:
    - firstName
    - lastName
    - email
    - company
    - linkedin (optional - LinkedIn profile URL)
    - companyUrl (optional - Company website URL)
    - role (optional)

    Headers: ${JSON.stringify(headers)}
    Sample Data (first 3 rows): ${JSON.stringify(sampleRows.slice(0, 3))}

    Return the exact header name from the provided list that best matches each standard field.
    If no match is found for a required field, pick the closest one or empty string if totally ambiguous.
  `;

  try {
    const { object } = await generateObject({
      model: getModel('mapping'),
      schema: mappingSchema,
      prompt,
      temperature: 0,
    });

    const warnings = validateMapping(object, headers);
    if (warnings.length > 0) {
      console.warn('Mapping warnings:', warnings);
    }

    return object;
  } catch (error: any) {
    if (error instanceof MappingAgentError) {
      throw error;
    }

    if (NoObjectGeneratedError.isInstance(error)) {
      throw new MappingAgentError(
        'MAPPING_FAILED',
        'AI returned an unexpected response',
        'The AI did not return a valid column mapping. Please try again.',
      );
    }

    const status = error?.statusCode ?? error?.status;
    const message = (error?.message ?? '').toLowerCase();

    if (message.includes('timeout') || error?.code === 'ETIMEDOUT') {
      throw new MappingAgentError(
        'TIMEOUT',
        'Column mapping timed out',
        'The AI mapping service took too long to respond. Please try again.',
      );
    }

    if (status === 401 || message.includes('unauthorized') || message.includes('invalid api key')) {
      throw new MappingAgentError(
        'AUTH_ERROR',
        'Authentication failed with OpenRouter',
        'Please check that your OpenRouter API key is valid.',
      );
    }

    if (status === 429 || message.includes('rate limit')) {
      throw new MappingAgentError(
        'RATE_LIMIT',
        'OpenRouter rate limit exceeded',
        'Too many requests. Please wait a moment and try again.',
      );
    }

    if ((typeof status === 'number' && status >= 500) || message.includes('server error')) {
      throw new MappingAgentError(
        'API_ERROR',
        'AI service temporarily unavailable',
        'The AI service is experiencing issues. Please try again in a few moments.',
      );
    }

    console.error('Mapping agent error:', error);
    throw new MappingAgentError(
      'MAPPING_FAILED',
      'Failed to map CSV columns',
      `An unexpected error occurred while mapping columns: ${error?.message || 'Unknown error'}`,
    );
  }
}

export class MappingAgentError extends Error {
  code: string;
  details?: string;

  constructor(code: string, message: string, details?: string) {
    super(message);
    this.name = 'MappingAgentError';
    this.code = code;
    this.details = details;
  }
}
```

- [ ] **Step 2: Typecheck**

Run:
```bash
npx tsc --noEmit
```

Expected: no new errors. Errors in `lib/agents/research-agent.ts`, `lib/agents/drafting-agent.ts`, `lib/agents/regeneration-agent.ts` are still expected — they'll be fixed in later tasks.

- [ ] **Step 3: Commit**

```bash
git add lib/agents/mapping-agent.ts
git commit -m "refactor: migrate mapping agent to ai sdk + openrouter"
```

---

## Task 5: Update `app/api/ingest/route.ts` and `app/api/debug/route.ts`

**Files:**
- Modify: `app/api/ingest/route.ts:47-55`
- Modify: `app/api/debug/route.ts:10`

- [ ] **Step 1: Edit `app/api/ingest/route.ts`**

Find this block (around line 47):

```ts
    if (!process.env.OPENAI_API_KEY) {
        console.error("Missing OPENAI_API_KEY in /api/ingest");
        return errorResponse(
            "CONFIG_ERROR",
            "Server configuration error",
            "AI mapping service is not configured. Please contact support.",
            500
        );
    }
```

Replace with:

```ts
    if (!process.env.OPENROUTER_API_KEY) {
        console.error("Missing OPENROUTER_API_KEY in /api/ingest");
        return errorResponse(
            "CONFIG_ERROR",
            "Server configuration error",
            "AI mapping service is not configured. Please contact support.",
            500
        );
    }
```

- [ ] **Step 2: Edit `app/api/debug/route.ts`**

Find line 10, which currently reads (in the response object):

```ts
            hasOpenAIKey: !!process.env.OPENAI_API_KEY,
```

Replace with:

```ts
            hasOpenRouterKey: !!process.env.OPENROUTER_API_KEY,
```

- [ ] **Step 3: Typecheck**

Run:
```bash
npx tsc --noEmit
```

Expected: no new errors from these two files.

- [ ] **Step 4: Commit**

```bash
git add app/api/ingest/route.ts app/api/debug/route.ts
git commit -m "refactor: switch ingest and debug routes to OPENROUTER_API_KEY"
```

---

## Task 6: Migrate `lib/agents/research-agent.ts` to AI SDK

**Files:**
- Modify: `lib/agents/research-agent.ts`

- [ ] **Step 1: Replace the file content**

Overwrite `lib/agents/research-agent.ts` with:

```ts
import { generateText } from 'ai';
import { TavilySearch } from '@langchain/tavily';
import { ImportedLead } from '@/types';
import { getModel } from '@/lib/ai/openrouter';

export interface ResearchResult {
    summary: string;
    sources: { title: string; url: string }[];
}

export async function researchLead(lead: ImportedLead): Promise<ResearchResult> {
    const tavilyApiKey = process.env.TAVILY_API_KEY;
    if (!tavilyApiKey) {
        throw new Error('TAVILY_API_KEY not found in environment');
    }

    const linkedinContext = lead.linkedinUrl ? `- LinkedIn Profile: ${lead.linkedinUrl}` : '';
    const companyUrlContext = lead.companyUrl ? `- Company Website: ${lead.companyUrl}` : '';

    const customFieldsText = Object.entries(lead.customFields || {})
        .filter(([_, v]) => v !== undefined && v !== null && v !== '')
        .map(([k, v]) => `- ${k}: ${v}`)
        .join('\n');

    const searchQueries: string[] = [
        `${lead.company} company news announcements`,
        `${lead.firstName} ${lead.lastName} ${lead.company} ${lead.role}`,
    ];

    if (lead.companyUrl) {
        searchQueries.push(`site:${lead.companyUrl} about products services`);
    }

    if (lead.linkedinUrl) {
        searchQueries.push(`${lead.firstName} ${lead.lastName} LinkedIn professional`);
    }

    console.log('Using Tavily search with queries:');
    searchQueries.forEach((q, i) => console.log(`  ${i + 1}. ${q}`));

    try {
        const searchTool = new TavilySearch({
            tavilyApiKey: tavilyApiKey,
            maxResults: 5,
        });

        const allResults: { title: string; url: string; content: string }[] = [];
        const sources: { title: string; url: string }[] = [];

        for (const query of searchQueries) {
            try {
                const result = await searchTool.invoke({ query });

                let parsedResult;
                if (typeof result === 'string') {
                    try {
                        parsedResult = JSON.parse(result);
                    } catch {
                        allResults.push({ title: query, url: '', content: result });
                        continue;
                    }
                } else {
                    parsedResult = result;
                }

                if (Array.isArray(parsedResult)) {
                    for (const item of parsedResult) {
                        allResults.push({
                            title: item.title || '',
                            url: item.url || '',
                            content: item.content || item.snippet || '',
                        });
                        if (item.url) {
                            sources.push({
                                title: item.title || item.url,
                                url: item.url,
                            });
                        }
                    }
                } else if (parsedResult.results && Array.isArray(parsedResult.results)) {
                    for (const item of parsedResult.results) {
                        allResults.push({
                            title: item.title || '',
                            url: item.url || '',
                            content: item.content || item.snippet || '',
                        });
                        if (item.url) {
                            sources.push({
                                title: item.title || item.url,
                                url: item.url,
                            });
                        }
                    }
                }
            } catch (searchError: any) {
                console.warn(
                    `Search query failed: ${query} - ${searchError?.statusText || searchError?.message || 'Unknown error'}`,
                );
                if (
                    searchError?.status === 429 ||
                    searchError?.statusText === 'Too Many Requests' ||
                    searchError?.message?.includes('429')
                ) {
                    console.log('Tavily rate limit reached. Stopping further queries.');
                    break;
                }
            }
        }

        console.log(`Tavily search completed. Found ${allResults.length} results from ${sources.length} sources`);

        if (allResults.length === 0) {
            throw new Error('No search results found from any query.');
        }

        const uniqueSources = sources.filter(
            (source, index, self) => index === self.findIndex((s) => s.url === source.url),
        );

        const searchContext = allResults
            .map((r) => `[${r.title}]\n${r.content}`)
            .join('\n\n---\n\n');

        const summaryPrompt = `
You are a researcher preparing context for cold outreach. Based on the web search results provided, write a focused summary.

Prospect Details:
- Name: ${lead.firstName} ${lead.lastName}
- Company: ${lead.company}
- Role: ${lead.role}
${linkedinContext}
${companyUrlContext}
${customFieldsText}

WEB SEARCH RESULTS:
${searchContext || 'No search results found.'}

Write a focused 150-word summary that includes:
- Recent company news, announcements, or achievements
- Company initiatives, products, or services
- Information about ${lead.firstName} ${lead.lastName} - their role, professional updates, or thought leadership
- Any conversation hooks that would be relevant for cold outreach

Be factual and specific. Only include information that appears in the search results above.
If no relevant information was found, state that clearly and provide general context based on the role/industry.
`;

        const { text: summary } = await generateText({
            model: getModel('research'),
            prompt: summaryPrompt,
            temperature: 0.3,
        });

        console.log('Tavily research completed successfully');

        return {
            summary: summary || 'No summary generated',
            sources: uniqueSources,
        };
    } catch (error) {
        console.error('Tavily search failed:', error);
        console.log('Falling back to basic research summary without web search');

        const fallbackPrompt = `
You are a researcher preparing context for cold outreach.

Prospect:
- Name: ${lead.firstName} ${lead.lastName}
- Company: ${lead.company}
- Role: ${lead.role}
${linkedinContext}
${companyUrlContext}
${customFieldsText}

Task: Write a focused 150-word summary of this person/company based on your knowledge.
Focus on:
- Known information about the company
- Industry context and typical roles
- Anything that could serve as a conversation hook

Be factual and specific where possible. If you don't have specific information,
focus on general industry knowledge that might be relevant.
`;

        const { text: fallbackSummary } = await generateText({
            model: getModel('research'),
            prompt: fallbackPrompt,
            temperature: 0,
        });

        return {
            summary: fallbackSummary || 'No summary generated',
            sources: [],
        };
    }
}
```

- [ ] **Step 2: Typecheck**

Run:
```bash
npx tsc --noEmit
```

Expected: no new errors from research-agent.ts. drafting-agent / regeneration-agent / generate route still have errors (handled in next task).

- [ ] **Step 3: Commit**

```bash
git add lib/agents/research-agent.ts
git commit -m "refactor: migrate research agent to ai sdk + openrouter"
```

---

## Task 7: Migrate drafting + regeneration + generate route (atomic)

The drafting agent currently exports `OpenAIError`, `parseOpenAIError`, and `emailSchema`. Both regeneration-agent and the generate route depend on these. We migrate all three together so the build never goes through a broken state.

**Files:**
- Modify: `lib/agents/drafting-agent.ts`
- Modify: `lib/agents/regeneration-agent.ts`
- Modify: `app/api/generate/route.ts`

- [ ] **Step 1: Replace `lib/agents/drafting-agent.ts`**

Overwrite with:

```ts
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
```

- [ ] **Step 2: Replace `lib/agents/regeneration-agent.ts`**

Overwrite with:

```ts
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
```

- [ ] **Step 3: Update `app/api/generate/route.ts`**

The current file imports `OpenAIError` from `@/lib/agents/drafting-agent`. Change that import and update the `instanceof` checks.

Find:
```ts
import { draftEmail, OpenAIError } from "@/lib/agents/drafting-agent";
```

Replace with:
```ts
import { draftEmail } from "@/lib/agents/drafting-agent";
import { AIError } from "@/lib/ai/errors";
```

Find (inside the per-lead `catch` block):
```ts
                    if (err instanceof OpenAIError) {
                        return {
                            leadId: lead.id,
                            status: "failed",
                            error: err.userMessage,
                            errorCode: err.code,
                            retryable: err.retryable,
                        };
                    }
```

Replace with:
```ts
                    if (err instanceof AIError) {
                        return {
                            leadId: lead.id,
                            status: "failed",
                            error: err.userMessage,
                            errorCode: err.code,
                            retryable: err.retryable,
                        };
                    }
```

Find (inside the top-level `catch` block):
```ts
        if (error instanceof OpenAIError) {
            return NextResponse.json({
                error: error.userMessage,
                errorCode: error.code,
                retryable: error.retryable,
            }, { status: 503 });
        }
```

Replace with:
```ts
        if (error instanceof AIError) {
            return NextResponse.json({
                error: error.userMessage,
                errorCode: error.code,
                retryable: error.retryable,
            }, { status: 503 });
        }
```

- [ ] **Step 4: Typecheck**

Run:
```bash
npx tsc --noEmit
```

Expected: no errors in any of the three files. The only remaining typecheck issues should be from `lib/actions/settings.ts` and `app/settings/page.tsx` references — addressed in Task 8.

- [ ] **Step 5: Build**

Run:
```bash
npm run build
```

Expected: build succeeds. Some warnings about deprecated `langchain` peer deps may appear; ignore.

- [ ] **Step 6: Commit**

```bash
git add lib/agents/drafting-agent.ts lib/agents/regeneration-agent.ts app/api/generate/route.ts
git commit -m "refactor: migrate drafting and regeneration to ai sdk + openrouter

Drafting and regeneration agents now use generateObject with deepseek/deepseek-v3.2
via OpenRouter. Errors flow through the unified AIError class.

The generate route's instanceof check is updated accordingly."
```

---

## Task 8: Remove provider toggle (settings UI + actions)

**Files:**
- Delete: `lib/actions/settings.ts`
- Delete: `app/settings/provider-selector.tsx`
- Modify: `app/settings/page.tsx`

- [ ] **Step 1: Replace `app/settings/page.tsx`**

Overwrite with:

```tsx
import { ClearDatabaseButton } from "@/components/settings/clear-database-button";
import { AlertCircle } from "lucide-react";

export default async function SettingsPage() {
    return (
        <div className="flex flex-col gap-6 p-6 max-w-5xl mx-auto w-full">
            <div className="flex items-center justify-between">
                <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
            </div>

            <div className="rounded-xl border border-destructive/20 bg-destructive/5 p-6 shadow-sm">
                <div className="flex items-center gap-2 mb-2 text-destructive">
                    <AlertCircle className="h-5 w-5" />
                    <h2 className="text-xl font-semibold">Danger Zone</h2>
                </div>
                <p className="text-muted-foreground text-sm mb-6">
                    The actions below are irreversible. Please proceed with caution.
                </p>
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-t border-destructive/10 pt-6">
                    <div>
                        <h3 className="font-medium text-foreground">Clear Database</h3>
                        <p className="text-sm text-muted-foreground">
                            Removes all ingested files, leads, and email records. This does not affect your configuration settings.
                        </p>
                    </div>
                    <ClearDatabaseButton />
                </div>
            </div>
        </div>
    )
}
```

- [ ] **Step 2: Delete the provider toggle files**

Run:
```bash
rm lib/actions/settings.ts app/settings/provider-selector.tsx
```

- [ ] **Step 3: Verify nothing else imports them**

Run:
```bash
grep -rn "lib/actions/settings\|provider-selector\|getAiProvider\|setAiProvider" app lib components 2>/dev/null | grep -v node_modules
```

Expected: no output. If any matches appear, fix them — likely a stale import in a component or page.

- [ ] **Step 4: Typecheck and build**

Run:
```bash
npx tsc --noEmit && npm run build
```

Expected: clean build.

- [ ] **Step 5: Commit**

```bash
git add app/settings/page.tsx
git add -u lib/actions/settings.ts app/settings/provider-selector.tsx
git commit -m "refactor: remove openai/gateway provider toggle

Single OpenRouter provider — the cookie-driven toggle has no remaining purpose.
Settings page keeps the Clear Database action."
```

---

## Task 9: Remove unused LLM dependencies

**Files:**
- Modify: `package.json`, `package-lock.json`

- [ ] **Step 1: Confirm nothing imports the packages we're about to remove**

Run:
```bash
grep -rn "@langchain/openai\|@langfuse/langchain\|^import .* from ['\"]langfuse" app lib components 2>/dev/null | grep -v node_modules
grep -rn "from ['\"]openai['\"]" app lib components 2>/dev/null | grep -v node_modules
grep -rn "from ['\"]langchain[/'\"]" app lib components 2>/dev/null | grep -v node_modules | grep -v "@langchain/tavily\|@langchain/community\|@langchain/core"
```

Expected: no output. If any imports remain, fix them before continuing.

- [ ] **Step 2: Uninstall the packages**

Run:
```bash
npm uninstall @langchain/openai @langfuse/langchain langchain langfuse openai
```

Expected: packages removed from `package.json`. `@langchain/tavily`, `@langchain/community`, `@langchain/core` remain (Tavily depends on them).

- [ ] **Step 3: Build**

Run:
```bash
npm run build
```

Expected: clean build. If it fails because `@langchain/tavily` needs one of the removed packages, reinstall the specific minimum required (this is unlikely but worth checking).

- [ ] **Step 4: Commit**

```bash
git add package.json package-lock.json
git commit -m "chore: remove openai, langchain, and langfuse llm dependencies

All LLM calls now go through ai + @openrouter/ai-sdk-provider.
@langchain/tavily and its peer deps stay for Tavily web search."
```

---

## Task 10: End-to-end manual verification

**Files:** none modified — verification only.

- [ ] **Step 1: Confirm `OPENROUTER_API_KEY` is set in `.env.local`**

Run:
```bash
grep -c "^OPENROUTER_API_KEY=" .env.local
```

Expected: `1`. If the key has no value (`OPENROUTER_API_KEY=`), paste the actual key now.

- [ ] **Step 2: Start the dev server**

Run:
```bash
npm run dev
```

Expected: server starts on `http://localhost:3000` without errors. Leave running for the rest of the task.

- [ ] **Step 3: Walk through CSV upload (mapping agent)**

In the browser:
1. Open `http://localhost:3000`.
2. Navigate to the upload UI (whichever page handles ingest).
3. Upload a small CSV with first name / last name / email / company columns (any test CSV works).

Expected: file processes successfully, leads land in Supabase, no error toast. Check the dev server logs — you should see no `ChatOpenAI` or `langfuse` references and no auth errors.

- [ ] **Step 4: Walk through generation (research + drafting agents)**

1. From the upload result, select 2–3 leads.
2. Trigger generation through the existing UI flow.

Expected:
- Server logs show `Tavily search completed successfully` (or fallback message) for each lead.
- Drafts return with non-empty `subject` and `body`.
- Drafts persist in Supabase `email_drafts` table.

- [ ] **Step 5: Walk through regeneration**

1. On a generated draft, click "Regenerate".

Expected: a different variation comes back, replaces the original in the UI, and updates in Supabase.

- [ ] **Step 6: Spot-check draft quality**

Read one draft. DeepSeek-v3.2's voice differs from gpt-4o-mini — minor stylistic differences are expected and not a blocker. Block-level structure (subject, opening, KPI bullets, closing signature) should match the reference template loaded by `loadEmailTemplate()`.

If output is consistently malformed (e.g. JSON parse failures, missing subject/body), capture the server log and flag for follow-up — the spec's fallback path is `generateText` + manual Zod parsing.

- [ ] **Step 7: Verify the error path**

1. Stop the dev server.
2. In `.env.local`, change `OPENROUTER_API_KEY` to an invalid value (e.g. `OPENROUTER_API_KEY=sk-or-invalid`).
3. Restart `npm run dev`.
4. Trigger a generation.

Expected: UI shows a clear error like "AI service configuration error" (not a 500 stack trace). Server log shows the parsed `AIError` with code `INVALID_API_KEY`.

5. Restore the real key and restart the dev server.

- [ ] **Step 8: Final cleanliness check**

Run:
```bash
git status
```

Expected: only the unrelated Everlytic/Instantly files appear as modified/untracked. None of the migration files should be uncommitted.

- [ ] **Step 9: Done**

The migration is complete. No commit needed for this task — verification only.

---

## Self-review notes

- **Spec coverage:** all four agents, both new files, both deletions, both small-route updates, dependency add/remove, env var, settings page, manual testing — every spec item is covered by a task.
- **No placeholders:** every code-changing step shows the literal code or commands. No "TODO" or "fill in" anywhere.
- **Type consistency:** `AgentRole` values (`'mapping' | 'research' | 'drafting' | 'regeneration'`), `AIError` shape (`code`, `userMessage`, `retryable`), and `emailSchema` (`{ subject, body }`) are used identically across tasks 2, 3, 4, 6, 7.
- **Order safety:** drafting / regeneration / generate route are bundled into Task 7 because they share `OpenAIError` / `emailSchema` exports — splitting them would put the build through a broken state.
- **Scope discipline:** `git add` is scoped per task; the unrelated Everlytic → Instantly changes are explicitly left alone.
