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
      {/* Enhanced Header */}
      <header className="relative overflow-hidden border-b bg-white/80 backdrop-blur-md sticky top-0 z-50">
        <div className="absolute inset-0 bg-gradient-to-r from-purple-100/20 to-pink-100/20" />
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-5">
            <div className="flex items-center space-x-4">
              <div className="relative">
                <div className="w-12 h-12 gradient-bg rounded-2xl flex items-center justify-center transform rotate-3 transition-transform hover:rotate-6">
                  <Search className="text-white h-6 w-6 transform -rotate-3" />
                </div>
                <div className="absolute -bottom-1 -right-1 w-3 h-3 bg-green-400 rounded-full animate-pulse" />
              </div>
              <div>
                <h1 className="text-2xl font-bold">
                  <span className="gradient-text">Semantic AI</span>
                </h1>
                <p className="text-sm text-gray-600">Content Intelligence Platform</p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <Badge className="glass-effect border-purple-200">
                <Sparkles className="h-3 w-3 mr-1" /> Powered by GPT-3
              </Badge>
              <Button
                variant="outline"
                onClick={handleReset}
                className="hover:border-purple-300 transition-all"
              >
                <RotateCcw className="h-4 w-4 mr-2" />
                New Analysis
              </Button>
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
              © {new Date().getFullYear()} Semantic Similarity Tool. 
              Not affiliated with OpenAI. You are responsible for your API usage and costs.
            </p>
          </div>
        </div>
      </footer>

      {/* Loading Overlay */}
      {isAnalyzing && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center">
          <div className="bg-white rounded-2xl p-8 shadow-2xl max-w-sm w-full mx-4">
            <div className="relative w-24 h-24 mx-auto mb-4">
              <div className="absolute inset-0 gradient-bg rounded-full animate-ping opacity-20" />
              <div className="absolute inset-0 gradient-bg rounded-full animate-pulse opacity-40" />
              <div className="relative gradient-bg rounded-full w-full h-full flex items-center justify-center">
                <Brain className="h-10 w-10 text-white animate-pulse" />
              </div>
            </div>
            <h3 className="text-lg font-semibold text-center mb-2">Analyzing Content</h3>
            <p className="text-sm text-gray-600 text-center">Creating embeddings and calculating semantic similarity...</p>
            <div className="mt-4 space-y-2">
              <div className="flex items-center gap-2 text-sm text-gray-500">
                <div className="w-2 h-2 gradient-bg rounded-full animate-pulse" /> Processing keywords
              </div>
              <div className="flex items-center gap-2 text-sm text-gray-500">
                <div className="w-2 h-2 gradient-bg rounded-full animate-pulse animation-delay-150" /> Generating embeddings
              </div>
              <div className="flex items-center gap-2 text-sm text-gray-500">
                <div className="w-2 h-2 gradient-bg rounded-full animate-pulse animation-delay-300" /> Calculating similarity
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
