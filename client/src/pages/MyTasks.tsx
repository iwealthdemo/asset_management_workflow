import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useState, useEffect } from "react";
import { Clock, CheckSquare, AlertTriangle, Calendar, User, Download, FileText, File, ChevronDown, ChevronUp, CheckCircle, XCircle, Eye, MessageSquare, Send, Loader2 } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { format } from "date-fns";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

export default function MyTasks() {
  const [expandedTask, setExpandedTask] = useState<number | null>(null);
  const [comments, setComments] = useState("");
  // Remove previewDocument state as we're using new tab approach
  const [customQueryOpen, setCustomQueryOpen] = useState<number | null>(null);
  const [customQuery, setCustomQuery] = useState("");
  const [customQueryResult, setCustomQueryResult] = useState<string | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: tasks, isLoading } = useQuery({
    queryKey: ["/api/tasks"],
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'completed':
        return 'bg-green-100 text-green-800';
      case 'overdue':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high':
        return 'bg-red-100 text-red-800';
      case 'medium':
        return 'bg-yellow-100 text-yellow-800';
      case 'low':
        return 'bg-blue-100 text-blue-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getTaskIcon = (taskType: string) => {
    switch (taskType) {
      case 'approval':
        return CheckSquare;
      case 'review':
        return Clock;
      case 'changes_requested':
        return AlertTriangle;
      default:
        return CheckSquare;
    }
  };

  const handleTaskAction = (task: any) => {
    setExpandedTask(expandedTask === task.id ? null : task.id);
    setComments("");
  };

  const processApproval = useMutation({
    mutationFn: async ({ taskId, action }: { taskId: number; action: 'approve' | 'reject' | 'changes_requested' }) => {
      const task = tasks?.find((t: any) => t.id === taskId);
      if (!task) throw new Error('Task not found');
      
      const response = await apiRequest("POST", "/api/approvals", {
        requestType: task.requestType,
        requestId: task.requestId,
        action,
        comments,
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tasks"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/stats"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/recent-requests"] });
      queryClient.invalidateQueries({ queryKey: ["/api/investments"] });
      
      toast({
        title: "Approval processed",
        description: "The request has been processed successfully",
      });
      
      setExpandedTask(null);
      setComments("");
    },
    onError: (error: any) => {
      toast({
        title: "Error processing approval",
        description: error.message || "Something went wrong",
        variant: "destructive",
      });
    },
  });

  if (isLoading) {
    return (
      <div className="p-6">
        <div className="space-y-4">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="bg-white p-6 rounded-lg shadow animate-pulse">
              <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
              <div className="h-4 bg-gray-200 rounded w-1/2"></div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  const pendingTasks = tasks?.filter((task: any) => task.status === 'pending') || [];
  const completedTasks = tasks?.filter((task: any) => task.status === 'completed') || [];
  const overdueTasks = tasks?.filter((task: any) => task.status === 'overdue') || [];

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold mb-2">My Tasks</h1>
        <div className="flex gap-4 text-sm text-gray-600">
          <span>{pendingTasks.length} pending</span>
          <span>{overdueTasks.length} overdue</span>
          <span>{completedTasks.length} completed</span>
        </div>
      </div>

      <div className="space-y-6">
        {/* Overdue Tasks */}
        {overdueTasks.length > 0 && (
          <div>
            <h2 className="text-lg font-semibold mb-4 text-red-600">Overdue Tasks</h2>
            <div className="space-y-4">
              {overdueTasks.map((task: any) => (
                <TaskCard 
                  key={task.id} 
                  task={task} 
                  onAction={handleTaskAction}
                  isExpanded={expandedTask === task.id}
                  onProcessApproval={processApproval}
                  comments={comments}
                  setComments={setComments}
                  onPreview={() => {}}
                  customQueryOpen={customQueryOpen}
                  setCustomQueryOpen={setCustomQueryOpen}
                  customQuery={customQuery}
                  setCustomQuery={setCustomQuery}
                  customQueryResult={customQueryResult}
                  setCustomQueryResult={setCustomQueryResult}
                  customQueryMutation={customQueryMutation}
                  handleCustomQuery={handleCustomQuery}
                />
              ))}
            </div>
          </div>
        )}

        {/* Pending Tasks */}
        <div>
          <h2 className="text-lg font-semibold mb-4">Pending Tasks</h2>
          <div className="space-y-4">
            {pendingTasks.length === 0 ? (
              <Card>
                <CardContent className="py-8 text-center">
                  <CheckSquare className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-600">No pending tasks</p>
                  <p className="text-sm text-gray-500 mt-2">
                    You're all caught up! Check back later for new tasks.
                  </p>
                </CardContent>
              </Card>
            ) : (
              pendingTasks.map((task: any) => (
                <TaskCard 
                  key={task.id} 
                  task={task} 
                  onAction={handleTaskAction}
                  isExpanded={expandedTask === task.id}
                  onProcessApproval={processApproval}
                  comments={comments}
                  setComments={setComments}
                  onPreview={() => {}}
                  customQueryOpen={customQueryOpen}
                  setCustomQueryOpen={setCustomQueryOpen}
                  customQuery={customQuery}
                  setCustomQuery={setCustomQuery}
                  customQueryResult={customQueryResult}
                  setCustomQueryResult={setCustomQueryResult}
                  customQueryMutation={customQueryMutation}
                  handleCustomQuery={handleCustomQuery}
                />
              ))
            )}
          </div>
        </div>

        {/* Completed Tasks */}
        {completedTasks.length > 0 && (
          <div>
            <h2 className="text-lg font-semibold mb-4 text-green-600">Completed Tasks</h2>
            <div className="space-y-4">
              {completedTasks.map((task: any) => (
                <TaskCard 
                  key={task.id} 
                  task={task} 
                  onAction={handleTaskAction}
                  isExpanded={expandedTask === task.id}
                  onProcessApproval={processApproval}
                  comments={comments}
                  setComments={setComments}
                  onPreview={() => {}}
                  customQueryOpen={customQueryOpen}
                  setCustomQueryOpen={setCustomQueryOpen}
                  customQuery={customQuery}
                  setCustomQuery={setCustomQuery}
                  customQueryResult={customQueryResult}
                  setCustomQueryResult={setCustomQueryResult}
                  customQueryMutation={customQueryMutation}
                  handleCustomQuery={handleCustomQuery}
                />
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Preview now opens in new tab, no dialog needed */}
    </div>
  );
}

function TaskCard({ 
  task, 
  onAction, 
  isExpanded, 
  onProcessApproval,
  comments,
  setComments,
  onPreview,
  customQueryOpen,
  setCustomQueryOpen,
  customQuery,
  setCustomQuery,
  customQueryResult,
  setCustomQueryResult,
  customQueryMutation,
  handleCustomQuery
}: { 
  task: any; 
  onAction: (task: any) => void;
  isExpanded: boolean;
  onProcessApproval: any;
  comments: string;
  setComments: (comments: string) => void;
  onPreview: (document: any) => void;
  customQueryOpen: number | null;
  setCustomQueryOpen: (id: number | null) => void;
  customQuery: string;
  setCustomQuery: (query: string) => void;
  customQueryResult: string | null;
  setCustomQueryResult: (result: string | null) => void;
  customQueryMutation: any;
  handleCustomQuery: (e: React.FormEvent) => void;
}) {
  const Icon = getTaskIcon(task.taskType);
  const [analyzingDocument, setAnalyzingDocument] = useState<number | null>(null);
  const [analysisResults, setAnalysisResults] = useState<Record<number, any>>({});
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const { data: requestData } = useQuery({
    queryKey: [`/api/${task.requestType.replace('_', '-')}s/${task.requestId}`],
    enabled: isExpanded,
  });

  const { data: approvalHistory } = useQuery({
    queryKey: [`/api/approvals/${task.requestType}/${task.requestId}`],
    enabled: isExpanded,
  });

  const { data: documents } = useQuery({
    queryKey: [`/api/documents/${task.requestType}/${task.requestId}`],
    enabled: isExpanded,
  });

  // Load existing insights from documents when they're available
  useEffect(() => {
    if (documents && documents.length > 0) {
      const results: Record<number, any> = {};
      
      documents.forEach((doc: any) => {
        if (doc.analysisStatus === 'completed' && doc.analysisResult) {
          try {
            const analysisData = JSON.parse(doc.analysisResult);
            results[doc.id] = analysisData;
          } catch (error) {
            console.error('Failed to parse analysis result for document', doc.id, error);
          }
        }
      });
      
      setAnalysisResults(results);
    }
  }, [documents]);

  const getFileIcon = (mimeType: string) => {
    if (mimeType.includes('pdf')) {
      return <FileText className="h-5 w-5 text-red-500" />;
    }
    return <File className="h-5 w-5 text-gray-500" />;
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'approved':
      case 'approve':
        return <CheckCircle className="h-5 w-5 text-green-600" />;
      case 'rejected':
        return <XCircle className="h-5 w-5 text-red-600" />;
      case 'pending':
        return <Clock className="h-5 w-5 text-yellow-600" />;
      default:
        return <User className="h-5 w-5 text-gray-600" />;
    }
  };

  const handleDownload = async (document: any) => {
    try {
      console.log('Starting download for document:', document);
      // Use direct link approach for better browser compatibility
      const link = window.document.createElement('a');
      link.href = `/api/documents/download/${document.id}`;
      link.download = document.originalName;
      link.target = '_blank';
      window.document.body.appendChild(link);
      link.click();
      window.document.body.removeChild(link);
      console.log('Download initiated successfully');
    } catch (error) {
      console.error('Download failed:', error);
      alert('Download failed. Please try again or contact support.');
    }
  };

  const handleGetInsights = async (document: any) => {
    setAnalyzingDocument(document.id);
    
    try {
      toast({
        title: "Getting AI Insights",
        description: "Analyzing document and generating insights...",
      });
      
      const response = await apiRequest('POST', `/api/documents/${document.id}/get-insights`);
      const result = await response.json();
      
      // Store the insights in the analysis results for display
      setAnalysisResults(prev => ({
        ...prev,
        [document.id]: {
          ...prev[document.id],
          summary: result.summary,
          insights: result.insights,
          confidence: 0.95 // Default confidence for insights
        }
      }));
      
      toast({
        title: "Insights Generated",
        description: "AI insights have been generated for the document",
      });
      
      // Refresh the tasks to show updated data
      queryClient.invalidateQueries({ queryKey: [`/api/documents/${task.requestType}/${task.requestId}`] });
      
    } catch (error) {
      console.error('Get insights failed:', error);
      toast({
        title: "Error",
        description: "Failed to generate insights. Please try again.",
        variant: "destructive",
      });
    } finally {
      setAnalyzingDocument(null);
    }
  };

  const handlePrepareForAI = async (document: any) => {
    setAnalyzingDocument(document.id);
    
    try {
      toast({
        title: "Preparing for AI",
        description: "Uploading document to vector store and creating embeddings...",
      });
      
      const response = await apiRequest('POST', `/api/documents/${document.id}/prepare-ai`);
      const result = await response.json();
      
      // Show specific success message based on the result
      if (result.message?.includes('already prepared')) {
        toast({
          title: "✅ Already Prepared",
          description: `Document "${document.originalName}" was already in the vector store and ready for AI analysis.`,
          duration: 5000,
        });
      } else {
        toast({
          title: "✅ AI Preparation Complete",
          description: `Document "${document.originalName}" has been successfully uploaded to vector store and is ready for AI analysis.`,
          duration: 5000,
        });
      }
      
      // Refresh the task data and documents to update button states
      queryClient.invalidateQueries({ queryKey: ['/api/tasks/my-tasks'] });
      queryClient.invalidateQueries({ queryKey: [`/api/documents/${task.requestType}/${task.requestId}`] });
      
    } catch (error) {
      console.error('AI preparation failed:', error);
      toast({
        title: "❌ AI Preparation Failed",
        description: `Failed to prepare document "${document.originalName}" for AI. Please try again.`,
        variant: "destructive",
        duration: 5000,
      });
    } finally {
      setAnalyzingDocument(null);
    }
  };



  
  return (
    <Card className={`hover:shadow-md transition-shadow ${
      task.status === 'overdue' ? 'border-l-4 border-red-500' : ''
    }`}>
      <CardContent className="p-6">
        <div className="flex items-start justify-between">
          <div className="flex items-start gap-4 flex-1">
            <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
              task.status === 'overdue' ? 'bg-red-100' : 
              task.status === 'completed' ? 'bg-green-100' : 'bg-blue-100'
            }`}>
              <Icon className={`h-5 w-5 ${
                task.status === 'overdue' ? 'text-red-600' : 
                task.status === 'completed' ? 'text-green-600' : 'text-blue-600'
              }`} />
            </div>
            
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2">
                <h3 className="font-semibold">{task.title}</h3>
                <Badge className={getStatusColor(task.status)}>
                  {task.status}
                </Badge>
                <Badge className={getPriorityColor(task.priority)}>
                  {task.priority}
                </Badge>
              </div>
              
              <p className="text-gray-600 mb-3">{task.description}</p>
              
              <div className="flex items-center gap-4 text-sm text-gray-500">
                <div className="flex items-center gap-1">
                  <Calendar className="h-4 w-4" />
                  {task.dueDate ? format(new Date(task.dueDate), 'MMM dd, yyyy') : 'No due date'}
                </div>
                <div className="flex items-center gap-1">
                  <User className="h-4 w-4" />
                  {task.requestType.replace('_', ' ')}
                </div>
              </div>
            </div>
          </div>
          
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => onAction(task)}>
              {isExpanded ? <ChevronUp className="h-4 w-4 mr-1" /> : <ChevronDown className="h-4 w-4 mr-1" />}
              {isExpanded ? 'Hide Details' : 'View Details'}
            </Button>
            {task.status === 'pending' && !isExpanded && (
              <Button size="sm" onClick={() => onAction(task)}>
                Take Action
              </Button>
            )}
          </div>
        </div>

        {/* Expanded Details */}
        {isExpanded && requestData && (
          <div className="mt-6 space-y-6 pt-6 border-t">
            {/* Request Details */}
            <div className="bg-gray-50 p-4 rounded-lg">
              <h4 className="font-semibold mb-4">Request Details</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <p className="text-sm font-medium text-gray-600">Request ID</p>
                  <p className="text-lg font-semibold">{requestData.requestId}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-600">
                    {task.requestType === 'investment' ? 'Target Company' : 'Amount'}
                  </p>
                  <p className="text-lg font-semibold">
                    {task.requestType === 'investment' 
                      ? requestData.targetCompany 
                      : `$${requestData.amount}`}
                  </p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-600">Amount</p>
                  <p className="text-lg font-semibold">${requestData.amount}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-600">
                    {task.requestType === 'investment' ? 'Expected Return' : 'Payment Timeline'}
                  </p>
                  <p className="text-lg font-semibold">
                    {task.requestType === 'investment' 
                      ? `${requestData.expectedReturn}%` 
                      : requestData.paymentTimeline}
                  </p>
                </div>
              </div>
              
              {requestData.description && (
                <div className="mt-4">
                  <p className="text-sm font-medium text-gray-600 mb-2">Description</p>
                  <p className="text-gray-800">{requestData.description}</p>
                </div>
              )}

              {task.requestType === 'investment' && requestData.riskLevel && (
                <div className="mt-4">
                  <p className="text-sm font-medium text-gray-600 mb-2">Risk Level</p>
                  <Badge className={
                    requestData.riskLevel === 'high' ? 'bg-red-100 text-red-800' :
                    requestData.riskLevel === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                    'bg-green-100 text-green-800'
                  }>
                    {requestData.riskLevel} risk
                  </Badge>
                </div>
              )}
            </div>

            {/* Documents */}
            {documents && documents.length > 0 && (
              <div className="bg-gray-50 p-4 rounded-lg">
                <h4 className="font-semibold mb-4">Supporting Documents</h4>
                <div className="space-y-2">
                  {documents.map((document: any) => (
                    <div key={document.id} className="flex items-center justify-between p-3 bg-white rounded-lg shadow-sm">
                      <div className="flex items-center space-x-3">
                        {getFileIcon(document.mimeType)}
                        <div>
                          <p className="text-sm font-medium">{document.originalName}</p>
                          <p className="text-xs text-gray-500">
                            {(document.fileSize / 1024 / 1024).toFixed(2)} MB
                          </p>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button 
                                variant="ghost" 
                                size="sm"
                                onClick={() => {
                                  // Open preview in new tab to avoid Chrome blocking
                                  window.open(`/api/documents/preview/${document.id}`, '_blank');
                                }}
                              >
                                <Eye className="h-4 w-4" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>Preview Document</p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button 
                                variant="ghost" 
                                size="sm"
                                onClick={() => {
                                  // Use direct link approach for download
                                  const link = window.document.createElement('a');
                                  link.href = `/api/documents/download/${document.id}`;
                                  link.download = document.originalName;
                                  link.target = '_blank';
                                  window.document.body.appendChild(link);
                                  link.click();
                                  window.document.body.removeChild(link);
                                }}
                              >
                                <Download className="h-4 w-4" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>Download Document</p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                        {document.analysisStatus === 'pending' && (
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  variant="ghost" 
                                  size="sm"
                                  onClick={() => handlePrepareForAI(document)}
                                  disabled={analyzingDocument === document.id}
                                >
                                  <FileText className={`h-4 w-4 ${analyzingDocument === document.id ? 'animate-pulse' : ''}`} />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>
                                <p>{analyzingDocument === document.id ? 'Preparing for AI...' : 'Prepare for AI'}</p>
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        )}
                        {document.analysisStatus === 'completed' && (
                          <Dialog open={customQueryOpen === document.id} onOpenChange={(open) => {
                            if (open) {
                              setCustomQueryOpen(document.id);
                              setCustomQuery('');
                              setCustomQueryResult(null);
                            } else {
                              setCustomQueryOpen(null);
                            }
                          }}>
                            <DialogTrigger asChild>
                              <TooltipProvider>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Button 
                                      variant="ghost" 
                                      size="sm"
                                      className="text-green-600 hover:text-green-700 hover:bg-green-50 dark:text-green-400 dark:hover:text-green-300 dark:hover:bg-green-900/20"
                                    >
                                      <MessageSquare className="h-4 w-4" />
                                    </Button>
                                  </TooltipTrigger>
                                  <TooltipContent>
                                    <p>Ask Custom Question</p>
                                  </TooltipContent>
                                </Tooltip>
                              </TooltipProvider>
                            </DialogTrigger>
                            <DialogContent className="sm:max-w-[525px]">
                              <DialogHeader>
                                <DialogTitle className="flex items-center gap-2">
                                  <MessageSquare className="h-5 w-5 text-green-600" />
                                  Ask About This Document
                                </DialogTitle>
                              </DialogHeader>
                              <div className="space-y-4">
                                <p className="text-sm text-gray-600 dark:text-gray-400">
                                  Ask any specific question about "{document.originalName}" and get AI-powered answers based on the document content.
                                </p>
                                
                                <form onSubmit={handleCustomQuery} className="space-y-4">
                                  <div className="flex gap-2">
                                    <input
                                      type="text"
                                      placeholder="e.g., What are the key financial highlights?"
                                      value={customQuery}
                                      onChange={(e) => setCustomQuery(e.target.value)}
                                      disabled={customQueryMutation.isPending}
                                      className="flex-1 px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    />
                                    <Button 
                                      type="submit" 
                                      disabled={customQueryMutation.isPending || !customQuery.trim()}
                                      size="sm"
                                    >
                                      {customQueryMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                                    </Button>
                                  </div>
                                </form>
                                
                                {customQueryResult && (
                                  <div className="mt-4 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                                    <div className="flex items-center gap-2 mb-2">
                                      <MessageSquare className="h-4 w-4 text-green-600" />
                                      <span className="text-sm font-medium">AI Response</span>
                                    </div>
                                    <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
                                      {customQueryResult}
                                    </p>
                                  </div>
                                )}
                              </div>
                            </DialogContent>
                          </Dialog>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
                
                {/* Analysis Results */}
                {Object.keys(analysisResults).length > 0 && (
                  <div className="mt-6 space-y-4">
                    <h4 className="font-semibold text-lg">Document Analysis Results</h4>
                    {Object.entries(analysisResults).map(([docId, analysis]) => {
                      const document = documents.find((doc: any) => doc.id === parseInt(docId));
                      return (
                        <div key={docId} className="bg-blue-50 p-4 rounded-lg border">
                          <div className="flex items-center gap-2 mb-3">
                            <FileText className="h-5 w-5 text-blue-600" />
                            <h5 className="font-medium">{document?.originalName}</h5>
                            <Badge className="bg-blue-100 text-blue-800">
                              {Math.round(analysis.confidence * 100)}% confidence
                            </Badge>
                          </div>
                          
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                              <p className="text-sm font-medium text-gray-600 mb-1">Document Type</p>
                              <p className="text-sm">{analysis.documentType}</p>
                            </div>
                            <div>
                              <p className="text-sm font-medium text-gray-600 mb-1">Risk Level</p>
                              <Badge className={
                                analysis.riskAssessment?.level === 'high' ? 'bg-red-100 text-red-800' :
                                analysis.riskAssessment?.level === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                                'bg-green-100 text-green-800'
                              }>
                                {analysis.riskAssessment?.level || 'unknown'} risk
                              </Badge>
                            </div>
                          </div>
                          
                          <div className="mt-3">
                            <p className="text-sm font-medium text-gray-600 mb-1">Summary</p>
                            <p className="text-sm text-gray-700">{analysis.summary}</p>
                          </div>
                          
                          {/* AI Insights */}
                          {analysis.insights && (
                            <div className="mt-3">
                              <p className="text-sm font-medium text-gray-600 mb-1">AI Insights</p>
                              <div className="text-sm text-gray-700 whitespace-pre-line">
                                {analysis.insights}
                              </div>
                            </div>
                          )}
                          
                          {analysis.keyInformation?.amounts && analysis.keyInformation.amounts.length > 0 && (
                            <div className="mt-3">
                              <p className="text-sm font-medium text-gray-600 mb-1">Key Amounts</p>
                              <div className="flex flex-wrap gap-2">
                                {analysis.keyInformation.amounts.map((amount: string, index: number) => (
                                  <Badge key={index} variant="outline" className="text-xs">
                                    {amount}
                                  </Badge>
                                ))}
                              </div>
                            </div>
                          )}
                          
                          {analysis.recommendations && analysis.recommendations.length > 0 && (
                            <div className="mt-3">
                              <p className="text-sm font-medium text-gray-600 mb-1">Recommendations</p>
                              <ul className="text-sm text-gray-700 space-y-1">
                                {analysis.recommendations.slice(0, 3).map((rec: string, index: number) => (
                                  <li key={index} className="flex items-start gap-2">
                                    <span className="text-blue-600">•</span>
                                    <span>{rec}</span>
                                  </li>
                                ))}
                              </ul>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* Approval History */}
            {approvalHistory && approvalHistory.length > 0 && (
              <div className="bg-gray-50 p-4 rounded-lg">
                <h4 className="font-semibold mb-4">Approval History</h4>
                <div className="space-y-3">
                  {approvalHistory.map((approval: any) => (
                    <div key={approval.id} className="flex items-center space-x-3 p-3 bg-white rounded-lg">
                      {getStatusIcon(approval.status)}
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-medium">
                            Stage {approval.stage} - {approval.status === 'approve' ? 'approved' : approval.status}
                          </p>
                          <Badge className={getStatusColor(approval.status === 'approve' ? 'approved' : approval.status)}>
                            {approval.status === 'approve' ? 'approved' : approval.status}
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
              </div>
            )}

            {/* Comments and Actions */}
            {task.status === 'pending' && (
              <div className="bg-gray-50 p-4 rounded-lg">
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="comments">Comments (Optional)</Label>
                    <Textarea
                      id="comments"
                      rows={3}
                      placeholder="Add your comments or feedback..."
                      value={comments}
                      onChange={(e) => setComments(e.target.value)}
                      className="mt-2"
                    />
                  </div>

                  <div className="flex items-center justify-end space-x-4">
                    <Button
                      variant="destructive"
                      onClick={() => onProcessApproval.mutate({ taskId: task.id, action: 'reject' })}
                      disabled={onProcessApproval.isPending}
                    >
                      <XCircle className="h-4 w-4 mr-2" />
                      Reject
                    </Button>
                    <Button
                      variant="secondary"
                      onClick={() => onProcessApproval.mutate({ taskId: task.id, action: 'changes_requested' })}
                      disabled={onProcessApproval.isPending}
                    >
                      <FileText className="h-4 w-4 mr-2" />
                      Request Changes
                    </Button>
                    <Button
                      onClick={() => onProcessApproval.mutate({ taskId: task.id, action: 'approve' })}
                      disabled={onProcessApproval.isPending}
                    >
                      <CheckCircle className="h-4 w-4 mr-2" />
                      Approve
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function getTaskIcon(taskType: string) {
  switch (taskType) {
    case 'approval':
      return CheckSquare;
    case 'review':
      return Clock;
    case 'changes_requested':
      return AlertTriangle;
    default:
      return CheckSquare;
  }
}

function getStatusColor(status: string) {
  switch (status) {
    case 'pending':
      return 'bg-yellow-100 text-yellow-800';
    case 'completed':
    case 'approved':
    case 'approve':
    case 'Manager approved':
    case 'Committee approved':
    case 'Finance approved':
      return 'bg-green-100 text-green-800';
    case 'overdue':
    case 'rejected':
    case 'Manager rejected':
    case 'Committee rejected':
    case 'Finance rejected':
      return 'bg-red-100 text-red-800';
    default:
      return 'bg-gray-100 text-gray-800';
  }
}

function getPriorityColor(priority: string) {
  switch (priority) {
    case 'high':
      return 'bg-red-100 text-red-800';
    case 'medium':
      return 'bg-yellow-100 text-yellow-800';
    case 'low':
      return 'bg-blue-100 text-blue-800';
    default:
      return 'bg-gray-100 text-gray-800';
  }
}
