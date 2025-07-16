import { useState } from "react";
import { AnalysisForm } from "@/components/analysis-form";
import { ResultsDisplay } from "@/components/results-display";
import { TermsOfService } from "@/components/terms-of-service";
import { PrivacyPolicy } from "@/components/privacy-policy";
import { type AnalysisResult } from "@shared/schema";
import { Search, Shield, RotateCcw, Sparkles, Brain } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export default function AnalysisPage() {
  const [results, setResults] = useState<AnalysisResult | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [originalText, setOriginalText] = useState("");
  const [competitorText, setCompetitorText] = useState("");
  const [apiKey, setApiKey] = useState("");
  const [showTerms, setShowTerms] = useState(false);
  const [showPrivacy, setShowPrivacy] = useState(false);

  const handleAnalysisComplete = (analysisResults: AnalysisResult, originalMainCopy: string, userApiKey: string, competitorCopy?: string) => {
    setResults(analysisResults);
    setIsAnalyzing(false);
    setOriginalText(originalMainCopy);
    setApiKey(userApiKey);
    if (competitorCopy) setCompetitorText(competitorCopy);
    
    // Also retrieve stored data as backup
    const storedText = sessionStorage.getItem('originalMainCopy');
    const storedCompetitorText = sessionStorage.getItem('competitorCopy');
    const storedApiKey = sessionStorage.getItem('apiKey');
    if (storedText) setOriginalText(storedText);
    if (storedCompetitorText) setCompetitorText(storedCompetitorText);
    if (storedApiKey) setApiKey(storedApiKey);
  };

  const handleReset = () => {
    setResults(null);
    setIsAnalyzing(false);
    setOriginalText("");
    setCompetitorText("");
    setApiKey("");
    // Reset form would be handled by the form component
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Clean Header */}
      <header className="bg-white border-b sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-primary rounded-lg flex items-center justify-center">
                <Search className="text-white h-5 w-5" />
              </div>
              <div>
                <h1 className="text-xl font-semibold text-gray-900">
                  Semantic Similarity Analyzer
                </h1>
                <p className="text-sm text-gray-500">AI-powered content analysis</p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <Badge variant="secondary" className="text-xs">
                Powered by OpenAI
              </Badge>
              {results && (
                <Button
                  variant="outline"
                  onClick={handleReset}
                  size="sm"
                >
                  <RotateCcw className="h-4 w-4 mr-2" />
                  New Analysis
                </Button>
              )}
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <AnalysisForm 
          onAnalysisComplete={handleAnalysisComplete}
          isAnalyzing={isAnalyzing}
          setIsAnalyzing={setIsAnalyzing}
        />
        
        {results && (
          <ResultsDisplay 
            results={results} 
            originalText={originalText}
            competitorText={competitorText}
            apiKey={apiKey}
          />
        )}
      </main>

      {/* Footer */}
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
              © {new Date().getFullYear()} Semantic Similarity Tool - A free community tool. 
              Not affiliated with OpenAI. You are responsible for your API usage and costs.
              By using this tool, you agree to our Terms of Service and Privacy Policy.
            </p>
            <p className="text-center text-xs text-gray-400 mt-2">
              Built by <a href="https://vesivanov.com/" target="_blank" rel="noopener" className="text-gray-600 hover:text-gray-900 underline">Ves Ivanov</a>
            </p>
          </div>
        </div>
      </footer>

      {/* Loading Overlay */}
      {isAnalyzing && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center">
          <div className="bg-white rounded-lg p-8 shadow-xl max-w-sm w-full mx-4">
            <div className="flex flex-col items-center">
              <div className="w-16 h-16 bg-primary rounded-full flex items-center justify-center mb-4">
                <Brain className="h-8 w-8 text-white animate-pulse" />
              </div>
              <h3 className="text-lg font-semibold text-center mb-2">Analyzing Content</h3>
              <p className="text-sm text-gray-600 text-center">This may take a few moments...</p>
              <div className="mt-6 w-full">
                <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                  <div className="h-full bg-primary rounded-full animate-pulse" style={{ width: '60%' }} />
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      <TermsOfService open={showTerms} onClose={() => setShowTerms(false)} />
      <PrivacyPolicy open={showPrivacy} onClose={() => setShowPrivacy(false)} />
    </div>
  );
}
