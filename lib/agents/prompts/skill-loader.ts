import { readFileSync } from "fs";
import { join } from "path";

const SKILL_PATH = join(process.cwd(), "lib", "agents", "prompts", "cold-email-skill.md");

/**
 * Loads the cold-email SKILL.md from disk on every call. Used as the system
 * prompt for drafting and regeneration agents — it's the single source of
 * truth for the Carl Davis XYZ formula.
 *
 * Intentionally NOT cached: edits to the markdown should apply on the next
 * request without a server restart. The file is small (<10 KB), so re-reading
 * it per generation call is negligible compared to the LLM round-trip.
 */
export function loadColdEmailSkill(): string {
    try {
        return readFileSync(SKILL_PATH, "utf-8");
    } catch (error) {
        console.error("Failed to load cold-email-skill.md:", error);
        throw new Error(
            "lib/agents/prompts/cold-email-skill.md not found. This file is required as the system prompt for email drafting.",
        );
    }
}
