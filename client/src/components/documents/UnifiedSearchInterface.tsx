import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { 
  Search, 
  FileText, 
  Globe, 
  ChevronDown, 
  ChevronUp, 
  Clock, 
  CheckCircle,
  AlertCircle,
  Loader2,
  Archive,
  RotateCcw
} from 'lucide-react';
import { format } from 'date-fns';
import { apiRequest } from '@/lib/queryClient';

interface Document {
  id: number;
  filename: string;
  originalName: string;
  analysisStatus?: string;
}

interface QueryResult {
  id: number;
  query: string;
  response: string;
  searchType: 'document' | 'web';
  documentIds?: number[];
  createdAt: string;
}

interface UnifiedSearchInterfaceProps {
  requestId: number;
  documents: Document[];
}

type SearchType = 'document' | 'web';

export default function UnifiedSearchInterface({ requestId, documents }: UnifiedSearchInterfaceProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [searchType, setSearchType] = useState<SearchType>('document');
  const [query, setQuery] = useState('');
  const [selectedDocuments, setSelectedDocuments] = useState<number[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  
  const queryClient = useQueryClient();

  // Initialize with all documents selected by default
  useEffect(() => {
    if (documents.length > 0 && selectedDocuments.length === 0) {
      setSelectedDocuments(documents.map(doc => doc.id));
    }
  }, [documents]);

  // Fetch document search history
  const { data: documentQueries = [] } = useQuery({
    queryKey: ['/api/cross-document-queries', requestId],
    enabled: isExpanded
  });

  // Fetch web search history  
  const { data: webQueries = [] } = useQuery({
    queryKey: ['/api/web-search-queries', requestId],
    enabled: isExpanded
  });

  // Document search mutation
  const documentSearchMutation = useMutation({
    mutationFn: ({ query, documentIds }: { query: string; documentIds: number[] }) =>
      apiRequest(`/api/cross-document-queries`, {
        method: 'POST',
        body: { requestId, query, documentIds }
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/cross-document-queries', requestId] });
      setQuery('');
    }
  });

  // Web search mutation
  const webSearchMutation = useMutation({
    mutationFn: ({ query }: { query: string }) =>
      apiRequest(`/api/web-search-queries`, {
        method: 'POST',
        body: { requestId, query }
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/web-search-queries', requestId] });
      setQuery('');
    }
  });

  const handleSearch = () => {
    if (!query.trim()) return;

    if (searchType === 'document') {
      if (selectedDocuments.length === 0) {
        alert('Please select at least one document to search');
        return;
      }
      documentSearchMutation.mutate({ query, documentIds: selectedDocuments });
    } else {
      webSearchMutation.mutate({ query });
    }
  };

  const handleSelectAll = () => {
    setSelectedDocuments(documents.map(doc => doc.id));
  };

  const handleDeselectAll = () => {
    setSelectedDocuments([]);
  };

  const handleDocumentToggle = (documentId: number) => {
    setSelectedDocuments(prev => 
      prev.includes(documentId)
        ? prev.filter(id => id !== documentId)
        : [...prev, documentId]
    );
  };

  const getSearchIcon = (type: SearchType) => {
    return type === 'document' ? <FileText className="h-4 w-4" /> : <Globe className="h-4 w-4" />;
  };

  const getDocumentName = (id: number) => {
    return documents.find(doc => doc.id === id)?.originalName || `Document ${id}`;
  };

  const parseMarkdown = (text: string) => {
    if (!text) return text;
    
    // Convert **bold** to <strong>
    text = text.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
    
    // Convert *italic* to <em>
    text = text.replace(/\*(.*?)\*/g, '<em>$1</em>');
    
    // Convert headers
    text = text.replace(/^### (.*$)/gm, '<h3 class="text-lg font-semibold mt-4 mb-2">$1</h3>');
    text = text.replace(/^## (.*$)/gm, '<h2 class="text-xl font-semibold mt-4 mb-2">$1</h2>');
    
    // Convert source references 【4:0†source】 to badges
    text = text.replace(/【(\d+):(\d+)†source】/g, 
      '<span class="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200 ml-1">[Source: Page $1, Section $2]</span>'
    );
    
    return text;
  };

  const combinedQueries = [...documentQueries, ...webQueries]
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  const isLoading = documentSearchMutation.isPending || webSearchMutation.isPending;

  return (
    <Card className="w-full">
      <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
        <CollapsibleTrigger asChild>
          <CardHeader className="cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <Search className="h-5 w-5" />
                Research & Analysis
                {combinedQueries.length > 0 && (
                  <Badge variant="secondary" className="ml-2">
                    {combinedQueries.length} {combinedQueries.length === 1 ? 'query' : 'queries'}
                  </Badge>
                )}
              </CardTitle>
              {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </div>
          </CardHeader>
        </CollapsibleTrigger>
        
        <CollapsibleContent>
          <CardContent className="space-y-4">
            {/* Search Type Selection */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Search Type</label>
              <Select value={searchType} onValueChange={(value: SearchType) => setSearchType(value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="document">
                    <div className="flex items-center gap-2">
                      <FileText className="h-4 w-4" />
                      Document Search
                    </div>
                  </SelectItem>
                  <SelectItem value="web">
                    <div className="flex items-center gap-2">
                      <Globe className="h-4 w-4" />
                      Web Search
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Document Selection (only for document search) */}
            {searchType === 'document' && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-medium">Select Documents</label>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleSelectAll}
                      disabled={selectedDocuments.length === documents.length}
                    >
                      Select All
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleDeselectAll}
                      disabled={selectedDocuments.length === 0}
                    >
                      Deselect All
                    </Button>
                  </div>
                </div>
                
                <div className="grid grid-cols-1 gap-2 max-h-32 overflow-y-auto">
                  {documents.map((doc) => (
                    <div key={doc.id} className="flex items-center space-x-2">
                      <Checkbox
                        id={`doc-${doc.id}`}
                        checked={selectedDocuments.includes(doc.id)}
                        onCheckedChange={() => handleDocumentToggle(doc.id)}
                      />
                      <label
                        htmlFor={`doc-${doc.id}`}
                        className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer flex-1"
                      >
                        {doc.originalName}
                      </label>
                      {doc.analysisStatus === 'processed' && (
                        <CheckCircle className="h-4 w-4 text-green-500" />
                      )}
                    </div>
                  ))}
                </div>
                
                {selectedDocuments.length > 0 && (
                  <div className="text-sm text-gray-600">
                    {selectedDocuments.length} of {documents.length} documents selected
                  </div>
                )}
              </div>
            )}

            {/* Query Input */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Your Question</label>
              <Textarea
                placeholder={
                  searchType === 'document'
                    ? "Ask questions about the selected documents..."
                    : "Search for external information..."
                }
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="min-h-[80px]"
              />
            </div>

            {/* Search Button */}
            <Button
              onClick={handleSearch}
              disabled={isLoading || !query.trim() || (searchType === 'document' && selectedDocuments.length === 0)}
              className="w-full"
            >
              {isLoading ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                getSearchIcon(searchType)
              )}
              {isLoading ? 'Searching...' : `Search ${searchType === 'document' ? 'Documents' : 'Web'}`}
            </Button>

            {/* Query History Toggle */}
            {combinedQueries.length > 0 && (
              <>
                <Separator />
                <Button
                  variant="ghost"
                  onClick={() => setShowHistory(!showHistory)}
                  className="w-full justify-between"
                >
                  <div className="flex items-center gap-2">
                    <Archive className="h-4 w-4" />
                    Query History ({combinedQueries.length})
                  </div>
                  {showHistory ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                </Button>
              </>
            )}

            {/* Query History */}
            {showHistory && (
              <ScrollArea className="max-h-96">
                <div className="space-y-4">
                  {combinedQueries.map((queryResult) => (
                    <div key={`${queryResult.searchType}-${queryResult.id}`} className="border rounded-lg p-4 space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          {getSearchIcon(queryResult.searchType)}
                          <Badge variant={queryResult.searchType === 'document' ? 'default' : 'secondary'}>
                            {queryResult.searchType === 'document' ? 'Document Search' : 'Web Search'}
                          </Badge>
                          <span className="text-xs text-gray-500 flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {format(new Date(queryResult.createdAt), 'MMM dd, HH:mm')}
                          </span>
                        </div>
                      </div>
                      
                      <div className="space-y-2">
                        <div>
                          <span className="text-sm font-medium text-gray-600">Question:</span>
                          <p className="text-sm mt-1 bg-gray-50 dark:bg-gray-800 p-2 rounded">{queryResult.query}</p>
                        </div>
                        
                        {queryResult.searchType === 'document' && queryResult.documentIds && (
                          <div>
                            <span className="text-sm font-medium text-gray-600">Documents:</span>
                            <div className="flex flex-wrap gap-1 mt-1">
                              {queryResult.documentIds.map(docId => (
                                <Badge key={docId} variant="outline" className="text-xs">
                                  {getDocumentName(docId)}
                                </Badge>
                              ))}
                            </div>
                          </div>
                        )}
                        
                        <div>
                          <span className="text-sm font-medium text-gray-600">Answer:</span>
                          <div 
                            className="text-sm mt-1 prose prose-sm max-w-none dark:prose-invert"
                            dangerouslySetInnerHTML={{ __html: parseMarkdown(queryResult.response) }}
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            )}
          </CardContent>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
}