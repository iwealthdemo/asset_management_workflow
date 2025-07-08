import { useQuery } from "@tanstack/react-query";
import { StatsCard } from "@/components/cards/StatsCard";
import { RequestsTable } from "@/components/tables/RequestsTable";
import { TaskList } from "@/components/tasks/TaskList";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Link } from "wouter";
import { DashboardStats, RecentRequest } from "@/lib/types";
import { 
  Clock, 
  Briefcase, 
  DollarSign, 
  AlertTriangle, 
  PlusCircle, 
  FileText
} from "lucide-react";

export default function Dashboard() {
  const { data: stats, isLoading: statsLoading } = useQuery<DashboardStats>({
    queryKey: ["/api/dashboard/stats"],
  });

  const { data: recentRequests, isLoading: requestsLoading } = useQuery<RecentRequest[]>({
    queryKey: ["/api/dashboard/recent-requests"],
  });

  const { data: myTasks, isLoading: tasksLoading } = useQuery({
    queryKey: ["/api/tasks"],
  });

  if (statsLoading || requestsLoading || tasksLoading) {
    return (
      <div className="p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="bg-white p-6 rounded-lg shadow animate-pulse">
              <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
              <div className="h-8 bg-gray-200 rounded w-1/2"></div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <StatsCard
          title="Pending Approvals"
          value={stats?.pendingApprovals || 0}
          icon={Clock}
          trend="+8%"
          trendType="positive"
          color="primary"
        />
        <StatsCard
          title="Active Investments"
          value={stats?.activeInvestments || 0}
          icon={Briefcase}
          trend="+12%"
          trendType="positive"
          color="success"
        />
        <StatsCard
          title="Cash Requests"
          value={stats?.cashRequests || 0}
          icon={DollarSign}
          trend="-3%"
          trendType="negative"
          color="warning"
        />
        <StatsCard
          title="SLA Breaches"
          value={stats?.slaBreaches || 0}
          icon={AlertTriangle}
          trend="2 new today"
          trendType="negative"
          color="destructive"
        />
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Requests */}
        <div className="lg:col-span-2">
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
        </div>

        {/* Quick Actions & Tasks */}
        <div className="space-y-6">
          {/* Quick Actions */}
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
    </div>
  );
}
