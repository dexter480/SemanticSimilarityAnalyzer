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