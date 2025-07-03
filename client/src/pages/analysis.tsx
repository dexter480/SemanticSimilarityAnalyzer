import { useState } from "react";
import { AnalysisForm } from "@/components/analysis-form";
import { ResultsDisplay } from "@/components/results-display";
import { type AnalysisResult } from "@shared/schema";
import { Search, Shield, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function AnalysisPage() {
  const [results, setResults] = useState<AnalysisResult | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  const handleAnalysisComplete = (analysisResults: AnalysisResult) => {
    setResults(analysisResults);
    setIsAnalyzing(false);
  };

  const handleReset = () => {
    setResults(null);
    setIsAnalyzing(false);
    // Reset form would be handled by the form component
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-primary rounded-lg flex items-center justify-center">
                <Search className="text-primary-foreground h-5 w-5" />
              </div>
              <div>
                <h1 className="text-xl font-semibold text-gray-900">Semantic Similarity Analysis</h1>
                <p className="text-sm text-gray-500">Optimize your content with AI-powered analysis</p>
              </div>
            </div>
            <Button 
              variant="outline" 
              onClick={handleReset}
              className="inline-flex items-center"
            >
              <RotateCcw className="h-4 w-4 mr-2" />
              Reset All
            </Button>
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
          <ResultsDisplay results={results} />
        )}
      </main>

      {/* Footer */}
      <footer className="bg-gray-100 border-t border-gray-200 mt-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-center text-sm text-gray-500">
            <Shield className="h-4 w-4 mr-2 text-gray-400" />
            <span>All data is processed client-side. API keys and content are never stored on our servers. Data is sent only to OpenAI for embedding generation.</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
