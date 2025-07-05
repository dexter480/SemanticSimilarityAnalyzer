import type { Express } from "express";
import { createServer, type Server } from "http";
import { analysisRequestSchema, type AnalysisResult, type Keyword, type KeywordCoverage, type SectionImprovement, type ChunkResult } from "@shared/schema";
import OpenAI from "openai";

// Helper functions for enhanced analysis
function countMentions(text: string, keyword: string): number {
  // Escape special regex characters in keyword
  const escapedKeyword = keyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const regex = new RegExp(`\\b${escapedKeyword}\\b`, 'gi');
  const matches = text.match(regex);
  
  // If no exact word matches, try partial matches for compound keywords
  if (!matches || matches.length === 0) {
    const partialRegex = new RegExp(escapedKeyword, 'gi');
    const partialMatches = text.match(partialRegex);
    return partialMatches ? partialMatches.length : 0;
  }
  
  return matches.length;
}

function findRelatedTerms(keyword: string, text: string): string[] {
  // Simple related terms finder - you can enhance this
  const relatedPatterns: { [key: string]: string[] } = {
    'seo': ['search engine optimization', 'search ranking', 'organic traffic', 'serp'],
    'content marketing': ['content strategy', 'editorial calendar', 'blog posts', 'content creation'],
    'digital marketing': ['online marketing', 'digital strategy', 'digital presence'],
    // Add more patterns as needed
  };
  
  const related = relatedPatterns[keyword.toLowerCase()] || [];
  return related.filter(term => 
    text.toLowerCase().includes(term.toLowerCase())
  );
}

async function calculateKeywordSimilarity(
  openai: OpenAI,
  keyword: string,
  text: string
): Promise<number> {
  const [keywordEmbed, textEmbed] = await Promise.all([
    openai.embeddings.create({
      model: "text-embedding-3-small",
      input: keyword
    }),
    openai.embeddings.create({
      model: "text-embedding-3-small",
      input: text
    })
  ]);
  
  return cosineSimilarity(
    keywordEmbed.data[0].embedding,
    textEmbed.data[0].embedding
  );
}

async function analyzeKeywordCoverage(
  openai: OpenAI,
  keywords: Keyword[],
  mainText: string,
  competitorText: string,
  mainChunks: ChunkResult[],
  competitorChunks: ChunkResult[]
): Promise<KeywordCoverage[]> {
  const results: KeywordCoverage[] = [];
  
  for (const keyword of keywords) {
    // Count direct mentions
    const mainMentions = countMentions(mainText, keyword.text);
    const competitorMentions = countMentions(competitorText, keyword.text);
    
    // Calculate semantic coverage per chunk
    const chunkScores = await Promise.all(
      mainChunks.map(async (chunk) => ({
        title: chunk.title,
        score: await calculateKeywordSimilarity(openai, keyword.text, chunk.text)
      }))
    );
    
    // Calculate average semantic coverage
    const avgScore = chunkScores.length > 0 
      ? chunkScores.reduce((a, b) => a + b.score, 0) / chunkScores.length
      : 0;
    
    // Identify strong/weak sections
    const strongSections = chunkScores
      .filter(c => c.score > Math.max(avgScore * 1.2, 0.3))
      .map(c => c.title);
    const weakSections = chunkScores
      .filter(c => c.score < Math.max(avgScore * 0.8, 0.2))
      .map(c => c.title);
    
    // If no weak sections found but keyword has low coverage, mark all sections as weak
    if (weakSections.length === 0 && (mainMentions === 0 || avgScore < 0.3)) {
      weakSections.push(...chunkScores.map(c => c.title));
    }
    
    // Find related terms
    const relatedTerms = findRelatedTerms(keyword.text, mainText);
    
    results.push({
      keyword: keyword.text,
      weight: keyword.weight,
      directMentions: mainMentions,
      semanticCoverage: Math.round(avgScore * 100),
      strongSections,
      weakSections,
      relatedTermsFound: relatedTerms,
      competitorAdvantage: competitorMentions > mainMentions * 1.5,
      competitorMentions
    });
  }
  
  return results;
}

function analyzeSectionImprovements(
  mainChunks: ChunkResult[],
  competitorChunks: ChunkResult[],
  keywords: Keyword[],
  keywordAnalysis: KeywordCoverage[]
): SectionImprovement[] {
  return mainChunks.map((chunk, index) => {
    // Find keywords that have low mentions or are in weak sections for this chunk
    const missingKeywords = keywordAnalysis
      .filter(ka => {
        // Include if: in weak sections OR has very few direct mentions OR low semantic coverage
        return ka.weakSections.includes(chunk.title) || 
               ka.directMentions === 0 || 
               ka.semanticCoverage < 50;
      })
      .map(ka => ka.keyword);
    
    // If no missing keywords found, include all keywords for improvement
    const finalMissingKeywords = missingKeywords.length > 0 ? missingKeywords : 
      keywordAnalysis.slice(0, 3).map(ka => ka.keyword);
    
    // Generate suggested phrases based on missing keywords
    const suggestedPhrases = finalMissingKeywords.map(keyword => {
      const templates = [
        `effective ${keyword} strategies`,
        `optimize for ${keyword}`,
        `${keyword} best practices`,
        `improving ${keyword} performance`,
        `${keyword} solutions`,
        `advanced ${keyword} techniques`
      ];
      return templates[Math.floor(Math.random() * templates.length)];
    });
    
    // Analyze competitor strengths in similar section
    const competitorChunk = competitorChunks[index];
    const competitorStrengths = [];
    
    if (competitorChunk && competitorChunk.score > chunk.score) {
      competitorStrengths.push("Higher keyword density");
      competitorStrengths.push("Better semantic alignment");
    }
    
    return {
      section: chunk.title,
      currentScore: Math.round(chunk.score * 10) / 10,
      missingKeywords: finalMissingKeywords,
      suggestedPhrases,
      competitorStrengths
    };
  });
}

export async function registerRoutes(app: Express): Promise<Server> {
  // Semantic similarity analysis endpoint
  app.post("/api/analyze", async (req, res) => {
    try {
      const validatedData = analysisRequestSchema.parse(req.body);
      const startTime = Date.now();

      // Initialize OpenAI with user's API key
      const openai = new OpenAI({
        apiKey: validatedData.apiKey
      });

      // Generate embeddings for keywords
      const keywordEmbeddings = await Promise.all(
        validatedData.keywords.map(async (keyword) => {
          const response = await openai.embeddings.create({
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

      // Calculate weighted centroid
      const dimensions = keywordEmbeddings[0].embedding.length;
      const weightedCentroid = new Array(dimensions).fill(0);
      let totalWeight = 0;

      keywordEmbeddings.forEach(({ embedding, weight }) => {
        totalWeight += weight;
        embedding.forEach((value, i) => {
          weightedCentroid[i] += value * weight;
        });
      });

      // Normalize centroid
      const magnitude = Math.sqrt(weightedCentroid.reduce((sum, val) => sum + val * val, 0));
      const normalizedCentroid = weightedCentroid.map(val => val / magnitude);

      let mainCopyScore: number;
      let competitorCopyScore: number;
      let mainCopyChunks: any[] | undefined;
      let competitorCopyChunks: any[] | undefined;

      if (validatedData.analysisMode === 'chunked') {
        // Chunked analysis
        console.log("Running chunked analysis mode");
        const mainChunks = chunkText(validatedData.mainCopy);
        const competitorChunks = chunkText(validatedData.competitorCopy);
        console.log(`Created ${mainChunks.length} main chunks and ${competitorChunks.length} competitor chunks`);

        const [mainChunkResults, competitorChunkResults] = await Promise.all([
          analyzeChunks(openai, mainChunks, normalizedCentroid),
          analyzeChunks(openai, competitorChunks, normalizedCentroid)
        ]);

        mainCopyChunks = mainChunkResults;
        competitorCopyChunks = competitorChunkResults;
        mainCopyScore = mainChunkResults.reduce((sum, chunk) => sum + chunk.score, 0) / mainChunkResults.length;
        competitorCopyScore = competitorChunkResults.reduce((sum, chunk) => sum + chunk.score, 0) / competitorChunkResults.length;
      } else {
        // Full document analysis
        const [mainEmbedding, competitorEmbedding] = await Promise.all([
          openai.embeddings.create({
            model: "text-embedding-3-small",
            input: validatedData.mainCopy
          }),
          openai.embeddings.create({
            model: "text-embedding-3-small",
            input: validatedData.competitorCopy
          })
        ]);

        mainCopyScore = cosineSimilarity(normalizedCentroid, mainEmbedding.data[0].embedding) * 100;
        competitorCopyScore = cosineSimilarity(normalizedCentroid, competitorEmbedding.data[0].embedding) * 100;
      }

      const gap = mainCopyScore - competitorCopyScore;
      const gapAnalysis = gap > 0 
        ? `Your copy is ${Math.abs(gap).toFixed(1)}% more aligned with target keywords than competitor content. This indicates strong keyword optimization and semantic relevance.`
        : `Your copy is ${Math.abs(gap).toFixed(1)}% less aligned with target keywords than competitor content. Consider improving keyword density and semantic relevance.`;

      // Add keyword analysis for both modes
      let keywordAnalysis: KeywordCoverage[] = [];
      let sectionImprovements: SectionImprovement[] = [];
      
      if (validatedData.analysisMode === 'chunked' && mainCopyChunks && competitorCopyChunks) {
        // Chunked mode analysis
        keywordAnalysis = await analyzeKeywordCoverage(
          openai,
          validatedData.keywords,
          validatedData.mainCopy,
          validatedData.competitorCopy,
          mainCopyChunks,
          competitorCopyChunks
        );

        sectionImprovements = analyzeSectionImprovements(
          mainCopyChunks,
          competitorCopyChunks,
          validatedData.keywords,
          keywordAnalysis
        );
      } else {
        // Full mode analysis - create synthetic chunks for analysis
        const mainFullChunk: ChunkResult = {
          title: "Full Document",
          score: mainCopyScore,
          startIndex: 0,
          endIndex: validatedData.mainCopy.split(/\s+/).length - 1,
          text: validatedData.mainCopy
        };
        
        const competitorFullChunk: ChunkResult = {
          title: "Full Document",
          score: competitorCopyScore,
          startIndex: 0,
          endIndex: validatedData.competitorCopy.split(/\s+/).length - 1,
          text: validatedData.competitorCopy
        };

        keywordAnalysis = await analyzeKeywordCoverage(
          openai,
          validatedData.keywords,
          validatedData.mainCopy,
          validatedData.competitorCopy,
          [mainFullChunk],
          [competitorFullChunk]
        );

        sectionImprovements = analyzeSectionImprovements(
          [mainFullChunk],
          [competitorFullChunk],
          validatedData.keywords,
          keywordAnalysis
        );
      }

      const result: AnalysisResult = {
        mainCopyScore: Math.round(mainCopyScore * 10) / 10,
        competitorCopyScore: Math.round(competitorCopyScore * 10) / 10,
        gapAnalysis,
        mainCopyChunks,
        competitorCopyChunks,
        keywordWeights: validatedData.keywords,
        processingTime: Date.now() - startTime,
        keywordAnalysis,
        sectionImprovements
      };

      res.json(result);
    } catch (error: any) {
      console.error("Analysis error:", error);
      
      if (error.status === 401) {
        if (error.message?.includes('insufficient permissions')) {
          res.status(401).json({ 
            message: "Your API key doesn't have the required permissions. Please ensure your OpenAI API key has 'model.request' scope and proper organization/project access. You may need to create a new API key with full permissions."
          });
        } else {
          res.status(401).json({ message: "Invalid OpenAI API key. Please check your key and try again." });
        }
      } else if (error.code === 'rate_limit_exceeded' || error.status === 429) {
        res.status(429).json({ message: "Rate limit exceeded. Please wait a moment and try again." });
      } else if (error.message?.includes('parse')) {
        res.status(400).json({ message: "Invalid input data. Please check your inputs and try again." });
      } else {
        res.status(500).json({ message: "Analysis failed. Please try again or contact support." });
      }
    }
  });

  // AI Enhancement endpoint
  app.post("/api/enhance", async (req, res) => {
    try {
      const { apiKey, originalText, improvements } = req.body;
      
      const openai = new OpenAI({ apiKey });
      
      // Build enhancement prompt
      const prompt = `You are a content optimization expert. Enhance the following text by naturally incorporating the suggested improvements while maintaining the original voice and structure.

Original Text:
${originalText}

Improvements Needed:
${improvements.map((imp: SectionImprovement) => `
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

      const completion = await openai.chat.completions.create({
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

      const enhancedContent = completion.choices[0].message.content || originalText;
      
      res.json({ enhancedContent });
    } catch (error: any) {
      console.error("Enhancement error:", error);
      res.status(500).json({ 
        message: "Failed to enhance content. Please try again." 
      });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}

interface TextSection {
  title: string;
  content: string;
  startIndex: number;
  endIndex: number;
  level: number;
  type: 'heading' | 'paragraph' | 'chunk';
}

function detectSections(text: string): TextSection[] {
  // Strategy 1: Try HTML/Markdown headings first
  const htmlSections = detectHtmlSections(text);
  if (htmlSections.length > 1) {
    return htmlSections;
  }
  
  const markdownSections = detectMarkdownSections(text);
  if (markdownSections.length > 1) {
    return markdownSections;
  }
  
  // Strategy 2: Try paragraph-based splitting
  const paragraphSections = detectParagraphSections(text);
  if (paragraphSections.length > 1) {
    return paragraphSections;
  }
  
  // Strategy 3: Fallback to single section
  return [{
    title: "Full Content",
    content: text,
    startIndex: 0,
    endIndex: text.split(/\s+/).length - 1,
    level: 1,
    type: 'chunk'
  }];
}

function detectHtmlSections(text: string): TextSection[] {
  const sections: TextSection[] = [];
  const headingRegex = /<h([1-6])[^>]*>(.*?)<\/h\1>/gi;
  const matches = Array.from(text.matchAll(headingRegex));
  
  if (matches.length === 0) return [];
  
  let currentIndex = 0;
  
  matches.forEach((match, index) => {
    const level = parseInt(match[1]);
    const title = match[2].replace(/<[^>]*>/g, '').trim();
    
    // Content is from current position to start of next heading
    const nextMatch = matches[index + 1];
    const contentEnd = nextMatch ? nextMatch.index! : text.length;
    const content = text.substring(currentIndex, contentEnd).trim();
    
    if (content.length > 0) {
      sections.push({
        title: title || `Section ${index + 1}`,
        content,
        startIndex: currentIndex,
        endIndex: contentEnd,
        level,
        type: 'heading'
      });
    }
    
    currentIndex = contentEnd;
  });
  
  return sections;
}

function detectMarkdownSections(text: string): TextSection[] {
  const sections: TextSection[] = [];
  const lines = text.split('\n');
  const headingRegex = /^(#{1,6})\s+(.+)$/;
  
  let currentSection: TextSection | null = null;
  let currentContent: string[] = [];
  let lineIndex = 0;
  
  for (const line of lines) {
    const match = line.match(headingRegex);
    
    if (match) {
      // Save previous section if exists
      if (currentSection) {
        currentSection.content = currentContent.join('\n').trim();
        if (currentSection.content.length > 0) {
          sections.push(currentSection);
        }
      }
      
      // Start new section
      const level = match[1].length;
      const title = match[2].trim();
      
      currentSection = {
        title,
        content: '',
        startIndex: lineIndex,
        endIndex: lineIndex,
        level,
        type: 'heading'
      };
      currentContent = [];
    } else {
      currentContent.push(line);
    }
    
    lineIndex++;
  }
  
  // Add final section
  if (currentSection) {
    currentSection.content = currentContent.join('\n').trim();
    if (currentSection.content.length > 0) {
      sections.push(currentSection);
    }
  }
  
  return sections;
}

function detectParagraphSections(text: string): TextSection[] {
  const paragraphs = text.split(/\n\s*\n/).filter(p => p.trim().length > 0);
  
  if (paragraphs.length < 2) return [];
  
  return paragraphs.map((paragraph, index) => ({
    title: `Paragraph ${index + 1}`,
    content: paragraph.trim(),
    startIndex: index * 100,
    endIndex: (index + 1) * 100,
    level: 1,
    type: 'paragraph'
  }));
}

function chunkText(text: string, chunkSize: number = 500, overlap: number = 100): Array<{text: string, startIndex: number, endIndex: number}> {
  // First try intelligent sectioning
  const sections = detectSections(text);
  
  if (sections.length > 1 && sections[0].type !== 'chunk') {
    return sections.map(section => ({
      text: section.content,
      startIndex: section.startIndex,
      endIndex: section.endIndex
    }));
  }
  
  // Fall back to word-based chunking
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

async function analyzeChunks(
  openai: OpenAI, 
  chunks: Array<{text: string, startIndex: number, endIndex: number}>, 
  centroid: number[]
) {
  const embeddings = await Promise.all(
    chunks.map(chunk => 
      openai.embeddings.create({
        model: "text-embedding-3-small",
        input: chunk.text
      })
    )
  );

  return chunks.map((chunk, index) => ({
    title: `Chunk ${index + 1}`,
    score: Math.round(cosineSimilarity(centroid, embeddings[index].data[0].embedding) * 1000) / 10,
    startIndex: chunk.startIndex,
    endIndex: chunk.endIndex,
    text: chunk.text
  }));
}

function cosineSimilarity(a: number[], b: number[]): number {
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
