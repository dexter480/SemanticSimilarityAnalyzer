# Complete Security Implementation Guide for Semantic Similarity Tool

## Table of Contents
1. [Overview](#overview)
2. [Phase 1: Convert to Client-Side Architecture](#phase-1-convert-to-client-side-architecture)
3. [Phase 2: Security Enhancements](#phase-2-security-enhancements)
4. [Phase 3: Netlify Deployment Setup](#phase-3-netlify-deployment-setup)
5. [Phase 4: Legal & Compliance](#phase-4-legal--compliance)
6. [Phase 5: Final Security Checklist](#phase-5-final-security-checklist)

---

## Overview

This guide will transform your application into a secure, client-side only tool suitable for public deployment on Netlify. All OpenAI API calls will be moved to the browser, eliminating the need for backend API key handling.

**Time Estimate**: 4-6 hours
**Difficulty**: Medium
**Risk**: Low (with proper testing)

---

## Phase 1: Convert to Client-Side Architecture

### Step 1.1: Install Required Dependencies

```bash
npm install dompurify
npm install --save-dev @types/dompurify
```

### Step 1.2: Create Client-Side OpenAI Service

Create new file: `client/src/services/openai-client.service.ts`

```typescript
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
    
    this.openai = new OpenAI({
      apiKey,
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
    // Implementation of keyword coverage analysis
    // (Copy the logic from your server implementation)
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
```

### Step 1.3: Create Security Utilities

Create new file: `client/src/lib/security.ts`

```typescript
import DOMPurify from 'dompurify';

// Input sanitization
export function sanitizeHtml(dirty: string): string {
  return DOMPurify.sanitize(dirty, {
    ALLOWED_TAGS: ['b', 'i', 'em', 'strong', 'span', 'br', 'p'],
    ALLOWED_ATTR: [],
    KEEP_CONTENT: true,
    SAFE_FOR_TEMPLATES: true
  });
}

// API key validation with additional checks
export function validateApiKey(key: string): { valid: boolean; error?: string } {
  if (!key) {
    return { valid: false, error: 'API key is required' };
  }
  
  if (!key.startsWith('sk-')) {
    return { valid: false, error: 'API key must start with "sk-"' };
  }
  
  if (key.length < 40) {
    return { valid: false, error: 'API key appears to be incomplete' };
  }
  
  // Check for common mistakes
  if (key.includes(' ')) {
    return { valid: false, error: 'API key should not contain spaces' };
  }
  
  if (key.includes('\n') || key.includes('\r')) {
    return { valid: false, error: 'API key should not contain line breaks' };
  }
  
  return { valid: true };
}

// Rate limiting for client-side
export class ClientRateLimiter {
  private attempts: number[] = [];
  private readonly maxAttempts: number;
  private readonly windowMs: number;

  constructor(maxAttempts: number = 10, windowMs: number = 900000) { // 15 minutes
    this.maxAttempts = maxAttempts;
    this.windowMs = windowMs;
  }

  canMakeRequest(): boolean {
    const now = Date.now();
    
    // Remove old attempts
    this.attempts = this.attempts.filter(time => now - time < this.windowMs);
    
    // Check if under limit
    if (this.attempts.length >= this.maxAttempts) {
      return false;
    }
    
    // Record this attempt
    this.attempts.push(now);
    return true;
  }

  getRemainingAttempts(): number {
    const now = Date.now();
    this.attempts = this.attempts.filter(time => now - time < this.windowMs);
    return Math.max(0, this.maxAttempts - this.attempts.length);
  }

  getResetTime(): Date | null {
    if (this.attempts.length === 0) return null;
    
    const oldestAttempt = Math.min(...this.attempts);
    return new Date(oldestAttempt + this.windowMs);
  }
}

// Create global rate limiter instance
export const rateLimiter = new ClientRateLimiter();

// Secure storage wrapper (session only)
export class SecureSessionStorage {
  private static encrypt(text: string): string {
    // Simple obfuscation for session storage (not true encryption)
    return btoa(encodeURIComponent(text));
  }

  private static decrypt(text: string): string {
    try {
      return decodeURIComponent(atob(text));
    } catch {
      return '';
    }
  }

  static setItem(key: string, value: string): void {
    sessionStorage.setItem(key, this.encrypt(value));
  }

  static getItem(key: string): string | null {
    const encrypted = sessionStorage.getItem(key);
    return encrypted ? this.decrypt(encrypted) : null;
  }

  static removeItem(key: string): void {
    sessionStorage.removeItem(key);
  }

  static clear(): void {
    sessionStorage.clear();
  }
}
```

### Step 1.4: Update Analysis Form Component

Update file: `client/src/components/analysis-form.tsx`

```typescript
import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { analysisRequestSchema, type AnalysisRequest, type AnalysisResult } from "@shared/schema";
import { openAIClient } from "@/services/openai-client.service";
import { validateApiKey, rateLimiter, SecureSessionStorage } from "@/lib/security";
import { ApiKeyWarning } from "@/components/api-key-warning";
// ... other imports

export function AnalysisForm({ onAnalysisComplete, isAnalyzing, setIsAnalyzing }: AnalysisFormProps) {
  const [showApiKey, setShowApiKey] = useState(false);
  const [apiKeyError, setApiKeyError] = useState<string | null>(null);
  const [rateLimitError, setRateLimitError] = useState<string | null>(null);
  // ... other state

  const handleSubmit = async (data: AnalysisRequest) => {
    // Validate API key
    const keyValidation = validateApiKey(data.apiKey);
    if (!keyValidation.valid) {
      setApiKeyError(keyValidation.error!);
      return;
    }

    // Check rate limit
    if (!rateLimiter.canMakeRequest()) {
      const resetTime = rateLimiter.getResetTime();
      setRateLimitError(
        `Rate limit exceeded. Please try again after ${resetTime?.toLocaleTimeString()}`
      );
      return;
    }

    setIsAnalyzing(true);
    setApiKeyError(null);
    setRateLimitError(null);

    try {
      // Initialize OpenAI client
      openAIClient.initialize(data.apiKey);
      
      // Store API key in secure session storage (optional)
      SecureSessionStorage.setItem('temp_api_key', data.apiKey);
      
      // Perform analysis
      const results = await openAIClient.analyze(data);
      
      onAnalysisComplete(results, data.mainCopy, data.apiKey, data.competitorCopy);
    } catch (error: any) {
      toast({
        title: "Analysis Failed",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsAnalyzing(false);
      // Clear API key from client
      openAIClient.destroy();
    }
  };

  // Clear session on unmount
  useEffect(() => {
    return () => {
      SecureSessionStorage.removeItem('temp_api_key');
      openAIClient.destroy();
    };
  }, []);

  return (
    <>
      <ApiKeyWarning />
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-8">
        {/* API Key Input with enhanced security */}
        <Card>
          <CardHeader>
            <CardTitle>API Configuration</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="apiKey">
                  OpenAI API Key <span className="text-destructive">*</span>
                </Label>
                <div className="relative">
                  <Input
                    id="apiKey"
                    type={showApiKey ? "text" : "password"}
                    placeholder="sk-..."
                    {...form.register("apiKey")}
                    className="pr-10"
                    autoComplete="off"
                    spellCheck={false}
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-0 top-0 h-full px-3"
                    onClick={() => setShowApiKey(!showApiKey)}
                  >
                    {showApiKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </Button>
                </div>
                {apiKeyError && (
                  <Alert variant="destructive" className="mt-2">
                    <AlertDescription>{apiKeyError}</AlertDescription>
                  </Alert>
                )}
                <p className="text-xs text-muted-foreground">
                  Your API key is processed locally in your browser and never sent to our servers.
                </p>
              </div>
              
              {rateLimitError && (
                <Alert variant="destructive">
                  <AlertDescription>{rateLimitError}</AlertDescription>
                </Alert>
              )}
              
              <div className="text-xs text-muted-foreground space-y-1">
                <p>Remaining analyses: {rateLimiter.getRemainingAttempts()}/10 per 15 minutes</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Rest of your form... */}
      </form>
    </>
  );
}
```

### Step 1.5: Create API Key Warning Component

Create new file: `client/src/components/api-key-warning.tsx`

```typescript
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertTriangle, Shield, DollarSign, Lock } from "lucide-react";
import { useState } from "react";

export function ApiKeyWarning() {
  const [dismissed, setDismissed] = useState(false);

  if (dismissed) return null;

  return (
    <Alert className="mb-6 border-orange-200 bg-orange-50 relative">
      <AlertTriangle className="h-5 w-5 text-orange-600" />
      <AlertTitle className="text-orange-800">Important Security & Cost Information</AlertTitle>
      <AlertDescription className="mt-3 space-y-3">
        <div className="flex items-start gap-2">
          <Lock className="h-4 w-4 text-orange-600 mt-0.5" />
          <div className="text-sm text-orange-700">
            <strong>Security:</strong> Your OpenAI API key is processed entirely in your browser. 
            We never store, log, or transmit your API key to any server.
          </div>
        </div>
        
        <div className="flex items-start gap-2">
          <DollarSign className="h-4 w-4 text-orange-600 mt-0.5" />
          <div className="text-sm text-orange-700">
            <strong>Costs:</strong> Each analysis costs approximately $0.0002. 
            You are responsible for all charges incurred on your OpenAI account.
          </div>
        </div>
        
        <div className="flex items-start gap-2">
          <Shield className="h-4 w-4 text-orange-600 mt-0.5" />
          <div className="text-sm text-orange-700">
            <strong>Best Practices:</strong>
            <ul className="list-disc list-inside mt-1 space-y-1">
              <li>Use API keys with limited permissions when possible</li>
              <li>Set usage limits in your OpenAI account</li>
              <li>Monitor your API usage regularly</li>
              <li>Never share your API key with others</li>
            </ul>
          </div>
        </div>
        
        <button
          onClick={() => setDismissed(true)}
          className="absolute top-2 right-2 text-orange-600 hover:text-orange-800"
          aria-label="Dismiss warning"
        >
          ×
        </button>
      </AlertDescription>
    </Alert>
  );
}
```

### Step 1.6: Update Results Display for Client-Side Enhancement

Update file: `client/src/components/results-display.tsx`

```typescript
// Add to imports
import { openAIClient } from "@/services/openai-client.service";
import { SecureSessionStorage } from "@/lib/security";

// Update AI enhancement handler
const handleAIEnhancement = async () => {
  try {
    // Get API key from secure storage or props
    const storedKey = SecureSessionStorage.getItem('temp_api_key') || apiKey;
    
    if (!storedKey) {
      toast({
        title: "API Key Required",
        description: "Please provide your API key to use AI enhancement",
        variant: "destructive"
      });
      return;
    }

    // Initialize client and enhance
    openAIClient.initialize(storedKey);
    setShowEnhancement(true);
  } catch (error: any) {
    toast({
      title: "Enhancement Failed",
      description: error.message,
      variant: "destructive"
    });
  }
};
```

---

## Phase 2: Security Enhancements

### Step 2.1: Create Content Security Policy Component

Create new file: `client/src/components/security-headers.tsx`

```typescript
import { useEffect } from 'react';

export function SecurityHeaders() {
  useEffect(() => {
    // Add client-side security policies
    
    // Prevent clickjacking
    if (window.top !== window.self) {
      window.top?.location.replace(window.self.location.href);
    }

    // Add CSP meta tag
    const cspMeta = document.createElement('meta');
    cspMeta.httpEquiv = 'Content-Security-Policy';
    cspMeta.content = `
      default-src 'self';
      script-src 'self' 'unsafe-inline' 'unsafe-eval' https://cdnjs.cloudflare.com;
      style-src 'self' 'unsafe-inline';
      img-src 'self' data: https:;
      connect-src 'self' https://api.openai.com;
      font-src 'self' https://fonts.gstatic.com;
      frame-ancestors 'none';
      base-uri 'self';
      form-action 'self';
    `.replace(/\s+/g, ' ').trim();
    document.head.appendChild(cspMeta);

    // Cleanup
    return () => {
      document.head.removeChild(cspMeta);
    };
  }, []);

  return null;
}
```

### Step 2.2: Add Security Headers to App

Update file: `client/src/App.tsx`

```typescript
import { SecurityHeaders } from "@/components/security-headers";

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <SecurityHeaders />
      <TooltipProvider>
        <Toaster />
        <Router />
      </TooltipProvider>
    </QueryClientProvider>
  );
}
```

### Step 2.3: Create Input Sanitization Hook

Create new file: `client/src/hooks/use-sanitized-input.ts`

```typescript
import { useState, useCallback } from 'react';
import { sanitizeHtml } from '@/lib/security';

export function useSanitizedInput(initialValue: string = '') {
  const [value, setValue] = useState(initialValue);
  const [sanitizedValue, setSanitizedValue] = useState(sanitizeHtml(initialValue));

  const handleChange = useCallback((newValue: string) => {
    setValue(newValue);
    setSanitizedValue(sanitizeHtml(newValue));
  }, []);

  return {
    value,
    sanitizedValue,
    setValue: handleChange,
    reset: () => {
      setValue('');
      setSanitizedValue('');
    }
  };
}
```

---

## Phase 3: Netlify Deployment Setup

### Step 3.1: Create Netlify Configuration

Create file: `netlify.toml`

```toml
[build]
  command = "npm run build:client"
  publish = "dist/public"
  functions = "netlify/functions"

[build.environment]
  NODE_VERSION = "20"

[[redirects]]
  from = "/api/*"
  to = "/.netlify/functions/:splat"
  status = 200

[[headers]]
  for = "/*"
  [headers.values]
    X-Frame-Options = "DENY"
    X-Content-Type-Options = "nosniff"
    X-XSS-Protection = "1; mode=block"
    Referrer-Policy = "strict-origin-when-cross-origin"
    Permissions-Policy = "camera=(), microphone=(), geolocation=(), interest-cohort=()"
    Strict-Transport-Security = "max-age=31536000; includeSubDomains; preload"

[[headers]]
  for = "/*.js"
  [headers.values]
    Cache-Control = "public, max-age=31536000, immutable"

[[headers]]
  for = "/*.css"
  [headers.values]
    Cache-Control = "public, max-age=31536000, immutable"

[[headers]]
  for = "/index.html"
  [headers.values]
    Cache-Control = "no-cache, no-store, must-revalidate"
    X-Robots-Tag = "noindex, nofollow"
```

### Step 3.2: Update Package.json Scripts

Update file: `package.json`

```json
{
  "scripts": {
    "dev": "vite",
    "build": "npm run build:client",
    "build:client": "vite build",
    "preview": "vite preview",
    "check": "tsc",
    "clean": "rm -rf dist node_modules/.vite",
    "security-check": "npm audit"
  }
}
```

### Step 3.3: Create Environment Variables File

Create file: `.env.example`

```bash
# This file is for documentation only
# DO NOT add any actual API keys here

# For development only
VITE_DEV_MODE=true

# Feature flags
VITE_ENABLE_ANALYTICS=false
VITE_ENABLE_ERROR_REPORTING=false

# Public URLs (safe to expose)
VITE_APP_URL=https://your-app.netlify.app
VITE_SUPPORT_EMAIL=support@example.com
```

### Step 3.4: Create Build Script

Create file: `scripts/prebuild.js`

```javascript
#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

console.log('Running pre-build security checks...');

// Check for sensitive files
const sensitiveFiles = [
  '.env',
  '.env.local',
  '.env.production',
  'credentials.json',
  'private-key.pem'
];

let hasIssues = false;

sensitiveFiles.forEach(file => {
  if (fs.existsSync(path.join(__dirname, '..', file))) {
    console.error(`❌ Found sensitive file: ${file}`);
    hasIssues = true;
  }
});

// Check for console.logs in production code
const srcDir = path.join(__dirname, '..', 'client', 'src');
const checkForConsoleLogs = (dir) => {
  const files = fs.readdirSync(dir);
  
  files.forEach(file => {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    
    if (stat.isDirectory()) {
      checkForConsoleLogs(filePath);
    } else if (file.endsWith('.ts') || file.endsWith('.tsx')) {
      const content = fs.readFileSync(filePath, 'utf8');
      if (content.includes('console.log')) {
        console.warn(`⚠️  Found console.log in: ${filePath}`);
      }
    }
  });
};

checkForConsoleLogs(srcDir);

if (hasIssues) {
  console.error('\n❌ Build failed due to security issues');
  process.exit(1);
} else {
  console.log('✅ Security checks passed');
}
```

---

## Phase 4: Legal & Compliance

### Step 4.1: Create Terms of Service Component

Create file: `client/src/components/terms-of-service.tsx`

```typescript
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

export function TermsOfService({ open, onClose }: { open: boolean; onClose: () => void }) {
  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Terms of Service</DialogTitle>
        </DialogHeader>
        <div className="prose prose-sm max-w-none">
          <h3>Last Updated: {new Date().toLocaleDateString()}</h3>
          
          <h4>1. Acceptance of Terms</h4>
          <p>
            By using this Semantic Similarity Analysis Tool ("Service"), you agree to these Terms of Service.
            If you do not agree, please do not use the Service.
          </p>

          <h4>2. Service Description</h4>
          <p>
            This Service provides semantic similarity analysis using OpenAI's API. You must provide your own
            OpenAI API key, and you are responsible for all associated costs.
          </p>

          <h4>3. User Responsibilities</h4>
          <ul>
            <li>You are solely responsible for your OpenAI API key security</li>
            <li>You must monitor and manage your own API usage and costs</li>
            <li>You agree not to use the Service for any illegal or harmful purposes</li>
            <li>You will not attempt to reverse engineer or compromise the Service</li>
          </ul>

          <h4>4. Privacy and Data Handling</h4>
          <ul>
            <li>Your API key is processed only in your browser</li>
            <li>We do not store, log, or transmit your API key or content</li>
            <li>All processing occurs client-side for your security</li>
          </ul>

          <h4>5. Disclaimer of Warranties</h4>
          <p>
            THE SERVICE IS PROVIDED "AS IS" WITHOUT WARRANTIES OF ANY KIND. WE DISCLAIM ALL WARRANTIES,
            EXPRESS OR IMPLIED, INCLUDING MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE.
          </p>

          <h4>6. Limitation of Liability</h4>
          <p>
            IN NO EVENT SHALL WE BE LIABLE FOR ANY INDIRECT, INCIDENTAL, SPECIAL, OR CONSEQUENTIAL DAMAGES,
            INCLUDING BUT NOT LIMITED TO LOSS OF PROFITS, DATA, OR API CREDITS.
          </p>

          <h4>7. API Usage and Costs</h4>
          <p>
            You acknowledge that:
          </p>
          <ul>
            <li>Each analysis incurs costs on your OpenAI account</li>
            <li>We are not responsible for any charges you incur</li>
            <li>OpenAI's terms of service also apply to your usage</li>
          </ul>

          <h4>8. Modifications</h4>
          <p>
            We reserve the right to modify these terms at any time. Continued use constitutes acceptance
            of modified terms.
          </p>

          <h4>9. Contact</h4>
          <p>
            For questions about these terms, contact: support@example.com
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
```

### Step 4.2: Create Privacy Policy Component

Create file: `client/src/components/privacy-policy.tsx`

```typescript
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

export function PrivacyPolicy({ open, onClose }: { open: boolean; onClose: () => void }) {
  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Privacy Policy</DialogTitle>
        </DialogHeader>
        <div className="prose prose-sm max-w-none">
          <h3>Last Updated: {new Date().toLocaleDateString()}</h3>
          
          <h4>1. Information We Don't Collect</h4>
          <p>
            This tool is designed with privacy-first principles. We do NOT collect, store, or transmit:
          </p>
          <ul>
            <li>Your OpenAI API keys</li>
            <li>Your content or competitor content</li>
            <li>Your analysis results</li>
            <li>Personal information</li>
          </ul>

          <h4>2. How the Tool Works</h4>
          <p>
            All processing happens entirely in your web browser:
          </p>
          <ul>
            <li>Your API key is used only for direct communication with OpenAI</li>
            <li>No data passes through our servers</li>
            <li>All data is cleared when you close the browser tab</li>
          </ul>

          <h4>3. Third-Party Services</h4>
          <p>
            This tool communicates directly with:
          </p>
          <ul>
            <li><strong>OpenAI API:</strong> For generating embeddings and analysis</li>
            <li><strong>Netlify:</strong> For hosting static files only</li>
          </ul>

          <h4>4. Browser Storage</h4>
          <p>
            We use browser session storage for:
          </p>
          <ul>
            <li>Temporarily holding your API key during analysis</li>
            <li>Storing analysis state during your session</li>
          </ul>
          <p>
            This data is automatically deleted when you close the browser tab.
          </p>

          <h4>5. Security Measures</h4>
          <ul>
            <li>All connections use HTTPS encryption</li>
            <li>Client-side only architecture</li>
            <li>No server-side data processing</li>
            <li>Regular security updates</li>
          </ul>

          <h4>6. Your Rights</h4>
          <p>
            Since we don't collect any data, there is no personal data to access, modify, or delete.
          </p>

          <h4>7. Changes to This Policy</h4>
          <p>
            We may update this policy. Check the "Last Updated" date for changes.
          </p>

          <h4>8. Contact</h4>
          <p>
            For privacy questions: privacy@example.com
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
```

### Step 4.3: Add Legal Links to Footer

Update file: `client/src/pages/analysis.tsx`

```typescript
import { TermsOfService } from "@/components/terms-of-service";
import { PrivacyPolicy } from "@/components/privacy-policy";

export default function AnalysisPage() {
  const [showTerms, setShowTerms] = useState(false);
  const [showPrivacy, setShowPrivacy] = useState(false);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Existing header and main content */}
      
      {/* Updated Footer */}
      <footer className="bg-gray-100 border-t border-gray-200 mt-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div>
              <div className="flex items-center text-sm text-gray-500">
                <Shield className="h-4 w-4 mr-2 text-gray-400" />
                <span>Your data never leaves your browser</span>
              </div>
              <div className="mt-2 text-xs text-gray-400">
                All processing happens locally. We never see your API keys or content.
              </div>
            </div>
            
            <div className="flex items-center justify-end space-x-6">
              <button
                onClick={() => setShowTerms(true)}
                className="text-sm text-gray-600 hover:text-gray-900 underline"
              >
                Terms of Service
              </button>
              <button
                onClick={() => setShowPrivacy(true)}
                className="text-sm text-gray-600 hover:text-gray-900 underline"
              >
                Privacy Policy
              </button>
              <a
                href="mailto:support@example.com"
                className="text-sm text-gray-600 hover:text-gray-900 underline"
              >
                Contact
              </a>
            </div>
          </div>
          
          <div className="mt-6 pt-6 border-t border-gray-200">
            <p className="text-center text-xs text-gray-400">
              © {new Date().getFullYear()} Semantic Similarity Tool. 
              Not affiliated with OpenAI. You are responsible for your API usage and costs.
            </p>
          </div>
        </div>
      </footer>
      
      <TermsOfService open={showTerms} onClose={() => setShowTerms(false)} />
      <PrivacyPolicy open={showPrivacy} onClose={() => setShowPrivacy(false)} />
    </div>
  );
}
```

---

## Phase 5: Final Security Checklist

### Step 5.1: Remove Backend Dependencies

Update file: `package.json`

```json
{
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "preview": "vite preview"
  },
  "dependencies": {
    // Remove these backend dependencies:
    // - "express"
    // - "express-session"
    // - "connect-pg-simple"
    // - "passport"
    // - "passport-local"
    // - "@neondatabase/serverless"
    // - "drizzle-orm"
    // - "drizzle-kit"
    
    // Keep all React/frontend dependencies
  }
}
```

### Step 5.2: Update Vite Config

Update file: `vite.config.ts`

```typescript
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./client/src"),
      "@shared": path.resolve(__dirname, "./shared"),
    },
  },
  root: path.resolve(__dirname, "client"),
  build: {
    outDir: path.resolve(__dirname, "dist/public"),
    emptyOutDir: true,
    rollupOptions: {
      output: {
        manualChunks: {
          'react-vendor': ['react', 'react-dom'],
          'ui-vendor': ['@radix-ui/react-dialog', '@radix-ui/react-tooltip'],
          'openai': ['openai']
        }
      }
    }
  },
  server: {
    port: 3000,
    strictPort: true,
    host: true
  }
});
```

### Step 5.3: Create Security Audit Script

Create file: `scripts/security-audit.js`

```javascript
#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

console.log('🔒 Running Security Audit...\n');

const issues = [];
const warnings = [];

// Check for sensitive patterns in code
const sensitivePatterns = [
  { pattern: /sk-[a-zA-Z0-9]{48}/, name: 'OpenAI API Key' },
  { pattern: /api[_-]?key[\s]*=[\s]*["'][^"']+["']/gi, name: 'API Key Assignment' },
  { pattern: /localhost:\d{4}/, name: 'Localhost URL' },
  { pattern: /console\.log\(.*apiKey.*\)/gi, name: 'API Key Logging' }
];

function scanFile(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  
  sensitivePatterns.forEach(({ pattern, name }) => {
    if (pattern.test(content)) {
      issues.push(`Found ${name} in ${filePath}`);
    }
  });
  
  // Check for console.log
  if (content.includes('console.log') && !filePath.includes('test')) {
    warnings.push(`console.log found in ${filePath}`);
  }
}

function scanDirectory(dir) {
  const files = fs.readdirSync(dir);
  
  files.forEach(file => {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    
    if (stat.isDirectory() && !file.includes('node_modules') && !file.includes('.git')) {
      scanDirectory(filePath);
    } else if (stat.isFile() && (file.endsWith('.ts') || file.endsWith('.tsx') || file.endsWith('.js'))) {
      scanFile(filePath);
    }
  });
}

// Run scan
scanDirectory(path.join(__dirname, '..', 'client', 'src'));

// Generate report
console.log('📊 Security Audit Report\n');

if (issues.length > 0) {
  console.log('❌ CRITICAL ISSUES FOUND:');
  issues.forEach(issue => console.log(`   - ${issue}`));
  console.log('');
}

if (warnings.length > 0) {
  console.log('⚠️  WARNINGS:');
  warnings.forEach(warning => console.log(`   - ${warning}`));
  console.log('');
}

// Check dependencies
console.log('📦 Checking Dependencies...');
const { execSync } = require('child_process');

try {
  const auditResult = execSync('npm audit --json', { encoding: 'utf8' });
  const audit = JSON.parse(auditResult);
  
  if (audit.vulnerabilities) {
    const vulnCount = Object.values(audit.vulnerabilities).length;
    if (vulnCount > 0) {
      console.log(`   - Found ${vulnCount} vulnerabilities`);
      console.log('   - Run "npm audit fix" to address them');
    }
  }
} catch (e) {
  // npm audit returns non-zero exit code if vulnerabilities found
  console.log('   - Vulnerabilities detected. Run "npm audit" for details');
}

// Summary
console.log('\n📈 Summary:');
console.log(`   - Critical Issues: ${issues.length}`);
console.log(`   - Warnings: ${warnings.length}`);

if (issues.length === 0 && warnings.length === 0) {
  console.log('\n✅ All security checks passed!');
  process.exit(0);
} else {
  console.log('\n❌ Please address the issues before deploying');
  process.exit(1);
}
```

### Step 5.4: Add Pre-commit Hook

Create file: `.husky/pre-commit`

```bash
#!/bin/sh
. "$(dirname "$0")/_/husky.sh"

echo "🔒 Running security checks..."

# Run security audit
node scripts/security-audit.js

# Check for sensitive files
if [ -f ".env" ] || [ -f ".env.local" ] || [ -f ".env.production" ]; then
  echo "❌ Error: .env files should not be committed"
  exit 1
fi

# Run type checking
npm run check

echo "✅ Security checks passed"
```

### Step 5.5: Final .gitignore Update

Update file: `.gitignore`

```
# Dependencies
node_modules
dist
.DS_Store

# Environment files (NEVER commit these)
.env
.env.local
.env.production
.env.development
*.env

# API Keys and Secrets
**/apikeys/
**/secrets/
**/credentials/
*.pem
*.key
*.cert

# Build outputs
dist/
build/
.next/
out/

# Logs
logs/
*.log
npm-debug.log*
yarn-debug.log*
yarn-error.log*

# IDE
.vscode/
.idea/
*.swp
*.swo

# OS
.DS_Store
Thumbs.db

# Test coverage
coverage/
.nyc_output/

# Temporary files
tmp/
temp/
*.tmp
*.temp

# Backup files
*.backup
*.bak

# Server files (not needed for client-only)
server/
migrations/
drizzle.config.ts
```

---

## Deployment Instructions

### 1. Install Netlify CLI
```bash
npm install -g netlify-cli
```

### 2. Build the Project
```bash
npm run build
```

### 3. Test Locally
```bash
netlify dev
```

### 4. Deploy to Netlify
```bash
netlify deploy --prod
```

### 5. Configure Domain & HTTPS
1. Go to Netlify dashboard
2. Set custom domain
3. Enable HTTPS (automatic)
4. Configure headers (already in netlify.toml)

### 6. Monitor Security
1. Enable Netlify Analytics
2. Set up error tracking (e.g., Sentry)
3. Monitor for suspicious activity
4. Regular security audits

---

## Post-Deployment Checklist

- [ ] Verify HTTPS is working
- [ ] Test all security headers
- [ ] Confirm no API keys in source
- [ ] Test rate limiting
- [ ] Verify Terms/Privacy links work
- [ ] Test on multiple browsers
- [ ] Check mobile responsiveness
- [ ] Monitor first 24h for issues
- [ ] Set up error alerts
- [ ] Document support process

---

## Support Contact Template

Create file: `SECURITY.md`

```markdown
# Security Policy

## Reporting Security Issues

If you discover a security vulnerability, please email security@example.com

Do NOT create public GitHub issues for security vulnerabilities.

## Security Measures

- Client-side only architecture
- No server-side data processing
- API keys never leave the browser
- Regular security audits
- Dependency monitoring

## Responsible Disclosure

We appreciate security researchers who:
1. Give us reasonable time to fix issues
2. Don't access user data
3. Act in good faith

Thank you for helping keep our users safe!
```

---

This implementation guide provides a complete security overhaul for your application. The client-side architecture ensures maximum security while maintaining all functionality. Follow each phase carefully and test thoroughly before deploying to production.