import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertTriangle, Shield, DollarSign, Lock } from "lucide-react";
import { useState } from "react";

export function ApiKeyWarning() {
  const [dismissed, setDismissed] = useState(false);

  if (dismissed) return null;

  return (
    <Alert className="mb-6 border-orange-200 bg-orange-50 relative">
      <AlertTriangle className="h-5 w-5 text-orange-600" />
      <AlertTitle className="text-orange-800">Important Security & Cost Information</AlertTitle>
      <AlertDescription className="mt-3 space-y-3">
        <div className="flex items-start gap-2">
          <Lock className="h-4 w-4 text-orange-600 mt-0.5" />
          <div className="text-sm text-orange-700">
            <strong>Security:</strong> Your OpenAI API key is processed entirely in your browser. 
            We never store, log, or transmit your API key to any server.
          </div>
        </div>
        
        <div className="flex items-start gap-2">
          <DollarSign className="h-4 w-4 text-orange-600 mt-0.5" />
          <div className="text-sm text-orange-700">
            <strong>Costs:</strong> Each analysis costs approximately $0.0002. 
            You are responsible for all charges incurred on your OpenAI account.
          </div>
        </div>
        
        <div className="flex items-start gap-2">
          <Shield className="h-4 w-4 text-orange-600 mt-0.5" />
          <div className="text-sm text-orange-700">
            <strong>Best Practices:</strong>
            <ul className="list-disc list-inside mt-1 space-y-1">
              <li>Use API keys with limited permissions when possible</li>
              <li>Set usage limits in your OpenAI account</li>
              <li>Monitor your API usage regularly</li>
              <li>Never share your API key with others</li>
            </ul>
          </div>
        </div>
        
        <button
          onClick={() => setDismissed(true)}
          className="absolute top-2 right-2 text-orange-600 hover:text-orange-800"
          aria-label="Dismiss warning"
        >
          ×
        </button>
      </AlertDescription>
    </Alert>
  );
} 