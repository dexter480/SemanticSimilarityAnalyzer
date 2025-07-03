import { type Keyword } from "@shared/schema";

export function parseKeywords(input: string): Keyword[] {
  if (!input.trim()) return [];

  const lines = input.split(/[,\n]/);
  const keywords: Keyword[] = [];

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    // Check for weighted format (keyword:weight)
    const match = trimmed.match(/^(.+?):(\d*\.?\d+)$/);
    
    if (match) {
      const text = match[1].trim();
      const weight = parseFloat(match[2]);
      
      if (text && weight >= 0.1 && weight <= 10) {
        keywords.push({ text, weight });
      } else if (text) {
        // Invalid weight, use default
        keywords.push({ text, weight: 1 });
      }
    } else {
      // Simple format
      keywords.push({ text: trimmed, weight: 1 });
    }
  }

  return keywords.slice(0, 50); // Limit to 50 keywords
}

export function countWords(text: string): number {
  if (!text.trim()) return 0;
  return text.trim().split(/\s+/).filter(word => word.length > 0).length;
}

export function validateApiKey(key: string): boolean {
  return key.startsWith('sk-') && key.length > 10;
}

export function chunkText(text: string, chunkSize: number = 500, overlap: number = 100): string[] {
  const words = text.split(/\s+/);
  const chunks: string[] = [];
  
  let startIndex = 0;
  
  while (startIndex < words.length) {
    const endIndex = Math.min(startIndex + chunkSize, words.length);
    const chunkWords = words.slice(startIndex, endIndex);
    chunks.push(chunkWords.join(' '));
    
    if (endIndex >= words.length) break;
    startIndex = endIndex - overlap;
  }
  
  return chunks;
}

export function cosineSimilarity(a: number[], b: number[]): number {
  let dotProduct = 0;
  let normA = 0;
  let normB = 0;
  
  for (let i = 0; i < a.length; i++) {
    dotProduct += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  
  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}
