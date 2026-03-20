import { readFileSync } from "fs";
import { join } from "path";

let cachedTemplate: string | null = null;

/**
 * Loads the email template from email_template.md at the project root.
 * This is the SINGLE SOURCE OF TRUTH for email structure, tone, KPIs, and footer.
 * The template is cached in memory after first read for performance.
 */
export function loadEmailTemplate(): string {
    if (cachedTemplate) {
        return cachedTemplate;
    }

    const templatePath = join(process.cwd(), "email_template.md");

    try {
        cachedTemplate = readFileSync(templatePath, "utf-8");
        return cachedTemplate;
    } catch (error) {
        console.error("Failed to load email_template.md:", error);
        throw new Error(
            "email_template.md not found at project root. This file is required as the single source of truth for email generation."
        );
    }
}

/**
 * Clears the cached template so it will be re-read from disk on next call.
 * Useful if the template file is updated at runtime.
 */
export function clearTemplateCache(): void {
    cachedTemplate = null;
}
