import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AppLayout } from "@/components/layout/AppLayout";
import Dashboard from "@/pages/Dashboard";
import NewInvestment from "@/pages/NewInvestment";
import CashRequests from "@/pages/CashRequests";
import MyTasks from "@/pages/MyTasks";
import MyInvestments from "@/pages/MyInvestments";
import Login from "@/pages/Login";
import NotFound from "@/pages/not-found";
import { useUser } from "@/lib/auth";

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useUser();

  if (isLoading) {
    return <div className="min-h-screen flex items-center justify-center">Loading...</div>;
  }

  if (!user) {
    return <Login />;
  }

  return <AppLayout>{children}</AppLayout>;
}

function Router() {
  return (
    <Switch>
      <Route path="/login" component={Login} />
      <Route path="/">
        <ProtectedRoute>
          <Dashboard />
        </ProtectedRoute>
      </Route>
      <Route path="/new-investment">
        <ProtectedRoute>
          <NewInvestment />
        </ProtectedRoute>
      </Route>
      <Route path="/cash-requests">
        <ProtectedRoute>
          <CashRequests />
        </ProtectedRoute>
      </Route>
      <Route path="/my-tasks">
        <ProtectedRoute>
          <MyTasks />
        </ProtectedRoute>
      </Route>
      <Route path="/investments">
        <ProtectedRoute>
          <MyInvestments />
        </ProtectedRoute>
      </Route>
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Router />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
