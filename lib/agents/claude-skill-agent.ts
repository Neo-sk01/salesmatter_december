/**
 * Claude Skill Agent
 *
 * Uses SKILL.md as the system prompt and calls Claude claude-opus-4-5
 * via the Anthropic API to generate cold outreach emails following the
 * Carl Davis XYZ Formula.
 *
 * Drop-in replacement for draftEmail() — same input/output shape.
 */

import fs from "fs";
import path from "path";
import { ImportedLead } from "@/types";

// ── Load SKILL.md once at module init ────────────────────────────────────────
function loadSkill(): string {
    try {
        const skillPath = path.join(process.cwd(), "SKILL.md");
        return fs.readFileSync(skillPath, "utf-8");
    } catch {
        console.warn("[claude-skill-agent] SKILL.md not found — using bare system prompt");
        return "You are an expert cold outreach copywriter. Write concise, personalised cold emails.";
    }
}

const SKILL_CONTENT = loadSkill();

// ── Types ─────────────────────────────────────────────────────────────────────
interface DraftResult {
    subject: string;
    body: string;
}

// ── Core call ─────────────────────────────────────────────────────────────────
export async function draftEmailWithSkill(
    lead: ImportedLead,
    researchSummary: string,
    userPrompt: string
): Promise<DraftResult> {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) throw new Error("ANTHROPIC_API_KEY is not set");

    // Build the user message — research + lead context + any extra instructions
    const userMessage = `
## Lead to write for:
- Name: ${lead.firstName} ${lead.lastName}
- Company: ${lead.company}
- Role: ${lead.role}
- Email: ${lead.email}

## Research Summary (use this for Component 1 personalisation):
${researchSummary}

## Additional instructions from the user:
${userPrompt || "None"}

---

Please write ONE cold outreach email following the Carl Davis XYZ Formula exactly as defined in your system instructions.

Return your answer as a valid JSON object with exactly two keys:
{
  "subject": "<subject line>",
  "body": "<full email body — plain text, no markdown>"
}

Do NOT wrap the JSON in a code block. Return raw JSON only.
`;

    const response = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            "x-api-key": apiKey,
            "anthropic-version": "2023-06-01",
        },
        body: JSON.stringify({
            model: "claude-opus-4-5",
            max_tokens: 1024,
            system: SKILL_CONTENT,
            messages: [
                {
                    role: "user",
                    content: userMessage,
                },
            ],
        }),
    });

    if (!response.ok) {
        const err = await response.text();
        throw new Error(`Anthropic API error ${response.status}: ${err}`);
    }

    const data = await response.json();
    const rawText: string = data?.content?.[0]?.text ?? "";

    // Parse JSON from Claude's response
    let parsed: DraftResult;
    try {
        parsed = JSON.parse(rawText.trim());
    } catch {
        // Attempt to extract JSON block if Claude wrapped it
        const match = rawText.match(/\{[\s\S]*\}/);
        if (!match) throw new Error(`Claude returned non-JSON output: ${rawText.slice(0, 200)}`);
        parsed = JSON.parse(match[0]);
    }

    if (!parsed.subject || !parsed.body) {
        throw new Error("Claude response missing subject or body");
    }

    return parsed;
}
