import { useQuery } from "@tanstack/react-query";
import { StatsCard } from "@/components/cards/StatsCard";
import { RequestsTable } from "@/components/tables/RequestsTable";
import { TaskList } from "@/components/tasks/TaskList";
import ProposalSummaryCard from "@/components/dashboard/ProposalSummaryCard";
import RiskProfileChart from "@/components/dashboard/RiskProfileChart";
import ValueDistributionChart from "@/components/dashboard/ValueDistributionChart";
import DecisionSupportWidget from "@/components/dashboard/DecisionSupportWidget";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Link } from "wouter";
import { useUser } from "@/lib/auth";
import { DashboardStats, RecentRequest } from "@/lib/types";
import { 
  Clock, 
  Briefcase, 
  DollarSign, 
  AlertTriangle, 
  PlusCircle, 
  FileText,
  TrendingUp,
  Shield
} from "lucide-react";

export default function Dashboard() {
  const { data: user } = useUser();
  
  // Legacy stats for backward compatibility
  const { data: stats, isLoading: statsLoading } = useQuery<DashboardStats>({
    queryKey: ["/api/dashboard/stats"],
  });

  // Enhanced stats for new dashboard
  const { data: enhancedStats, isLoading: enhancedStatsLoading } = useQuery({
    queryKey: ["/api/dashboard/enhanced-stats"],
  });

  const { data: recentRequests, isLoading: requestsLoading } = useQuery<RecentRequest[]>({
    queryKey: ["/api/dashboard/recent-requests"],
  });

  const { data: myTasks, isLoading: tasksLoading } = useQuery({
    queryKey: ["/api/tasks"],
  });

  if (statsLoading || enhancedStatsLoading || requestsLoading || tasksLoading) {
    return (
      <div className="p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="bg-card p-6 rounded-lg shadow animate-pulse">
              <div className="h-4 bg-muted rounded w-3/4 mb-2"></div>
              <div className="h-8 bg-muted rounded w-1/2"></div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  const userRole = user?.role || 'analyst';
  
  // Show Quick Actions only for roles that can create proposals
  const showQuickActions = ['analyst', 'admin'].includes(userRole);
  
  return (
    <div className="p-6 space-y-6">
      {/* Legacy Stats Cards - Condensed */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatsCard
          title="My Pending Tasks"
          value={stats?.pendingApprovals || 0}
          icon={Clock}
          color="primary"
        />
        <StatsCard
          title="Active Investments"
          value={stats?.activeInvestments || 0}
          icon={Briefcase}
          color="success"
        />
        <StatsCard
          title="Cash Requests"
          value={stats?.cashRequests || 0}
          icon={DollarSign}
          color="warning"
        />
        <StatsCard
          title="SLA Issues"
          value={stats?.slaBreaches || 0}
          icon={AlertTriangle}
          color="destructive"
        />
      </div>

      {/* Enhanced Dashboard Content */}
      {enhancedStats && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Proposal Summary - Full Width */}
          <div className="lg:col-span-3">
            <ProposalSummaryCard 
              data={enhancedStats.proposalSummary} 
              userRole={userRole}
            />
          </div>

          {/* Decision Support Widget - Full Width */}
          <div className="lg:col-span-3">
            <DecisionSupportWidget 
              data={enhancedStats.decisionSupport} 
              userRole={userRole}
            />
          </div>

          {/* Risk Profile Chart */}
          <div className="lg:col-span-1">
            <RiskProfileChart data={enhancedStats.riskProfile} />
          </div>

          {/* Value Distribution Chart */}
          <div className="lg:col-span-1">
            <ValueDistributionChart data={enhancedStats.valueDistribution} />
          </div>

          {/* Recent Requests & Quick Actions */}
          <div className="lg:col-span-1 space-y-6">
            {/* Recent Requests */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>Recent Requests</CardTitle>
                  <Link href="/investments">
                    <Button variant="ghost" size="sm">
                      View All
                    </Button>
                  </Link>
                </div>
              </CardHeader>
              <CardContent>
                <RequestsTable requests={recentRequests || []} />
              </CardContent>
            </Card>

            {/* Quick Actions - Only for analysts and admins */}
            {showQuickActions && (
              <Card>
                <CardHeader>
                  <CardTitle>Quick Actions</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <Link href="/new-investment">
                    <Button className="w-full justify-start">
                      <PlusCircle className="mr-2 h-4 w-4" />
                      New Investment Request
                    </Button>
                  </Link>
                  <Link href="/cash-requests">
                    <Button variant="outline" className="w-full justify-start">
                      <DollarSign className="mr-2 h-4 w-4" />
                      New Cash Request
                    </Button>
                  </Link>
                  <Link href="/templates">
                    <Button variant="ghost" className="w-full justify-start">
                      <FileText className="mr-2 h-4 w-4" />
                      Use Template
                    </Button>
                  </Link>
                </CardContent>
              </Card>
            )}

            {/* My Tasks */}
            <Card>
              <CardHeader>
                <CardTitle>My Tasks</CardTitle>
              </CardHeader>
              <CardContent>
                <TaskList tasks={myTasks || []} />
              </CardContent>
            </Card>
          </div>
        </div>
      )}
    </div>
  );
}
