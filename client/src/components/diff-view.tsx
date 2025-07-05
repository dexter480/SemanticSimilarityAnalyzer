import { DiffSegment, calculateContextualDiff } from "@/lib/text-analysis";
import { type SectionImprovement } from "@shared/schema";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Info } from "lucide-react";

interface DiffViewProps {
  original: string;
  enhanced: string;
  improvements: SectionImprovement[];
}

export function DiffView({ original, enhanced, improvements }: DiffViewProps) {
  const diff = calculateContextualDiff(original, enhanced, improvements);
  
  return (
    <TooltipProvider>
      <div className="space-y-4">
        <div className="p-4 bg-white rounded-lg border">
          <div className="prose prose-sm max-w-none leading-relaxed">
            {diff.map((segment, index) => (
              <span key={index} className="inline">
                {segment.type === 'unchanged' && (
                  <span className="text-gray-700">{segment.text}</span>
                )}
                {segment.type === 'removed' && (
                  <span className="bg-red-100 text-red-700 line-through px-1 rounded">
                    {segment.text}
                  </span>
                )}
                {segment.type === 'added' && (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <span className="bg-green-100 text-green-700 px-2 py-1 rounded font-medium cursor-help border-b-2 border-green-300">
                        {segment.text}
                        <Info className="inline h-3 w-3 ml-1" />
                      </span>
                    </TooltipTrigger>
                    <TooltipContent className="max-w-xs">
                      <div className="space-y-2">
                        {segment.keywordAdded && (
                          <div>
                            <strong>Keyword Added:</strong> {segment.keywordAdded}
                          </div>
                        )}
                        {segment.reason && (
                          <div>
                            <strong>Reason:</strong> {segment.reason}
                          </div>
                        )}
                        {segment.context && (
                          <div className="text-xs text-muted-foreground">
                            <strong>Context:</strong> ...{segment.context.before} <mark>[NEW]</mark> {segment.context.after}...
                          </div>
                        )}
                      </div>
                    </TooltipContent>
                  </Tooltip>
                )}
                {index < diff.length - 1 && ' '}
              </span>
            ))}
          </div>
        </div>
        
        {/* Enhancement Summary */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h4 className="font-medium text-blue-900 mb-2">Enhancement Summary</h4>
          <div className="space-y-2 text-sm">
            {improvements.map((improvement, index) => (
              <div key={index} className="flex items-start gap-2">
                <Badge variant="outline" className="text-xs">
                  {improvement.section}
                </Badge>
                <div>
                  <span className="text-blue-800">
                    Added keywords: {improvement.missingKeywords.join(', ')}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
        
        {/* Legend */}
        <div className="flex gap-4 text-xs text-muted-foreground">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-gray-100 border border-gray-200 rounded" />
            <span>Unchanged text</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-green-100 border border-green-200 rounded" />
            <span>AI additions (hover for details)</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-red-100 border border-red-200 rounded" />
            <span>Removed text</span>
          </div>
        </div>
      </div>
    </TooltipProvider>
  );
} 