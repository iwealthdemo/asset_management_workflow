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
  const [enhancements, setEnhancements] = useState<Enhancement[]>([
    { type: 'professional', text: '', loading: false },
    { type: 'grammar', text: '', loading: false },
    { type: 'clarity', text: '', loading: false },
    { type: 'rewrite', text: '', loading: false }
  ]);
  const [selectedEnhancement, setSelectedEnhancement] = useState<string>('');

  const enhancementLabels = {
    professional: 'Professional Tone',
    grammar: 'Grammar & Vocabulary',
    clarity: 'Clarity & Structure',
    rewrite: 'Complete Rewrite'
  };

  const enhancementDescriptions = {
    professional: 'Make language more formal and business-appropriate',
    grammar: 'Fix spelling, grammar, and vocabulary issues',
    clarity: 'Improve readability and structure',
    rewrite: 'Restructure for maximum impact and persuasiveness'
  };

  const handleEnhance = async (type: EnhancementType) => {
    if (!originalText.trim()) return;

    setEnhancements(prev => 
      prev.map(e => e.type === type ? { ...e, loading: true } : e)
    );

    try {
      const response = await apiRequest('POST', '/api/text/enhance', {
        text: originalText,
        type: type
      }) as { enhancedText: string };

      setEnhancements(prev => 
        prev.map(e => e.type === type ? { ...e, text: response.enhancedText, loading: false } : e)
      );
    } catch (error) {
      console.error('Enhancement failed:', error);
      setEnhancements(prev => 
        prev.map(e => e.type === type ? { ...e, loading: false } : e)
      );
    }
  };

  const handleApply = (text: string) => {
    onApply(text);
    onClose();
  };

  const handleEnhanceAll = async () => {
    if (!originalText.trim()) return;
    
    const types: EnhancementType[] = ['professional', 'grammar', 'clarity', 'rewrite'];
    
    // Set all to loading
    setEnhancements(prev => 
      prev.map(e => ({ ...e, loading: true }))
    );

    // Process all enhancements in parallel
    const promises = types.map(async (type) => {
      try {
        const response = await apiRequest('POST', '/api/text/enhance', {
          text: originalText,
          type: type
        }) as { enhancedText: string };
        return { type, text: response.enhancedText };
      } catch (error) {
        console.error(`Enhancement failed for ${type}:`, error);
        return { type, text: '' };
      }
    });

    const results = await Promise.all(promises);
    
    setEnhancements(prev => 
      prev.map(e => {
        const result = results.find(r => r.type === e.type);
        return { ...e, text: result?.text || '', loading: false };
      })
    );
  };

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
                onClick={handleEnhanceAll}
                size="sm"
                className="gap-2"
                disabled={!originalText.trim() || enhancements.some(e => e.loading)}
              >
                {enhancements.some(e => e.loading) ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Sparkles className="h-4 w-4" />
                )}
                Enhance All
              </Button>
            </div>
            <Textarea 
              value={originalText}
              readOnly
              className="min-h-[100px] bg-muted"
            />
          </div>

          {/* Enhancement Options */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {enhancements.map((enhancement) => (
              <div key={enhancement.type} className="border rounded-lg p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <Badge variant="secondary" className="mb-1">
                      {enhancementLabels[enhancement.type]}
                    </Badge>
                    <p className="text-sm text-muted-foreground">
                      {enhancementDescriptions[enhancement.type]}
                    </p>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleEnhance(enhancement.type)}
                    disabled={!originalText.trim() || enhancement.loading}
                  >
                    {enhancement.loading ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <RefreshCw className="h-4 w-4" />
                    )}
                  </Button>
                </div>

                {enhancement.loading ? (
                  <div className="flex items-center justify-center py-8 text-muted-foreground">
                    <Loader2 className="h-6 w-6 animate-spin mr-2" />
                    Enhancing...
                  </div>
                ) : enhancement.text ? (
                  <div className="space-y-2">
                    <Textarea 
                      value={enhancement.text}
                      readOnly
                      className="min-h-[100px] bg-green-50 dark:bg-green-950/20 border-green-200 dark:border-green-800"
                    />
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        onClick={() => handleApply(enhancement.text)}
                        className="gap-2"
                      >
                        <Check className="h-4 w-4" />
                        Apply This
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setSelectedEnhancement(enhancement.text)}
                      >
                        Preview
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="py-8 text-center text-muted-foreground">
                    Click enhance to see AI suggestions
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Preview Section */}
          {selectedEnhancement && (
            <div className="border-t pt-4">
              <h3 className="font-medium mb-2">Preview</h3>
              <Textarea 
                value={selectedEnhancement}
                readOnly
                className="min-h-[120px] bg-blue-50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-800"
              />
              <div className="flex gap-2 mt-2">
                <Button
                  onClick={() => handleApply(selectedEnhancement)}
                  className="gap-2"
                >
                  <Check className="h-4 w-4" />
                  Apply This Version
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