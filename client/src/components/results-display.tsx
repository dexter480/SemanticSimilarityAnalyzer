import { useState } from "react";
import { type AnalysisResult } from "@shared/schema";
import { openAIClient } from "@/services/openai-client.service";
import { SecureSessionStorage } from "@/lib/security";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Trophy, CheckCircle, Lightbulb, TrendingUp, ThumbsUp, FileText, Download, Brain, AlertTriangle } from "lucide-react";
import { ChevronDown, ChevronUp, Copy } from "lucide-react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { calculateScorePredictions, calculateCumulativeImpact } from "@/lib/analysis";
import { AIEnhancement } from "@/components/ai-enhancement";
import { TextEvidence } from "@/components/text-evidence";
import { useToast } from "@/hooks/use-toast";

interface ResultsDisplayProps {
  results: AnalysisResult;
  originalText: string;
  competitorText: string;
  apiKey: string;
}

export function ResultsDisplay({ results, originalText, competitorText, apiKey }: ResultsDisplayProps) {
  const isMainWinner = results.mainCopyScore > results.competitorCopyScore;
  const gap = Math.abs(results.mainCopyScore - results.competitorCopyScore);
  const [showEnhancement, setShowEnhancement] = useState(false);
  const [enhancedContent, setEnhancedContent] = useState("");
  const [showCalculation, setShowCalculation] = useState(false);
  const { toast } = useToast();

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

  const handleAcceptEnhancement = (enhanced: string) => {
    setEnhancedContent(enhanced);
    setShowEnhancement(false);
    toast({
      title: "Content Enhanced",
      description: "Your content has been updated with AI suggestions",
    });
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text).then(() => {
      toast({
        title: "Copied!",
        description: text.length > 50 ? text.substring(0, 50) + "..." : text,
      });
    }).catch(() => {
      toast({
        title: "Copy failed",
        description: "Please try selecting and copying manually",
        variant: "destructive",
      });
    });
  };

  const exportCSV = () => {
    const csvData = [
      ['Metric', 'Your Content', 'Competitor Content'],
      ['Overall Score (%)', results.mainCopyScore.toString(), results.competitorCopyScore.toString()],
      ['Gap Analysis', results.gapAnalysis, ''],
    ];

    if (results.mainCopyChunks && results.competitorCopyChunks) {
      csvData.push(['', '', '']);
      csvData.push(['Chunk Analysis', '', '']);
      csvData.push(['Chunk', 'Your Content Score (%)', 'Competitor Score (%)']);
      
      const maxChunks = Math.max(results.mainCopyChunks.length, results.competitorCopyChunks.length);
      for (let i = 0; i < maxChunks; i++) {
        const mainScore = results.mainCopyChunks[i]?.score?.toString() || '';
        const compScore = results.competitorCopyChunks[i]?.score?.toString() || '';
        csvData.push([`Chunk ${i + 1}`, mainScore, compScore]);
      }
    }

    const csv = csvData.map(row => row.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'semantic-analysis-results.csv';
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const exportPDF = () => {
    // For simplicity, we'll create a comprehensive text report
    const reportContent = `
SEMANTIC SIMILARITY ANALYSIS REPORT
Generated: ${new Date().toLocaleString()}

OVERALL RESULTS
Your Content Score: ${results.mainCopyScore}%
Competitor Content Score: ${results.competitorCopyScore}%
Winner: ${isMainWinner ? 'Your Content' : 'Competitor Content'}

GAP ANALYSIS
${results.gapAnalysis}

${results.mainCopyChunks ? `
DETAILED CHUNK ANALYSIS

Your Content Breakdown:
${results.mainCopyChunks.map((chunk, i) => `Chunk ${i + 1}: ${chunk.score}%`).join('\n')}

Competitor Content Breakdown:
${results.competitorCopyChunks?.map((chunk, i) => `Chunk ${i + 1}: ${chunk.score}%`).join('\n') || ''}
` : ''}

KEYWORD WEIGHTS
${results.keywordWeights.map(k => `${k.text}: ${k.weight}`).join('\n')}

Processing Time: ${(results.processingTime / 1000).toFixed(1)} seconds
    `.trim();

    const blob = new Blob([reportContent], { type: 'text/plain' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'semantic-analysis-report.txt';
    a.click();
    window.URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-8 mt-8">
      {/* Summary Results */}
      <Card>
        <CardHeader>
          <CardTitle>Analysis Results</CardTitle>
        </CardHeader>
        <CardContent>
          {/* Overall Scores */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
            {/* Your Content Score */}
            <div className="text-center">
              <h3 className="text-sm font-medium text-muted-foreground mb-2">Your Content</h3>
              <div className="relative group">
                <div className="absolute inset-0 gradient-bg rounded-full blur-xl opacity-30 group-hover:opacity-50 transition-opacity" />
                <div className="relative w-32 h-32 mx-auto">
                  <svg className="w-32 h-32 transform -rotate-90" viewBox="0 0 36 36">
                    <circle cx="18" cy="18" r="16" fill="none" stroke="currentColor" strokeWidth="2" className="text-gray-200" />
                    <circle cx="18" cy="18" r="16" fill="none" stroke="url(#gradientMain)" strokeWidth="2" strokeDasharray={`${results.mainCopyScore}, 100`} className="transition-all duration-1000 ease-out" />
                    <defs>
                      <linearGradient id="gradientMain">
                        <stop offset="0%" stopColor="var(--gradient-start)" />
                        <stop offset="100%" stopColor="var(--gradient-end)" />
                      </linearGradient>
                    </defs>
                  </svg>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="text-center">
                      <span className="text-3xl font-bold gradient-text">{results.mainCopyScore}%</span>
                      <span className="block text-xs text-gray-500 mt-1">Match</span>
                    </div>
                  </div>
                </div>
                {isMainWinner && (
                  <div className="absolute -top-2 -right-2 animate-bounce">
                    <div className="gradient-bg p-2 rounded-full shadow-lg">
                      <Trophy className="h-4 w-4 text-white" />
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Competitor Content Score */}
            <div className="text-center">
              <h3 className="text-sm font-medium text-muted-foreground mb-2">Competitor Content</h3>
              <div className="relative group">
                <div className="absolute inset-0 gradient-bg rounded-full blur-xl opacity-30 group-hover:opacity-50 transition-opacity" />
                <div className="relative w-32 h-32 mx-auto">
                  <svg className="w-32 h-32 transform -rotate-90" viewBox="0 0 36 36">
                    <circle cx="18" cy="18" r="16" fill="none" stroke="currentColor" strokeWidth="2" className="text-gray-200" />
                    <circle cx="18" cy="18" r="16" fill="none" stroke="url(#gradientComp)" strokeWidth="2" strokeDasharray={`${results.competitorCopyScore}, 100`} className="transition-all duration-1000 ease-out" />
                    <defs>
                      <linearGradient id="gradientComp">
                        <stop offset="0%" stopColor="var(--gradient-start)" />
                        <stop offset="100%" stopColor="var(--gradient-end)" />
                      </linearGradient>
                    </defs>
                  </svg>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="text-center">
                      <span className="text-3xl font-bold gradient-text">{results.competitorCopyScore}%</span>
                      <span className="block text-xs text-gray-500 mt-1">Match</span>
                    </div>
                  </div>
                </div>
                {!isMainWinner && (
                  <div className="absolute -top-2 -right-2 animate-bounce">
                    <div className="gradient-bg p-2 rounded-full shadow-lg">
                      <Trophy className="h-4 w-4 text-white" />
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Gap Analysis */}
          <div className="border-t pt-6">
            <div className={`border rounded-md p-4 ${isMainWinner ? 'bg-green-50 border-green-200' : 'bg-yellow-50 border-yellow-200'}`}>
              <div className="flex">
                <div className="flex-shrink-0">
                  <CheckCircle className={`h-5 w-5 ${isMainWinner ? 'text-green-400' : 'text-yellow-400'}`} />
                </div>
                <div className="ml-3">
                  <h3 className={`text-sm font-medium ${isMainWinner ? 'text-green-800' : 'text-yellow-800'}`}>
                    Performance Summary
                  </h3>
                  <div className={`mt-2 text-sm ${isMainWinner ? 'text-green-700' : 'text-yellow-700'}`}>
                    <p>{results.gapAnalysis}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* How We Calculated This - Calculation Process */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Brain className="h-5 w-5" />
            How We Calculated Your Score
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Collapsible open={showCalculation} onOpenChange={setShowCalculation}>
            <CollapsibleTrigger asChild>
              <Button variant="outline" className="w-full justify-between">
                <span>Show Calculation Process</span>
                {showCalculation ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent className="space-y-6 mt-4">
              {/* Visual Process Flow */}
              <div className="bg-gradient-to-r from-blue-50 to-indigo-50 p-4 rounded-lg">
                <h4 className="text-sm font-medium text-center mb-3">Analysis Process</h4>
                <div className="flex items-center justify-center gap-2 text-sm flex-wrap">
                  <Badge className="bg-white">{results.keywordWeights.length} Keywords</Badge>
                  <span className="text-gray-500">→</span>
                  <Badge className="bg-white">AI Embeddings</Badge>
                  <span className="text-gray-500">→</span>
                  <Badge className="bg-white">Semantic Compare</Badge>
                  <span className="text-gray-500">→</span>
                  <Badge variant="default" className="text-lg px-3 py-1">
                    {results.mainCopyScore}%
                  </Badge>
                </div>
              </div>

              {/* Detailed Steps */}
              <div className="space-y-4">
                {/* Step 1: Keywords */}
                <div className="border-l-4 border-blue-500 pl-4">
                  <h4 className="font-medium mb-2">1. Your Target Keywords (weighted):</h4>
                  <div className="flex flex-wrap gap-2">
                    {results.keywordWeights.map((kw) => (
                      <Badge key={kw.text} variant="outline">
                        {kw.text}
                        {kw.weight !== 1 && <span className="ml-1 font-bold">×{kw.weight}</span>}
                      </Badge>
                    ))}
                  </div>
                  <p className="text-xs text-muted-foreground mt-2">
                    Higher weights mean more importance in the calculation
                  </p>
                </div>

                {/* Step 2: Keyword Analysis */}
                <div className="border-l-4 border-green-500 pl-4">
                  <h4 className="font-medium mb-2">2. Keyword Presence in Your Content:</h4>
                  <div className="space-y-2">
                    {results.keywordAnalysis.slice(0, 5).map((ka) => (
                      <div key={ka.keyword} className="flex items-center justify-between text-sm">
                        <span className="font-medium">{ka.keyword}:</span>
                        <div className="flex items-center gap-3">
                          <span className="text-muted-foreground">
                            {ka.directMentions} direct mention{ka.directMentions !== 1 ? "s" : ""}
                          </span>
                          <Badge
                            variant={ka.semanticCoverage > 70 ? "default" : ka.semanticCoverage > 40 ? "secondary" : "destructive"}
                            className="text-xs"
                          >
                            {ka.semanticCoverage}%
                          </Badge>
                        </div>
                      </div>
                    ))}
                    {results.keywordAnalysis.length > 5 && (
                      <p className="text-xs text-muted-foreground">
                        ... and {results.keywordAnalysis.length - 5} more keywords
                      </p>
                    )}
                  </div>
                </div>

                {/* Step 3: Section Scores */}
                {results.mainCopyChunks && (
                  <div className="border-l-4 border-purple-500 pl-4">
                    <h4 className="font-medium mb-2">3. Section-by-Section Analysis:</h4>
                    <div className="space-y-2">
                      {results.mainCopyChunks.map((chunk, index) => (
                        <div key={chunk.title} className="flex items-center justify-between text-sm">
                          <span>{chunk.title}:</span>
                          <div className="flex items-center gap-2">
                            <Progress value={chunk.score} className="w-24 h-2" />
                            <span className="font-medium w-12 text-right">{chunk.score}%</span>
                          </div>
                        </div>
                      ))}
                    </div>
                    <p className="text-xs text-muted-foreground mt-2">
                      Overall score is the average of all sections
                    </p>
                  </div>
                )}

                {/* Step 4: Final Calculation */}
                <div className="border-l-4 border-orange-500 pl-4">
                  <h4 className="font-medium mb-2">4. Final Score Calculation:</h4>
                  <div className="bg-orange-50 p-3 rounded text-sm">
                    <p>
                      Your content's embeddings are {results.mainCopyScore}% similar to the weighted keyword centroid. This measures how well your content semantically aligns with your target keywords.
                    </p>
                    <p className="mt-2 font-medium">
                      {results.mainCopyScore >= 80
                        ? "Excellent"
                        : results.mainCopyScore >= 60
                        ? "Good"
                        : results.mainCopyScore >= 40
                        ? "Needs Improvement"
                        : "Poor"} alignment!
                    </p>
                  </div>
                </div>
              </div>
            </CollapsibleContent>
          </Collapsible>
        </CardContent>
      </Card>
      {/* End Calculation Card */}

      {/* Detailed Analysis Results */}
      {results.mainCopyChunks && results.competitorCopyChunks && (
        <Card>
          <CardHeader>
            <CardTitle>Detailed Content Analysis</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* Your Content Breakdown */}
              <div>
                <h3 className="text-md font-medium mb-4">Your Content Breakdown</h3>
                <div className="space-y-3">
                  {results.mainCopyChunks.map((chunk, index) => {
                    const isLowScore = chunk.score < 60;
                    return (
                      <div 
                        key={index}
                        className={`p-3 border rounded-md ${isLowScore ? 'border-yellow-200 bg-yellow-50' : 'border-gray-200'}`}
                      >
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-sm font-medium">{chunk.title}</span>
                          <div className="flex items-center">
                            <span className={`text-sm font-semibold ${isLowScore ? 'text-yellow-600' : 'text-primary'}`}>
                              {chunk.score}%
                            </span>
                            {isLowScore && <span className="ml-2 text-yellow-500">⚠️</span>}
                          </div>
                        </div>
                        <Progress 
                          value={chunk.score} 
                          className={`h-2 ${isLowScore ? '[&>div]:bg-yellow-500' : ''}`}
                        />
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Competitor Content Breakdown */}
              <div>
                <h3 className="text-md font-medium mb-4">Competitor Content Breakdown</h3>
                <div className="space-y-3">
                  {results.competitorCopyChunks.map((chunk, index) => (
                    <div key={index} className="p-3 border border-gray-200 rounded-md">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium">{chunk.title}</span>
                        <span className="text-sm font-semibold text-muted-foreground">
                          {chunk.score}%
                        </span>
                      </div>
                      <Progress value={chunk.score} className="h-2 [&>div]:bg-muted-foreground" />
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Actionable Insights */}
      <Card>
        <CardHeader>
          <CardTitle>Optimization Insights</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {/* Low performing chunks warning */}
            {results.mainCopyChunks && (
              <>
                {results.mainCopyChunks.some(chunk => chunk.score < 60) && (
                  <div className="border-l-4 border-yellow-400 bg-yellow-50 p-4">
                    <div className="flex">
                      <div className="flex-shrink-0">
                        <Lightbulb className="h-5 w-5 text-yellow-400" />
                      </div>
                      <div className="ml-3">
                        <h3 className="text-sm font-medium text-yellow-800">Content Improvement Opportunity</h3>
                        <div className="mt-2 text-sm text-yellow-700">
                          <p>
                            Some sections scored below 60%. Consider increasing keyword density and semantic relevance in these areas.
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </>
            )}

            {/* Keyword coverage analysis */}
            <div className="border-l-4 border-primary bg-primary/5 p-4">
              <div className="flex">
                <div className="flex-shrink-0">
                  <TrendingUp className="h-5 w-5 text-primary" />
                </div>
                <div className="ml-3">
                  <h3 className="text-sm font-medium text-primary">Keyword Coverage Analysis</h3>
                  <div className="mt-2 text-sm text-primary/80">
                    <p>
                      High-weight keywords show strong semantic alignment. Consider balancing coverage across all target keywords for optimal performance.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Strength areas */}
            {isMainWinner && (
              <div className="border-l-4 border-green-400 bg-green-50 p-4">
                <div className="flex">
                  <div className="flex-shrink-0">
                    <ThumbsUp className="h-5 w-5 text-green-400" />
                  </div>
                  <div className="ml-3">
                    <h3 className="text-sm font-medium text-green-800">Strength Areas</h3>
                    <div className="mt-2 text-sm text-green-700">
                      <p>
                        Your content shows excellent keyword alignment. This semantic foundation gives you a competitive advantage.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

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
                competitorText={competitorText}
                chunks={results.mainCopyChunks}
              />
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Section Improvements */}
      {results.sectionImprovements && results.sectionImprovements.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Section-by-Section Improvements
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {results.sectionImprovements.map((section, index) => (
                <div key={index} className="border rounded-lg p-4">
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="font-medium">{section.section}</h4>
                    <Badge variant={section.currentScore < 60 ? "destructive" : "secondary"}>
                      Score: {section.currentScore}%
                    </Badge>
                  </div>
                  
                  {section.missingKeywords.length > 0 && (
                    <div className="mb-3">
                      <p className="text-sm text-muted-foreground mb-1">Missing keywords:</p>
                      <div className="flex flex-wrap gap-1">
                        {section.missingKeywords.map((keyword) => (
                          <Badge key={keyword} variant="outline" className="text-xs">
                            {keyword}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}
                  
                  {section.suggestedPhrases.length > 0 && (
                    <div className="mb-3">
                      <p className="text-sm text-muted-foreground mb-1">Suggested additions:</p>
                      <ul className="list-disc list-inside text-sm space-y-1">
                        {section.suggestedPhrases.map((phrase, i) => (
                          <li key={i} className="text-primary">{phrase}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                  
                  {section.competitorStrengths.length > 0 && (
                    <div>
                      <p className="text-sm text-muted-foreground mb-1">Competitor strengths:</p>
                      <ul className="list-disc list-inside text-sm space-y-1">
                        {section.competitorStrengths.map((strength, i) => (
                          <li key={i} className="text-muted-foreground">{strength}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Quick Copy Improvements */}
      {results.sectionImprovements && results.sectionImprovements.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Ready-to-Use Phrases
            </CardTitle>
            <p className="text-sm text-muted-foreground mt-1">
              Copy these phrases directly into your content to improve keyword coverage
            </p>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              {results.sectionImprovements
                .filter((section) => section.suggestedPhrases.length > 0)
                .map((section, sectionIndex) => (
                  <div key={sectionIndex} className="space-y-3">
                    <div className="flex items-center justify-between">
                      <h4 className="font-medium">{section.section}</h4>
                      <Badge
                        variant={section.currentScore < 60 ? "destructive" : "secondary"}
                        className="text-xs"
                      >
                        Current: {section.currentScore}%
                      </Badge>
                    </div>

                    {section.missingKeywords.length > 0 && (
                      <div className="text-sm text-muted-foreground">
                        Missing keywords: {section.missingKeywords.join(", ")}
                      </div>
                    )}

                    <div className="space-y-2">
                      {section.suggestedPhrases.map((phrase, phraseIndex) => (
                        <div
                          key={phraseIndex}
                          className="group flex items-center justify-between p-3 bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors"
                        >
                          <span className="text-sm font-medium pr-4">"{phrase}"</span>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="opacity-0 group-hover:opacity-100 transition-opacity"
                            onClick={() => copyToClipboard(phrase)}
                          >
                            <Copy className="h-4 w-4 mr-1" />
                            Copy
                          </Button>
                        </div>
                      ))}
                    </div>

                    {section.suggestedPhrases.length > 1 && (
                      <Button
                        size="sm"
                        variant="outline"
                        className="w-full"
                        onClick={() => copyToClipboard(section.suggestedPhrases.join('\n'))}
                      >
                        Copy All Phrases for {section.section}
                      </Button>
                    )}
                  </div>
                ))}
            </div>

            <div className="mt-6 pt-6 border-t">
              <Button
                variant="default"
                className="w-full"
                onClick={() => {
                  const allPhrases =
                    results.sectionImprovements?.flatMap((s) => s.suggestedPhrases).join('\n') || '';
                  copyToClipboard(allPhrases);
                }}
              >
                <Copy className="h-4 w-4 mr-2" />
                Copy All Suggested Phrases
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* What-If Score Predictions */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Score Improvement Predictions
          </CardTitle>
          <p className="text-sm text-muted-foreground mt-1">
            See how your score could improve by adding missing keywords
          </p>
        </CardHeader>
        <CardContent>
          {(() => {
            const predictions = calculateScorePredictions(
              results.mainCopyScore,
              results.keywordAnalysis
            );
            const cumulativeScore = calculateCumulativeImpact(predictions);

            if (predictions.length === 0) {
              return (
                <Alert>
                  <CheckCircle className="h-4 w-4" />
                  <AlertDescription>
                    Your content already has good keyword coverage! Focus on maintaining quality rather than adding more keywords.
                  </AlertDescription>
                </Alert>
              );
            }

            return (
              <div className="space-y-4">
                <div className="space-y-3">
                  {predictions.map((prediction, index) => (
                    <div key={prediction.keyword} className="p-4 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg">
                      <div className="flex items-start justify-between mb-2">
                        <div>
                          <h4 className="font-medium">Add "{prediction.keyword}"</h4>
                          <p className="text-sm text-muted-foreground">
                            Currently: {prediction.currentMentions} mentions → Suggested: {prediction.suggestedMentions} mentions
                          </p>
                        </div>
                        <Badge variant="default" className="ml-2">
                          +{prediction.impact}%
                        </Badge>
                      </div>

                      <div className="space-y-1">
                        <div className="flex items-center gap-2 text-xs">
                          <span>Current</span>
                          <Progress value={prediction.currentScore} className="flex-1 h-2" />
                          <span className="w-10 text-right">{prediction.currentScore}%</span>
                        </div>
                        <div className="flex items-center gap-2 text-xs">
                          <span>Predicted</span>
                          <Progress value={prediction.predictedScore} className="flex-1 h-2 [&>div]:bg-green-500" />
                          <span className="w-10 text-right font-bold text-green-600">{prediction.predictedScore}%</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {predictions.length > 1 && (
                  <div className="p-4 bg-gradient-to-r from-green-50 to-emerald-50 rounded-lg border border-green-200">
                    <h4 className="font-medium mb-2">🎯 If you implement all suggestions:</h4>
                    <div className="flex items-center justify-between">
                      <div className="text-sm text-gray-600">Your score could improve from {results.mainCopyScore}% to</div>
                      <div className="text-2xl font-bold text-green-600">{cumulativeScore}%</div>
                    </div>
                    <Progress value={cumulativeScore} className="mt-3 h-3 [&>div]:bg-green-500" />
                    <p className="text-xs text-muted-foreground mt-2">* Estimates based on semantic analysis. Actual results may vary.</p>
                  </div>
                )}

                <div className="flex justify-center pt-4">
                  <Button onClick={handleAIEnhancement} size="lg" className="w-full max-w-sm">
                    <Brain className="h-4 w-4 mr-2" />
                    Apply These Improvements with AI
                  </Button>
                </div>
              </div>
            );
          })()}
        </CardContent>
      </Card>

      {/* AI Enhancement */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Brain className="h-5 w-5" />
            AI-Powered Content Enhancement
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Alert className="mb-4">
            <Lightbulb className="h-4 w-4" />
            <AlertDescription>
              Let AI enhance your content based on the analysis above. Your original text will be preserved,
              and all changes will be clearly highlighted for your review.
            </AlertDescription>
          </Alert>
          
          <Button 
            onClick={handleAIEnhancement}
            className="w-full"
            size="lg"
            disabled={!results.sectionImprovements || results.sectionImprovements.length === 0}
          >
            <Brain className="h-5 w-5 mr-2" />
            Add Suggestions Using AI
          </Button>
          
          {(!results.sectionImprovements || results.sectionImprovements.length === 0) && (
            <p className="text-sm text-muted-foreground mt-2 text-center">
              No improvement suggestions available for this analysis
            </p>
          )}
        </CardContent>
      </Card>

      {/* Export Options */}
      <Card>
        <CardHeader>
          <CardTitle>Export Results</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-4">
            <Button variant="outline" onClick={exportCSV} className="inline-flex items-center">
              <FileText className="h-4 w-4 mr-2" />
              Export CSV
            </Button>
            <Button variant="outline" onClick={exportPDF} className="inline-flex items-center">
              <Download className="h-4 w-4 mr-2" />
              Export Report
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* AI Enhancement Dialog */}
      {showEnhancement && (
        <AIEnhancement
          originalText={originalText}
          improvements={results.sectionImprovements || []}
          apiKey={apiKey}
          onAccept={handleAcceptEnhancement}
          onCancel={() => setShowEnhancement(false)}
        />
      )}
    </div>
  );
}
