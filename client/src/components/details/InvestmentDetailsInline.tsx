import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CheckCircle, AlertTriangle, Clock, Eye, ChevronDown, ChevronUp, Edit, Send, FileText, Brain } from "lucide-react";
import { format } from "date-fns";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import DocumentAnalysisCard from "@/components/documents/DocumentAnalysisCard";
import DocumentInsights from "@/components/documents/DocumentInsights";

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
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);

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

  // Edit draft mutation
  const editDraftMutation = useMutation({
    mutationFn: async (data: z.infer<typeof editFormSchema>) => {
      return apiRequest('PUT', `/api/investments/${investmentDetails?.id}`, data);
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Draft updated successfully",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/investments'] });
      queryClient.invalidateQueries({ queryKey: [`/api/investments/${investmentDetails?.id}`] });
      setIsEditDialogOpen(false);
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update draft",
        variant: "destructive",
      });
    },
  });

  // Submit draft mutation
  const submitDraftMutation = useMutation({
    mutationFn: async (investmentId: number) => {
      return apiRequest('POST', `/api/investments/${investmentId}/submit`);
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Draft submitted for approval successfully",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/investments'] });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to submit draft",
        variant: "destructive",
      });
    },
  });

  const handleSubmitDraft = () => {
    if (investmentDetails?.id) {
      submitDraftMutation.mutate(investmentDetails.id);
    }
  };

  const handleEditDraft = () => {
    if (investmentDetails) {
      editForm.reset({
        targetCompany: investmentDetails.targetCompany || "",
        investmentType: investmentDetails.investmentType || "equity",
        amount: investmentDetails.amount || "",
        expectedReturn: investmentDetails.expectedReturn || "",
        description: investmentDetails.description || "",
        riskLevel: investmentDetails.riskLevel || "medium",
      });
      setIsEditDialogOpen(true);
    }
  };

  const onEditSubmit = (data: z.infer<typeof editFormSchema>) => {
    editDraftMutation.mutate(data);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Draft':
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
            {/* Request Details */}
            <Card>
              <CardContent className="pt-6">
                <h4 className="font-semibold mb-4">Request Information</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Request ID</p>
                    <p className="text-lg font-semibold">{investmentDetails.requestId}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-600">Status</p>
                    <Badge className={getStatusColor(investmentDetails.status)}>
                      {getStatusIcon(investmentDetails.status)}
                      <span className="ml-1">{investmentDetails.status}</span>
                    </Badge>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-600">Amount</p>
                    <p className="text-lg font-semibold">${investmentDetails.amount}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-600">Expected Return</p>
                    <p className="text-lg font-semibold">{investmentDetails.expectedReturn}%</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-600">Target Company</p>
                    <p className="text-lg font-semibold">{investmentDetails.targetCompany}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-600">Investment Type</p>
                    <p className="text-lg font-semibold">{investmentDetails.investmentType}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-600">Risk Level</p>
                    <Badge className={getRiskColor(investmentDetails.riskLevel)}>
                      {investmentDetails.riskLevel}
                    </Badge>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-600">Created Date</p>
                    <p className="text-lg font-semibold">
                      {format(new Date(investmentDetails.createdAt), 'MMM dd, yyyy')}
                    </p>
                  </div>
                </div>
                
                {investmentDetails.description && (
                  <div className="mt-4">
                    <p className="text-sm font-medium text-gray-600 mb-2">Description</p>
                    <p className="text-gray-800">{investmentDetails.description}</p>
                  </div>
                )}
                
                {/* Draft Actions */}
                {investmentDetails.status.toLowerCase() === 'draft' && (
                  <div className="mt-4 flex gap-2">
                    <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
                      <DialogTrigger asChild>
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={handleEditDraft}
                          className="flex items-center gap-2"
                        >
                          <Edit className="h-4 w-4" />
                          Edit Draft
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="max-w-md">
                        <DialogHeader>
                          <DialogTitle>Edit Draft Proposal</DialogTitle>
                        </DialogHeader>
                        <Form {...editForm}>
                          <form onSubmit={editForm.handleSubmit(onEditSubmit)} className="space-y-4">
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
                              name="investmentType"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Investment Type</FormLabel>
                                  <Select onValueChange={field.onChange} defaultValue={field.value}>
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
                                    <Input type="number" placeholder="Enter expected return" {...field} />
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
                                  <Select onValueChange={field.onChange} defaultValue={field.value}>
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
                              name="description"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Description</FormLabel>
                                  <FormControl>
                                    <Textarea placeholder="Enter description" {...field} />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                            
                            <div className="flex justify-end gap-2">
                              <Button 
                                type="button" 
                                variant="outline" 
                                onClick={() => setIsEditDialogOpen(false)}
                              >
                                Cancel
                              </Button>
                              <Button 
                                type="submit" 
                                disabled={editDraftMutation.isPending}
                              >
                                {editDraftMutation.isPending ? 'Updating...' : 'Update Draft'}
                              </Button>
                            </div>
                          </form>
                        </Form>
                      </DialogContent>
                    </Dialog>
                    
                    <Button 
                      size="sm"
                      onClick={handleSubmitDraft}
                      disabled={submitDraftMutation.isPending}
                      className="flex items-center gap-2"
                    >
                      <Send className="h-4 w-4" />
                      {submitDraftMutation.isPending ? 'Submitting...' : 'Submit for Approval'}
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Approval History */}
            {approvalHistory && approvalHistory.length > 0 && (
              <Card>
                <CardContent className="pt-6">
                  <h4 className="font-semibold mb-4">Approval History</h4>
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
                          {approval.approvedAt && (
                            <p className="text-xs text-gray-500">
                              {format(new Date(approval.approvedAt), 'MMM dd, yyyy HH:mm')}
                            </p>
                          )}
                          {approval.comments && (
                            <p className="text-sm text-gray-600 mt-1">{approval.comments}</p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Documents and AI Analysis */}
            <div className="space-y-6">
              <h3 className="text-lg font-semibold flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Documents & AI Analysis ({documents?.length || 0})
              </h3>
              
              {/* Document Insights */}
              <DocumentInsights 
                requestType="investment" 
                requestId={investmentDetails?.id || 0} 
              />
              
              {/* Individual Document Analysis */}
              {documents && documents.length > 0 ? (
                <div className="space-y-4">
                  <h4 className="font-medium flex items-center gap-2">
                    <Brain className="h-4 w-4" />
                    Document Analysis
                  </h4>
                  <div className="grid grid-cols-1 gap-4">
                    {documents.map((doc: any) => (
                      <DocumentAnalysisCard 
                        key={doc.id} 
                        document={doc} 
                        requestType="investment" 
                        requestId={investmentDetails?.id || 0} 
                      />
                    ))}
                  </div>
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <FileText className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                  <p>No documents uploaded yet.</p>
                  <p className="text-sm">Upload documents to get AI-powered insights and analysis.</p>
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="text-center py-8">
            <p className="text-gray-500">Investment details not found</p>
          </div>
        )}
      </CollapsibleContent>
    </Collapsible>
  );
}