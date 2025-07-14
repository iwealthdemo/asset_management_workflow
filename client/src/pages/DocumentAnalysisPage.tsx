import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { 
  Brain, 
  FileText, 
  Upload, 
  Search, 
  Filter,
  TrendingUp,
  AlertTriangle,
  CheckCircle,
  Clock,
  BarChart3
} from 'lucide-react';
import DocumentAnalysisCard from '@/components/documents/DocumentAnalysisCard';

interface Document {
  id: number;
  fileName: string;
  originalName: string;
  fileSize: number;
  mimeType: string;
  analysisStatus: 'pending' | 'processing' | 'completed' | 'failed';
  classification?: string;
  confidence?: number;
  riskLevel?: string;
  createdAt: string;
  analyzedAt?: string;
  requestType: string;
  requestId: number;
}

const DocumentAnalysisPage = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [riskFilter, setRiskFilter] = useState<string>('all');

  // Fetch all documents for analysis
  const { data: allDocuments = [], isLoading } = useQuery({
    queryKey: ['all-documents'],
    queryFn: async () => {
      // This would need to be implemented as an API endpoint
      const response = await fetch('/api/documents/all');
      return response.json();
    },
    retry: 1
  });

  // Fetch pending documents
  const { data: pendingDocuments = [] } = useQuery({
    queryKey: ['pending-documents'],
    queryFn: async () => {
      const response = await fetch('/api/documents/pending-analysis');
      return response.json();
    }
  });

  // Filter documents based on search and filters
  const filteredDocuments = allDocuments.filter((doc: Document) => {
    const matchesSearch = doc.originalName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         doc.classification?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || doc.analysisStatus === statusFilter;
    const matchesRisk = riskFilter === 'all' || doc.riskLevel === riskFilter;
    
    return matchesSearch && matchesStatus && matchesRisk;
  });

  // Get analysis statistics
  const analysisStats = {
    total: allDocuments.length,
    completed: allDocuments.filter((doc: Document) => doc.analysisStatus === 'completed').length,
    pending: allDocuments.filter((doc: Document) => doc.analysisStatus === 'pending').length,
    processing: allDocuments.filter((doc: Document) => doc.analysisStatus === 'processing').length,
    failed: allDocuments.filter((doc: Document) => doc.analysisStatus === 'failed').length,
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300';
      case 'processing': return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300';
      case 'failed': return 'bg-destructive/10 text-destructive dark:bg-destructive/20 dark:text-destructive';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  return (
    <div className="container mx-auto px-4 py-8 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-3">
            <Brain className="h-8 w-8 text-primary" />
            Document Analysis Center
          </h1>
          <p className="text-muted-foreground mt-2">
            AI-powered document analysis and classification system
          </p>
        </div>
      </div>

      {/* Analysis Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Documents</p>
                <p className="text-2xl font-bold">{analysisStats.total}</p>
              </div>
              <FileText className="h-8 w-8 text-primary" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Completed</p>
                <p className="text-2xl font-bold text-success">{analysisStats.completed}</p>
              </div>
              <CheckCircle className="h-8 w-8 text-success" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Processing</p>
                <p className="text-2xl font-bold text-primary">{analysisStats.processing}</p>
              </div>
              <Clock className="h-8 w-8 text-primary" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Pending</p>
                <p className="text-2xl font-bold text-warning">{analysisStats.pending}</p>
              </div>
              <Clock className="h-8 w-8 text-warning" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Failed</p>
                <p className="text-2xl font-bold text-destructive">{analysisStats.failed}</p>
              </div>
              <AlertTriangle className="h-8 w-8 text-destructive" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search and Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Search className="h-5 w-5" />
            Search & Filter
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label htmlFor="search">Search Documents</Label>
              <Input
                id="search"
                placeholder="Search by filename or classification..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            
            <div>
              <Label htmlFor="status">Filter by Status</Label>
              <select
                id="status"
                className="w-full p-2 border rounded-md"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
              >
                <option value="all">All Status</option>
                <option value="pending">Pending</option>
                <option value="processing">Processing</option>
                <option value="completed">Completed</option>
                <option value="failed">Failed</option>
              </select>
            </div>
            
            <div>
              <Label htmlFor="risk">Filter by Risk Level</Label>
              <select
                id="risk"
                className="w-full p-2 border rounded-md"
                value={riskFilter}
                onChange={(e) => setRiskFilter(e.target.value)}
              >
                <option value="all">All Risk Levels</option>
                <option value="low">Low Risk</option>
                <option value="medium">Medium Risk</option>
                <option value="high">High Risk</option>
              </select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Document Analysis Results */}
      <Tabs defaultValue="all" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="all">All Documents ({filteredDocuments.length})</TabsTrigger>
          <TabsTrigger value="pending">Pending Analysis ({pendingDocuments.length})</TabsTrigger>
          <TabsTrigger value="insights">Analysis Insights</TabsTrigger>
        </TabsList>

        <TabsContent value="all" className="space-y-4">
          {isLoading ? (
            <div className="grid grid-cols-1 gap-4">
              {[...Array(3)].map((_, i) => (
                <Card key={i} className="animate-pulse">
                  <CardContent className="p-6">
                    <div className="space-y-3">
                      <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                      <div className="h-4 bg-gray-200 rounded w-1/2"></div>
                      <div className="h-4 bg-gray-200 rounded w-2/3"></div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : filteredDocuments.length > 0 ? (
            <div className="grid grid-cols-1 gap-4">
              {filteredDocuments.map((doc: Document) => (
                <DocumentAnalysisCard
                  key={doc.id}
                  document={doc}
                  requestType={doc.requestType}
                  requestId={doc.requestId}
                />
              ))}
            </div>
          ) : (
            <div className="text-center py-12 text-gray-500">
              <FileText className="h-16 w-16 mx-auto mb-4 text-gray-300" />
              <p className="text-lg">No documents found</p>
              <p className="text-sm">Try adjusting your search or filters</p>
            </div>
          )}
        </TabsContent>

        <TabsContent value="pending" className="space-y-4">
          {pendingDocuments.length > 0 ? (
            <div className="grid grid-cols-1 gap-4">
              {pendingDocuments.map((doc: Document) => (
                <DocumentAnalysisCard
                  key={doc.id}
                  document={doc}
                  requestType={doc.requestType}
                  requestId={doc.requestId}
                />
              ))}
            </div>
          ) : (
            <div className="text-center py-12 text-gray-500">
              <CheckCircle className="h-16 w-16 mx-auto mb-4 text-gray-300" />
              <p className="text-lg">No pending documents</p>
              <p className="text-sm">All documents have been processed</p>
            </div>
          )}
        </TabsContent>

        <TabsContent value="insights" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="h-5 w-5" />
                  Analysis Progress
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span>Completion Rate</span>
                    <Badge className={getStatusColor('completed')}>
                      {Math.round((analysisStats.completed / analysisStats.total) * 100)}%
                    </Badge>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div 
                      className="bg-green-600 h-2 rounded-full" 
                      style={{ width: `${(analysisStats.completed / analysisStats.total) * 100}%` }}
                    ></div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5" />
                  System Performance
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span>Success Rate</span>
                    <span className="font-semibold">
                      {Math.round(((analysisStats.completed) / (analysisStats.total - analysisStats.pending)) * 100)}%
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Average Processing Time</span>
                    <span className="font-semibold">~2 minutes</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Documents Processed Today</span>
                    <span className="font-semibold">{analysisStats.completed}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default DocumentAnalysisPage;