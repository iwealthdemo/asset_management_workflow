import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Briefcase, DollarSign, Calendar, TrendingUp, Eye } from "lucide-react";
import { format } from "date-fns";
import { useState } from "react";
import { InvestmentDetailsInline } from "@/components/details/InvestmentDetailsInline";

export default function MyInvestments() {
  const [expandedInvestment, setExpandedInvestment] = useState<number | null>(null);

  const { data: investments, isLoading } = useQuery({
    queryKey: ["/api/investments", { my: true }],
  });

  const handleToggleDetails = (investmentId: number) => {
    setExpandedInvestment(expandedInvestment === investmentId ? null : investmentId);
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

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending':
        return <Clock className="w-4 h-4" />;
      case 'approved':
        return <CheckCircle className="w-4 h-4" />;
      case 'rejected':
        return <AlertTriangle className="w-4 h-4" />;
      case 'changes_requested':
        return <Eye className="w-4 h-4" />;
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

  // Filter logic based on actual approval states
  const pendingInvestments = investments?.filter((inv: any) => {
    // Pending means not fully approved and not rejected
    const status = inv.status.toLowerCase();
    return !status.includes('approved') && !status.includes('rejected') && status !== 'approved';
  }) || [];
  
  const approvedInvestments = investments?.filter((inv: any) => {
    // Approved means final approval status (only "approved", not partial approvals)
    return inv.status.toLowerCase() === 'approved';
  }) || [];
  
  const rejectedInvestments = investments?.filter((inv: any) => {
    // Rejected by any approver
    const status = inv.status.toLowerCase();
    return status === 'rejected' || status.includes('rejected');
  }) || [];

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
          <InvestmentList investments={investments || []} onToggleDetails={handleToggleDetails} expandedInvestment={expandedInvestment} />
        </TabsContent>

        <TabsContent value="pending" className="space-y-4">
          <InvestmentList investments={pendingInvestments} onToggleDetails={handleToggleDetails} expandedInvestment={expandedInvestment} />
        </TabsContent>

        <TabsContent value="approved" className="space-y-4">
          <InvestmentList investments={approvedInvestments} onToggleDetails={handleToggleDetails} expandedInvestment={expandedInvestment} />
        </TabsContent>

        <TabsContent value="rejected" className="space-y-4">
          <InvestmentList investments={rejectedInvestments} onToggleDetails={handleToggleDetails} expandedInvestment={expandedInvestment} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function InvestmentList({ investments, onToggleDetails, expandedInvestment }: { 
  investments: any[], 
  onToggleDetails: (id: number) => void, 
  expandedInvestment: number | null 
}) {
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
      <div className="text-center py-8 text-gray-500">
        No investments found.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {investments.map((investment) => (
        <Card key={investment.id} className="hover:shadow-lg transition-shadow">
          <CardContent className="p-6">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-3">
                  <div className="flex items-center gap-2">
                    <Briefcase className="w-5 h-5 text-blue-600" />
                    <h3 className="font-semibold text-lg">{investment.targetCompany}</h3>
                  </div>
                  <Badge className={getStatusColor(investment.status)}>
                    {investment.status}
                  </Badge>
                  <Badge className={getRiskColor(investment.riskLevel)}>
                    {investment.riskLevel} risk
                  </Badge>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                  <div className="flex items-center gap-2">
                    <DollarSign className="w-4 h-4 text-green-600" />
                    <span className="text-sm text-gray-600">Amount:</span>
                    <span className="font-semibold">${investment.amount}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <TrendingUp className="w-4 h-4 text-blue-600" />
                    <span className="text-sm text-gray-600">Expected Return:</span>
                    <span className="font-semibold">{investment.expectedReturn}%</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-gray-600" />
                    <span className="text-sm text-gray-600">Created:</span>
                    <span className="font-semibold">{format(new Date(investment.createdAt), 'MMM dd, yyyy')}</span>
                  </div>
                </div>
                
                <p className="text-sm text-gray-600 mb-4">{investment.description}</p>
              </div>
            </div>
            
            <InvestmentDetailsInline
              investment={investment}
              isExpanded={expandedInvestment === investment.id}
              onToggle={() => onToggleDetails(investment.id)}
            />
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
