import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { FileText, Brain, Loader2, Sparkles, Edit, Trash2 } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import type { Template, InvestmentRationale } from '@shared/schema';

interface InvestmentRationaleModalProps {
  isOpen: boolean;
  onClose: () => void;
  investmentId: number;
  investmentType?: string;
}

const rationaleFormSchema = z.object({
  content: z.string().min(10, "Rationale must be at least 10 characters"),
  templateId: z.number().optional(),
  type: z.enum(['manual', 'ai_generated'])
});

type RationaleFormData = z.infer<typeof rationaleFormSchema>;

const InvestmentRationaleModal: React.FC<InvestmentRationaleModalProps> = ({
  isOpen,
  onClose,
  investmentId,
  investmentType = 'equity'
}) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedTemplate, setSelectedTemplate] = useState<Template | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedContent, setGeneratedContent] = useState('');

  // Fetch existing rationales
  const { data: rationales } = useQuery({
    queryKey: [`/api/investments/${investmentId}/rationales`],
    enabled: isOpen
  });

  // Fetch templates
  const { data: templates } = useQuery({
    queryKey: ['/api/templates/investment'],
    enabled: isOpen
  });

  const form = useForm<RationaleFormData>({
    resolver: zodResolver(rationaleFormSchema),
    defaultValues: {
      content: '',
      type: 'manual'
    }
  });

  const createRationaleMutation = useMutation({
    mutationFn: async (data: RationaleFormData) => {
      return apiRequest(`/api/investments/${investmentId}/rationales`, 'POST', data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/investments/${investmentId}/rationales`] });
      queryClient.invalidateQueries({ queryKey: [`/api/investments/${investmentId}`] });
      form.reset();
      setGeneratedContent('');
      toast({
        title: "Rationale Added",
        description: "Investment rationale has been added successfully.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to add rationale.",
        variant: "destructive",
      });
    },
  });

  const deleteRationaleMutation = useMutation({
    mutationFn: async (rationaleId: number) => {
      return apiRequest(`/api/investments/${investmentId}/rationales/${rationaleId}`, 'DELETE');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/investments/${investmentId}/rationales`] });
      toast({
        title: "Rationale Deleted",
        description: "Investment rationale has been deleted successfully.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to delete rationale.",
        variant: "destructive",
      });
    },
  });

  const generateAIRationale = async () => {
    if (!selectedTemplate) {
      toast({
        title: "Template Required",
        description: "Please select a template for AI generation.",
        variant: "destructive",
      });
      return;
    }

    setIsGenerating(true);
    try {
      // This would integrate with your LLM service
      // For now, we'll create a placeholder
      const sections = (selectedTemplate.templateData as any)?.sections || [];
      const sampleContent = sections.map((section: any) => 
        `**${section.name}**\n\n[AI-generated content for ${section.name} would appear here, covering ${section.description}]\n\n`
      ).join('');
      
      setGeneratedContent(sampleContent);
      form.setValue('content', sampleContent);
      form.setValue('type', 'ai_generated');
      form.setValue('templateId', selectedTemplate.id);
      
      toast({
        title: "AI Content Generated",
        description: "Review and edit the generated content before saving.",
      });
    } catch (error) {
      toast({
        title: "Generation Failed",
        description: "Failed to generate AI content.",
        variant: "destructive",
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const onSubmit = (data: RationaleFormData) => {
    createRationaleMutation.mutate(data);
  };

  const getRelevantTemplates = () => {
    if (!templates) return [];
    return (templates as Template[]).filter(template => 
      template.investmentType === investmentType || !template.investmentType
    );
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Investment Rationale
          </DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="existing" className="space-y-4">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="existing">Existing Rationales</TabsTrigger>
            <TabsTrigger value="add">Add New</TabsTrigger>
          </TabsList>

          <TabsContent value="existing" className="space-y-4">
            {rationales && (rationales as InvestmentRationale[]).length > 0 ? (
              <div className="space-y-3">
                {(rationales as InvestmentRationale[]).map((rationale) => (
                  <div key={rationale.id} className="border rounded-lg p-4 space-y-3">
                    <div className="flex justify-between items-start">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          {rationale.type === 'ai_generated' ? (
                            <Brain className="h-4 w-4 text-purple-600" />
                          ) : (
                            <Edit className="h-4 w-4 text-blue-600" />
                          )}
                          <span className="text-sm font-medium">
                            {rationale.type === 'ai_generated' ? 'AI Generated' : 'Manual Entry'}
                          </span>
                          {(rationale as any).template?.name && (
                            <span className="text-xs text-gray-500">
                              • {(rationale as any).template.name}
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-gray-500">
                          By {(rationale as any).author?.firstName} {(rationale as any).author?.lastName} • {new Date(rationale.createdAt).toLocaleDateString()}
                        </p>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => deleteRationaleMutation.mutate(rationale.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                    <div className="prose prose-sm max-w-none">
                      <div className="whitespace-pre-wrap text-sm">
                        {rationale.content}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">
                <FileText className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                <p>No rationales added yet.</p>
                <p className="text-sm">Switch to the "Add New" tab to create your first rationale.</p>
              </div>
            )}
          </TabsContent>

          <TabsContent value="add" className="space-y-4">
            <Tabs defaultValue="manual">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="manual" className="flex items-center gap-2">
                  <Edit className="h-4 w-4" />
                  Manual Entry
                </TabsTrigger>
                <TabsTrigger value="ai" className="flex items-center gap-2">
                  <Brain className="h-4 w-4" />
                  AI Generation
                </TabsTrigger>
              </TabsList>

              <TabsContent value="manual" className="space-y-4">
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="content">Investment Rationale</Label>
                    <Textarea
                      id="content"
                      {...form.register('content')}
                      placeholder="Enter your investment rationale..."
                      rows={12}
                      className="resize-none"
                    />
                    {form.formState.errors.content && (
                      <p className="text-sm text-red-600">
                        {form.formState.errors.content.message}
                      </p>
                    )}
                  </div>

                  <div className="flex justify-end space-x-3">
                    <Button type="button" variant="outline" onClick={onClose}>
                      Cancel
                    </Button>
                    <Button 
                      type="submit" 
                      disabled={createRationaleMutation.isPending}
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
                </form>
              </TabsContent>

              <TabsContent value="ai" className="space-y-4">
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="template">Select Template</Label>
                    <Select 
                      value={selectedTemplate?.id?.toString() || ''} 
                      onValueChange={(value) => {
                        const template = getRelevantTemplates().find(t => t.id.toString() === value);
                        setSelectedTemplate(template || null);
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Choose an analysis template..." />
                      </SelectTrigger>
                      <SelectContent>
                        {getRelevantTemplates().map((template) => (
                          <SelectItem key={template.id} value={template.id.toString()}>
                            <div className="flex flex-col">
                              <span className="font-medium">{template.name}</span>
                              <span className="text-xs text-gray-500">
                                {((template.templateData as any)?.sections?.length || 0)} sections
                              </span>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {selectedTemplate && (
                    <div className="border rounded-lg p-4 bg-gray-50 dark:bg-gray-800">
                      <h4 className="font-medium mb-2">Template Preview:</h4>
                      <div className="space-y-2">
                        {((selectedTemplate.templateData as any)?.sections || []).map((section: any, index: number) => (
                          <div key={index} className="text-sm">
                            <span className="font-medium">{section.name}</span>
                            <span className="text-gray-500 ml-2">({section.wordLimit} words)</span>
                            <p className="text-xs text-gray-600 mt-1">{section.description}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  <Button
                    type="button"
                    onClick={generateAIRationale}
                    disabled={!selectedTemplate || isGenerating}
                    className="w-full"
                  >
                    {isGenerating ? (
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

                  {generatedContent && (
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="generated-content">Generated Content (Edit as needed)</Label>
                        <Textarea
                          id="generated-content"
                          {...form.register('content')}
                          rows={12}
                          className="resize-none"
                        />
                      </div>

                      <div className="flex justify-end space-x-3">
                        <Button type="button" variant="outline" onClick={onClose}>
                          Cancel
                        </Button>
                        <Button 
                          type="submit" 
                          disabled={createRationaleMutation.isPending}
                        >
                          {createRationaleMutation.isPending ? (
                            <>
                              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                              Adding...
                            </>
                          ) : (
                            'Save AI Rationale'
                          )}
                        </Button>
                      </div>
                    </form>
                  )}
                </div>
              </TabsContent>
            </Tabs>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
};

export default InvestmentRationaleModal;