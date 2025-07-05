# Semantic Similarity Tool - UX Enhancement Implementation Guide

## Overview
This guide provides detailed implementation steps to fix critical UX issues in the Semantic Similarity Analysis Tool:

1. **Smart Text Sectioning** - Replace arbitrary word chunks with meaningful content sections
2. **Inline Highlighting Diff View** - Show clear before/after with contextual highlights
3. **Process Transparency** - Show evidence and examples from user's actual text
4. **Clear AI Enhancement Preview** - Demonstrate exact changes before accepting

## Current Problems Identified

### Problem 1: Meaningless Section Splits
- Current: Arbitrary 500-word chunks ("Chunk 1", "Chunk 2")
- Impact: Users can't understand where improvements are needed
- Solution: Heading-based sectioning with fallback

### Problem 2: Confusing Diff View
- Current: Word-based diff creates visual noise
- Impact: Users can't see what changes are actually being made
- Solution: Inline highlighting with context

### Problem 3: Lack of Process Transparency
- Current: Abstract recommendations without evidence
- Impact: Users don't trust the analysis or understand the scoring
- Solution: Show actual text snippets and examples

### Problem 4: Vague AI Enhancement
- Current: Generic "AI will enhance your content" message
- Impact: Users don't know what changes will be made
- Solution: Clear before/after preview with explanations

## Implementation Plan

### Phase 1: Smart Text Sectioning

#### Step 1.1: Update Text Analysis Library

**File: `client/src/lib/text-analysis.ts`**

Add new sectioning functions:

```typescript
// Add after existing interfaces
export interface TextSection {
  title: string;
  content: string;
  startIndex: number;
  endIndex: number;
  level: number; // 1 for H1, 2 for H2, etc.
  type: 'heading' | 'paragraph' | 'chunk';
}

export function detectSections(text: string): TextSection[] {
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
  const matches = [...text.matchAll(headingRegex)];
  
  if (matches.length === 0) return [];
  
  let currentIndex = 0;
  
  matches.forEach((match, index) => {
    const level = parseInt(match[1]);
    const title = match[2].replace(/<[^>]*>/g, '').trim();
    const matchStart = match.index!;
    
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
    startIndex: index * 100, // Approximate
    endIndex: (index + 1) * 100,
    level: 1,
    type: 'paragraph'
  }));
}

// Update existing DiffSegment interface with more context
export interface DiffSegment {
  type: 'unchanged' | 'removed' | 'added';
  text: string;
  context?: {
    before: string;
    after: string;
  };
  keywordAdded?: string; // Which keyword was added
  reason?: string; // Why this change was made
}

export function calculateContextualDiff(
  original: string, 
  enhanced: string, 
  improvements: SectionImprovement[]
): DiffSegment[] {
  const segments: DiffSegment[] = [];
  
  // Simple approach: find insertions and mark them with context
  const originalWords = original.split(/\s+/);
  const enhancedWords = enhanced.split(/\s+/);
  
  let i = 0, j = 0;
  
  while (i < originalWords.length || j < enhancedWords.length) {
    // Find matching sequences
    if (i < originalWords.length && j < enhancedWords.length && 
        originalWords[i] === enhancedWords[j]) {
      
      // Collect unchanged words
      const unchangedStart = i;
      while (i < originalWords.length && j < enhancedWords.length && 
             originalWords[i] === enhancedWords[j]) {
        i++;
        j++;
      }
      
      segments.push({
        type: 'unchanged',
        text: originalWords.slice(unchangedStart, i).join(' ')
      });
      
    } else if (j < enhancedWords.length) {
      // Find added content
      const addedStart = j;
      const contextBefore = originalWords.slice(Math.max(0, i - 5), i).join(' ');
      const contextAfter = originalWords.slice(i, Math.min(originalWords.length, i + 5)).join(' ');
      
      // Look for keyword additions
      const addedText = enhancedWords.slice(j, j + 10).join(' ');
      const matchingKeyword = improvements.find(imp => 
        imp.missingKeywords.some(kw => 
          addedText.toLowerCase().includes(kw.toLowerCase())
        )
      );
      
      // Skip to next matching point
      let nextMatchJ = j + 1;
      while (nextMatchJ < enhancedWords.length && 
             !originalWords.slice(i).includes(enhancedWords[nextMatchJ])) {
        nextMatchJ++;
      }
      
      segments.push({
        type: 'added',
        text: enhancedWords.slice(j, nextMatchJ).join(' '),
        context: {
          before: contextBefore,
          after: contextAfter
        },
        keywordAdded: matchingKeyword?.missingKeywords[0],
        reason: matchingKeyword ? 
          `Added "${matchingKeyword.missingKeywords[0]}" to improve section score` : 
          'Content enhancement'
      });
      
      j = nextMatchJ;
    } else {
      // Handle removed content (shouldn't happen in enhancement)
      segments.push({
        type: 'removed',
        text: originalWords.slice(i).join(' ')
      });
      break;
    }
  }
  
  return segments;
}
```

#### Step 1.2: Update Analysis Library

**File: `client/src/lib/analysis.ts`**

Replace the existing `chunkText` function:

```typescript
// Replace existing chunkText function
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
```

#### Step 1.3: Update Server Routes

**File: `server/routes.ts`**

Update the chunking logic:

```typescript
// Update the chunkText function in server/routes.ts
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

// Add the detectSections function to server/routes.ts
function detectSections(text: string): TextSection[] {
  // Copy the detectSections implementation from text-analysis.ts
  // (Same code as above)
}
```

### Phase 2: Inline Highlighting Diff View

#### Step 2.1: Enhanced Diff View Component

**File: `client/src/components/diff-view.tsx`**

Replace the existing implementation:

```typescript
import { DiffSegment, calculateContextualDiff } from "@/lib/text-analysis";
import { type SectionImprovement } from "@shared/schema";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Info } from "lucide-react";

interface DiffViewProps {
  original: string;
  enhanced: string;
  improvements: SectionImprovement[];
}

export function DiffView({ original, enhanced, improvements }: DiffViewProps) {
  const diff = calculateContextualDiff(original, enhanced, improvements);
  
  return (
    <TooltipProvider>
      <div className="space-y-4">
        <div className="p-4 bg-white rounded-lg border">
          <div className="prose prose-sm max-w-none leading-relaxed">
            {diff.map((segment, index) => (
              <span key={index} className="inline">
                {segment.type === 'unchanged' && (
                  <span className="text-gray-700">{segment.text}</span>
                )}
                {segment.type === 'removed' && (
                  <span className="bg-red-100 text-red-700 line-through px-1 rounded">
                    {segment.text}
                  </span>
                )}
                {segment.type === 'added' && (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <span className="bg-green-100 text-green-700 px-2 py-1 rounded font-medium cursor-help border-b-2 border-green-300">
                        {segment.text}
                        <Info className="inline h-3 w-3 ml-1" />
                      </span>
                    </TooltipTrigger>
                    <TooltipContent className="max-w-xs">
                      <div className="space-y-2">
                        {segment.keywordAdded && (
                          <div>
                            <strong>Keyword Added:</strong> {segment.keywordAdded}
                          </div>
                        )}
                        {segment.reason && (
                          <div>
                            <strong>Reason:</strong> {segment.reason}
                          </div>
                        )}
                        {segment.context && (
                          <div className="text-xs text-muted-foreground">
                            <strong>Context:</strong> ...{segment.context.before} <mark>[NEW]</mark> {segment.context.after}...
                          </div>
                        )}
                      </div>
                    </TooltipContent>
                  </Tooltip>
                )}
                {index < diff.length - 1 && ' '}
              </span>
            ))}
          </div>
        </div>
        
        {/* Enhancement Summary */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h4 className="font-medium text-blue-900 mb-2">Enhancement Summary</h4>
          <div className="space-y-2 text-sm">
            {improvements.map((improvement, index) => (
              <div key={index} className="flex items-start gap-2">
                <Badge variant="outline" className="text-xs">
                  {improvement.section}
                </Badge>
                <div>
                  <span className="text-blue-800">
                    Added keywords: {improvement.missingKeywords.join(', ')}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
        
        {/* Legend */}
        <div className="flex gap-4 text-xs text-muted-foreground">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-gray-100 border border-gray-200 rounded" />
            <span>Unchanged text</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-green-100 border border-green-200 rounded" />
            <span>AI additions (hover for details)</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-red-100 border border-red-200 rounded" />
            <span>Removed text</span>
          </div>
        </div>
      </div>
    </TooltipProvider>
  );
}
```

### Phase 3: Process Transparency with Evidence

#### Step 3.1: Text Evidence Components

**File: `client/src/components/text-evidence.tsx`** (new file)

```typescript
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { ChevronDown, ChevronUp, Search, CheckCircle, AlertTriangle } from "lucide-react";
import { type KeywordCoverage } from "@shared/schema";

interface TextEvidenceProps {
  keyword: KeywordCoverage;
  userText: string;
  competitorText: string;
}

export function TextEvidence({ keyword, userText, competitorText }: TextEvidenceProps) {
  const [showEvidence, setShowEvidence] = useState(false);
  
  // Extract text snippets showing keyword usage
  const getUserSnippets = (text: string, keyword: string) => {
    const regex = new RegExp(`(.{0,50}\\b${keyword}\\b.{0,50})`, 'gi');
    const matches = text.match(regex) || [];
    return matches.slice(0, 3); // Show max 3 examples
  };
  
  const getSemanticSnippets = (text: string, sections: string[]) => {
    // Find the actual text for strong/weak sections
    // This is a simplified version - in reality you'd need to map section names back to text
    const words = text.split(/\s+/);
    const snippetLength = 100;
    
    return sections.slice(0, 2).map((section, index) => {
      const startIndex = Math.floor((index / sections.length) * words.length);
      const endIndex = Math.min(startIndex + snippetLength, words.length);
      return words.slice(startIndex, endIndex).join(' ');
    });
  };
  
  const userSnippets = getUserSnippets(userText, keyword.keyword);
  const competitorSnippets = getUserSnippets(competitorText, keyword.keyword);
  const strongSnippets = getSemanticSnippets(userText, keyword.strongSections);
  const weakSnippets = getSemanticSnippets(userText, keyword.weakSections);
  
  return (
    <div className="border rounded-lg p-4 space-y-4">
      {/* Keyword Header */}
      <div className="flex items-start justify-between">
        <div>
          <h4 className="font-medium flex items-center gap-2">
            {keyword.keyword}
            <Badge variant="outline" className="text-xs">
              Weight: {keyword.weight}
            </Badge>
          </h4>
          <div className="flex items-center gap-4 text-sm text-muted-foreground mt-1">
            <span>{keyword.directMentions} direct mentions</span>
            <span>{keyword.semanticCoverage}% semantic coverage</span>
          </div>
        </div>
        {keyword.competitorAdvantage && (
          <Badge variant="destructive" className="text-xs">
            <AlertTriangle className="h-3 w-3 mr-1" />
            Competitor Advantage
          </Badge>
        )}
      </div>
      
      {/* Quick Stats */}
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-blue-50 p-3 rounded">
          <div className="text-sm font-medium text-blue-900">Your Content</div>
          <div className="text-2xl font-bold text-blue-700">{keyword.directMentions}</div>
          <div className="text-xs text-blue-600">mentions found</div>
        </div>
        <div className="bg-gray-50 p-3 rounded">
          <div className="text-sm font-medium text-gray-900">Competitor Content</div>
          <div className="text-2xl font-bold text-gray-700">{keyword.competitorMentions}</div>
          <div className="text-xs text-gray-600">mentions found</div>
        </div>
      </div>
      
      {/* Evidence Toggle */}
      <Collapsible open={showEvidence} onOpenChange={setShowEvidence}>
        <CollapsibleTrigger asChild>
          <Button variant="outline" size="sm" className="w-full">
            <Search className="h-4 w-4 mr-2" />
            {showEvidence ? 'Hide' : 'Show'} Evidence from Your Text
            {showEvidence ? <ChevronUp className="h-4 w-4 ml-2" /> : <ChevronDown className="h-4 w-4 ml-2" />}
          </Button>
        </CollapsibleTrigger>
        
        <CollapsibleContent className="space-y-4 mt-4">
          {/* Direct Mentions */}
          {userSnippets.length > 0 && (
            <div>
              <h5 className="font-medium text-sm mb-2 flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-green-500" />
                Direct Mentions Found
              </h5>
              <div className="space-y-2">
                {userSnippets.map((snippet, index) => (
                  <div key={index} className="bg-green-50 p-2 rounded text-sm">
                    <span className="text-gray-600">
                      {snippet.split(new RegExp(`(\\b${keyword.keyword}\\b)`, 'gi')).map((part, i) => 
                        part.toLowerCase() === keyword.keyword.toLowerCase() ? 
                          <mark key={i} className="bg-green-200 font-medium">{part}</mark> : 
                          part
                      )}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
          
          {/* Strong Sections */}
          {keyword.strongSections.length > 0 && (
            <div>
              <h5 className="font-medium text-sm mb-2 flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-green-500" />
                Strong Semantic Sections
              </h5>
              <div className="space-y-2">
                {keyword.strongSections.map((section, index) => (
                  <div key={index} className="bg-green-50 p-2 rounded">
                    <Badge variant="secondary" className="text-xs mb-1">{section}</Badge>
                    {strongSnippets[index] && (
                      <div className="text-sm text-gray-700 mt-1">
                        "{strongSnippets[index]}..."
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
          
          {/* Weak Sections */}
          {keyword.weakSections.length > 0 && (
            <div>
              <h5 className="font-medium text-sm mb-2 flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-yellow-500" />
                Sections Needing Improvement
              </h5>
              <div className="space-y-2">
                {keyword.weakSections.map((section, index) => (
                  <div key={index} className="bg-yellow-50 p-2 rounded">
                    <Badge variant="outline" className="text-xs mb-1">{section}</Badge>
                    {weakSnippets[index] && (
                      <div className="text-sm text-gray-700 mt-1">
                        "{weakSnippets[index]}..."
                      </div>
                    )}
                    <div className="text-xs text-yellow-600 mt-1">
                      💡 Consider adding "{keyword.keyword}" or related terms to this section
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
          
          {/* Competitor Comparison */}
          {competitorSnippets.length > 0 && (
            <div>
              <h5 className="font-medium text-sm mb-2">How Competitor Uses This Keyword</h5>
              <div className="space-y-2">
                {competitorSnippets.slice(0, 2).map((snippet, index) => (
                  <div key={index} className="bg-gray-50 p-2 rounded text-sm">
                    <span className="text-gray-600">
                      {snippet.split(new RegExp(`(\\b${keyword.keyword}\\b)`, 'gi')).map((part, i) => 
                        part.toLowerCase() === keyword.keyword.toLowerCase() ? 
                          <mark key={i} className="bg-gray-200 font-medium">{part}</mark> : 
                          part
                      )}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </CollapsibleContent>
      </Collapsible>
    </div>
  );
}
```

#### Step 3.2: Update Results Display

**File: `client/src/components/results-display.tsx`**

Replace the Keyword Performance Analysis section:

```typescript
import { TextEvidence } from "@/components/text-evidence";

// Replace the existing keyword analysis section with:
{/* Keyword Performance Analysis with Evidence */}
<Card>
  <CardHeader>
    <CardTitle className="flex items-center gap-2">
      <TrendingUp className="h-5 w-5" />
      Keyword Performance Analysis
    </CardTitle>
  </CardHeader>
  <CardContent>
    <div className="space-y-6">
      {results.keywordAnalysis.map((keyword) => (
        <TextEvidence
          key={keyword.keyword}
          keyword={keyword}
          userText={originalText}
          competitorText={/* You'll need to pass competitor text */}
        />
      ))}
    </div>
  </CardContent>
</Card>
```

### Phase 4: Clear AI Enhancement Preview

#### Step 4.1: Enhanced AI Enhancement Component

**File: `client/src/components/ai-enhancement.tsx`**

Replace the existing implementation:

```typescript
import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Brain, CheckCircle, AlertTriangle, Eye, EyeOff, Lightbulb } from "lucide-react";
import { DiffView } from "@/components/diff-view";
import { type SectionImprovement } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";

interface AIEnhancementProps {
  originalText: string;
  improvements: SectionImprovement[];
  apiKey: string;
  onAccept: (enhancedText: string) => void;
  onCancel: () => void;
}

export function AIEnhancement({ 
  originalText, 
  improvements, 
  apiKey,
  onAccept, 
  onCancel 
}: AIEnhancementProps) {
  const [enhancedText, setEnhancedText] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [activeTab, setActiveTab] = useState("preview");
  const { toast } = useToast();

  const handleEnhance = async () => {
    setIsProcessing(true);
    try {
      const response = await fetch("/api/enhance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          apiKey,
          originalText,
          improvements
        })
      });

      if (!response.ok) {
        throw new Error(await response.text());
      }

      const { enhancedContent } = await response.json();
      setEnhancedText(enhancedContent);
    } catch (error: any) {
      toast({
        title: "Enhancement Failed",
        description: error.message || "Failed to enhance content",
        variant: "destructive"
      });
    } finally {
      setIsProcessing(false);
    }
  };

  // Auto-enhance when component mounts
  useEffect(() => {
    handleEnhance();
  }, []);

  return (
    <Dialog open={true} onOpenChange={onCancel}>
      <DialogContent className="max-w-6xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Brain className="h-5 w-5 text-primary" />
            AI Content Enhancement Preview
          </DialogTitle>
        </DialogHeader>
        
        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="preview">What Will Change</TabsTrigger>
            <TabsTrigger value="comparison">Before & After</TabsTrigger>
            <TabsTrigger value="details">Enhancement Details</TabsTrigger>
          </TabsList>
          
          <TabsContent value="preview" className="flex-1 space-y-4">
            <Alert className="border-blue-200 bg-blue-50">
              <Lightbulb className="h-4 w-4 text-blue-600" />
              <AlertDescription className="text-blue-800">
                <strong>AI will make these specific changes to your content:</strong>
              </AlertDescription>
            </Alert>
            
            <div className="grid gap-4">
              {improvements.map((improvement, index) => (
                <Card key={index} className="border-l-4 border-l-blue-500">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base flex items-center gap-2">
                      <Badge variant="outline">{improvement.section}</Badge>
                      <span className="text-sm font-normal text-muted-foreground">
                        Current Score: {improvement.currentScore}%
                      </span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div>
                      <h4 className="font-medium text-sm mb-2">Keywords to Add:</h4>
                      <div className="flex flex-wrap gap-1">
                        {improvement.missingKeywords.map((keyword) => (
                          <Badge key={keyword} variant="secondary" className="text-xs">
                            {keyword}
                          </Badge>
                        ))}
                      </div>
                    </div>
                    
                    <div>
                      <h4 className="font-medium text-sm mb-2">How AI Will Add Them:</h4>
                      <ul className="space-y-1 text-sm">
                        {improvement.suggestedPhrases.map((phrase, i) => (
                          <li key={i} className="flex items-start gap-2">
                            <CheckCircle className="h-3 w-3 text-green-500 mt-1 flex-shrink-0" />
                            <span className="text-green-700">"{phrase}"</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>
          
          <TabsContent value="comparison" className="flex-1 overflow-y-auto">
            {isProcessing ? (
              <div className="flex items-center justify-center h-64">
                <div className="text-center">
                  <Brain className="h-12 w-12 text-primary animate-pulse mx-auto mb-4" />
                  <p className="text-sm text-muted-foreground">Generating enhanced content...</p>
                </div>
              </div>
            ) : enhancedText ? (
              <DiffView 
                original={originalText} 
                enhanced={enhancedText} 
                improvements={improvements}
              />
            ) : (
              <div className="text-center text-muted-foreground py-8">
                No enhanced content available
              </div>
            )}
          </TabsContent>
          
          <TabsContent value="details" className="flex-1 space-y-4">
            <div className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Enhancement Strategy</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <h4 className="font-medium text-sm mb-2">What AI Will Do:</h4>
                      <ul className="text-sm space-y-1">
                        <li>• Add missing keywords naturally</li>
                        <li>• Maintain your original tone</li>
                        <li>• Preserve sentence structure</li>
                        <li>• Focus on weak sections only</li>
                      </ul>
                    </div>
                    <div>
                      <h4 className="font-medium text-sm mb-2">What AI Won't Do:</h4>
                      <ul className="text-sm space-y-1">
                        <li>• Change your main message</li>
                        <li>• Remove existing content</li>
                        <li>• Alter your writing style</li>
                        <li>• Add irrelevant keywords</li>
                      </ul>
                    </div>
                  </div>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Expected Impact</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {improvements.map((improvement, index) => (
                      <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded">
                        <div>
                          <div className="font-medium text-sm">{improvement.section}</div>
                          <div className="text-xs text-muted-foreground">
                            Adding {improvement.missingKeywords.length} keywords
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-sm">{improvement.currentScore}%</span>
                          <span className="text-muted-foreground">→</span>
                          <span className="text-sm font-medium text-green-600">
                            ~{Math.min(100, improvement.currentScore + 15)}%
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>

        <DialogFooter className="mt-4">
          <Button variant="outline" onClick={onCancel}>
            Cancel
          </Button>
          <Button 
            onClick={() => onAccept(enhancedText)} 
            disabled={isProcessing || !enhancedText}
            className="min-w-[140px]"
          >
            {isProcessing ? (
              <>
                <Brain className="h-4 w-4 mr-2 animate-spin" />
                Processing...
              </>
            ) : (
              <>
                <CheckCircle className="h-4 w-4 mr-2" />
                Apply Changes
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
```

## Testing Guidelines

### Phase 1 Testing: Smart Sectioning
1. **Test with HTML headings**: Use content with `<h1>`, `<h2>`, etc.
2. **Test with Markdown**: Use content with `#`, `##`, `###` headers
3. **Test with paragraphs**: Use content with clear paragraph breaks
4. **Test with plain text**: Ensure it falls back to single section

### Phase 2 Testing: Diff View
1. **Test tooltip interactions**: Hover over highlighted changes
2. **Test context display**: Verify surrounding text shows properly
3. **Test keyword attribution**: Ensure changes are linked to keywords
4. **Test visual hierarchy**: Check that changes are clearly visible

### Phase 3 Testing: Evidence Display
1. **Test evidence toggle**: Verify collapsible sections work
2. **Test snippet extraction**: Check that keyword mentions are highlighted
3. **Test section mapping**: Ensure strong/weak sections show relevant text
4. **Test competitor comparison**: Verify competitor examples appear

### Phase 4 Testing: AI Enhancement
1. **Test tab navigation**: Verify all tabs work correctly
2. **Test enhancement preview**: Check that changes are clearly explained
3. **Test impact estimation**: Verify score improvements are realistic
4. **Test enhancement process**: Ensure AI generates appropriate changes

## Implementation Notes

1. **Import Requirements**: Add missing imports for new components
2. **Styling Dependencies**: Ensure all UI components are properly imported
3. **Data Flow**: Update parent components to pass required data
4. **Error Handling**: Add appropriate error boundaries
5. **Performance**: Consider lazy loading for large text comparisons

## Success Criteria

- Users can see exactly where their content needs improvement
- Users understand why specific changes are recommended
- Users can preview AI changes before accepting them
- Users see evidence from their actual text supporting recommendations
- Sections are meaningful and actionable rather than arbitrary

This implementation transforms the tool from showing abstract recommendations to providing concrete, actionable insights with full transparency.