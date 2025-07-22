import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CheckCircle, AlertTriangle, Clock, Eye, ChevronDown, ChevronUp, Edit, Send, FileText, Upload, X, Save, Search } from "lucide-react";
import { format } from "date-fns";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import DocumentAnalysisCard from "@/components/documents/DocumentAnalysisCard";
import UnifiedSearchInterface from "@/components/documents/UnifiedSearchInterface";

// Edit form schema
const editFormSchema = z.object({
  targetCompany: z.string().min(1, "Target company is required"),
  investmentType: z.enum(["equity", "debt", "real_estate", "alternative"]),
  amount: z.string().min(1, "Amount is required"),
  expectedReturn: z.string().min(1, "Expected return is required"),
  description: z.string().optional(),
  riskLevel: z.enum(["low", "medium", "high"]),
});

interface InvestmentDetailsInlineProps {
  investment: any;
  isExpanded: boolean;
  onToggle: () => void;
}

export function InvestmentDetailsInline({ investment, isExpanded, onToggle }: InvestmentDetailsInlineProps) {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const [isInlineEditing, setIsInlineEditing] = useState(false);
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([]);
  const [filesToDelete, setFilesToDelete] = useState<number[]>([]);
  const [isRationaleExpanded, setIsRationaleExpanded] = useState(false);
  const [isDocumentsExpanded, setIsDocumentsExpanded] = useState(false);
  const [isResearchExpanded, setIsResearchExpanded] = useState(false);
  const [isApprovalExpanded, setIsApprovalExpanded] = useState(true);

  // Fetch detailed investment data when expanded
  const { data: investmentDetails, isLoading: isInvestmentLoading } = useQuery({
    queryKey: [`/api/investments/${investment?.id}`],
    enabled: !!investment?.id && isExpanded,
  });

  // Fetch approval history
  const { data: approvalHistory } = useQuery({
    queryKey: [`/api/approvals/investment/${investment?.id}`],
    enabled: !!investment?.id && isExpanded,
  });

  // Fetch documents
  const { data: documents } = useQuery({
    queryKey: [`/api/documents/investment/${investment?.id}`],
    enabled: !!investment?.id && isExpanded,
  });

  // Edit form
  const editForm = useForm<z.infer<typeof editFormSchema>>({
    resolver: zodResolver(editFormSchema),
    defaultValues: {
      targetCompany: "",
      investmentType: "equity",
      amount: "",
      expectedReturn: "",
      description: "",
      riskLevel: "medium",
    },
  });

  // Initialize form when investment details are loaded using useEffect
  useEffect(() => {
    if (investmentDetails && !isInlineEditing) {
      editForm.reset({
        targetCompany: investmentDetails.targetCompany || "",
        investmentType: investmentDetails.investmentType || "equity",
        amount: investmentDetails.amount?.toString() || "",
        expectedReturn: investmentDetails.expectedReturn?.toString() || "",
        description: investmentDetails.description || "",
        riskLevel: investmentDetails.riskLevel || "medium",
      });
    }
  }, [investmentDetails, isInlineEditing]);

  // Mutations
  const editDraftMutation = useMutation({
    mutationFn: async (data: z.infer<typeof editFormSchema>) => {
      return apiRequest(`/api/investments/${investment.id}`, {
        method: "PATCH",
        body: {
          ...data,
          amount: parseFloat(data.amount),
          expectedReturn: parseFloat(data.expectedReturn),
        },
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/investments/${investment.id}`] });
      queryClient.invalidateQueries({ queryKey: ['/api/investments'] });
      queryClient.invalidateQueries({ queryKey: ['/api/tasks'] });
      queryClient.invalidateQueries({ queryKey: ['/api/approvals'] });
      queryClient.invalidateQueries({ queryKey: ['/api/documents'] });
      toast({ title: "Investment updated successfully" });
      setIsInlineEditing(false);
    },
    onError: () => {
      toast({ title: "Failed to update investment", variant: "destructive" });
    },
  });

  const uploadFilesMutation = useMutation({
    mutationFn: async () => {
      const formData = new FormData();
      uploadedFiles.forEach((file) => {
        formData.append('files', file);
      });
      formData.append('requestType', 'investment');
      formData.append('requestId', investment.id.toString());

      const response = await fetch('/api/documents/upload', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error('Upload failed');
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/documents/investment/${investment.id}`] });
      queryClient.invalidateQueries({ queryKey: ['/api/tasks'] });
      queryClient.invalidateQueries({ queryKey: ['/api/approvals'] });
      queryClient.invalidateQueries({ queryKey: ['/api/documents'] });
      setUploadedFiles([]);
      toast({ title: "Files uploaded successfully" });
    },
    onError: () => {
      toast({ title: "Failed to upload files", variant: "destructive" });
    },
  });

  const deleteDocumentMutation = useMutation({
    mutationFn: async () => {
      const deletePromises = filesToDelete.map(documentId =>
        apiRequest(`/api/documents/${documentId}`, { method: "DELETE" })
      );
      return Promise.all(deletePromises);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/documents/investment/${investment.id}`] });
      queryClient.invalidateQueries({ queryKey: ['/api/tasks'] });
      queryClient.invalidateQueries({ queryKey: ['/api/approvals'] });
      queryClient.invalidateQueries({ queryKey: ['/api/documents'] });
      setFilesToDelete([]);
      toast({ title: "Documents deleted successfully" });
    },
    onError: () => {
      toast({ title: "Failed to delete documents", variant: "destructive" });
    },
  });

  const submitDraftMutation = useMutation({
    mutationFn: async () => {
      return apiRequest(`/api/investments/${investment.id}/submit`, {
        method: "POST",
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/investments/${investment.id}`] });
      queryClient.invalidateQueries({ queryKey: ['/api/investments'] });
      queryClient.invalidateQueries({ queryKey: ['/api/tasks'] });
      queryClient.invalidateQueries({ queryKey: ['/api/approvals'] });
      queryClient.invalidateQueries({ queryKey: ['/api/documents'] });
      toast({ title: "Investment submitted for approval successfully" });
      setIsInlineEditing(false);
    },
    onError: () => {
      toast({ title: "Failed to submit investment", variant: "destructive" });
    },
  });

  // Handlers
  const handleInlineEdit = () => {
    setIsInlineEditing(true);
  };

  const handleCancelInlineEdit = () => {
    editForm.reset();
    setIsInlineEditing(false);
    setUploadedFiles([]);
    setFilesToDelete([]);
  };

  const handleSaveInlineEdit = async () => {
    try {
      // Validate form
      const formData = editForm.getValues();
      const validatedData = editFormSchema.parse(formData);
      
      // Save changes
      await editDraftMutation.mutateAsync(validatedData);
      
      // Upload new files if any
      if (uploadedFiles.length > 0) {
        await uploadFilesMutation.mutateAsync();
      }
      
      // Delete files if any
      if (filesToDelete.length > 0) {
        await deleteDocumentMutation.mutateAsync();
      }
    } catch (error) {
      console.error('Save failed:', error);
    }
  };

  const handleSubmitDraft = () => {
    submitDraftMutation.mutate();
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    setUploadedFiles(prev => [...prev, ...files]);
  };

  const handleRemoveUploadedFile = (index: number) => {
    setUploadedFiles(prev => prev.filter((_, i) => i !== index));
  };

  const handleDeleteDocument = (documentId: number) => {
    setFilesToDelete(prev => [...prev, documentId]);
  };

  const handleUndoDelete = (documentId: number) => {
    setFilesToDelete(prev => prev.filter(id => id !== documentId));
  };

  // Helper functions
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'draft':
        return 'bg-gray-100 text-gray-800';
      case 'New':
      case 'Modified':
        return 'bg-blue-100 text-blue-800';
      case 'Manager approved':
      case 'Committee approved':
      case 'Finance approved':
      case 'approved':
        return 'bg-green-100 text-green-800';
      case 'Manager rejected':
      case 'Committee rejected':
      case 'Finance rejected':
      case 'rejected':
        return 'bg-red-100 text-red-800';
      case 'changes_requested':
        return 'bg-orange-100 text-orange-800';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'Manager approved':
      case 'Committee approved':
      case 'Finance approved':
      case 'approved':
        return <CheckCircle className="w-4 h-4" />;
      case 'Manager rejected':
      case 'Committee rejected':
      case 'Finance rejected':
      case 'rejected':
        return <AlertTriangle className="w-4 h-4" />;
      case 'changes_requested':
        return <AlertTriangle className="w-4 h-4" />;
      case 'pending':
        return <Clock className="w-4 h-4" />;
      default:
        return <Clock className="w-4 h-4" />;
    }
  };

  const getRiskColor = (risk: string) => {
    switch (risk) {
      case 'high':
        return 'bg-red-100 text-red-800';
      case 'medium':
        return 'bg-yellow-100 text-yellow-800';
      case 'low':
        return 'bg-green-100 text-green-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <Collapsible open={isExpanded} onOpenChange={onToggle}>
      <CollapsibleTrigger asChild>
        <Button variant="ghost" size="sm" className="w-full justify-between">
          <span className="flex items-center">
            <Eye className="w-4 h-4 mr-2" />
            View Details
          </span>
          {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </Button>
      </CollapsibleTrigger>
      
      <CollapsibleContent className="mt-4">
        {isInvestmentLoading ? (
          <div className="flex items-center justify-center p-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        ) : investmentDetails ? (
          <div className="space-y-6">
            {/* I. Attached Documents */}
            {documents && documents.length > 0 && (
              <Card>
                <CardHeader 
                  className="cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors py-3"
                  onClick={() => setIsDocumentsExpanded(!isDocumentsExpanded)}
                >
                  <div className="flex items-center justify-between">
                    <CardTitle className="flex items-center gap-2 text-base">
                      <FileText className="h-4 w-4" />
                      Attached Documents
                    </CardTitle>
                    {isDocumentsExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                  </div>
                </CardHeader>
                {isDocumentsExpanded && (
                  <CardContent className="pt-0 pb-4">
                  <div className="space-y-3">
                    {documents.map((doc: any) => (
                      <DocumentAnalysisCard
                        key={doc.id}
                        document={doc}
                        requestId={investment.id}
                        requestType="investment"
                        showAnalysisLabel={false}
                        showOnlyProcessed={true}
                      />
                    ))}
                  </div>
                  </CardContent>
                )}
              </Card>
            )}

            {/* II. Research & Analysis */}
            {documents && documents.length > 0 && (
              <Card>
                <CardHeader 
                  className="cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors py-3"
                  onClick={() => setIsResearchExpanded(!isResearchExpanded)}
                >
                  <div className="flex items-center justify-between">
                    <CardTitle className="flex items-center gap-2 text-base">
                      <Search className="h-4 w-4" />
                      Research & Analysis
                    </CardTitle>
                    {isResearchExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                  </div>
                </CardHeader>
                {isResearchExpanded && (
                  <CardContent className="pt-0 pb-4">
                    <UnifiedSearchInterface 
                      documents={documents}
                      requestId={investment.id}
                      requestType="investment"
                      isExpanded={isResearchExpanded}
                      onExpandedChange={setIsResearchExpanded}
                    />
                  </CardContent>
                )}
              </Card>
            )}

            {/* III. Investment Rationale / Description */}
            <Card>
              <CardHeader 
                className="cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors py-3"
                onClick={() => setIsRationaleExpanded(!isRationaleExpanded)}
              >
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2 text-base">
                    <FileText className="h-4 w-4" />
                    Investment Rationale
                  </CardTitle>
                  {isRationaleExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                </div>
              </CardHeader>
              {isRationaleExpanded && (
                <CardContent className="pt-0 pb-4">
                
                  {isInlineEditing ? (
                  <Form {...editForm}>
                    <div className="space-y-4">
                      <FormField
                        control={editForm.control}
                        name="description"
                        render={({ field }) => (
                          <FormItem>
                            <FormControl>
                              <Textarea 
                                placeholder="Enter investment description..." 
                                rows={4}
                                {...field} 
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      {/* Additional editing fields */}
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <FormField
                          control={editForm.control}
                          name="targetCompany"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Target Company</FormLabel>
                              <FormControl>
                                <Input placeholder="Enter company name" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={editForm.control}
                          name="riskLevel"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Risk Level</FormLabel>
                              <Select onValueChange={field.onChange} value={field.value}>
                                <FormControl>
                                  <SelectTrigger>
                                    <SelectValue placeholder="Select risk level" />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  <SelectItem value="low">Low</SelectItem>
                                  <SelectItem value="medium">Medium</SelectItem>
                                  <SelectItem value="high">High</SelectItem>
                                </SelectContent>
                              </Select>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={editForm.control}
                          name="amount"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Investment Amount</FormLabel>
                              <FormControl>
                                <Input type="number" placeholder="Enter amount" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={editForm.control}
                          name="expectedReturn"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Expected Return (%)</FormLabel>
                              <FormControl>
                                <Input type="number" step="0.1" placeholder="Enter expected return" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={editForm.control}
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
                                </SelectContent>
                              </Select>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                    </div>
                  </Form>
                ) : (
                  <p className="text-gray-800 bg-gray-50 p-3 rounded border min-h-[60px]">
                    {investmentDetails.description || 'No description provided by the analyst'}
                  </p>
                )}
                
                {/* Draft Actions */}
                {(investmentDetails.status.toLowerCase() === 'draft' || investmentDetails.status.toLowerCase() === 'changes_requested') && (
                  <div className="mt-4 flex gap-2">
                    {isInlineEditing ? (
                      <>
                        <Button 
                          variant="outline"
                          size="sm"
                          onClick={handleSaveInlineEdit}
                          disabled={editDraftMutation.isPending || uploadFilesMutation.isPending || deleteDocumentMutation.isPending}
                          className="flex items-center gap-2"
                        >
                          <Save className="h-4 w-4" />
                          {editDraftMutation.isPending ? 'Saving...' : 'Save Changes'}
                        </Button>
                        <Button 
                          variant="ghost"
                          size="sm"
                          onClick={handleCancelInlineEdit}
                          disabled={editDraftMutation.isPending || uploadFilesMutation.isPending || deleteDocumentMutation.isPending}
                          className="flex items-center gap-2"
                        >
                          <X className="h-4 w-4" />
                          Cancel
                        </Button>
                      </>
                    ) : (
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={handleInlineEdit}
                        className="flex items-center gap-2"
                      >
                        <Edit className="h-4 w-4" />
                        Edit Draft
                      </Button>
                    )}
                    
                    <Button 
                      size="sm"
                      onClick={handleSubmitDraft}
                      disabled={submitDraftMutation.isPending}
                      className="flex items-center gap-2"
                    >
                      <Send className="h-4 w-4" />
                      {submitDraftMutation.isPending ? 'Submitting...' : 
                       investmentDetails.status.toLowerCase() === 'changes_requested' ? 'Resubmit for Approval' : 'Submit for Approval'}
                    </Button>
                  </div>
                )}
                
                {/* Document Management - shown during inline editing */}
                {isInlineEditing && (
                  <div className="mt-6 p-4 border rounded-lg bg-gray-50">
                    <h5 className="font-medium mb-3">Document Management</h5>
                    
                    {/* File Upload */}
                    <div className="mb-4">
                      <label className="block text-sm font-medium mb-2">Upload New Documents</label>
                      <div className="flex items-center gap-2">
                        <Input
                          type="file"
                          multiple
                          accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.csv"
                          onChange={handleFileUpload}
                          className="flex-1"
                        />
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => document.querySelector('input[type="file"]')?.click()}
                          className="flex items-center gap-2"
                        >
                          <Upload className="h-4 w-4" />
                          Browse
                        </Button>
                      </div>
                    </div>
                    
                    {/* New Files Preview */}
                    {uploadedFiles.length > 0 && (
                      <div className="mb-4">
                        <label className="block text-sm font-medium mb-2">New Files to Upload</label>
                        <div className="space-y-2">
                          {uploadedFiles.map((file, index) => (
                            <div key={index} className="flex items-center justify-between p-2 bg-blue-50 rounded border">
                              <div className="flex items-center gap-2">
                                <FileText className="h-4 w-4 text-blue-600" />
                                <span className="text-sm">{file.name}</span>
                                <span className="text-xs text-gray-500">({(file.size / 1024 / 1024).toFixed(1)} MB)</span>
                              </div>
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={() => handleRemoveUploadedFile(index)}
                                className="text-red-600 hover:text-red-800"
                              >
                                <X className="h-4 w-4" />
                              </Button>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                    
                    {/* Existing Documents */}
                    {documents && documents.length > 0 && (
                      <div>
                        <label className="block text-sm font-medium mb-2">Existing Documents</label>
                        <div className="space-y-2">
                          {documents.map((doc: any) => (
                            <div key={doc.id} className={`flex items-center justify-between p-2 rounded border ${
                              filesToDelete.includes(doc.id) ? 'bg-red-50 border-red-200' : 'bg-white'
                            }`}>
                              <div className="flex items-center gap-2">
                                <FileText className={`h-4 w-4 ${filesToDelete.includes(doc.id) ? 'text-red-600' : 'text-gray-600'}`} />
                                <span className={`text-sm ${filesToDelete.includes(doc.id) ? 'line-through text-red-600' : ''}`}>
                                  {doc.fileName}
                                </span>
                              </div>
                              <div className="flex items-center gap-2">
                                {filesToDelete.includes(doc.id) ? (
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => handleUndoDelete(doc.id)}
                                    className="text-green-600 hover:text-green-800"
                                  >
                                    Undo
                                  </Button>
                                ) : (
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => handleDeleteDocument(doc.id)}
                                    className="text-red-600 hover:text-red-800"
                                  >
                                    <X className="h-4 w-4" />
                                  </Button>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                    
                    {uploadedFiles.length > 0 && (
                      <div className="mt-3 p-3 bg-blue-50 rounded border">
                        <p className="text-sm text-blue-700">
                          <strong>Note:</strong> New documents will be automatically processed by AI for analysis and insights generation after upload.
                        </p>
                      </div>
                    )}
                  </div>
                )}
                </CardContent>
              )}
            </Card>



            {/* IV. Approval History */}
            {approvalHistory && approvalHistory.length > 0 && (
              <Card>
                <CardHeader 
                  className="cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors py-3"
                  onClick={() => setIsApprovalExpanded(!isApprovalExpanded)}
                >
                  <div className="flex items-center justify-between">
                    <CardTitle className="flex items-center gap-2 text-base">
                      <Clock className="h-4 w-4" />
                      Approval History
                    </CardTitle>
                    {isApprovalExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                  </div>
                </CardHeader>
                {isApprovalExpanded && (
                  <CardContent className="pt-0 pb-4">
                  <div className="space-y-3">
                    {approvalHistory.map((approval: any) => (
                      <div key={approval.id} className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
                        {getStatusIcon(approval.status)}
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <p className="text-sm font-medium">
                              Stage {approval.stage} - {approval.status}
                            </p>
                            <Badge className={getStatusColor(approval.status)}>
                              {approval.status}
                            </Badge>
                          </div>
                          <p className="text-sm text-gray-600">
                            {approval.approverName} • {format(new Date(approval.createdAt), 'MMM dd, yyyy HH:mm')}
                          </p>
                          {approval.comments && (
                            <p className="text-sm text-gray-700 mt-1 italic">
                              "{approval.comments}"
                            </p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                  </CardContent>
                )}
              </Card>
            )}
          </div>
        ) : (
          <div className="text-center p-8 text-gray-500">
            No investment details available
          </div>
        )}
      </CollapsibleContent>
    </Collapsible>
  );
}