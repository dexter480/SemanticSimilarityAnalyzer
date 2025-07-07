import { type Keyword, type KeywordCoverage, type KeywordRole } from "@shared/schema";
import { detectSections, type TextSection } from "./text-analysis";

export function parseKeywords(input: string): Keyword[] {
  if (!input.trim()) return [];

  const lines = input.split(/[,\n]/);
  const keywords: Keyword[] = [];

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    // Check for weighted format (keyword:weight) - for backward compatibility
    const match = trimmed.match(/^(.+?):(\d*\.?\d+)$/);
    
    if (match) {
      const text = match[1].trim();
      const weight = parseFloat(match[2]);
      
      if (text && weight >= 0.1 && weight <= 10) {
        // Convert weight to role for new system
        const role: KeywordRole = weight > 1 ? 'main' : 'supporting';
        keywords.push({ text, role, weight });
      } else if (text) {
        // Invalid weight, use default
        keywords.push({ text, role: 'supporting' as KeywordRole, weight: 1 });
      }
    } else {
      // Simple format - default to supporting role
      keywords.push({ text: trimmed, role: 'supporting' as KeywordRole, weight: 1 });
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

// New intelligent chunking function
export function intelligentChunkText(text: string): Array<{text: string, startIndex: number, endIndex: number, title: string}> {
  const sections = detectSections(text);
  
  return sections.map(section => ({
    text: section.content,
    startIndex: section.startIndex,
    endIndex: section.endIndex,
    title: section.title
  }));
}

// Keep original function for backward compatibility
export function chunkText(text: string, chunkSize: number = 500, overlap: number = 100): string[] {
  const sections = detectSections(text);
  
  // If we have good sections, use them
  if (sections.length > 1 && sections[0].type !== 'chunk') {
    return sections.map(s => s.content);
  }
  
  // Otherwise fall back to word-based chunking
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

// --- Score Prediction Utilities ---

export interface ScorePrediction {
  keyword: string;
  currentMentions: number;
  suggestedMentions: number;
  currentScore: number;
  predictedScore: number;
  impact: number;
}

export function calculateScorePredictions(
  currentScore: number,
  keywordAnalysis: KeywordCoverage[],
  competitorAnalysis?: KeywordCoverage[]
): ScorePrediction[] {
  const predictions: ScorePrediction[] = [];

  keywordAnalysis.forEach((ka) => {
    // Only predict for keywords needing improvement
    if (ka.directMentions === 0 || ka.semanticCoverage < 60) {
      // Determine competitor usage if provided
      const competitorData = competitorAnalysis?.find((c) => c.keyword === ka.keyword);
      const targetMentions = competitorData
        ? Math.max(3, Math.ceil(competitorData.directMentions * 0.8))
        : 3;

      // Compute impact based on missing coverage and weight
      const missingCoverage = 100 - ka.semanticCoverage;
      const weightMultiplier = ka.weight;
      const baseImpact = (missingCoverage / 100) * 10; // Max 10% per keyword
      const impact = Math.round(baseImpact * weightMultiplier * 10) / 10;

      predictions.push({
        keyword: ka.keyword,
        currentMentions: ka.directMentions,
        suggestedMentions: targetMentions,
        currentScore,
        predictedScore: Math.min(100, currentScore + impact),
        impact,
      });
    }
  });

  // Return top 5 highest-impact keywords
  return predictions.sort((a, b) => b.impact - a.impact).slice(0, 5);
}

export function calculateCumulativeImpact(predictions: ScorePrediction[]): number {
  if (predictions.length === 0) return 0;

  let cumulativeScore = predictions[0].currentScore;
  let diminishingFactor = 1;

  predictions.forEach((pred) => {
    cumulativeScore += pred.impact * diminishingFactor;
    diminishingFactor *= 0.8; // Diminishing returns
  });

  return Math.min(100, Math.round(cumulativeScore * 10) / 10);
}
