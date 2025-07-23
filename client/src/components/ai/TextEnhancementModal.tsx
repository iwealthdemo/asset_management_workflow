import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, Sparkles, RefreshCw, Check, X } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";

interface TextEnhancementModalProps {
  isOpen: boolean;
  onClose: () => void;
  originalText: string;
  onApply: (enhancedText: string) => void;
}

type EnhancementType = 'professional' | 'grammar' | 'clarity' | 'rewrite';

interface Enhancement {
  type: EnhancementType;
  text: string;
  loading: boolean;
}

export function TextEnhancementModal({ 
  isOpen, 
  onClose, 
  originalText, 
  onApply 
}: TextEnhancementModalProps) {
  const [enhancedText, setEnhancedText] = useState<string>('');
  const [isEnhancing, setIsEnhancing] = useState(false);
  const [selectedEnhancement, setSelectedEnhancement] = useState<string>('');

  // Single comprehensive enhancement that includes all improvements

  const handleEnhance = async () => {
    if (!originalText.trim()) return;

    setIsEnhancing(true);

    try {
      const response = await apiRequest('POST', '/api/text/enhance', {
        text: originalText,
        type: 'professional' // Type doesn't matter as backend uses single comprehensive prompt
      }) as unknown as { enhancedText: string };

      setEnhancedText(response.enhancedText);
    } catch (error) {
      console.error('Enhancement failed:', error);
      setEnhancedText('');
    } finally {
      setIsEnhancing(false);
    }
  };

  const handleApply = (text: string) => {
    onApply(text);
    onClose();
  };

  // Single enhancement function replaces "Enhance All"

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            AI Text Enhancement
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Original Text */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <h3 className="font-medium">Original Text</h3>
              <Button 
                onClick={handleEnhance}
                size="sm"
                className="gap-2"
                disabled={!originalText.trim() || isEnhancing}
              >
                {isEnhancing ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Sparkles className="h-4 w-4" />
                )}
                Enhance Text
              </Button>
            </div>
            <Textarea 
              value={originalText}
              readOnly
              className="min-h-[100px] bg-muted"
            />
          </div>

          {/* Enhancement Features Description */}
          <div className="bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
            <h4 className="font-medium text-blue-900 dark:text-blue-100 mb-2">
              Comprehensive AI Enhancement
            </h4>
            <p className="text-sm text-blue-700 dark:text-blue-300 mb-2">
              Our AI will improve your text by:
            </p>
            <ul className="text-sm text-blue-700 dark:text-blue-300 space-y-1">
              <li>• <strong>Grammar & Language:</strong> Fix spelling, grammar, and vocabulary issues</li>
              <li>• <strong>Professional Tone:</strong> Convert to formal business terminology</li>
              <li>• <strong>Clarity & Structure:</strong> Improve readability and organization</li>
              <li>• <strong>Content Preservation:</strong> Keep all key facts and data intact</li>
            </ul>
          </div>

          {/* Enhanced Text Result */}
          {isEnhancing ? (
            <div className="flex items-center justify-center py-12 text-muted-foreground">
              <Loader2 className="h-8 w-8 animate-spin mr-3" />
              <div>
                <p className="font-medium">Enhancing your text...</p>
                <p className="text-sm">This may take a few seconds</p>
              </div>
            </div>
          ) : enhancedText ? (
            <div className="space-y-4">
              <h3 className="font-medium">Enhanced Text</h3>
              <Textarea 
                value={enhancedText}
                readOnly
                className="min-h-[120px] bg-green-50 dark:bg-green-950/20 border-green-200 dark:border-green-800"
              />
              <div className="flex gap-2">
                <Button
                  onClick={() => handleApply(enhancedText)}
                  className="gap-2"
                >
                  <Check className="h-4 w-4" />
                  Apply Enhancement
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setSelectedEnhancement(enhancedText)}
                >
                  Preview Changes
                </Button>
                <Button
                  variant="outline"
                  onClick={handleEnhance}
                  disabled={isEnhancing}
                >
                  <RefreshCw className="h-4 w-4" />
                  Re-enhance
                </Button>
              </div>
            </div>
          ) : originalText.trim() ? (
            <div className="py-12 text-center text-muted-foreground border-2 border-dashed rounded-lg">
              <Sparkles className="h-12 w-12 mx-auto mb-4 text-primary/50" />
              <p className="font-medium">Ready to enhance your text</p>
              <p className="text-sm">Click "Enhance Text" to improve grammar, tone, and clarity</p>
            </div>
          ) : (
            <div className="py-12 text-center text-muted-foreground border-2 border-dashed rounded-lg">
              <p>Enter some text above to get started</p>
            </div>
          )}

          {/* Preview Section */}
          {selectedEnhancement && (
            <div className="border-t pt-4">
              <h3 className="font-medium mb-2">Side-by-Side Comparison</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <h4 className="text-sm font-medium mb-2 text-muted-foreground">Original</h4>
                  <Textarea 
                    value={originalText}
                    readOnly
                    className="min-h-[120px] bg-muted"
                  />
                </div>
                <div>
                  <h4 className="text-sm font-medium mb-2 text-green-600 dark:text-green-400">Enhanced</h4>
                  <Textarea 
                    value={selectedEnhancement}
                    readOnly
                    className="min-h-[120px] bg-green-50 dark:bg-green-950/20 border-green-200 dark:border-green-800"
                  />
                </div>
              </div>
              <div className="flex gap-2 mt-4">
                <Button
                  onClick={() => handleApply(selectedEnhancement)}
                  className="gap-2"
                >
                  <Check className="h-4 w-4" />
                  Apply Enhancement
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setSelectedEnhancement('')}
                >
                  <X className="h-4 w-4" />
                  Close Preview
                </Button>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}