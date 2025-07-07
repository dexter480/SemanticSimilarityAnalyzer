import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { analysisRequestSchema, type AnalysisRequest, type AnalysisResult, type Keyword } from "@shared/schema";
import { openAIClient } from "@/services/openai-client.service";
import { validateApiKey, rateLimiter, ObfuscatedStorage } from "@/lib/security";
import { ApiKeyWarning } from "@/components/api-key-warning";
import { KeywordInput } from "@/components/keyword-input";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";
import { parseKeywords, countWords } from "@/lib/analysis";
import { Eye, EyeOff, Shield, Brain, HelpCircle } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";

interface AnalysisFormProps {
  onAnalysisComplete: (results: AnalysisResult, originalText: string, apiKey: string, competitorText?: string) => void;
  isAnalyzing: boolean;
  setIsAnalyzing: (analyzing: boolean) => void;
}

export function AnalysisForm({ onAnalysisComplete, isAnalyzing, setIsAnalyzing }: AnalysisFormProps) {
  const [showApiKey, setShowApiKey] = useState(false);
  const [parsedKeywords, setParsedKeywords] = useState<Keyword[]>([]);
  const [mainCopyWordCount, setMainCopyWordCount] = useState(0);
  const [competitorCopyWordCount, setCompetitorCopyWordCount] = useState(0);
  const [apiKeyError, setApiKeyError] = useState<string | null>(null);
  const [rateLimitError, setRateLimitError] = useState<string | null>(null);
  const { toast } = useToast();

  const form = useForm<AnalysisRequest & { keywordsRaw: string }>({
    resolver: zodResolver(analysisRequestSchema),
    defaultValues: {
      apiKey: "",
      keywords: [],
      keywordsRaw: "", // Add this
      mainCopy: "",
      competitorCopy: "",
      analysisMode: "full"
    }
  });

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
      ObfuscatedStorage.setItem('temp_api_key', data.apiKey);
      
      // Perform analysis
      const results = await openAIClient.analyze({
        ...data,
        keywords: parsedKeywords
      });
      
      onAnalysisComplete(results, data.mainCopy, data.apiKey, data.competitorCopy);
      
      toast({
        title: "Analysis Complete",
        description: `Processing completed in ${(results.processingTime / 1000).toFixed(1)} seconds`,
      });
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



  const handleMainCopyChange = (value: string) => {
    setMainCopyWordCount(countWords(value));
    form.setValue("mainCopy", value);
  };

  const handleCompetitorCopyChange = (value: string) => {
    setCompetitorCopyWordCount(countWords(value));
    form.setValue("competitorCopy", value);
  };

  // Clear session on unmount
  useEffect(() => {
    return () => {
      ObfuscatedStorage.removeItem('temp_api_key');
      openAIClient.destroy();
    };
  }, []);

  return (
    <>
      <ApiKeyWarning />
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-8">
        {/* API Key Section */}
        <Card className="bg-white rounded-lg border border-gray-200 shadow-sm">
          <CardHeader className="pb-4">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg font-semibold">API Configuration</CardTitle>
              <Badge variant="secondary" className="text-xs">
                <Shield className="h-3 w-3 mr-1" />
                Secure Session
              </Badge>
            </div>
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

        {/* Input Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Keywords Input */}
          <Card className="bg-white rounded-lg border border-gray-200 shadow-sm">
            <CardHeader className="pb-4">
              <CardTitle className="text-lg font-semibold">Target Keywords</CardTitle>
            </CardHeader>
            <CardContent>
              <KeywordInput
                value={form.watch("keywordsRaw") || ""}
                onChange={(value) => form.setValue("keywordsRaw", value)}
                keywords={parsedKeywords}
                onKeywordsChange={(keywords) => {
                  setParsedKeywords(keywords);
                  form.setValue("keywords", keywords);
                }}
              />
            </CardContent>
          </Card>

          {/* Analysis Settings */}
          <Card className="bg-white rounded-lg border border-gray-200 shadow-sm">
            <CardHeader className="pb-4">
              <CardTitle className="text-lg font-semibold">Analysis Settings</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <Label className="text-sm font-medium mb-3 block">Analysis Mode</Label>
                  <RadioGroup
                    defaultValue="full"
                    value={form.watch("analysisMode")}
                    onValueChange={(value) => form.setValue("analysisMode", value as "full" | "chunked")}
                    className="flex space-x-4"
                  >
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="full" id="full" />
                      <Label htmlFor="full" className="text-sm">Full Document</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="chunked" id="chunked" />
                      <Label htmlFor="chunked" className="text-sm">Chunked Analysis</Label>
                    </div>
                  </RadioGroup>
                  <p className="mt-2 text-xs text-muted-foreground">
                    Full mode analyzes the entire document. Chunked mode splits text into ~500-word sections for detailed analysis.
                  </p>
                </div>

                <div className="border-t pt-4">
                  <h4 className="text-sm font-medium mb-2">Processing Details</h4>
                  <div className="text-xs text-muted-foreground space-y-1">
                    <div className="flex justify-between">
                      <span>Model:</span>
                      <span className="font-medium">text-embedding-3-small</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Dimensions:</span>
                      <span className="font-medium">1,536</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Est. Cost:</span>
                      <span className="font-medium">~$0.0002/analysis</span>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Content Input Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Main Copy */}
          <Card className="bg-white rounded-lg border border-gray-200 shadow-sm">
            <CardHeader className="pb-4">
              <CardTitle className="text-lg font-semibold">Your Content</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <Textarea
                  placeholder="Paste your content here for analysis..."
                  rows={12}
                  onChange={(e) => handleMainCopyChange(e.target.value)}
                  className="resize-none"
                />
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>{mainCopyWordCount} words</span>
                  <span>Max: 4,000 words</span>
                </div>
                {form.formState.errors.mainCopy && (
                  <p className="text-xs text-destructive">{form.formState.errors.mainCopy.message}</p>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Competitor Copy */}
          <Card className="bg-white rounded-lg border border-gray-200 shadow-sm">
            <CardHeader className="pb-4">
              <CardTitle className="text-lg font-semibold">Competitor Content</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <Textarea
                  placeholder="Paste competitor content here for comparison..."
                  rows={12}
                  onChange={(e) => handleCompetitorCopyChange(e.target.value)}
                  className="resize-none"
                />
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>{competitorCopyWordCount} words</span>
                  <span>Max: 4,000 words</span>
                </div>
                {form.formState.errors.competitorCopy && (
                  <p className="text-xs text-destructive">{form.formState.errors.competitorCopy.message}</p>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Analyze Button */}
        <div className="flex justify-center">
          <Button
            type="submit"
            size="lg"
                        disabled={isAnalyzing || parsedKeywords.length === 0}
            className="px-8 py-3 text-base shadow-lg"
          >
            <Brain className="h-5 w-5 mr-2" />
            {isAnalyzing ? "Analyzing..." : "Analyze Semantic Similarity"}
          </Button>
        </div>
      </form>
    </>
  );
}
