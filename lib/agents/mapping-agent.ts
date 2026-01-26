
import { ChatOpenAI } from "@langchain/openai";
import { z } from "zod";

const mappingSchema = z.object({
  firstName: z.string().describe("Column name for First Name"),
  lastName: z.string().describe("Column name for Last Name"),
  email: z.string().describe("Column name for Email"),
  company: z.string().describe("Column name for Company Name"),
  linkedin: z.string().nullable().optional().describe("Column name for LinkedIn URL"),
  companyUrl: z.string().nullable().optional().describe("Column name for Company Website URL"),
  role: z.string().nullable().optional().describe("Column name for Job Title / Role"),
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

// Validate that required fields have valid mappings
function validateMapping(mapping: MappingResult, headers: string[]): string[] {
  const warnings: string[] = [];
  const headerSet = new Set(headers.map(h => h.toLowerCase()));

  // Check required fields
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
  sampleRows: any[]
): Promise<MappingResult> {
  // Input validation
  if (!headers || headers.length === 0) {
    throw new MappingAgentError(
      "EMPTY_HEADERS",
      "No column headers found in the file",
      "The file appears to be empty or malformed. Please ensure the first row contains column headers."
    );
  }

  if (!sampleRows || sampleRows.length === 0) {
    throw new MappingAgentError(
      "EMPTY_DATA",
      "No data rows found in the file",
      "The file contains headers but no data rows. Please ensure there is at least one row of data."
    );
  }

  // Check for OpenAI API key
  if (!process.env.OPENAI_API_KEY) {
    throw new MappingAgentError(
      "MISSING_API_KEY",
      "OpenAI API key not configured",
      "Please ensure OPENAI_API_KEY is set in your environment variables."
    );
  }

  try {
    const model = new ChatOpenAI({
      modelName: "gpt-4o-mini",
      temperature: 0,
      timeout: 30000, // 30 second timeout
      maxRetries: 2,
    });

    const structuredModel = model.withStructuredOutput(mappingSchema);

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

    const result = await structuredModel.invoke(prompt);

    // Validate the mapping
    const warnings = validateMapping(result, headers);
    if (warnings.length > 0) {
      console.warn("Mapping warnings:", warnings);
    }

    return result;
  } catch (error: any) {
    // Handle specific error types
    if (error instanceof MappingAgentError) {
      throw error;
    }

    if (error.code === "ETIMEDOUT" || error.message?.includes("timeout")) {
      throw new MappingAgentError(
        "TIMEOUT",
        "Column mapping timed out",
        "The AI mapping service took too long to respond. Please try again."
      );
    }

    if (error.status === 401 || error.message?.includes("Unauthorized")) {
      throw new MappingAgentError(
        "AUTH_ERROR",
        "Authentication failed with OpenAI",
        "Please check that your OpenAI API key is valid."
      );
    }

    if (error.status === 429 || error.message?.includes("rate limit")) {
      throw new MappingAgentError(
        "RATE_LIMIT",
        "OpenAI rate limit exceeded",
        "Too many requests. Please wait a moment and try again."
      );
    }

    if (error.status >= 500 || error.message?.includes("server error")) {
      throw new MappingAgentError(
        "API_ERROR",
        "OpenAI service temporarily unavailable",
        "The AI service is experiencing issues. Please try again in a few moments."
      );
    }

    // Generic error
    console.error("Mapping agent error:", error);
    throw new MappingAgentError(
      "MAPPING_FAILED",
      "Failed to map CSV columns",
      `An unexpected error occurred while mapping columns: ${error.message || "Unknown error"}`
    );
  }
}

// Custom error class for mapping errors
export class MappingAgentError extends Error {
  code: string;
  details?: string;

  constructor(code: string, message: string, details?: string) {
    super(message);
    this.name = "MappingAgentError";
    this.code = code;
    this.details = details;
  }
}
