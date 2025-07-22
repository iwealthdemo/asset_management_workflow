import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { FileText, Sparkles, User, Brain, Loader2 } from 'lucide-react';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';

interface InvestmentRationaleModalProps {
  isOpen: boolean;
  onClose: () => void;
  investmentId: number;
  investmentType?: string;
}

const InvestmentRationaleModal: React.FC<InvestmentRationaleModalProps> = ({
  isOpen,
  onClose,
  investmentId,
  investmentType = 'equity'
}) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState('manual');
  const [manualContent, setManualContent] = useState('');
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>('');

  // Fetch templates for AI generation
  const { data: templates } = useQuery({
    queryKey: ['/api/templates/investment'],
    queryFn: async () => {
      const response = await fetch('/api/templates/investment', {
        credentials: 'include'
      });
      if (!response.ok) {
        throw new Error('Failed to fetch templates');
      }
      return response.json();
    },
    enabled: isOpen
  });

  // Create rationale mutation
  const createRationaleMutation = useMutation({
    mutationFn: async (data: { content: string; type: 'manual' | 'ai_generated'; templateId?: number }) => {
      return apiRequest(`/api/investments/${investmentId}/rationales`, 'POST', data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/investments/${investmentId}/rationales`] });
      toast({
        title: "Rationale Added",
        description: "Investment rationale has been added successfully.",
      });
      onClose();
      setManualContent('');
      setSelectedTemplateId('');
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to add investment rationale.",
        variant: "destructive",
      });
    },
  });

  // Generate AI rationale mutation
  const generateAIRationaleMutation = useMutation({
    mutationFn: async (templateId: number) => {
      return apiRequest(`/api/investments/${investmentId}/rationales/generate`, 'POST', { templateId });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/investments/${investmentId}/rationales`] });
      toast({
        title: "AI Rationale Generated",
        description: "AI-powered investment rationale has been generated successfully.",
      });
      onClose();
      setSelectedTemplateId('');
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to generate AI rationale.",
        variant: "destructive",
      });
    },
  });

  const handleManualSubmit = () => {
    if (!manualContent.trim()) {
      toast({
        title: "Error",
        description: "Please enter rationale content.",
        variant: "destructive",
      });
      return;
    }

    createRationaleMutation.mutate({
      content: manualContent,
      type: 'manual'
    });
  };

  const handleAIGenerate = () => {
    if (!selectedTemplateId) {
      toast({
        title: "Error",
        description: "Please select a template for AI generation.",
        variant: "destructive",
      });
      return;
    }

    generateAIRationaleMutation.mutate(parseInt(selectedTemplateId));
  };

  const filteredTemplates = templates?.filter((template: any) => 
    template.investmentType === investmentType || template.investmentType === 'general'
  ) || [];

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Add Investment Rationale
          </DialogTitle>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="manual" className="flex items-center gap-2">
              <User className="h-4 w-4" />
              Manual Entry
            </TabsTrigger>
            <TabsTrigger value="ai" className="flex items-center gap-2">
              <Sparkles className="h-4 w-4" />
              AI Generation
            </TabsTrigger>
          </TabsList>

          <TabsContent value="manual" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <User className="h-5 w-5" />
                  Manual Rationale Entry
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <label className="text-sm font-medium mb-2 block">
                    Investment Rationale Content
                  </label>
                  <Textarea
                    placeholder="Enter your investment rationale, including analysis, risk assessment, expected returns, and justification for this investment..."
                    value={manualContent}
                    onChange={(e) => setManualContent(e.target.value)}
                    rows={12}
                    className="min-h-[300px]"
                  />
                  <p className="text-sm text-gray-500 mt-2">
                    Provide comprehensive analysis including financial projections, risk factors, market analysis, and strategic fit.
                  </p>
                </div>

                <div className="flex justify-end space-x-3">
                  <Button variant="outline" onClick={onClose}>
                    Cancel
                  </Button>
                  <Button 
                    onClick={handleManualSubmit}
                    disabled={createRationaleMutation.isPending || !manualContent.trim()}
                  >
                    {createRationaleMutation.isPending ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Adding...
                      </>
                    ) : (
                      'Add Rationale'
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="ai" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Brain className="h-5 w-5" />
                  AI-Powered Rationale Generation
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <label className="text-sm font-medium mb-2 block">
                    Select Analysis Template
                  </label>
                  <Select value={selectedTemplateId} onValueChange={setSelectedTemplateId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Choose a template for AI analysis..." />
                    </SelectTrigger>
                    <SelectContent>
                      {filteredTemplates.length > 0 ? (
                        filteredTemplates.map((template: any) => (
                          <SelectItem key={template.id} value={template.id.toString()}>
                            <div className="flex items-center justify-between w-full">
                              <span>{template.name}</span>
                              <Badge 
                                variant="secondary" 
                                className="ml-2 text-xs"
                              >
                                {template.investmentType?.replace('_', ' ') || 'General'}
                              </Badge>
                            </div>
                          </SelectItem>
                        ))
                      ) : (
                        <SelectItem value="no-templates" disabled>
                          No templates available
                        </SelectItem>
                      )}
                    </SelectContent>
                  </Select>
                  {filteredTemplates.length === 0 && (
                    <p className="text-sm text-gray-500 mt-2">
                      No templates found for {investmentType} investments. Create templates in the Templates page.
                    </p>
                  )}
                </div>

                {selectedTemplateId && (
                  <div className="border rounded-lg p-4 bg-gray-50 dark:bg-gray-800">
                    <h4 className="font-medium mb-2">Template Preview</h4>
                    {(() => {
                      const selectedTemplate = filteredTemplates.find((t: any) => t.id.toString() === selectedTemplateId);
                      return selectedTemplate ? (
                        <div className="space-y-2">
                          <p className="text-sm text-gray-600">
                            {selectedTemplate.description}
                          </p>
                          <div className="space-y-1">
                            <p className="text-xs font-medium">Analysis Sections:</p>
                            {((selectedTemplate.templateData as any)?.sections || []).map((section: any, index: number) => (
                              <div key={index} className="text-xs bg-white dark:bg-gray-900 p-2 rounded border">
                                <div className="font-medium">{section.name}</div>
                                <div className="text-gray-500">{section.description} ({section.wordLimit} words)</div>
                              </div>
                            ))}
                          </div>
                        </div>
                      ) : null;
                    })()}
                  </div>
                )}

                <div className="bg-blue-50 dark:bg-blue-950 p-4 rounded-lg">
                  <h4 className="font-medium text-blue-900 dark:text-blue-100 mb-2">
                    How AI Generation Works
                  </h4>
                  <ul className="text-sm text-blue-800 dark:text-blue-200 space-y-1">
                    <li>• AI analyzes attached documents and investment details</li>
                    <li>• Generates comprehensive rationale using selected template structure</li>
                    <li>• Includes financial analysis, risk assessment, and recommendations</li>
                    <li>• Results are based on document content and market analysis</li>
                  </ul>
                </div>

                <div className="flex justify-end space-x-3">
                  <Button variant="outline" onClick={onClose}>
                    Cancel
                  </Button>
                  <Button 
                    onClick={handleAIGenerate}
                    disabled={generateAIRationaleMutation.isPending || !selectedTemplateId}
                  >
                    {generateAIRationaleMutation.isPending ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Generating...
                      </>
                    ) : (
                      <>
                        <Sparkles className="h-4 w-4 mr-2" />
                        Generate AI Rationale
                      </>
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
};

export default InvestmentRationaleModal;