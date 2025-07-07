import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { ChevronDown, ChevronUp, Search, CheckCircle, AlertTriangle } from "lucide-react";
import { type KeywordCoverage, type ChunkResult } from "@shared/schema";

interface TextEvidenceProps {
  keyword: KeywordCoverage;
  userText: string;
  competitorText: string;
  chunks?: ChunkResult[]; // optional: main copy chunks with titles and text
}

export function TextEvidence({ keyword, userText, competitorText, chunks }: TextEvidenceProps) {
  const [showEvidence, setShowEvidence] = useState(false);
  
  // Extract text snippets showing keyword usage
  const getUserSnippets = (text: string, keyword: string) => {
    // Escape special regex characters in keyword
    const escapedKeyword = keyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(`(.{0,50}\\b${escapedKeyword}\\b.{0,50})`, 'gi');
    const matches = text.match(regex) || [];
    
    // If no exact matches, try partial matches
    if (matches.length === 0) {
      const partialRegex = new RegExp(`(.{0,50}${escapedKeyword}.{0,50})`, 'gi');
      const partialMatches = text.match(partialRegex) || [];
      return partialMatches.slice(0, 3);
    }
    
    return matches.slice(0, 3); // Show max 3 examples
  };
  
  const getSemanticSnippets = (text: string, sections: string[]) => {
    // Try to map section names to chunk text if chunks are provided
    if (chunks && chunks.length > 0) {
      return sections.slice(0, 2).map(sectionName => {
        const match = chunks.find(c => c.title.toLowerCase() === sectionName.toLowerCase());
        if (match) {
          // Return first 40 words from the chunk for context
          return match.text.split(/\s+/).slice(0, 40).join(' ');
        }
        return "";
      });
    }
    // Fallback to naive slicing across whole text
    const words = text.split(/\s+/);
    const snippetLength = 100;
    return sections.slice(0, 2).map((_, index) => {
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
                                      Role: {keyword.weight > 1 ? 'Main Topic' : 'Supporting Topic'}
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
          {userSnippets.length > 0 ? (
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
          ) : (
            <div className="text-sm text-muted-foreground">
              No direct mentions of "{keyword.keyword}" were found in your content.
            </div>
          )}
          
          {/* Strong Sections */}
          {keyword.strongSections.length > 0 ? (
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
          ) : (
            <div className="text-sm text-muted-foreground">
              No particularly strong sections identified for this keyword.
            </div>
          )}
          
          {/* Weak Sections */}
          {keyword.weakSections.length > 0 ? (
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
          ) : (
            <div className="text-sm text-muted-foreground">
              No weak sections detected, but consider integrating the keyword naturally where relevant.
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