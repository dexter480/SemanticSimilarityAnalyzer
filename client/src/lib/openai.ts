// This file provides client-side utilities for OpenAI integration
// The actual API calls are made server-side for security

export interface EmbeddingResponse {
  data: Array<{
    embedding: number[];
    index: number;
    object: string;
  }>;
  model: string;
  object: string;
  usage: {
    prompt_tokens: number;
    total_tokens: number;
  };
}

export interface OpenAIError {
  error: {
    code: string;
    message: string;
    type: string;
  };
}

export function isOpenAIError(obj: any): obj is OpenAIError {
  return obj && obj.error && typeof obj.error.code === 'string';
}

export function getOpenAIErrorMessage(error: OpenAIError): string {
  switch (error.error.code) {
    case 'invalid_api_key':
      return 'Invalid API key. Please check your OpenAI API key and try again.';
    case 'rate_limit_exceeded':
      return 'Rate limit exceeded. Please wait a moment and try again.';
    case 'insufficient_quota':
      return 'Insufficient quota. Please check your OpenAI account billing.';
    case 'model_not_found':
      return 'Model not found. The embedding model may be unavailable.';
    default:
      return error.error.message || 'An error occurred while processing your request.';
  }
}

// Utility function to estimate token count (rough approximation)
export function estimateTokenCount(text: string): number {
  // Rough approximation: 1 token ≈ 4 characters for English text
  return Math.ceil(text.length / 4);
}

// Utility function to estimate cost
export function estimateEmbeddingCost(tokenCount: number): number {
  // text-embedding-3-small pricing: $0.00002 per 1K tokens
  return (tokenCount / 1000) * 0.00002;
}
