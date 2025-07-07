import { useState, useEffect } from "react";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { 
  Tooltip, 
  TooltipContent, 
  TooltipProvider, 
  TooltipTrigger 
} from "@/components/ui/tooltip";
import { Target, List, Sparkles, X } from "lucide-react";
import { type Keyword, type KeywordRole } from "@shared/schema";

interface KeywordInputProps {
  value: string;
  onChange: (value: string) => void;
  keywords: Keyword[];
  onKeywordsChange: (keywords: Keyword[]) => void;
}

// Map roles to weights for backend calculation
const roleToWeight = (role: KeywordRole): number => {
  return role === 'main' ? 3 : 1;
};

export function KeywordInput({ value, onChange, keywords, onKeywordsChange }: KeywordInputProps) {
  const [editMode, setEditMode] = useState(false);
  const [keywordRoles, setKeywordRoles] = useState<Keyword[]>([]);

  // Parse keywords when textarea value actually changes (not when roles change internally)
  useEffect(() => {
    // Only re-parse the textarea if its text has actually changed compared to our current keyword list
    const currentText = keywordRoles.map(k => k.text).join(', ');
    if (value === currentText) return; // nothing new – keep existing roles

    if (!value.trim()) {
      setKeywordRoles([]);
      onKeywordsChange([]);
      return;
    }

    const lines = value.split(/[\n,]/);
      const parsed: Keyword[] = [];
      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed) continue;
        parsed.push({ 
          text: trimmed, 
        role: 'supporting',
        weight: 1,
        });
      }
    const limited = parsed.slice(0, 50);
    setKeywordRoles(limited);
    onKeywordsChange(limited);
  }, [value]);

  const updateRole = (index: number, newRole: KeywordRole) => {
    const updated = [...keywordRoles];
    
    // Enforce "only one main topic" rule
    if (newRole === 'main') {
      // Set all others to supporting
      updated.forEach((k, i) => {
        if (i !== index) {
          k.role = 'supporting';
          k.weight = roleToWeight('supporting');
        }
      });
    }
    
    updated[index].role = newRole;
    updated[index].weight = roleToWeight(newRole);
    
    setKeywordRoles(updated);
    onKeywordsChange(updated);
    
    // We deliberately do NOT update the textarea content here because the text itself hasn’t changed –
    // only the roles have. Avoiding that change prevents a re-parse that would wipe our roles.
  };

  const setAllSupporting = () => {
    const updated = keywordRoles.map(k => ({
      ...k,
      role: 'supporting' as KeywordRole,
      weight: roleToWeight('supporting')
    }));
    
    setKeywordRoles(updated);
    onKeywordsChange(updated);
  };

  const setFirstAsMain = () => {
    if (keywordRoles.length === 0) return;
    
    const updated = keywordRoles.map((k, i) => ({
      ...k,
      role: (i === 0 ? 'main' : 'supporting') as KeywordRole,
      weight: roleToWeight(i === 0 ? 'main' : 'supporting')
    }));
    
    setKeywordRoles(updated);
    onKeywordsChange(updated);
  };

  const mainTopic = keywordRoles.find(k => k.role === 'main');
  const supportingTopics = keywordRoles.filter(k => k.role === 'supporting');

  // Auto-enable edit mode when keywords are present
  useEffect(() => {
    if (keywordRoles.length > 0 && !editMode) {
      setEditMode(true);
    }
  }, [keywordRoles.length]);

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label>Target Keywords</Label>
          <div className="flex items-center gap-2">
            {keywordRoles.length > 0 && (
              <Button
                size="sm"
                variant={editMode ? "default" : "outline"}
                onClick={() => setEditMode(!editMode)}
              >
                <Sparkles className="h-3 w-3 mr-1" />
                {editMode ? "Preview" : "Set Topic Roles"}
              </Button>
            )}
          </div>
        </div>
        
        <textarea
          className="w-full min-h-[120px] px-3 py-2 text-sm border rounded-md resize-none focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
          placeholder="Enter keywords separated by commas or new lines&#10;&#10;Examples:&#10;• AI in content marketing&#10;• practical tips for content creation&#10;• content marketing automation&#10;&#10;After adding keywords, you can set one as your main topic and others as supporting topics."
          value={value}
          onChange={(e) => onChange(e.target.value)}
        />
        
        <div className="flex items-center justify-between text-xs text-gray-600">
          <span>{keywordRoles.length} keywords</span>
          <span>Max: 50 keywords</span>
        </div>
      </div>

      {/* Topic Roles Preview */}
      {keywordRoles.length > 0 && (
        <Card className="p-4 bg-gray-50 border-gray-200">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-medium">Topic Roles</h4>
              {editMode && (
                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={setAllSupporting}
                    className="text-xs h-8"
                  >
                    All Supporting
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={setFirstAsMain}
                    className="text-xs h-8"
                  >
                    First as Main
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => setEditMode(false)}
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </div>
              )}
            </div>

            {editMode ? (
              <div className="space-y-3">
                {keywordRoles.map((keyword, index) => (
                  <div key={`${keyword.text}-${index}`} className="flex items-center justify-between p-3 bg-white rounded-md border">
                    <div className="flex items-center gap-2">
                      {keyword.role === 'main' ? (
                        <Target className="h-4 w-4 text-blue-600" />
                      ) : (
                        <List className="h-4 w-4 text-gray-500" />
                      )}
                      <span className="font-medium text-sm">{keyword.text}</span>
                    </div>
                    
                    {/* Simple native select - much more reliable */}
                    <select
                      value={keyword.role}
                      onChange={(e) => updateRole(index, e.target.value as KeywordRole)}
                      className="w-[130px] h-8 px-2 text-sm border rounded bg-white focus:outline-none focus:ring-2 focus:ring-primary"
                    >
                      <option value="supporting">Supporting</option>
                      <option value="main">Main Topic</option>
                    </select>
                  </div>
                ))}
                
                {keywordRoles.length > 0 && !mainTopic && (
                  <div className="text-xs text-amber-600 bg-amber-50 p-2 rounded-md border border-amber-200">
                    💡 Tip: Select one keyword as your "Main Topic" for better content focus
                  </div>
                )}
              </div>
            ) : (
              <div className="space-y-3">
                {/* Main Topic Display */}
                {mainTopic && (
                  <div className="bg-blue-50 border border-blue-200 rounded-md p-3">
                    <div className="flex items-center gap-2 mb-1">
                      <Target className="h-4 w-4 text-blue-600" />
                      <span className="text-xs font-medium text-blue-800 uppercase tracking-wide">Main Topic</span>
                    </div>
                    <Badge variant="default" className="text-sm">
                      {mainTopic.text}
                    </Badge>
                  </div>
                )}

                {/* Supporting Topics Display */}
                {supportingTopics.length > 0 && (
                  <div className="bg-gray-50 border border-gray-200 rounded-md p-3">
                    <div className="flex items-center gap-2 mb-2">
                      <List className="h-4 w-4 text-gray-500" />
                      <span className="text-xs font-medium text-gray-600 uppercase tracking-wide">Supporting Topics</span>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {supportingTopics.map((keyword, index) => (
                        <Badge key={index} variant="secondary" className="text-xs">
                          {keyword.text}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                {/* Explanation */}
                <div className="text-xs text-gray-600 bg-white p-3 rounded-md border">
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <div className="cursor-help">
                          <strong>How this affects your analysis:</strong>
                          <br />
                          {mainTopic 
                            ? `Your content will be scored primarily on how well it covers "${mainTopic.text}" with supporting context from your other topics.`
                            : "All topics will be weighted equally in the analysis."
                          }
                        </div>
                      </TooltipTrigger>
                      <TooltipContent side="top" className="max-w-xs">
                        <p className="text-xs">
                          The analysis tool looks for semantic similarity between your content and these topics. 
                          Your main topic gets 3x more influence in the final similarity score.
                        </p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </div>
              </div>
            )}
          </div>
        </Card>
      )}
    </div>
  );
} 