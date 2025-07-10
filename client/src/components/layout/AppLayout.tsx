import { useState } from "react";
import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger,
  DropdownMenuSeparator
} from "@/components/ui/dropdown-menu";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { useUser, useLogout } from "@/lib/auth";
import { useQuery } from "@tanstack/react-query";
import { 
  Home, 
  PlusCircle, 
  DollarSign, 
  CheckSquare, 
  Briefcase, 
  FileText, 
  BarChart3, 
  Users, 
  Table, 
  PieChart,
  Search,
  Bell,
  Settings,
  Menu,
  LogOut
} from "lucide-react";

interface AppLayoutProps {
  children: React.ReactNode;
}

export function AppLayout({ children }: AppLayoutProps) {
  const [location] = useLocation();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const { user } = useUser();
  const logout = useLogout();

  const { data: taskCount = 0 } = useQuery<number>({
    queryKey: ["/api/tasks/count"],
    queryFn: async () => {
      const response = await fetch("/api/tasks", { credentials: "include" });
      const tasks = await response.json();
      return tasks.filter((task: any) => task.status === 'pending').length;
    },
  });

  const { data: notifications = [] } = useQuery({
    queryKey: ["/api/notifications"],
    queryFn: async () => {
      const response = await fetch("/api/notifications", { credentials: "include" });
      return response.json();
    },
  });

  const unreadNotifications = notifications.filter((n: any) => !n.isRead).length;

  const navigationItems = [
    { href: "/", label: "Dashboard", icon: Home },
    { href: "/new-investment", label: "New Investment", icon: PlusCircle },
    { href: "/cash-requests", label: "Cash Requests", icon: DollarSign },
    { href: "/my-tasks", label: "My Tasks", icon: CheckSquare, badge: taskCount },
    { href: "/investments", label: "My Investments", icon: Briefcase },
    { href: "/templates", label: "Templates", icon: FileText },
    { href: "/sla-monitoring", label: "SLA Monitoring", icon: BarChart3 },
  ];

  const adminItems = [
    { href: "/user-management", label: "User Management", icon: Users },
    { href: "/approval-chains", label: "Approval Chains", icon: Table },
    { href: "/reports", label: "Reports", icon: PieChart },
  ];

  const handleLogout = () => {
    logout.mutate();
  };

  const SidebarContent = () => (
    <div className="flex flex-col h-full">
      {/* Logo & Brand */}
      <div className="flex items-center justify-between p-6 border-b">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 bg-primary rounded-lg flex items-center justify-center">
            <BarChart3 className="h-6 w-6 text-white" />
          </div>
          <div>
            <h1 className="text-lg font-semibold">ABCBank</h1>
            <p className="text-sm text-muted-foreground">Investment Portal</p>
          </div>
        </div>
        <Button 
          variant="ghost" 
          size="icon" 
          className="lg:hidden"
          onClick={() => setIsMobileMenuOpen(false)}
        >
          <Menu className="h-4 w-4" />
        </Button>
      </div>

      {/* Navigation Menu */}
      <nav className="flex-1 px-4 py-6 space-y-2 overflow-y-auto">
        {navigationItems.map((item) => {
          const Icon = item.icon;
          const isActive = location === item.href;
          
          return (
            <Link key={item.href} href={item.href}>
              <Button
                variant={isActive ? "default" : "ghost"}
                className="w-full justify-start"
                onClick={() => setIsMobileMenuOpen(false)}
              >
                <Icon className="mr-3 h-4 w-4" />
                {item.label}
                {item.badge && item.badge > 0 && (
                  <Badge variant="secondary" className="ml-auto">
                    {item.badge}
                  </Badge>
                )}
              </Button>
            </Link>
          );
        })}
        
        <div className="my-4 border-t" />
        
        {/* Admin Section */}
        {user?.role === 'admin' && (
          <>
            <div className="px-4 py-2">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                Administration
              </p>
            </div>
            
            {adminItems.map((item) => {
              const Icon = item.icon;
              const isActive = location === item.href;
              
              return (
                <Link key={item.href} href={item.href}>
                  <Button
                    variant={isActive ? "default" : "ghost"}
                    className="w-full justify-start"
                    onClick={() => setIsMobileMenuOpen(false)}
                  >
                    <Icon className="mr-3 h-4 w-4" />
                    {item.label}
                  </Button>
                </Link>
              );
            })}
          </>
        )}
      </nav>

      {/* User Profile */}
      <div className="p-4 border-t">
        <div className="flex items-center space-x-3">
          <Avatar className="h-8 w-8">
            <AvatarImage src="" />
            <AvatarFallback>
              {user?.firstName?.[0]}{user?.lastName?.[0]}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1">
            <p className="text-sm font-medium">{user?.firstName} {user?.lastName}</p>
            <p className="text-xs text-muted-foreground capitalize">{user?.role}</p>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon">
                <Settings className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              <DropdownMenuItem>Settings</DropdownMenuItem>
              <DropdownMenuItem>Profile</DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleLogout}>
                <LogOut className="mr-2 h-4 w-4" />
                Logout
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </div>
  );

  return (
    <div className="flex h-screen bg-background animate-fade-in">
      {/* Desktop Sidebar */}
      <div className="hidden lg:flex w-72 bg-card shadow-lg card-shadow">
        <SidebarContent />
      </div>

      {/* Mobile Sidebar */}
      <Sheet open={isMobileMenuOpen} onOpenChange={setIsMobileMenuOpen}>
        <SheetContent side="left" className="w-72 p-0">
          <SidebarContent />
        </SheetContent>
      </Sheet>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top Bar */}
        <header className="bg-card shadow-sm border-b border-border animate-slide-up">
          <div className="px-6 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <Sheet>
                  <SheetTrigger asChild>
                    <Button variant="ghost" size="icon" className="lg:hidden">
                      <Menu className="h-5 w-5" />
                    </Button>
                  </SheetTrigger>
                  <SheetContent side="left" className="w-72 p-0">
                    <SidebarContent />
                  </SheetContent>
                </Sheet>
                <h2 className="text-2xl font-semibold text-gray-900">
                  {location === '/' ? 'Dashboard' : 
                   location === '/new-investment' ? 'New Investment' :
                   location === '/cash-requests' ? 'Cash Requests' :
                   location === '/my-tasks' ? 'My Tasks' :
                   location === '/investments' ? 'My Investments' :
                   'Investment Portal'}
                </h2>
              </div>
              
              <div className="flex items-center space-x-4">
                {/* Search */}
                <div className="relative">
                  <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                  <Input
                    placeholder="Search requests..."
                    className="w-64 pl-10"
                  />
                </div>
                
                {/* Notifications */}
                <div className="relative">
                  <Button variant="ghost" size="icon">
                    <Bell className="h-5 w-5" />
                    {unreadNotifications > 0 && (
                      <Badge className="absolute -top-2 -right-2 h-5 w-5 rounded-full p-0 flex items-center justify-center text-xs">
                        {unreadNotifications}
                      </Badge>
                    )}
                  </Button>
                </div>
                
                {/* Theme Toggle */}
                <ThemeToggle />
                
                {/* Quick Actions */}
                <div className="flex items-center space-x-2">
                  <Link href="/new-investment">
                    <Button>
                      <PlusCircle className="mr-2 h-4 w-4" />
                      New Request
                    </Button>
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </header>

        {/* Main Content */}
        <main className="flex-1 overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
