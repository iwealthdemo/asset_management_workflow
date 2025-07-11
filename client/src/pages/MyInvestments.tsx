import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Briefcase, DollarSign, Calendar, TrendingUp } from "lucide-react";
import { format } from "date-fns";
import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { CheckCircle, AlertTriangle, Clock, Eye } from "lucide-react";

export default function MyInvestments() {
  const [selectedInvestment, setSelectedInvestment] = useState<any>(null);
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);

  const { data: investments, isLoading } = useQuery({
    queryKey: ["/api/investments", { my: true }],
  });

  // Fetch detailed investment data when viewing
  const { data: investmentDetails, isLoading: isInvestmentLoading } = useQuery({
    queryKey: ["/api/investments", selectedInvestment?.id],
    enabled: !!selectedInvestment && isViewDialogOpen,
  });

  // Fetch approval history
  const { data: approvalHistory } = useQuery({
    queryKey: ["/api/approvals/investment", selectedInvestment?.id],
    enabled: !!selectedInvestment && isViewDialogOpen,
  });

  // Fetch documents
  const { data: documents } = useQuery({
    queryKey: ["/api/documents/investment", selectedInvestment?.id],
    enabled: !!selectedInvestment && isViewDialogOpen,
  });

  const handleViewInvestment = (investment: any) => {
    setSelectedInvestment(investment);
    setIsViewDialogOpen(true);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'approved':
        return 'bg-green-100 text-green-800';
      case 'rejected':
        return 'bg-red-100 text-red-800';
      case 'changes_requested':
        return 'bg-blue-100 text-blue-800';
      default:
        return 'bg-gray-100 text-gray-800';
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

  const pendingInvestments = investments?.filter((inv: any) => inv.status === 'pending') || [];
  const approvedInvestments = investments?.filter((inv: any) => inv.status === 'approved') || [];
  const rejectedInvestments = investments?.filter((inv: any) => inv.status === 'rejected') || [];

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold mb-2">My Investments</h1>
        <div className="flex gap-4 text-sm text-gray-600">
          <span>{pendingInvestments.length} pending</span>
          <span>{approvedInvestments.length} approved</span>
          <span>{rejectedInvestments.length} rejected</span>
        </div>
      </div>

      <Tabs defaultValue="all" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="all">All</TabsTrigger>
          <TabsTrigger value="pending">Pending</TabsTrigger>
          <TabsTrigger value="approved">Approved</TabsTrigger>
          <TabsTrigger value="rejected">Rejected</TabsTrigger>
        </TabsList>

        <TabsContent value="all" className="space-y-4">
          <InvestmentList investments={investments || []} onViewDetails={handleViewInvestment} />
        </TabsContent>

        <TabsContent value="pending" className="space-y-4">
          <InvestmentList investments={pendingInvestments} onViewDetails={handleViewInvestment} />
        </TabsContent>

        <TabsContent value="approved" className="space-y-4">
          <InvestmentList investments={approvedInvestments} onViewDetails={handleViewInvestment} />
        </TabsContent>

        <TabsContent value="rejected" className="space-y-4">
          <InvestmentList investments={rejectedInvestments} onViewDetails={handleViewInvestment} />
        </TabsContent>
      </Tabs>

      {/* View Investment Dialog */}
      <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Investment Request Details</DialogTitle>
          </DialogHeader>
          
          {isInvestmentLoading ? (
            <div className="flex items-center justify-center p-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : investmentDetails ? (
            <div className="space-y-6">
              {/* Request Details */}
              <div className="bg-gray-50 p-4 rounded-lg">
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
                </div>
                
                {investmentDetails.description && (
                  <div className="mt-4">
                    <p className="text-sm font-medium text-gray-600 mb-2">Description</p>
                    <p className="text-gray-800">{investmentDetails.description}</p>
                  </div>
                )}
              </div>

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

              {/* Documents */}
              {documents && documents.length > 0 && (
                <div className="bg-gray-50 p-4 rounded-lg">
                  <h4 className="font-semibold mb-4">Supporting Documents</h4>
                  <div className="space-y-2">
                    {documents.map((document: any) => (
                      <div key={document.id} className="flex items-center justify-between p-3 bg-white rounded-lg shadow-sm">
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
                </div>
              )}
            </div>
          ) : (
            <div className="text-center py-8">
              <p className="text-gray-500">Investment details not found</p>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function InvestmentList({ investments, onViewDetails }: { investments: any[], onViewDetails: (investment: any) => void }) {
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

  if (investments.length === 0) {
    return (
      <Card>
        <CardContent className="py-8 text-center">
          <Briefcase className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-600">No investments found</p>
          <p className="text-sm text-gray-500 mt-2">
            Create your first investment request to get started
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {investments.map((investment: any) => (
        <Card key={investment.id} className="hover:shadow-md transition-shadow">
          <CardContent className="p-6">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-2">
                  <h3 className="font-semibold text-lg">{investment.requestId}</h3>
                  <Badge className={getStatusColor(investment.status)}>
                    {investment.status}
                  </Badge>
                  <Badge className={getRiskColor(investment.riskLevel)}>
                    {investment.riskLevel} risk
                  </Badge>
                </div>
                
                <h4 className="font-medium text-gray-900 mb-2">{investment.targetCompany}</h4>
                
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
                  <div className="flex items-center gap-2">
                    <DollarSign className="h-4 w-4 text-gray-500" />
                    <span className="font-medium">${investment.amount}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <TrendingUp className="h-4 w-4 text-gray-500" />
                    <span className="text-sm text-gray-600">
                      {investment.expectedReturn}% expected return
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Briefcase className="h-4 w-4 text-gray-500" />
                    <span className="text-sm text-gray-600 capitalize">
                      {investment.investmentType.replace('_', ' ')}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-gray-500" />
                    <span className="text-sm text-gray-600">
                      {format(new Date(investment.createdAt), 'MMM dd, yyyy')}
                    </span>
                  </div>
                </div>
                
                <p className="text-gray-600 mb-4">{investment.description}</p>
              </div>
              
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={() => onViewDetails(investment)}>
                  View Details
                </Button>
                {investment.status === 'pending' && (
                  <Button variant="ghost" size="sm">
                    Edit
                  </Button>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
