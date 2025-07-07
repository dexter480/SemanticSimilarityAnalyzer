import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

export function TermsOfService({ open, onClose }: { open: boolean; onClose: () => void }) {
  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Terms of Service</DialogTitle>
        </DialogHeader>
        <div className="prose prose-sm max-w-none">
          <h3>Last Updated: {new Date().toLocaleDateString()}</h3>
          
          <h4>1. Acceptance of Terms</h4>
          <p>
            By using this Semantic Similarity Analysis Tool ("Service"), you agree to these Terms of Service.
            If you do not agree, please do not use the Service.
          </p>

          <h4>2. Service Description</h4>
          <p>
            This Service provides semantic similarity analysis using OpenAI's API. You must provide your own
            OpenAI API key, and you are responsible for all associated costs.
          </p>

          <h4>3. User Responsibilities</h4>
          <ul>
            <li>You are solely responsible for your OpenAI API key security</li>
            <li>You must monitor and manage your own API usage and costs</li>
            <li>You agree not to use the Service for any illegal or harmful purposes</li>
            <li>You will not attempt to reverse engineer or compromise the Service</li>
          </ul>

          <h4>4. Privacy and Data Handling</h4>
          <ul>
            <li>Your API key is processed only in your browser</li>
            <li>We do not store, log, or transmit your API key or content</li>
            <li>All processing occurs client-side for your security</li>
          </ul>

          <h4>5. Disclaimer of Warranties</h4>
          <p>
            THE SERVICE IS PROVIDED "AS IS" WITHOUT WARRANTIES OF ANY KIND. WE DISCLAIM ALL WARRANTIES,
            EXPRESS OR IMPLIED, INCLUDING MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE.
          </p>

          <h4>6. Limitation of Liability</h4>
          <p>
            IN NO EVENT SHALL WE BE LIABLE FOR ANY INDIRECT, INCIDENTAL, SPECIAL, OR CONSEQUENTIAL DAMAGES,
            INCLUDING BUT NOT LIMITED TO LOSS OF PROFITS, DATA, OR API CREDITS.
          </p>

          <h4>7. API Usage and Costs</h4>
          <p>
            You acknowledge that:
          </p>
          <ul>
            <li>Each analysis incurs costs on your OpenAI account</li>
            <li>We are not responsible for any charges you incur</li>
            <li>OpenAI's terms of service also apply to your usage</li>
          </ul>

          <h4>8. Modifications</h4>
          <p>
            We reserve the right to modify these terms at any time. Continued use constitutes acceptance
            of modified terms.
          </p>

          <h4>9. Contact</h4>
          <p>
            For questions about these terms, contact: support@example.com
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
} 