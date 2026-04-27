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
