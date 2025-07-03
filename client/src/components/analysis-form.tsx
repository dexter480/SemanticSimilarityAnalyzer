import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { analysisRequestSchema, type AnalysisRequest, type AnalysisResult, type Keyword } from "@shared/schema";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { parseKeywords, countWords } from "@/lib/analysis";
import { Eye, EyeOff, Shield, Brain, HelpCircle } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";

interface AnalysisFormProps {
  onAnalysisComplete: (results: AnalysisResult) => void;
  isAnalyzing: boolean;
  setIsAnalyzing: (analyzing: boolean) => void;
}

export function AnalysisForm({ onAnalysisComplete, isAnalyzing, setIsAnalyzing }: AnalysisFormProps) {
  const [showApiKey, setShowApiKey] = useState(false);
  const [parsedKeywords, setParsedKeywords] = useState<Keyword[]>([]);
  const [mainCopyWordCount, setMainCopyWordCount] = useState(0);
  const [competitorCopyWordCount, setCompetitorCopyWordCount] = useState(0);
  const { toast } = useToast();

  const form = useForm<AnalysisRequest>({
    resolver: zodResolver(analysisRequestSchema),
    defaultValues: {
      apiKey: "",
      keywords: [],
      mainCopy: "",
      competitorCopy: "",
      analysisMode: "full"
    }
  });

  const analysisMutation = useMutation({
    mutationFn: async (data: AnalysisRequest) => {
      const response = await apiRequest("POST", "/api/analyze", data);
      return response.json() as Promise<AnalysisResult>;
    },
    onSuccess: (results) => {
      onAnalysisComplete(results);
      toast({
        title: "Analysis Complete",
        description: `Processing completed in ${(results.processingTime / 1000).toFixed(1)} seconds`,
      });
    },
    onError: (error: any) => {
      setIsAnalyzing(false);
      toast({
        title: "Analysis Failed",
        description: error.message || "An error occurred during analysis",
        variant: "destructive",
      });
    }
  });

  const onSubmit = (data: AnalysisRequest) => {
    console.log("Form submitted with data:", data);
    console.log("Analysis mode:", data.analysisMode);
    setIsAnalyzing(true);
    analysisMutation.mutate({
      ...data,
      keywords: parsedKeywords
    });
  };

  const handleKeywordsChange = (value: string) => {
    const keywords = parseKeywords(value);
    setParsedKeywords(keywords);
    form.setValue("keywords", keywords);
  };

  const handleMainCopyChange = (value: string) => {
    setMainCopyWordCount(countWords(value));
    form.setValue("mainCopy", value);
  };

  const handleCompetitorCopyChange = (value: string) => {
    setCompetitorCopyWordCount(countWords(value));
    form.setValue("competitorCopy", value);
  };

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
      {/* API Key Section */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>API Configuration</CardTitle>
            <div className="flex items-center text-sm text-muted-foreground">
              <Shield className="h-4 w-4 mr-1" />
              Session only - never stored
            </div>
          </div>
        </CardHeader>
        <CardContent>
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
            <p className="text-xs text-muted-foreground">Required format: starts with 'sk-'</p>
            {form.formState.errors.apiKey && (
              <p className="text-xs text-destructive">{form.formState.errors.apiKey.message}</p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Input Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Keywords Input */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Target Keywords</CardTitle>
              <Dialog>
                <DialogTrigger asChild>
                  <Button variant="ghost" size="sm">
                    <HelpCircle className="h-4 w-4 mr-1" />
                    Help
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Keyword Format Help</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div>
                      <h4 className="font-medium">Simple Format:</h4>
                      <p className="text-sm text-muted-foreground">SEO, content marketing, digital strategy</p>
                    </div>
                    <div>
                      <h4 className="font-medium">Weighted Format:</h4>
                      <p className="text-sm text-muted-foreground">SEO:3, content marketing:2, digital strategy:1</p>
                    </div>
                    <div>
                      <h4 className="font-medium">Rules:</h4>
                      <ul className="text-sm text-muted-foreground list-disc list-inside space-y-1">
                        <li>Separate keywords with commas or new lines</li>
                        <li>Default weight is 1.0 if not specified</li>
                        <li>Weights can be 0.1 to 10.0</li>
                        <li>Maximum 50 keywords allowed</li>
                      </ul>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <Textarea
                  placeholder="Enter keywords separated by commas or new lines&#10;&#10;Examples:&#10;Simple: SEO, content marketing, digital strategy&#10;Weighted: SEO:3, content marketing:2, digital strategy:1"
                  rows={6}
                  onChange={(e) => handleKeywordsChange(e.target.value)}
                  className="resize-none"
                />
                <div className="mt-2 flex justify-between text-xs text-muted-foreground">
                  <span>{parsedKeywords.length} keywords parsed</span>
                  <span>Max: 50 keywords</span>
                </div>
              </div>

              {parsedKeywords.length > 0 && (
                <div className="border-t pt-4">
                  <h4 className="text-sm font-medium text-foreground mb-2">Parsed Keywords:</h4>
                  <div className="flex flex-wrap gap-2">
                    {parsedKeywords.map((keyword, index) => (
                      <Badge 
                        key={index} 
                        variant={keyword.weight > 1 ? "default" : "secondary"}
                        className="text-xs"
                      >
                        {keyword.text}
                        {keyword.weight !== 1 && (
                          <span className="ml-1 font-semibold">×{keyword.weight}</span>
                        )}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Analysis Settings */}
        <Card>
          <CardHeader>
            <CardTitle>Analysis Settings</CardTitle>
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
                  Chunked mode splits text into ~500-word sections for detailed analysis
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
        <Card>
          <CardHeader>
            <CardTitle>Your Content</CardTitle>
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
        <Card>
          <CardHeader>
            <CardTitle>Competitor Content</CardTitle>
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
  );
}
