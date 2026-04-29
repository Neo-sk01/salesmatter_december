import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import assert from "node:assert/strict";

const root = process.cwd();
const read = (path) => readFileSync(resolve(root, path), "utf8");

const coldEmailSkill = read("lib/agents/prompts/cold-email-skill.md");
const outreachContext = read("contexts/outreach-context.tsx");
const promptTemplateModal = read("components/outreach/prompt-template-modal.tsx");
const defaultPromptAction = read("app/actions/get-default-prompt.ts");
const draftingAgent = read("lib/agents/drafting-agent.ts");
const regenerationAgent = read("lib/agents/regeneration-agent.ts");
const legacyPartnerPattern = new RegExp(["mc", "(?:sorely|sorley)", "\\s+media"].join(""), "i");

assert(
  !legacyPartnerPattern.test(coldEmailSkill),
  "cold-email-skill.md must not contain the removed legacy partner name.",
);

assert(
  defaultPromptAction.includes("return loadColdEmailSkill()"),
  "The default prompt action must return cold-email-skill.md exactly.",
);

for (const [name, source] of [
  ["drafting-agent.ts", draftingAgent],
  ["regeneration-agent.ts", regenerationAgent],
]) {
  assert(
    source.includes("const systemPrompt = loadColdEmailSkill();"),
    `${name} must load its system prompt from cold-email-skill.md.`,
  );
  assert(
    source.includes("system: systemPrompt"),
    `${name} must pass cold-email-skill.md as the model system prompt.`,
  );
  assert(
    !legacyPartnerPattern.test(source),
    `${name} must not contain the removed legacy partner name.`,
  );
}

assert(
  outreachContext.includes("const PROMPT_TEMPLATE_STORAGE_KEY = 'salesmatter_prompt_template_v8'"),
  "The current prompt cache key must be v8 so browsers rehydrate after the latest markdown prompt edit.",
);

assert(
  outreachContext.includes("['salesmatter_prompt_template_v5', 'salesmatter_prompt_template_v6', 'salesmatter_prompt_template_v7']"),
  "The app must remove v5, v6, and v7 localStorage prompt caches before hydrating the default prompt.",
);

assert(
  !/localStorage\.(?:getItem|setItem)\(["']salesmatter_prompt_template_v[567]["']\)/.test(outreachContext),
  "The app must not read or write legacy v5/v6/v7 localStorage prompts.",
);

assert(
  outreachContext.includes("getDefaultPromptTemplate()"),
  "The default UI prompt must hydrate from cold-email-skill.md.",
);

assert(
  /useEffect\(\(\) => \{[\s\S]*setEditedTemplate\(template\)/.test(promptTemplateModal),
  "The prompt modal must sync its editor state from the latest cold-email-skill.md template.",
);

assert(
  /setEditedTemplate\(skill\)[\s\S]*onSave\(skill\)/.test(promptTemplateModal),
  "Reset to Default must save cold-email-skill.md into the shared generation prompt state.",
);

assert(
  /const \[resetSuccessOpen, setResetSuccessOpen\]/.test(promptTemplateModal)
  && /onSave\(skill\)[\s\S]*setResetSuccessOpen\(true\)/.test(promptTemplateModal)
  && promptTemplateModal.includes("<AlertDialog")
  && promptTemplateModal.includes("Prompt reset"),
  "Reset to Default must show a success modal after the default prompt is saved.",
);

console.log("Prompt sources are pinned to cold-email-skill.md.");
