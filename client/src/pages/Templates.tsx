import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { FileText, Plus, Edit, Trash2, Brain, Sparkles } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import type { Template } from '@shared/schema';

const templateFormSchema = z.object({
  name: z.string().min(1, "Template name is required"),
  investmentType: z.enum(["equity", "debt", "real_estate", "alternative", "general"]),
  description: z.string().optional(),
  templateData: z.object({
    sections: z.array(z.object({
      name: z.string(),
      description: z.string(),
      wordLimit: z.number().min(50).max(1000)
    })).min(1, "At least one section is required")
  })
});

type TemplateFormData = z.infer<typeof templateFormSchema>;

const Templates: React.FC = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [sections, setSections] = useState([{ name: '', description: '', wordLimit: 200 }]);

  // Fetch templates
  const { data: templates, isLoading } = useQuery({
    queryKey: ['/api/templates/investment'],
  });

  const form = useForm<TemplateFormData>({
    resolver: zodResolver(templateFormSchema),
    defaultValues: {
      name: '',
      investmentType: 'equity',
      description: '',
      templateData: {
        sections: [{ name: '', description: '', wordLimit: 200 }]
      }
    }
  });

  const createTemplateMutation = useMutation({
    mutationFn: async (data: TemplateFormData) => {
      return apiRequest('/api/templates', 'POST', data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/templates/investment'] });
      setIsCreateModalOpen(false);
      form.reset();
      setSections([{ name: '', description: '', wordLimit: 200 }]);
      toast({
        title: "Template Created",
        description: "Template has been created successfully.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to create template.",
        variant: "destructive",
      });
    },
  });

  const deleteTemplateMutation = useMutation({
    mutationFn: async (id: number) => {
      return apiRequest(`/api/templates/${id}`, 'DELETE');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/templates/investment'] });
      toast({
        title: "Template Deleted",
        description: "Template has been deleted successfully.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to delete template.",
        variant: "destructive",
      });
    },
  });

  const addSection = () => {
    setSections([...sections, { name: '', description: '', wordLimit: 200 }]);
  };

  const removeSection = (index: number) => {
    if (sections.length > 1) {
      setSections(sections.filter((_, i) => i !== index));
    }
  };

  const updateSection = (index: number, field: string, value: any) => {
    const updatedSections = [...sections];
    updatedSections[index] = { ...updatedSections[index], [field]: value };
    setSections(updatedSections);
    form.setValue('templateData.sections', updatedSections);
  };

  const onSubmit = (data: TemplateFormData) => {
    const formData = {
      ...data,
      templateData: {
        sections: sections.filter(s => s.name && s.description)
      }
    };
    createTemplateMutation.mutate(formData);
  };

  const getInvestmentTypeColor = (type: string) => {
    const colors = {
      equity: 'bg-blue-100 text-blue-800',
      debt: 'bg-green-100 text-green-800',
      real_estate: 'bg-purple-100 text-purple-800',
      alternative: 'bg-orange-100 text-orange-800',
      general: 'bg-gray-100 text-gray-800'
    };
    return colors[type as keyof typeof colors] || colors.general;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Investment Rationale Templates</h1>
          <p className="text-gray-600">
            Create and manage templates for AI-powered investment rationale generation
          </p>
        </div>
        
        <Dialog open={isCreateModalOpen} onOpenChange={setIsCreateModalOpen}>
          <DialogTrigger asChild>
            <Button className="flex items-center gap-2">
              <Plus className="h-4 w-4" />
              Create Template
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Sparkles className="h-5 w-5" />
                Create Investment Analysis Template
              </DialogTitle>
            </DialogHeader>

            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Template Name</FormLabel>
                        <FormControl>
                          <Input placeholder="e.g., Equity Analysis Template" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="investmentType"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Investment Type</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select investment type" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="equity">Equity</SelectItem>
                            <SelectItem value="debt">Debt</SelectItem>
                            <SelectItem value="real_estate">Real Estate</SelectItem>
                            <SelectItem value="alternative">Alternative</SelectItem>
                            <SelectItem value="general">General</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Description</FormLabel>
                      <FormControl>
                        <Textarea 
                          placeholder="Describe what this template covers..."
                          {...field} 
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-medium">Analysis Sections</h3>
                    <Button type="button" variant="outline" size="sm" onClick={addSection}>
                      <Plus className="h-4 w-4 mr-2" />
                      Add Section
                    </Button>
                  </div>

                  <div className="space-y-3">
                    {sections.map((section, index) => (
                      <div key={index} className="border rounded-lg p-4 space-y-3">
                        <div className="flex items-center justify-between">
                          <h4 className="font-medium">Section {index + 1}</h4>
                          {sections.length > 1 && (
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => removeSection(index)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          )}
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className="text-sm font-medium">Section Name</label>
                            <Input
                              placeholder="e.g., Financial Analysis"
                              value={section.name}
                              onChange={(e) => updateSection(index, 'name', e.target.value)}
                            />
                          </div>
                          <div>
                            <label className="text-sm font-medium">Word Limit</label>
                            <Input
                              type="number"
                              min="50"
                              max="1000"
                              value={section.wordLimit}
                              onChange={(e) => updateSection(index, 'wordLimit', parseInt(e.target.value) || 200)}
                            />
                          </div>
                        </div>

                        <div>
                          <label className="text-sm font-medium">Section Description</label>
                          <Textarea
                            placeholder="Describe what this section should cover..."
                            value={section.description}
                            onChange={(e) => updateSection(index, 'description', e.target.value)}
                            rows={2}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="flex justify-end space-x-3">
                  <Button 
                    type="button" 
                    variant="outline" 
                    onClick={() => setIsCreateModalOpen(false)}
                  >
                    Cancel
                  </Button>
                  <Button 
                    type="submit" 
                    disabled={createTemplateMutation.isPending}
                  >
                    {createTemplateMutation.isPending ? 'Creating...' : 'Create Template'}
                  </Button>
                </div>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      {isLoading ? (
        <div className="text-center py-8">Loading templates...</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {templates && (templates as Template[]).length > 0 ? (
            (templates as Template[]).map((template) => (
              <Card key={template.id} className="hover:shadow-lg transition-shadow">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="space-y-2">
                      <CardTitle className="text-lg">{template.name}</CardTitle>
                      <Badge className={getInvestmentTypeColor(template.investmentType || 'general')}>
                        {template.investmentType?.replace('_', ' ') || 'General'}
                      </Badge>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => deleteTemplateMutation.mutate(template.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {template.description && (
                      <p className="text-sm text-gray-600">{template.description}</p>
                    )}
                    
                    <div className="space-y-2">
                      <h4 className="text-sm font-medium flex items-center gap-2">
                        <Brain className="h-4 w-4" />
                        Analysis Sections ({((template.templateData as any)?.sections?.length || 0)})
                      </h4>
                      <div className="space-y-1">
                        {((template.templateData as any)?.sections || []).map((section: any, index: number) => (
                          <div key={index} className="text-xs bg-gray-50 dark:bg-gray-800 p-2 rounded">
                            <div className="font-medium">{section.name}</div>
                            <div className="text-gray-500">{section.wordLimit} words</div>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="text-xs text-gray-500 pt-2 border-t">
                      Created by {template.createdBy} • {new Date(template.createdAt).toLocaleDateString()}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          ) : (
            <div className="col-span-full text-center py-12">
              <FileText className="h-12 w-12 mx-auto mb-4 text-gray-400" />
              <h3 className="text-lg font-medium mb-2">No templates yet</h3>
              <p className="text-gray-600 mb-4">
                Create your first investment analysis template to enable AI-powered rationale generation.
              </p>
              <Button onClick={() => setIsCreateModalOpen(true)} className="flex items-center gap-2">
                <Plus className="h-4 w-4" />
                Create Your First Template
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default Templates;