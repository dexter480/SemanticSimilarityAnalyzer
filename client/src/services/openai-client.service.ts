import OpenAI from 'openai';
import { 
  type AnalysisRequest, 
  type AnalysisResult, 
  type Keyword,
  type ChunkResult,
  type KeywordCoverage,
  type SectionImprovement 
} from '@shared/schema';

export class OpenAIClientService {
  private openai: OpenAI | null = null;

  initialize(apiKey: string) {
    if (!apiKey.startsWith('sk-')) {
      throw new Error('Invalid API key format');
    }
    
    // Use an absolute base URL that includes /v1 so the OpenAI SDK constructs valid request URLs
    // The Vite dev proxy rewrites the "/openai" prefix to "https://api.openai.com", so keeping the
    // "/v1" segment ensures requests map to the correct OpenAI REST path (e.g. /v1/embeddings).
    const baseURL = typeof window !== 'undefined'
      ? `${window.location.origin}/openai/v1`
      : 'http://localhost:3000/openai/v1';

    this.openai = new OpenAI({
      apiKey,
      baseURL,
      dangerouslyAllowBrowser: true // Required for client-side usage
    });
  }

  async analyze(data: AnalysisRequest): Promise<AnalysisResult> {
    if (!this.openai) {
      throw new Error('OpenAI client not initialized');
    }

    const startTime = Date.now();

    try {
      // Generate keyword embeddings
      const keywordEmbeddings = await this.generateKeywordEmbeddings(data.keywords);
      
      // Calculate weighted centroid
      const centroid = this.calculateWeightedCentroid(keywordEmbeddings);
      
      // Analyze content
      let mainCopyScore: number;
      let competitorCopyScore: number;
      let mainCopyChunks: ChunkResult[] | undefined;
      let competitorCopyChunks: ChunkResult[] | undefined;

      if (data.analysisMode === 'chunked') {
        const results = await this.performChunkedAnalysis(
          data.mainCopy,
          data.competitorCopy,
          centroid
        );
        
        mainCopyScore = results.mainScore;
        competitorCopyScore = results.competitorScore;
        mainCopyChunks = results.mainChunks;
        competitorCopyChunks = results.competitorChunks;
      } else {
        const results = await this.performFullAnalysis(
          data.mainCopy,
          data.competitorCopy,
          centroid
        );
        
        mainCopyScore = results.mainScore;
        competitorCopyScore = results.competitorScore;
      }

      // Generate gap analysis
      const gap = mainCopyScore - competitorCopyScore;
      const gapAnalysis = this.generateGapAnalysis(gap);

      // Analyze keyword coverage
      const keywordAnalysis = await this.analyzeKeywordCoverage(
        data.keywords,
        data.mainCopy,
        data.competitorCopy,
        mainCopyChunks || [],
        competitorCopyChunks || []
      );

      // Generate improvement suggestions
      const sectionImprovements = this.analyzeSectionImprovements(
        mainCopyChunks || [],
        competitorCopyChunks || [],
        data.keywords,
        keywordAnalysis
      );

      return {
        mainCopyScore: Math.round(mainCopyScore * 10) / 10,
        competitorCopyScore: Math.round(competitorCopyScore * 10) / 10,
        gapAnalysis,
        mainCopyChunks,
        competitorCopyChunks,
        keywordWeights: data.keywords,
        processingTime: Date.now() - startTime,
        keywordAnalysis,
        sectionImprovements
      };
    } catch (error: any) {
      console.error('Analysis error:', error);
      throw this.handleOpenAIError(error);
    }
  }

  async enhance(originalText: string, improvements: SectionImprovement[]): Promise<string> {
    if (!this.openai) {
      throw new Error('OpenAI client not initialized');
    }

    const prompt = this.buildEnhancementPrompt(originalText, improvements);

    try {
      const completion = await this.openai.chat.completions.create({
        model: "gpt-3.5-turbo",
        messages: [
          {
            role: "system",
            content: "You are a content optimization expert who enhances text for better SEO while maintaining readability."
          },
          {
            role: "user",
            content: prompt
          }
        ],
        temperature: 0.3,
        max_tokens: 2000
      });

      return completion.choices[0].message.content || originalText;
    } catch (error: any) {
      throw this.handleOpenAIError(error);
    }
  }

  private async generateKeywordEmbeddings(keywords: Keyword[]) {
    if (!this.openai) throw new Error('OpenAI not initialized');

    const embeddings = await Promise.all(
      keywords.map(async (keyword) => {
        const response = await this.openai!.embeddings.create({
          model: "text-embedding-3-small",
          input: keyword.text
        });
        return {
          keyword: keyword.text,
          weight: keyword.weight,
          embedding: response.data[0].embedding
        };
      })
    );

    return embeddings;
  }

  private calculateWeightedCentroid(embeddings: any[]) {
    const dimensions = embeddings[0].embedding.length;
    const weightedCentroid = new Array(dimensions).fill(0);
    let totalWeight = 0;

    embeddings.forEach(({ embedding, weight }) => {
      totalWeight += weight;
      embedding.forEach((value: number, i: number) => {
        weightedCentroid[i] += value * weight;
      });
    });

    // Normalize
    const magnitude = Math.sqrt(
      weightedCentroid.reduce((sum, val) => sum + val * val, 0)
    );
    return weightedCentroid.map(val => val / magnitude);
  }

  private async performFullAnalysis(
    mainCopy: string,
    competitorCopy: string,
    centroid: number[]
  ) {
    if (!this.openai) throw new Error('OpenAI not initialized');

    const [mainEmbedding, competitorEmbedding] = await Promise.all([
      this.openai.embeddings.create({
        model: "text-embedding-3-small",
        input: mainCopy
      }),
      this.openai.embeddings.create({
        model: "text-embedding-3-small",
        input: competitorCopy
      })
    ]);

    return {
      mainScore: this.cosineSimilarity(centroid, mainEmbedding.data[0].embedding) * 100,
      competitorScore: this.cosineSimilarity(centroid, competitorEmbedding.data[0].embedding) * 100
    };
  }

  private async performChunkedAnalysis(
    mainCopy: string,
    competitorCopy: string,
    centroid: number[]
  ) {
    const mainChunks = this.chunkText(mainCopy);
    const competitorChunks = this.chunkText(competitorCopy);

    const [mainResults, competitorResults] = await Promise.all([
      this.analyzeChunks(mainChunks, centroid),
      this.analyzeChunks(competitorChunks, centroid)
    ]);

    const mainScore = mainResults.reduce((sum, chunk) => sum + chunk.score, 0) / mainResults.length;
    const competitorScore = competitorResults.reduce((sum, chunk) => sum + chunk.score, 0) / competitorResults.length;

    return {
      mainScore,
      competitorScore,
      mainChunks: mainResults,
      competitorChunks: competitorResults
    };
  }

  private async analyzeChunks(
    chunks: Array<{text: string, startIndex: number, endIndex: number}>,
    centroid: number[]
  ): Promise<ChunkResult[]> {
    if (!this.openai) throw new Error('OpenAI not initialized');

    const embeddings = await Promise.all(
      chunks.map(chunk => 
        this.openai!.embeddings.create({
          model: "text-embedding-3-small",
          input: chunk.text
        })
      )
    );

    return chunks.map((chunk, index) => ({
      title: `Section ${index + 1}`,
      score: Math.round(this.cosineSimilarity(centroid, embeddings[index].data[0].embedding) * 1000) / 10,
      startIndex: chunk.startIndex,
      endIndex: chunk.endIndex,
      text: chunk.text
    }));
  }

  private chunkText(text: string, chunkSize: number = 500, overlap: number = 100) {
    const words = text.split(/\s+/);
    const chunks: Array<{text: string, startIndex: number, endIndex: number}> = [];
    
    let startIndex = 0;
    
    while (startIndex < words.length) {
      const endIndex = Math.min(startIndex + chunkSize, words.length);
      const chunkWords = words.slice(startIndex, endIndex);
      
      chunks.push({
        text: chunkWords.join(' '),
        startIndex,
        endIndex: endIndex - 1
      });
      
      if (endIndex >= words.length) break;
      startIndex = endIndex - overlap;
    }
    
    return chunks;
  }

  private cosineSimilarity(a: number[], b: number[]): number {
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

  private generateGapAnalysis(gap: number): string {
    return gap > 0 
      ? `Your copy is ${Math.abs(gap).toFixed(1)}% more aligned with target keywords than competitor content. This indicates strong keyword optimization and semantic relevance.`
      : `Your copy is ${Math.abs(gap).toFixed(1)}% less aligned with target keywords than competitor content. Consider improving keyword density and semantic relevance.`;
  }

  private async analyzeKeywordCoverage(
    keywords: Keyword[],
    mainText: string,
    competitorText: string,
    mainChunks: ChunkResult[],
    competitorChunks: ChunkResult[]
  ): Promise<KeywordCoverage[]> {
    const results: KeywordCoverage[] = [];
    
    for (const keyword of keywords) {
      const mainMentions = this.countMentions(mainText, keyword.text);
      const competitorMentions = this.countMentions(competitorText, keyword.text);
      
      results.push({
        keyword: keyword.text,
        weight: keyword.weight,
        directMentions: mainMentions,
        semanticCoverage: 75, // Simplified for example
        strongSections: [],
        weakSections: mainChunks.map(c => c.title),
        relatedTermsFound: [],
        competitorAdvantage: competitorMentions > mainMentions * 1.5,
        competitorMentions
      });
    }
    
    return results;
  }

  private countMentions(text: string, keyword: string): number {
    const escapedKeyword = keyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(`\\b${escapedKeyword}\\b`, 'gi');
    const matches = text.match(regex);
    return matches ? matches.length : 0;
  }

  private analyzeSectionImprovements(
    mainChunks: ChunkResult[],
    competitorChunks: ChunkResult[],
    keywords: Keyword[],
    keywordAnalysis: KeywordCoverage[]
  ): SectionImprovement[] {
    return mainChunks.map((chunk, index) => {
      const missingKeywords = keywordAnalysis
        .filter(ka => ka.weakSections.includes(chunk.title))
        .map(ka => ka.keyword)
        .slice(0, 3);

      const suggestedPhrases = missingKeywords.map(keyword => 
        `effective ${keyword} strategies`
      );

      return {
        section: chunk.title,
        currentScore: chunk.score,
        missingKeywords,
        suggestedPhrases,
        competitorStrengths: []
      };
    });
  }

  private buildEnhancementPrompt(originalText: string, improvements: SectionImprovement[]): string {
    return `You are a content optimization expert. Enhance the following text by naturally incorporating the suggested improvements while maintaining the original voice and structure.

Original Text:
${originalText}

Improvements Needed:
${improvements.map(imp => `
Section: ${imp.section}
Missing Keywords: ${imp.missingKeywords.join(', ')}
Suggested Phrases: ${imp.suggestedPhrases.join(', ')}
`).join('\n')}

Rules:
1. Add missing keywords naturally without keyword stuffing
2. Maintain the original tone and style
3. Keep the same overall structure
4. Make minimal changes - only add what's necessary
5. Ensure all additions flow naturally with existing content

Enhanced Text:`;
  }

  private handleOpenAIError(error: any): Error {
    if (error.status === 401) {
      if (error.message?.includes('insufficient permissions')) {
        return new Error("Your API key doesn't have the required permissions. Please ensure your OpenAI API key has 'model.request' scope and proper organization/project access.");
      }
      return new Error("Invalid OpenAI API key. Please check your key and try again.");
    } else if (error.code === 'rate_limit_exceeded' || error.status === 429) {
      return new Error("Rate limit exceeded. Please wait a moment and try again.");
    } else if (error.message?.includes('parse')) {
      return new Error("Invalid input data. Please check your inputs and try again.");
    }
    return new Error("Analysis failed. Please try again or contact support.");
  }

  // Cleanup method
  destroy() {
    this.openai = null;
  }
}

// Export singleton instance
export const openAIClient = new OpenAIClientService(); 