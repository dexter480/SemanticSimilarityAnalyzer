import { z } from "zod";

export const keywordSchema = z.object({
  text: z.string().min(1),
  weight: z.number().min(0.1).max(10).default(1)
});

export const analysisRequestSchema = z.object({
  apiKey: z.string().min(1).refine(key => key.startsWith('sk-'), {
    message: "API key must start with 'sk-'"
  }),
  keywords: z.array(keywordSchema).min(1).max(50),
  mainCopy: z.string().min(1).max(50000), // ~4000 words * 12.5 chars avg
  competitorCopy: z.string().min(1).max(50000),
  analysisMode: z.enum(['full', 'chunked']).default('full')
});

export const chunkResultSchema = z.object({
  title: z.string(),
  score: z.number(),
  startIndex: z.number(),
  endIndex: z.number(),
  text: z.string()
});

// Add new schemas for enhanced analysis
export const keywordCoverageSchema = z.object({
  keyword: z.string(),
  weight: z.number(),
  directMentions: z.number(),
  semanticCoverage: z.number(), // 0-100%
  strongSections: z.array(z.string()),
  weakSections: z.array(z.string()),
  relatedTermsFound: z.array(z.string()),
  competitorAdvantage: z.boolean(),
  competitorMentions: z.number()
});

export const sectionImprovementSchema = z.object({
  section: z.string(),
  currentScore: z.number(),
  missingKeywords: z.array(z.string()),
  suggestedPhrases: z.array(z.string()),
  competitorStrengths: z.array(z.string())
});

// Update the existing analysisResultSchema to include new fields
export const analysisResultSchema = z.object({
  mainCopyScore: z.number(),
  competitorCopyScore: z.number(),
  gapAnalysis: z.string(),
  mainCopyChunks: z.array(chunkResultSchema).optional(),
  competitorCopyChunks: z.array(chunkResultSchema).optional(),
  keywordWeights: z.array(keywordSchema),
  processingTime: z.number(),
  // Add new fields for enhanced analysis
  keywordAnalysis: z.array(keywordCoverageSchema),
  sectionImprovements: z.array(sectionImprovementSchema)
});

export type Keyword = z.infer<typeof keywordSchema>;
export type AnalysisRequest = z.infer<typeof analysisRequestSchema>;
export type ChunkResult = z.infer<typeof chunkResultSchema>;
export type AnalysisResult = z.infer<typeof analysisResultSchema>;

// Export new types
export type KeywordCoverage = z.infer<typeof keywordCoverageSchema>;
export type SectionImprovement = z.infer<typeof sectionImprovementSchema>;
