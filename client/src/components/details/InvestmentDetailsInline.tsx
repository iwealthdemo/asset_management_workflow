import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Card, CardContent } from "@/components/ui/card";
import { CheckCircle, AlertTriangle, Clock, Eye, ChevronDown, ChevronUp } from "lucide-react";
import { format } from "date-fns";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";

interface InvestmentDetailsInlineProps {
  investment: any;
  isExpanded: boolean;
  onToggle: () => void;
}

export function InvestmentDetailsInline({ investment, isExpanded, onToggle }: InvestmentDetailsInlineProps) {
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

            {/* Documents */}
            {documents && documents.length > 0 && (
              <Card>
                <CardContent className="pt-6">
                  <h4 className="font-semibold mb-4">Supporting Documents</h4>
                  <div className="space-y-2">
                    {documents.map((document: any) => (
                      <div key={document.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <div className="flex items-center space-x-3">
                          <div className="h-5 w-5 text-gray-500">
                            {document.mimeType?.includes('pdf') ? '📄' : '📎'}
                          </div>
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
                            onClick={() => window.open(`/api/documents/preview/${document.id}`, '_blank')}
                          >
                            <Eye className="h-4 w-4 mr-1" />
                            Preview
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="sm"
                            onClick={() => {
                              const link = window.document.createElement('a');
                              link.href = `/api/documents/download/${document.id}`;
                              link.download = document.originalName;
                              link.target = '_blank';
                              window.document.body.appendChild(link);
                              link.click();
                              window.document.body.removeChild(link);
                            }}
                          >
                            Download
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
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