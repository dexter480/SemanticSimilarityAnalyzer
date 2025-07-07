import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

export function PrivacyPolicy({ open, onClose }: { open: boolean; onClose: () => void }) {
  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Privacy Policy</DialogTitle>
        </DialogHeader>
        <div className="prose prose-sm max-w-none">
          <h3>Last Updated: {new Date().toLocaleDateString()}</h3>
          
          <h4>1. Information We Don't Collect</h4>
          <p>
            This tool is designed with privacy-first principles. We do NOT collect, store, or transmit:
          </p>
          <ul>
            <li>Your OpenAI API keys</li>
            <li>Your content or competitor content</li>
            <li>Your analysis results</li>
            <li>Personal information</li>
          </ul>

          <h4>2. How the Tool Works</h4>
          <p>
            All processing happens entirely in your web browser:
          </p>
          <ul>
            <li>Your API key is used only for direct communication with OpenAI</li>
            <li>No data passes through our servers</li>
            <li>All data is cleared when you close the browser tab</li>
          </ul>

          <h4>3. Third-Party Services</h4>
          <p>
            This tool communicates directly with:
          </p>
          <ul>
            <li><strong>OpenAI API:</strong> For generating embeddings and analysis</li>
            <li><strong>Netlify:</strong> For hosting static files only</li>
          </ul>

          <h4>4. Browser Storage</h4>
          <p>
            We use browser session storage for:
          </p>
          <ul>
            <li>Temporarily holding your API key during analysis</li>
            <li>Storing analysis state during your session</li>
          </ul>
          <p>
            This data is automatically deleted when you close the browser tab.
          </p>

          <h4>5. Security Measures</h4>
          <ul>
            <li>All connections use HTTPS encryption</li>
            <li>Client-side only architecture</li>
            <li>No server-side data processing</li>
            <li>Regular security updates</li>
          </ul>

          <h4>6. Your Rights</h4>
          <p>
            Since we don't collect any data, there is no personal data to access, modify, or delete.
          </p>

          <h4>7. Changes to This Policy</h4>
          <p>
            We may update this policy. Check the "Last Updated" date for changes.
          </p>

          <h4>8. Contact</h4>
          <p>
            For privacy questions: privacy@example.com
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
} 