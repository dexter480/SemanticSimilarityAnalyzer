import { type AnalysisResult } from "@shared/schema";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Trophy, CheckCircle, Lightbulb, TrendingUp, ThumbsUp, FileText, Download } from "lucide-react";

interface ResultsDisplayProps {
  results: AnalysisResult;
}

export function ResultsDisplay({ results }: ResultsDisplayProps) {
  const isMainWinner = results.mainCopyScore > results.competitorCopyScore;
  const gap = Math.abs(results.mainCopyScore - results.competitorCopyScore);

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
            <div className="text-center">
              <h3 className="text-sm font-medium text-muted-foreground mb-2">Your Content</h3>
              <div className="relative w-24 h-24 mx-auto mb-2">
                <svg className="w-24 h-24 transform -rotate-90" viewBox="0 0 36 36">
                  <path 
                    className="text-muted" 
                    stroke="currentColor" 
                    strokeWidth="2" 
                    fill="none" 
                    d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                  />
                  <path 
                    className="text-primary" 
                    stroke="currentColor" 
                    strokeWidth="2" 
                    fill="none" 
                    strokeDasharray={`${results.mainCopyScore}, 100`}
                    d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                  />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-xl font-bold">{results.mainCopyScore}%</span>
                </div>
              </div>
              {isMainWinner && (
                <Badge className="bg-primary/10 text-primary hover:bg-primary/20">
                  <Trophy className="h-3 w-3 mr-1" />
                  Winner
                </Badge>
              )}
            </div>
            
            <div className="text-center">
              <h3 className="text-sm font-medium text-muted-foreground mb-2">Competitor Content</h3>
              <div className="relative w-24 h-24 mx-auto mb-2">
                <svg className="w-24 h-24 transform -rotate-90" viewBox="0 0 36 36">
                  <path 
                    className="text-muted" 
                    stroke="currentColor" 
                    strokeWidth="2" 
                    fill="none" 
                    d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                  />
                  <path 
                    className="text-muted-foreground" 
                    stroke="currentColor" 
                    strokeWidth="2" 
                    fill="none" 
                    strokeDasharray={`${results.competitorCopyScore}, 100`}
                    d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                  />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-xl font-bold">{results.competitorCopyScore}%</span>
                </div>
              </div>
              {!isMainWinner && (
                <Badge className="bg-primary/10 text-primary hover:bg-primary/20">
                  <Trophy className="h-3 w-3 mr-1" />
                  Winner
                </Badge>
              )}
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

      {/* Chunked Analysis Results */}
      {results.mainCopyChunks && results.competitorCopyChunks && (
        <Card>
          <CardHeader>
            <CardTitle>Detailed Chunk Analysis</CardTitle>
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
                            Some chunks scored below 60%. Consider increasing keyword density and semantic relevance in these sections.
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
    </div>
  );
}
