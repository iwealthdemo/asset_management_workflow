import { useState } from "react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { apiRequest } from "@/lib/queryClient"
import { useToast } from "@/hooks/use-toast"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Card, CardContent } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { CheckCircle, XCircle, Clock, User, Download, FileText, File } from "lucide-react"
import { format } from "date-fns"

interface ApprovalModalProps {
  isOpen: boolean
  onClose: () => void
  task: any
}

export function ApprovalModal({ isOpen, onClose, task }: ApprovalModalProps) {
  const [comments, setComments] = useState("")
  const { toast } = useToast()
  const queryClient = useQueryClient()

  const { data: requestData } = useQuery({
    queryKey: [`/api/${task?.requestType.replace('_', '-')}s/${task?.requestId}`],
    enabled: !!task,
  })

  const { data: approvalHistory } = useQuery({
    queryKey: [`/api/approvals/${task?.requestType}/${task?.requestId}`],
    enabled: !!task,
  })

  const { data: documents } = useQuery({
    queryKey: [`/api/documents/${task?.requestType}/${task?.requestId}`],
    enabled: !!task,
  })

  const processApproval = useMutation({
    mutationFn: async ({ action }: { action: 'approve' | 'reject' | 'changes_requested' }) => {
      const response = await apiRequest("POST", "/api/approvals", {
        requestType: task.requestType,
        requestId: task.requestId,
        action,
        comments,
      })
      return response.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tasks"] })
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/stats"] })
      queryClient.invalidateQueries({ queryKey: [`/api/approvals/${task?.requestType}/${task?.requestId}`] })
      
      toast({
        title: "Approval processed",
        description: "The request has been processed successfully",
      })
      
      onClose()
    },
    onError: (error: any) => {
      toast({
        title: "Error processing approval",
        description: error.message || "Something went wrong",
        variant: "destructive",
      })
    },
  })

  if (!task || !requestData) {
    return null
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'approved':
        return <CheckCircle className="h-5 w-5 text-green-600" />
      case 'rejected':
        return <XCircle className="h-5 w-5 text-red-600" />
      case 'pending':
        return <Clock className="h-5 w-5 text-yellow-600" />
      default:
        return <User className="h-5 w-5 text-gray-600" />
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'approved':
        return 'bg-green-100 text-green-800'
      case 'rejected':
        return 'bg-red-100 text-red-800'
      case 'pending':
        return 'bg-yellow-100 text-yellow-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const getFileIcon = (mimeType: string) => {
    if (mimeType.includes('pdf')) {
      return <FileText className="h-5 w-5 text-red-500" />
    }
    return <File className="h-5 w-5 text-gray-500" />
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl">
            {task.requestType === 'investment' ? 'Investment' : 'Cash'} Request Review
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Request Details */}
          <Card>
            <CardContent className="pt-6">
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
              
              <div className="mt-4">
                <p className="text-sm font-medium text-gray-600 mb-2">Investment Rationale / Description</p>
                <p className="text-gray-800 bg-white p-3 rounded border min-h-[60px]">
                  {requestData.description || 'No description provided by the analyst'}
                </p>
              </div>

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
            </CardContent>
          </Card>

          {/* Approval History */}
          {approvalHistory && approvalHistory.length > 0 && (
            <Card>
              <CardContent className="pt-6">
                <h4 className="text-lg font-semibold mb-4">Approval History</h4>
                <div className="space-y-3">
                  {approvalHistory.map((approval: any, index: number) => (
                    <div key={approval.id} className="flex items-center space-x-3">
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

          {/* Documents */}
          {documents && documents.length > 0 && (
            <Card>
              <CardContent className="pt-6">
                <h4 className="text-lg font-semibold mb-4">Supporting Documents</h4>
                <div className="space-y-2">
                  {documents.map((document: any) => (
                    <div key={document.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div className="flex items-center space-x-3">
                        {getFileIcon(document.mimeType)}
                        <div>
                          <p className="text-sm font-medium">{document.originalName}</p>
                          <p className="text-xs text-gray-500">
                            {(document.fileSize / 1024 / 1024).toFixed(2)} MB
                          </p>
                        </div>
                      </div>
                      <Button variant="ghost" size="sm">
                        <Download className="h-4 w-4 mr-1" />
                        Download
                      </Button>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Comments */}
          <Card>
            <CardContent className="pt-6">
              <Label htmlFor="comments">Comments (Optional)</Label>
              <Textarea
                id="comments"
                rows={3}
                placeholder="Add your comments or feedback..."
                value={comments}
                onChange={(e) => setComments(e.target.value)}
                className="mt-2"
              />
            </CardContent>
          </Card>

          {/* Action Buttons */}
          <div className="flex items-center justify-end space-x-4 pt-6 border-t">
            <Button variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => processApproval.mutate({ action: 'reject' })}
              disabled={processApproval.isPending}
            >
              <XCircle className="h-4 w-4 mr-2" />
              Reject
            </Button>
            <Button
              variant="secondary"
              onClick={() => processApproval.mutate({ action: 'changes_requested' })}
              disabled={processApproval.isPending}
            >
              <FileText className="h-4 w-4 mr-2" />
              Request Changes
            </Button>
            <Button
              onClick={() => processApproval.mutate({ action: 'approve' })}
              disabled={processApproval.isPending}
            >
              <CheckCircle className="h-4 w-4 mr-2" />
              Approve
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
