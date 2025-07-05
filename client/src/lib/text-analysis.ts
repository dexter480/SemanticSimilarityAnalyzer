// Utility functions for text analysis and diff calculation
import { type SectionImprovement } from "@shared/schema";

export interface TextSection {
  title: string;
  content: string;
  startIndex: number;
  endIndex: number;
  level: number; // 1 for H1, 2 for H2, etc.
  type: 'heading' | 'paragraph' | 'chunk';
}

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
  const matches = Array.from(text.matchAll(headingRegex));
  
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

// Keep the original diff function for backward compatibility
export function calculateDiff(original: string, enhanced: string): DiffSegment[] {
  // Simple word-based diff algorithm
  const originalWords = original.split(/\s+/);
  const enhancedWords = enhanced.split(/\s+/);
  const segments: DiffSegment[] = [];
  
  let i = 0, j = 0;
  
  while (i < originalWords.length || j < enhancedWords.length) {
    if (i >= originalWords.length) {
      // Rest of enhanced text is additions
      segments.push({
        type: 'added',
        text: enhancedWords.slice(j).join(' ')
      });
      break;
    }
    
    if (j >= enhancedWords.length) {
      // Rest of original text was removed
      segments.push({
        type: 'removed',
        text: originalWords.slice(i).join(' ')
      });
      break;
    }
    
    if (originalWords[i] === enhancedWords[j]) {
      // Words match
      const unchangedText = [];
      while (i < originalWords.length && j < enhancedWords.length && 
             originalWords[i] === enhancedWords[j]) {
        unchangedText.push(originalWords[i]);
        i++;
        j++;
      }
      segments.push({
        type: 'unchanged',
        text: unchangedText.join(' ')
      });
    } else {
      // Look ahead to find next matching section
      let nextMatch = findNextMatch(originalWords, enhancedWords, i, j);
      
      if (nextMatch.found) {
        if (nextMatch.originalIndex > i) {
          segments.push({
            type: 'removed',
            text: originalWords.slice(i, nextMatch.originalIndex).join(' ')
          });
        }
        if (nextMatch.enhancedIndex > j) {
          segments.push({
            type: 'added',
            text: enhancedWords.slice(j, nextMatch.enhancedIndex).join(' ')
          });
        }
        i = nextMatch.originalIndex;
        j = nextMatch.enhancedIndex;
      } else {
        // No more matches, treat rest as remove/add
        segments.push({
          type: 'removed',
          text: originalWords.slice(i).join(' ')
        });
        segments.push({
          type: 'added',
          text: enhancedWords.slice(j).join(' ')
        });
        break;
      }
    }
  }
  
  return segments;
}

function findNextMatch(
  original: string[], 
  enhanced: string[], 
  startI: number, 
  startJ: number
): { found: boolean; originalIndex: number; enhancedIndex: number } {
  for (let i = startI; i < original.length; i++) {
    for (let j = startJ; j < enhanced.length; j++) {
      if (original[i] === enhanced[j]) {
        return { found: true, originalIndex: i, enhancedIndex: j };
      }
    }
  }
  return { found: false, originalIndex: -1, enhancedIndex: -1 };
} 