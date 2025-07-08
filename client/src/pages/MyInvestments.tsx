import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Briefcase, DollarSign, Calendar, TrendingUp } from "lucide-react";
import { format } from "date-fns";

export default function MyInvestments() {
  const { data: investments, isLoading } = useQuery({
    queryKey: ["/api/investments", { my: true }],
  });

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
          <InvestmentList investments={investments || []} />
        </TabsContent>

        <TabsContent value="pending" className="space-y-4">
          <InvestmentList investments={pendingInvestments} />
        </TabsContent>

        <TabsContent value="approved" className="space-y-4">
          <InvestmentList investments={approvedInvestments} />
        </TabsContent>

        <TabsContent value="rejected" className="space-y-4">
          <InvestmentList investments={rejectedInvestments} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function InvestmentList({ investments }: { investments: any[] }) {
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
                <Button variant="outline" size="sm">
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
