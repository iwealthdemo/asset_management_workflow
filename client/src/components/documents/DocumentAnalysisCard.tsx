import React, { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  FileText, 
  Brain, 
  TrendingUp, 
  AlertTriangle, 
  CheckCircle,
  Clock,
  Eye,
  Download
} from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';

interface DocumentAnalysis {
  documentType: string;
  classification: string;
  confidence: number;
  keyInformation: {
    amounts?: string[];
    dates?: string[];
    parties?: string[];
    riskFactors?: string[];
    companyName?: string;
    financialMetrics?: Record<string, string>;
  };
  summary: string;
  riskAssessment: {
    level: 'low' | 'medium' | 'high';
    factors: string[];
    score: number;
  };
  recommendations: string[];
  extractedText: string;
}

interface Document {
  id: number;
  fileName: string;
  originalName: string;
  fileSize: number;
  mimeType: string;
  analysisStatus: 'pending' | 'processing' | 'completed' | 'failed';
  analysisResult?: string;
  classification?: string;
  confidence?: number;
  createdAt: string;
  analyzedAt?: string;
}

interface DocumentAnalysisCardProps {
  document: Document;
  requestType: string;
  requestId: number;
}

const DocumentAnalysisCard: React.FC<DocumentAnalysisCardProps> = ({ 
  document, 
  requestType, 
  requestId 
}) => {
  const [showDetails, setShowDetails] = useState(false);
  const [insights, setInsights] = useState<{summary: string; insights: string} | null>(null);
  const queryClient = useQueryClient();
  const { toast } = useToast();

  // Manual document AI preparation mutation
  const prepareForAIMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest('POST', `/api/documents/${document.id}/prepare-ai`);
      return response.json();
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['all-documents'] });
      queryClient.invalidateQueries({ queryKey: [`/api/documents/${requestType}/${requestId}`] });
      queryClient.invalidateQueries({ queryKey: ['documents', requestType, requestId] });
      queryClient.invalidateQueries({ queryKey: ['document-analysis', document.id] });
      
      // Show specific success message based on the result
      if (result.message?.includes('already prepared')) {
        toast({
          title: "✅ Already Prepared",
          description: `Document "${document.originalName}" was already in the vector store and ready for AI analysis.`,
          duration: 5000,
        });
      } else {
        toast({
          title: "✅ AI Preparation Complete",
          description: `Document "${document.originalName}" has been successfully uploaded to vector store and is ready for AI analysis.`,
          duration: 5000,
        });
      }
    },
    onMutate: () => {
      toast({
        title: "Preparing for AI",
        description: "Uploading document to vector store and creating embeddings...",
      });
    },
    onError: (error) => {
      console.error('AI preparation failed:', error);
      toast({
        title: "❌ AI Preparation Failed",
        description: `Failed to prepare document "${document.originalName}" for AI. Please try again.`,
        variant: "destructive",
        duration: 5000,
      });
    }
  });

  // Get insights mutation
  const getInsightsMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest('POST', `/api/documents/${document.id}/get-insights`);
      return response.json();
    },
    onSuccess: (result) => {
      setInsights({
        summary: result.summary,
        insights: result.insights
      });
      toast({
        title: "✅ Insights Generated",
        description: `AI insights generated for "${document.originalName}".`,
        duration: 5000,
      });
    },
    onMutate: () => {
      toast({
        title: "Generating Insights",
        description: "AI is analyzing the document to generate summary and insights...",
      });
    },
    onError: (error) => {
      console.error('Get insights failed:', error);
      toast({
        title: "❌ Insights Generation Failed",
        description: `Failed to generate insights for "${document.originalName}". Please try again.`,
        variant: "destructive",
        duration: 5000,
      });
    }
  });

  // Parse analysis from document.analysisResult if available
  const analysis = React.useMemo(() => {
    if (document.analysisStatus === 'completed' && document.analysisResult) {
      try {
        const parsed = JSON.parse(document.analysisResult);
        // Check if insights are already in the stored result
        if (parsed.summary && parsed.insights) {
          setInsights({
            summary: parsed.summary,
            insights: parsed.insights
          });
        }
        return parsed;
      } catch (error) {
        console.error('Failed to parse analysis result:', error);
        return null;
      }
    }
    return null;
  }, [document.analysisResult, document.analysisStatus]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300';
      case 'processing': return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300';
      case 'failed': return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300';
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300';
    }
  };

  const getRiskColor = (level: string) => {
    switch (level) {
      case 'low': return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300';
      case 'medium': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300';
      case 'high': return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300';
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300';
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };



  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <FileText className="h-5 w-5 text-blue-600" />
            <div>
              <CardTitle className="text-lg">{document.originalName}</CardTitle>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                {formatFileSize(document.fileSize)} • {document.mimeType}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Badge className={getStatusColor(document.analysisStatus)}>
              {document.analysisStatus === 'processing' && <Clock className="h-3 w-3 mr-1" />}
              {document.analysisStatus === 'completed' && <CheckCircle className="h-3 w-3 mr-1" />}
              {document.analysisStatus === 'failed' && <AlertTriangle className="h-3 w-3 mr-1" />}
              {document.analysisStatus.charAt(0).toUpperCase() + document.analysisStatus.slice(1)}
            </Badge>
            {document.analysisStatus === 'pending' && (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button 
                      onClick={() => prepareForAIMutation.mutate()}
                      disabled={prepareForAIMutation.isPending}
                      size="sm"
                      variant="outline"
                    >
                      <Brain className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>{prepareForAIMutation.isPending ? 'Preparing for AI...' : 'Prepare for AI'}</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}
            {document.analysisStatus === 'completed' && (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button 
                      onClick={() => getInsightsMutation.mutate()}
                      disabled={getInsightsMutation.isPending}
                      size="sm"
                      className="bg-blue-600 hover:bg-blue-700 text-white"
                    >
                      <Brain className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>{getInsightsMutation.isPending ? 'Analyzing document...' : 'Get AI Insights'}</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Analysis Progress */}
        {document.analysisStatus === 'processing' && (
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span>Analyzing document...</span>
              <span>Processing</span>
            </div>
            <Progress value={60} className="h-2" />
          </div>
        )}

        {/* Analysis Error */}
        {document.analysisStatus === 'failed' && (
          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              Document analysis failed. Please try again or contact support.
            </AlertDescription>
          </Alert>
        )}

        {/* Analysis Results */}
        {document.analysisStatus === 'completed' && analysis && (
          <div className="space-y-4">
            {/* Quick Summary */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <FileText className="h-4 w-4 text-blue-600" />
                  <span className="text-sm font-medium">Document Type</span>
                </div>
                <p className="text-sm text-gray-600 dark:text-gray-400 capitalize">
                  {analysis.documentType ? analysis.documentType.replace('_', ' ') : 'Unknown'}
                </p>
              </div>
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <TrendingUp className="h-4 w-4 text-green-600" />
                  <span className="text-sm font-medium">Confidence</span>
                </div>
                <div className="flex items-center gap-2">
                  <Progress value={(analysis.confidence || 0) * 100} className="h-2 flex-1" />
                  <span className="text-sm">{Math.round((analysis.confidence || 0) * 100)}%</span>
                </div>
              </div>
            </div>

            {/* Risk Assessment */}
            {analysis.riskAssessment && (
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-yellow-600" />
                  <span className="text-sm font-medium">Risk Assessment</span>
                </div>
                <div className="flex items-center gap-2">
                  <Badge className={getRiskColor(analysis.riskAssessment.level)}>
                    {analysis.riskAssessment.level?.toUpperCase() || 'UNKNOWN'}
                  </Badge>
                  <span className="text-sm text-gray-600 dark:text-gray-400">
                    Score: {analysis.riskAssessment.score || 0}/100
                  </span>
                </div>
              </div>
            )}

            {/* Key Information */}
            {analysis.keyInformation && (
              <div className="space-y-2">
                <span className="text-sm font-medium">Key Information</span>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  {analysis.keyInformation.amounts && analysis.keyInformation.amounts.length > 0 && (
                    <div>
                      <span className="font-medium">Amounts:</span>
                      <p className="text-gray-600 dark:text-gray-400">
                        {analysis.keyInformation.amounts.join(', ')}
                      </p>
                    </div>
                  )}
                  {analysis.keyInformation.companyName && (
                    <div>
                      <span className="font-medium">Company:</span>
                      <p className="text-gray-600 dark:text-gray-400">
                        {analysis.keyInformation.companyName}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* AI Insights Section */}
            {insights && (
              <div className="space-y-4 border-t pt-4">
                <div className="flex items-center gap-2">
                  <Brain className="h-4 w-4 text-purple-600" />
                  <span className="text-sm font-medium">AI-Generated Insights</span>
                </div>
                
                {/* Summary */}
                <div className="space-y-2">
                  <span className="text-sm font-medium">Summary</span>
                  <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
                    {insights.summary}
                  </p>
                </div>

                {/* Insights */}
                <div className="space-y-2">
                  <span className="text-sm font-medium">Key Insights</span>
                  <div className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed whitespace-pre-line">
                    {insights.insights}
                  </div>
                </div>
              </div>
            )}

            {/* Original Summary (fallback) */}
            {!insights && analysis.summary && (
              <div className="space-y-2">
                <span className="text-sm font-medium">Summary</span>
                <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
                  {analysis.summary}
                </p>
              </div>
            )}

            {/* Toggle Details */}
            <div className="flex items-center gap-2">
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => setShowDetails(!showDetails)}
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>{showDetails ? 'Hide Details' : 'Show Details'}</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => window.open(`/api/documents/download/${document.id}`, '_blank')}
                    >
                      <Download className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Download Document</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>

            {/* Detailed Analysis */}
            {showDetails && (
              <div className="space-y-4 border-t pt-4">
                {/* Risk Factors */}
                {analysis.riskAssessment?.factors?.length > 0 && (
                  <div>
                    <h4 className="font-medium mb-2">Risk Factors</h4>
                    <ul className="text-sm space-y-1">
                      {analysis.riskAssessment.factors.map((factor, index) => (
                        <li key={index} className="flex items-start gap-2">
                          <AlertTriangle className="h-3 w-3 text-yellow-500 mt-0.5 flex-shrink-0" />
                          <span className="text-gray-600 dark:text-gray-400">{factor}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Recommendations */}
                {analysis.recommendations?.length > 0 && (
                  <div>
                    <h4 className="font-medium mb-2">Recommendations</h4>
                    <ul className="text-sm space-y-1">
                      {analysis.recommendations.map((rec, index) => (
                        <li key={index} className="flex items-start gap-2">
                          <CheckCircle className="h-3 w-3 text-green-500 mt-0.5 flex-shrink-0" />
                          <span className="text-gray-600 dark:text-gray-400">{rec}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Financial Metrics */}
                {analysis.keyInformation?.financialMetrics && 
                 Object.keys(analysis.keyInformation.financialMetrics).length > 0 && (
                  <div>
                    <h4 className="font-medium mb-2">Financial Metrics</h4>
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      {Object.entries(analysis.keyInformation.financialMetrics).map(([key, value]) => (
                        <div key={key} className="flex justify-between">
                          <span className="font-medium capitalize">{key.replace('_', ' ')}:</span>
                          <span className="text-gray-600 dark:text-gray-400">{value}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Basic Info for Pending/Processing */}
        {document.analysisStatus !== 'completed' && (
          <div className="text-sm text-gray-600 dark:text-gray-400">
            <p>Upload time: {new Date(document.createdAt).toLocaleString()}</p>
            {document.classification && (
              <p>Classification: {document.classification}</p>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default DocumentAnalysisCard;