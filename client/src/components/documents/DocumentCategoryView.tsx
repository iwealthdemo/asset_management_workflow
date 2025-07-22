import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { ChevronDown, ChevronRight, FileText, Download, Eye, Clock, CheckCircle, AlertCircle } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

interface Document {
  id: number;
  originalName: string;
  fileName: string;
  fileSize: number;
  mimeType: string;
  analysisStatus?: string;
  createdAt: string;
  categoryId?: number;
  subcategoryId?: number;
  uploader: {
    firstName: string;
    lastName: string;
  };
}

interface DocumentCategory {
  id: number;
  name: string;
  description?: string;
  icon: string;
  isSystem: boolean;
}

interface DocumentSubcategory {
  id: number;
  categoryId: number;
  name: string;
  description?: string;
  isSystem: boolean;
}

interface DocumentCategoryViewProps {
  requestType: string;
  requestId: number;
  documents: Document[];
  onDocumentPreview?: (documentId: number) => void;
  onDocumentDownload?: (documentId: number) => void;
  onDocumentAnalyze?: (documentId: number) => void;
  showAnalysisActions?: boolean;
}

export function DocumentCategoryView({
  requestType,
  requestId,
  documents,
  onDocumentPreview,
  onDocumentDownload,
  onDocumentAnalyze,
  showAnalysisActions = true
}: DocumentCategoryViewProps) {
  const [openCategories, setOpenCategories] = useState<Set<number>>(new Set());

  const { data: categories = [] } = useQuery({
    queryKey: ['/api/document-categories'],
    enabled: true
  });

  const { data: subcategories = [] } = useQuery({
    queryKey: ['/api/document-subcategories'],
    enabled: true
  });

  const toggleCategory = (categoryId: number) => {
    const newOpen = new Set(openCategories);
    if (newOpen.has(categoryId)) {
      newOpen.delete(categoryId);
    } else {
      newOpen.add(categoryId);
    }
    setOpenCategories(newOpen);
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getAnalysisStatusIcon = (status?: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'processing':
        return <Clock className="h-4 w-4 text-yellow-500" />;
      case 'failed':
        return <AlertCircle className="h-4 w-4 text-red-500" />;
      default:
        return <FileText className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const getAnalysisStatusText = (status?: string) => {
    switch (status) {
      case 'completed':
        return 'Analyzed';
      case 'processing':
        return 'Processing';
      case 'failed':
        return 'Failed';
      default:
        return 'Pending';
    }
  };

  // Group documents by category and subcategory
  const groupedDocuments = categories.reduce((acc: any, category: DocumentCategory) => {
    const categoryDocs = documents.filter(doc => doc.categoryId === category.id);
    if (categoryDocs.length > 0) {
      acc[category.id] = {
        category,
        subcategories: {},
        uncategorizedDocs: categoryDocs.filter(doc => !doc.subcategoryId)
      };

      // Group by subcategory
      subcategories
        .filter((sub: DocumentSubcategory) => sub.categoryId === category.id)
        .forEach((subcategory: DocumentSubcategory) => {
          const subDocs = categoryDocs.filter(doc => doc.subcategoryId === subcategory.id);
          if (subDocs.length > 0) {
            acc[category.id].subcategories[subcategory.id] = {
              subcategory,
              documents: subDocs
            };
          }
        });
    }
    return acc;
  }, {});

  // Handle uncategorized documents
  const uncategorizedDocs = documents.filter(doc => !doc.categoryId);
  if (uncategorizedDocs.length > 0) {
    const uncategorizedCategory = categories.find((cat: DocumentCategory) => cat.name === 'Uncategorized');
    if (uncategorizedCategory) {
      groupedDocuments[uncategorizedCategory.id] = {
        category: uncategorizedCategory,
        subcategories: {},
        uncategorizedDocs
      };
    }
  }

  if (documents.length === 0) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="text-center py-8">
            <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">No documents uploaded yet</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {Object.values(groupedDocuments).map((group: any) => {
        const { category, subcategories, uncategorizedDocs } = group;
        const isOpen = openCategories.has(category.id);
        const totalDocs = uncategorizedDocs.length + 
          Object.values(subcategories).reduce((sum: number, sub: any) => sum + sub.documents.length, 0);

        return (
          <Card key={category.id}>
            <Collapsible open={isOpen} onOpenChange={() => toggleCategory(category.id)}>
              <CollapsibleTrigger asChild>
                <CardHeader className="cursor-pointer hover:bg-muted/50">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      {isOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                      <span className="text-xl">{category.icon}</span>
                      <div>
                        <CardTitle className="text-lg">{category.name}</CardTitle>
                        {category.description && (
                          <p className="text-sm text-muted-foreground">{category.description}</p>
                        )}
                      </div>
                    </div>
                    <Badge variant="secondary" className="ml-auto">
                      {totalDocs} {totalDocs === 1 ? 'document' : 'documents'}
                    </Badge>
                  </div>
                </CardHeader>
              </CollapsibleTrigger>
              
              <CollapsibleContent>
                <CardContent className="pt-0">
                  {/* Subcategorized documents */}
                  {Object.values(subcategories).map((subGroup: any) => {
                    const { subcategory, documents: subDocs } = subGroup;
                    return (
                      <div key={subcategory.id} className="mb-6">
                        <div className="flex items-center gap-2 mb-3">
                          <FileText className="h-4 w-4 text-muted-foreground" />
                          <h4 className="font-medium">{subcategory.name}</h4>
                          <Badge variant="outline" className="text-xs">
                            {subDocs.length}
                          </Badge>
                        </div>
                        <div className="pl-6 space-y-2">
                          {subDocs.map((doc: Document) => (
                            <div key={doc.id} className="flex items-center justify-between p-3 border rounded-lg">
                              <div className="flex items-center gap-3 flex-1">
                                {getAnalysisStatusIcon(doc.analysisStatus)}
                                <div className="flex-1 min-w-0">
                                  <p className="font-medium text-sm truncate">{doc.originalName}</p>
                                  <div className="flex items-center gap-4 text-xs text-muted-foreground">
                                    <span>{formatFileSize(doc.fileSize)}</span>
                                    <span>Uploaded {formatDistanceToNow(new Date(doc.createdAt))} ago</span>
                                    <span>by {doc.uploader.firstName} {doc.uploader.lastName}</span>
                                  </div>
                                </div>
                              </div>
                              <div className="flex items-center gap-1">
                                <Badge variant="outline" className="text-xs">
                                  {getAnalysisStatusText(doc.analysisStatus)}
                                </Badge>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => onDocumentPreview?.(doc.id)}
                                  title="Preview"
                                >
                                  <Eye className="h-4 w-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => onDocumentDownload?.(doc.id)}
                                  title="Download"
                                >
                                  <Download className="h-4 w-4" />
                                </Button>
                                {showAnalysisActions && doc.analysisStatus !== 'processing' && (
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => onDocumentAnalyze?.(doc.id)}
                                    title="Analyze"
                                  >
                                    Analyze
                                  </Button>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })}

                  {/* Uncategorized documents in this category */}
                  {uncategorizedDocs.length > 0 && (
                    <div>
                      {Object.keys(subcategories).length > 0 && <Separator className="mb-4" />}
                      <div className="space-y-2">
                        {uncategorizedDocs.map((doc: Document) => (
                          <div key={doc.id} className="flex items-center justify-between p-3 border rounded-lg">
                            <div className="flex items-center gap-3 flex-1">
                              {getAnalysisStatusIcon(doc.analysisStatus)}
                              <div className="flex-1 min-w-0">
                                <p className="font-medium text-sm truncate">{doc.originalName}</p>
                                <div className="flex items-center gap-4 text-xs text-muted-foreground">
                                  <span>{formatFileSize(doc.fileSize)}</span>
                                  <span>Uploaded {formatDistanceToNow(new Date(doc.createdAt))} ago</span>
                                  <span>by {doc.uploader.firstName} {doc.uploader.lastName}</span>
                                </div>
                              </div>
                            </div>
                            <div className="flex items-center gap-1">
                              <Badge variant="outline" className="text-xs">
                                {getAnalysisStatusText(doc.analysisStatus)}
                              </Badge>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => onDocumentPreview?.(doc.id)}
                                title="Preview"
                              >
                                <Eye className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => onDocumentDownload?.(doc.id)}
                                title="Download"
                              >
                                <Download className="h-4 w-4" />
                              </Button>
                              {showAnalysisActions && doc.analysisStatus !== 'processing' && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => onDocumentAnalyze?.(doc.id)}
                                  title="Analyze"
                                >
                                  Analyze
                                </Button>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </CardContent>
              </CollapsibleContent>
            </Collapsible>
          </Card>
        );
      })}
    </div>
  );
}