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
