import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ApprovalModal } from "@/components/modals/ApprovalModal";
import { useState } from "react";
import { Clock, CheckSquare, AlertTriangle, Calendar, User } from "lucide-react";
import { format } from "date-fns";

export default function MyTasks() {
  const [selectedTask, setSelectedTask] = useState<any>(null);
  const [isApprovalModalOpen, setIsApprovalModalOpen] = useState(false);

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
    setSelectedTask(task);
    setIsApprovalModalOpen(true);
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
                <TaskCard key={task.id} task={task} onAction={handleTaskAction} />
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
                <TaskCard key={task.id} task={task} onAction={handleTaskAction} />
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
                <TaskCard key={task.id} task={task} onAction={handleTaskAction} />
              ))}
            </div>
          </div>
        )}
      </div>

      <ApprovalModal
        isOpen={isApprovalModalOpen}
        onClose={() => setIsApprovalModalOpen(false)}
        task={selectedTask}
      />
    </div>
  );
}

function TaskCard({ task, onAction }: { task: any; onAction: (task: any) => void }) {
  const Icon = getTaskIcon(task.taskType);
  
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
              View Details
            </Button>
            {task.status === 'pending' && (
              <Button size="sm" onClick={() => onAction(task)}>
                Take Action
              </Button>
            )}
          </div>
        </div>
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
