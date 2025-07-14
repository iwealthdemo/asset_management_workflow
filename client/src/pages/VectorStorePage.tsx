import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Checkbox } from '@/components/ui/checkbox';
import { useToast } from '@/hooks/use-toast';
import { Upload, Search, Database, FileText, Zap, Info, Trash2, RefreshCw } from 'lucide-react';

interface VectorStoreInfo {
  id: string;
  name: string;
  fileCount: number;
  usageBytes: number;
  status: string;
  expiresAt?: string;
}

interface QueryResult {
  content: string;
  fileName: string;
  fileId: string;
  score: number;
  metadata: {
    documentId: number;
    uploadDate: string;
    fileSize: number;
  };
}

interface Document {
  id: number;
  fileName: string;
  fileSize: number;
  fileType: string;
  uploadedAt: string;
  analysisStatus: string;
}

export default function VectorStorePage() {
  const [query, setQuery] = useState('');
  const [selectedDocuments, setSelectedDocuments] = useState<number[]>([]);
  const [queryResults, setQueryResults] = useState<QueryResult[]>([]);
  const [isQuerying, setIsQuerying] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch vector store info
  const { data: vectorStoreInfo, isLoading: infoLoading } = useQuery<VectorStoreInfo>({
    queryKey: ['/api/vector-store/info'],
    queryFn: async () => {
      const response = await fetch('/api/vector-store/info');
      if (!response.ok) throw new Error('Failed to fetch vector store info');
      return response.json();
    }
  });

  // Fetch all documents
  const { data: documents = [], isLoading: documentsLoading } = useQuery<Document[]>({
    queryKey: ['/api/documents/all'],
    queryFn: async () => {
      const response = await fetch('/api/documents/all');
      if (!response.ok) throw new Error('Failed to fetch documents');
      return response.json();
    }
  });

  // Fetch vector store files
  const { data: vectorStoreFiles = [], isLoading: filesLoading } = useQuery({
    queryKey: ['/api/vector-store/files'],
    queryFn: async () => {
      const response = await fetch('/api/vector-store/files');
      if (!response.ok) throw new Error('Failed to fetch vector store files');
      return response.json();
    }
  });

  // Upload to vector store mutation
  const uploadMutation = useMutation({
    mutationFn: async (documentId: number) => {
      const response = await fetch(`/api/vector-store/upload/${documentId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });
      if (!response.ok) throw new Error('Failed to upload to vector store');
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Document uploaded to vector store successfully"
      });
      queryClient.invalidateQueries({ queryKey: ['/api/vector-store/info'] });
      queryClient.invalidateQueries({ queryKey: ['/api/vector-store/files'] });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive"
      });
    }
  });

  // Batch upload mutation
  const batchUploadMutation = useMutation({
    mutationFn: async (documentIds: number[]) => {
      const response = await fetch('/api/vector-store/batch-upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ documentIds })
      });
      if (!response.ok) throw new Error('Failed to batch upload to vector store');
      return response.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Success",
        description: `${data.vectorStoreDocuments.length} documents uploaded to vector store`
      });
      setSelectedDocuments([]);
      queryClient.invalidateQueries({ queryKey: ['/api/vector-store/info'] });
      queryClient.invalidateQueries({ queryKey: ['/api/vector-store/files'] });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive"
      });
    }
  });

  // Query vector store
  const handleQuery = async () => {
    if (!query.trim()) {
      toast({
        title: "Error",
        description: "Please enter a query",
        variant: "destructive"
      });
      return;
    }

    setIsQuerying(true);
    try {
      const response = await fetch('/api/vector-store/query', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query })
      });

      if (!response.ok) throw new Error('Failed to query vector store');
      
      const data = await response.json();
      setQueryResults(data.results);
      
      toast({
        title: "Success",
        description: "Query executed successfully"
      });
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : 'Query failed',
        variant: "destructive"
      });
    } finally {
      setIsQuerying(false);
    }
  };

  const handleDocumentSelection = (documentId: number, checked: boolean) => {
    if (checked) {
      setSelectedDocuments(prev => [...prev, documentId]);
    } else {
      setSelectedDocuments(prev => prev.filter(id => id !== documentId));
    }
  };

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Vector Store Management</h1>
          <p className="text-muted-foreground mt-1">
            Upload documents to OpenAI Vector Store and query them using AI-powered search
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Database className="h-5 w-5 text-blue-500" />
          <Badge variant="secondary">OpenAI Powered</Badge>
        </div>
      </div>

      {/* Vector Store Info */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Info className="h-5 w-5" />
            Vector Store Information
          </CardTitle>
        </CardHeader>
        <CardContent>
          {infoLoading ? (
            <div className="flex items-center gap-2">
              <RefreshCw className="h-4 w-4 animate-spin" />
              Loading vector store info...
            </div>
          ) : vectorStoreInfo ? (
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <Label className="text-sm font-medium">Store Name</Label>
                <p className="text-sm text-muted-foreground">{vectorStoreInfo.name}</p>
              </div>
              <div>
                <Label className="text-sm font-medium">Files</Label>
                <p className="text-sm text-muted-foreground">{vectorStoreInfo.fileCount} files</p>
              </div>
              <div>
                <Label className="text-sm font-medium">Storage Used</Label>
                <p className="text-sm text-muted-foreground">{formatBytes(vectorStoreInfo.usageBytes)}</p>
              </div>
              <div>
                <Label className="text-sm font-medium">Status</Label>
                <Badge variant={vectorStoreInfo.status === 'completed' ? 'default' : 'secondary'}>
                  {vectorStoreInfo.status}
                </Badge>
              </div>
            </div>
          ) : (
            <Alert>
              <AlertDescription>
                Failed to load vector store information. Please check your OpenAI API key.
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      <Tabs defaultValue="upload" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="upload">Upload Documents</TabsTrigger>
          <TabsTrigger value="query">Query Documents</TabsTrigger>
          <TabsTrigger value="manage">Manage Files</TabsTrigger>
        </TabsList>

        {/* Upload Tab */}
        <TabsContent value="upload" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Upload className="h-5 w-5" />
                Upload Documents to Vector Store
              </CardTitle>
              <CardDescription>
                Select documents to upload to the vector store for AI-powered search and analysis
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {documentsLoading ? (
                <div className="flex items-center gap-2">
                  <RefreshCw className="h-4 w-4 animate-spin" />
                  Loading documents...
                </div>
              ) : (
                <>
                  <div className="space-y-2">
                    <Label>Select Documents to Upload</Label>
                    <div className="grid gap-2 max-h-64 overflow-y-auto">
                      {documents.map((doc) => (
                        <div key={doc.id} className="flex items-center space-x-2 p-2 border rounded">
                          <Checkbox
                            id={`doc-${doc.id}`}
                            checked={selectedDocuments.includes(doc.id)}
                            onCheckedChange={(checked) => handleDocumentSelection(doc.id, checked)}
                          />
                          <FileText className="h-4 w-4 text-blue-500" />
                          <div className="flex-1 min-w-0">
                            <Label htmlFor={`doc-${doc.id}`} className="text-sm font-medium cursor-pointer">
                              {doc.fileName}
                            </Label>
                            <p className="text-xs text-muted-foreground">
                              {formatBytes(doc.fileSize)} • {formatDate(doc.uploadedAt)}
                            </p>
                          </div>
                          <Badge variant="outline" className="ml-2">
                            {doc.analysisStatus}
                          </Badge>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => uploadMutation.mutate(doc.id)}
                            disabled={uploadMutation.isPending}
                          >
                            {uploadMutation.isPending ? <RefreshCw className="h-3 w-3 animate-spin" /> : <Upload className="h-3 w-3" />}
                          </Button>
                        </div>
                      ))}
                    </div>
                  </div>
                  
                  {selectedDocuments.length > 0 && (
                    <Button
                      onClick={() => batchUploadMutation.mutate(selectedDocuments)}
                      disabled={batchUploadMutation.isPending}
                      className="w-full"
                    >
                      {batchUploadMutation.isPending ? (
                        <RefreshCw className="h-4 w-4 animate-spin mr-2" />
                      ) : (
                        <Zap className="h-4 w-4 mr-2" />
                      )}
                      Upload {selectedDocuments.length} Selected Documents
                    </Button>
                  )}
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Query Tab */}
        <TabsContent value="query" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Search className="h-5 w-5" />
                Query Vector Store
              </CardTitle>
              <CardDescription>
                Search across all uploaded documents using natural language queries
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="query">Enter your query</Label>
                <Textarea
                  id="query"
                  placeholder="e.g., What are the key financial metrics for HDFC Bank? What are the main risk factors mentioned in the investment proposals?"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  rows={3}
                />
              </div>
              
              <Button 
                onClick={handleQuery} 
                disabled={isQuerying || !query.trim()}
                className="w-full"
              >
                {isQuerying ? (
                  <RefreshCw className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  <Search className="h-4 w-4 mr-2" />
                )}
                {isQuerying ? 'Searching...' : 'Search Documents'}
              </Button>

              {queryResults.length > 0 && (
                <div className="space-y-4">
                  <Label>Search Results</Label>
                  {queryResults.map((result, index) => (
                    <Card key={index}>
                      <CardHeader>
                        <CardTitle className="text-lg flex items-center gap-2">
                          <FileText className="h-4 w-4" />
                          {result.fileName}
                        </CardTitle>
                        <div className="flex items-center gap-2">
                          <Badge variant="outline">Score: {result.score}</Badge>
                          <Badge variant="secondary">
                            {formatBytes(result.metadata.fileSize)}
                          </Badge>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <div className="prose prose-sm max-w-none">
                          <div className="whitespace-pre-wrap">{result.content}</div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Manage Tab */}
        <TabsContent value="manage" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Database className="h-5 w-5" />
                Manage Vector Store Files
              </CardTitle>
              <CardDescription>
                View and manage files currently in the vector store
              </CardDescription>
            </CardHeader>
            <CardContent>
              {filesLoading ? (
                <div className="flex items-center gap-2">
                  <RefreshCw className="h-4 w-4 animate-spin" />
                  Loading vector store files...
                </div>
              ) : vectorStoreFiles.length > 0 ? (
                <div className="space-y-2">
                  {vectorStoreFiles.map((file: any) => (
                    <div key={file.id} className="flex items-center justify-between p-3 border rounded">
                      <div className="flex items-center gap-2">
                        <FileText className="h-4 w-4 text-blue-500" />
                        <div>
                          <p className="font-medium">{file.fileName || file.id}</p>
                          <p className="text-sm text-muted-foreground">
                            {formatBytes(file.usageBytes)} • {formatDate(file.createdAt)}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant={file.status === 'completed' ? 'default' : 'secondary'}>
                          {file.status}
                        </Badge>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            // TODO: Implement delete functionality
                            toast({
                              title: "Info",
                              description: "Delete functionality will be implemented"
                            });
                          }}
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <Alert>
                  <AlertDescription>
                    No files found in the vector store. Upload some documents first.
                  </AlertDescription>
                </Alert>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}