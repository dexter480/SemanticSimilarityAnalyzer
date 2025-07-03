import type { Express } from "express";
import { createServer, type Server } from "http";
import { analysisRequestSchema, type AnalysisResult } from "@shared/schema";
import OpenAI from "openai";

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

      const result: AnalysisResult = {
        mainCopyScore: Math.round(mainCopyScore * 10) / 10,
        competitorCopyScore: Math.round(competitorCopyScore * 10) / 10,
        gapAnalysis,
        mainCopyChunks,
        competitorCopyChunks,
        keywordWeights: validatedData.keywords,
        processingTime: Date.now() - startTime
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

  const httpServer = createServer(app);
  return httpServer;
}

function chunkText(text: string, chunkSize: number = 500, overlap: number = 100): Array<{text: string, startIndex: number, endIndex: number}> {
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
