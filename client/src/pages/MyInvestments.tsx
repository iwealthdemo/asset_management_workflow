import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { 
  Briefcase, 
  DollarSign, 
  Calendar, 
  TrendingUp, 
  Eye, 
  Filter, 
  X, 
  ChevronDown, 
  ChevronUp,
  Clock,
  CheckCircle,
  AlertTriangle,
  Trash2
} from "lucide-react";
import { format } from "date-fns";
import { useState, useMemo } from "react";
import { InvestmentDetailsInline } from "@/components/details/InvestmentDetailsInline";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

// Filter interfaces
interface InvestmentFilters {
  searchRequestId: string;
  selectedCompanies: string[];
  selectedRiskLevels: string[];
  selectedInvestmentTypes: string[];
  expectedReturnMode: 'range' | 'specific';
  expectedReturnRange: [number, number];
  expectedReturnSpecific: string;
  amountRange: [number, number];
  amountMin: string;
  amountMax: string;
}

export default function MyInvestments() {
  const [expandedInvestment, setExpandedInvestment] = useState<number | null>(null);
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('all');
  
  // Filter state
  const [filters, setFilters] = useState<InvestmentFilters>({
    searchRequestId: '',
    selectedCompanies: [],
    selectedRiskLevels: [],
    selectedInvestmentTypes: [],
    expectedReturnMode: 'range',
    expectedReturnRange: [0, 50],
    expectedReturnSpecific: '',
    amountRange: [0, 10000000],
    amountMin: '',
    amountMax: ''
  });

  const { data: investments, isLoading } = useQuery({
    queryKey: ["/api/investments", { my: true }],
  });

  const handleToggleDetails = (investmentId: number) => {
    setExpandedInvestment(expandedInvestment === investmentId ? null : investmentId);
  };

  // Extract unique values for filter options
  const uniqueCompanies = useMemo(() => {
    return [...new Set(investments?.map((inv: any) => inv.targetCompany) || [])].sort();
  }, [investments]);

  const uniqueInvestmentTypes = useMemo(() => {
    return [...new Set(investments?.map((inv: any) => inv.investmentType) || [])].sort();
  }, [investments]);

  // Filter investments based on current filters
  const filteredInvestments = useMemo(() => {
    if (!investments) return [];
    
    return investments.filter((inv: any) => {
      // Search by Request ID filter
      if (filters.searchRequestId.trim() && !inv.requestId.toLowerCase().includes(filters.searchRequestId.toLowerCase())) {
        return false;
      }
      
      // Company filter
      if (filters.selectedCompanies.length > 0 && !filters.selectedCompanies.includes(inv.targetCompany)) {
        return false;
      }
      
      // Risk level filter
      if (filters.selectedRiskLevels.length > 0 && !filters.selectedRiskLevels.includes(inv.riskLevel)) {
        return false;
      }
      
      // Investment type filter
      if (filters.selectedInvestmentTypes.length > 0 && !filters.selectedInvestmentTypes.includes(inv.investmentType)) {
        return false;
      }
      
      // Expected return filter
      if (inv.expectedReturn !== null && inv.expectedReturn !== undefined) {
        const returnValue = parseFloat(inv.expectedReturn);
        if (filters.expectedReturnMode === 'range') {
          if (returnValue < filters.expectedReturnRange[0] || returnValue > filters.expectedReturnRange[1]) {
            return false;
          }
        } else if (filters.expectedReturnSpecific) {
          const specificValue = parseFloat(filters.expectedReturnSpecific);
          if (Math.abs(returnValue - specificValue) > 0.1) {
            return false;
          }
        }
      }
      
      // Amount filter
      if (inv.amount !== null && inv.amount !== undefined) {
        const amountValue = parseFloat(inv.amount);
        const minAmount = filters.amountMin ? parseFloat(filters.amountMin) : filters.amountRange[0];
        const maxAmount = filters.amountMax ? parseFloat(filters.amountMax) : filters.amountRange[1];
        
        if (amountValue < minAmount || amountValue > maxAmount) {
          return false;
        }
      }
      
      return true;
    });
  }, [investments, filters]);

  // Clear all filters
  const clearFilters = () => {
    setFilters({
      searchRequestId: '',
      selectedCompanies: [],
      selectedRiskLevels: [],
      selectedInvestmentTypes: [],
      expectedReturnMode: 'range',
      expectedReturnRange: [0, 50],
      expectedReturnSpecific: '',
      amountRange: [0, 10000000],
      amountMin: '',
      amountMax: ''
    });
  };

  // Count active filters
  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (filters.searchRequestId.trim()) count++;
    if (filters.selectedCompanies.length > 0) count++;
    if (filters.selectedRiskLevels.length > 0) count++;
    if (filters.selectedInvestmentTypes.length > 0) count++;
    if (filters.expectedReturnSpecific || (filters.expectedReturnRange[0] > 0 || filters.expectedReturnRange[1] < 50)) count++;
    if (filters.amountMin || filters.amountMax || (filters.amountRange[0] > 0 || filters.amountRange[1] < 10000000)) count++;
    return count;
  }, [filters]);

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

  // Filter logic based on actual approval states - now using filtered investments
  const pendingInvestments = filteredInvestments?.filter((inv: any) => {
    // Pending means not fully approved and not rejected
    const status = inv.status.toLowerCase();
    return !status.includes('approved') && !status.includes('rejected') && status !== 'approved';
  }) || [];
  
  const approvedInvestments = filteredInvestments?.filter((inv: any) => {
    // Approved means final approval status (only "approved", not partial approvals)
    return inv.status.toLowerCase() === 'approved';
  }) || [];
  
  const rejectedInvestments = filteredInvestments?.filter((inv: any) => {
    // Rejected by any approver
    const status = inv.status.toLowerCase();
    return status === 'rejected' || status.includes('rejected');
  }) || [];

  return (
    <div className="p-6">
      <div className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-2xl font-semibold">My Investments</h1>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsFilterOpen(!isFilterOpen)}
              className="flex items-center gap-2"
            >
              <Filter className="h-4 w-4" />
              Filters
              {activeFilterCount > 0 && (
                <Badge variant="secondary" className="ml-1">
                  {activeFilterCount}
                </Badge>
              )}
              {isFilterOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </Button>
          </div>
        </div>

        {/* Filter Panel */}
        <Collapsible open={isFilterOpen} onOpenChange={setIsFilterOpen}>
          <CollapsibleContent>
            <Card className="mb-4 p-4 border-2 border-dashed border-blue-200 dark:border-blue-800">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                
                {/* Search by Request ID */}
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Search by Request ID</Label>
                  <Input
                    type="text"
                    placeholder="Enter Request ID (e.g., INV-2025-0032)"
                    value={filters.searchRequestId}
                    onChange={(e) => setFilters(prev => ({ ...prev, searchRequestId: e.target.value }))}
                    className="w-full"
                  />
                </div>
                
                {/* Company Filter */}
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Client/Company</Label>
                  <Select 
                    value={filters.selectedCompanies.length > 0 ? filters.selectedCompanies[0] : "all"} 
                    onValueChange={(value) => 
                      setFilters(prev => ({ 
                        ...prev, 
                        selectedCompanies: value === "all" ? [] : [value] 
                      }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select company" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Companies</SelectItem>
                      {uniqueCompanies.map(company => (
                        <SelectItem key={company} value={company}>{company}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Risk Level Filter */}
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Risk Level</Label>
                  <div className="flex gap-2">
                    {['low', 'medium', 'high'].map(risk => (
                      <div key={risk} className="flex items-center space-x-2">
                        <Checkbox 
                          id={risk}
                          checked={filters.selectedRiskLevels.includes(risk)}
                          onCheckedChange={(checked) => 
                            setFilters(prev => ({
                              ...prev,
                              selectedRiskLevels: checked 
                                ? [...prev.selectedRiskLevels, risk]
                                : prev.selectedRiskLevels.filter(r => r !== risk)
                            }))
                          }
                        />
                        <Label htmlFor={risk} className="text-sm capitalize">{risk}</Label>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Investment Type Filter */}
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Investment Type</Label>
                  <Select 
                    value={filters.selectedInvestmentTypes.length > 0 ? filters.selectedInvestmentTypes[0] : "all"} 
                    onValueChange={(value) => 
                      setFilters(prev => ({ 
                        ...prev, 
                        selectedInvestmentTypes: value === "all" ? [] : [value] 
                      }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Types</SelectItem>
                      {uniqueInvestmentTypes.map(type => (
                        <SelectItem key={type} value={type}>{type}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Expected Return Filter */}
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Expected Returns</Label>
                  <div className="flex gap-2 mb-2">
                    <Button
                      variant={filters.expectedReturnMode === 'range' ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setFilters(prev => ({ ...prev, expectedReturnMode: 'range' }))}
                    >
                      Range
                    </Button>
                    <Button
                      variant={filters.expectedReturnMode === 'specific' ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setFilters(prev => ({ ...prev, expectedReturnMode: 'specific' }))}
                    >
                      Specific
                    </Button>
                  </div>
                  {filters.expectedReturnMode === 'range' ? (
                    <div className="space-y-2">
                      <div className="px-2">
                        <Slider
                          value={filters.expectedReturnRange}
                          onValueChange={(value) => setFilters(prev => ({ ...prev, expectedReturnRange: value as [number, number] }))}
                          max={50}
                          min={0}
                          step={1}
                        />
                      </div>
                      <div className="flex justify-between text-sm text-gray-600">
                        <span>{filters.expectedReturnRange[0]}%</span>
                        <span>{filters.expectedReturnRange[1]}%</span>
                      </div>
                    </div>
                  ) : (
                    <Input
                      type="number"
                      placeholder="Enter specific return %"
                      value={filters.expectedReturnSpecific}
                      onChange={(e) => setFilters(prev => ({ ...prev, expectedReturnSpecific: e.target.value }))}
                    />
                  )}
                </div>

                {/* Amount Range Filter */}
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Amount Range</Label>
                  <div className="flex gap-2">
                    <Input
                      type="number"
                      placeholder="Min amount"
                      value={filters.amountMin}
                      onChange={(e) => setFilters(prev => ({ ...prev, amountMin: e.target.value }))}
                    />
                    <Input
                      type="number"
                      placeholder="Max amount"
                      value={filters.amountMax}
                      onChange={(e) => setFilters(prev => ({ ...prev, amountMax: e.target.value }))}
                    />
                  </div>
                </div>

                {/* Clear Filters Button */}
                <div className="flex items-end">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={clearFilters}
                    className="flex items-center gap-2"
                    disabled={activeFilterCount === 0}
                  >
                    <X className="h-4 w-4" />
                    Clear Filters
                  </Button>
                </div>
              </div>
            </Card>
          </CollapsibleContent>
        </Collapsible>

        {/* Investment counts */}
        <div className="flex gap-4 text-sm text-gray-600 mb-4">
          <span>{filteredInvestments.length} total</span>
          <span>{pendingInvestments.length} pending</span>
          <span>{approvedInvestments.length} approved</span>
          <span>{rejectedInvestments.length} rejected</span>
          {activeFilterCount > 0 && (
            <span className="text-blue-600 font-medium">
              ({activeFilterCount} filter{activeFilterCount > 1 ? 's' : ''} applied)
            </span>
          )}
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="all">All ({filteredInvestments.length})</TabsTrigger>
          <TabsTrigger value="pending">Pending ({pendingInvestments.length})</TabsTrigger>
          <TabsTrigger value="approved">Approved ({approvedInvestments.length})</TabsTrigger>
          <TabsTrigger value="rejected">Rejected ({rejectedInvestments.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="all" className="space-y-4">
          <InvestmentList investments={filteredInvestments || []} onToggleDetails={handleToggleDetails} expandedInvestment={expandedInvestment} />
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
  const { toast } = useToast();

  const deleteInvestmentMutation = useMutation({
    mutationFn: async (investmentId: number) => {
      const response = await apiRequest('DELETE', `/api/investments/${investmentId}`);
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to delete investment');
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/investments"] });
      toast({
        title: "Investment deleted",
        description: "The investment request has been successfully deleted.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to delete investment",
        description: error.message,
        variant: "destructive",
      });
    }
  });

  const canDeleteInvestment = (status: string) => {
    const deletableStatuses = ['draft', 'rejected', 'admin_rejected', 'changes_requested', 'opportunity', 'Draft'];
    return deletableStatuses.includes(status);
  };

  const handleDeleteInvestment = (investmentId: number) => {
    deleteInvestmentMutation.mutate(investmentId);
  };
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Draft':
        return 'bg-gray-100 text-gray-800';
      case 'opportunity':
        return 'bg-purple-100 text-purple-800';
      case 'New':
      case 'Modified':
        return 'bg-blue-100 text-blue-800';
      case 'Admin approved':
      case 'Manager approved':
      case 'Committee approved':
      case 'Finance approved':
      case 'approved':
        return 'bg-green-100 text-green-800';
      case 'admin_rejected':
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
                
                {/* Show Request ID and Investment Type on main card */}
                <div className="flex items-center gap-4 text-sm mb-3">
                  <div className="flex items-center gap-1 font-semibold text-blue-600">
                    <span>Request ID:</span>
                    <span>{investment.requestId}</span>
                  </div>
                  <div className="flex items-center gap-1 font-semibold text-purple-600">
                    <span>Type:</span>
                    <span className="capitalize">{investment.investmentType}</span>
                  </div>
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
              
              {/* Action buttons */}
              <div className="flex flex-col gap-2 ml-4">
                {canDeleteInvestment(investment.status) && (
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button 
                        variant="destructive" 
                        size="sm"
                        className="w-10 h-10 p-0"
                        disabled={deleteInvestmentMutation.isPending}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Delete Investment Request</AlertDialogTitle>
                        <AlertDialogDescription>
                          Are you sure you want to delete this investment request for {investment.targetCompany}? 
                          This action cannot be undone.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction 
                          onClick={() => handleDeleteInvestment(investment.id)}
                          className="bg-red-600 hover:bg-red-700"
                        >
                          Delete
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                )}
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
