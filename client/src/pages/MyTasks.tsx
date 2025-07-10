import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useState } from "react";
import { Clock, CheckSquare, AlertTriangle, Calendar, User, Download, FileText, File, ChevronDown, ChevronUp, CheckCircle, XCircle, Eye } from "lucide-react";
import { format } from "date-fns";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

export default function MyTasks() {
  const [expandedTask, setExpandedTask] = useState<number | null>(null);
  const [comments, setComments] = useState("");
  // Remove previewDocument state as we're using new tab approach
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
  onPreview
}: { 
  task: any; 
  onAction: (task: any) => void;
  isExpanded: boolean;
  onProcessApproval: any;
  comments: string;
  setComments: (comments: string) => void;
  onPreview: (document: any) => void;
}) {
  const Icon = getTaskIcon(task.taskType);
  
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

  const getFileIcon = (mimeType: string) => {
    if (mimeType.includes('pdf')) {
      return <FileText className="h-5 w-5 text-red-500" />;
    }
    return <File className="h-5 w-5 text-gray-500" />;
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'approved':
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
                        <Button 
                          variant="ghost" 
                          size="sm"
                          onClick={() => {
                            // Open preview in new tab to avoid Chrome blocking
                            window.open(`/api/documents/preview/${document.id}`, '_blank');
                          }}
                        >
                          <Eye className="h-4 w-4 mr-1" />
                          Preview
                        </Button>
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
                          <Download className="h-4 w-4 mr-1" />
                          Download
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
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
      return 'bg-green-100 text-green-800';
    case 'overdue':
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
