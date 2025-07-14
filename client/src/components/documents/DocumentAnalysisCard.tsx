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
import { apiRequest } from '@/lib/queryClient';

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
  const queryClient = useQueryClient();

  // Fetch analysis if completed
  const { data: analysis, isLoading: analysisLoading } = useQuery({
    queryKey: ['document-analysis', document.id],
    queryFn: () => apiRequest('GET', `/api/documents/${document.id}/analysis`),
    enabled: document.analysisStatus === 'completed',
    retry: false
  });

  // Trigger analysis mutation
  const analyzeDocumentMutation = useMutation({
    mutationFn: () => apiRequest('POST', `/api/documents/${document.id}/analyze`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['documents', requestType, requestId] });
      queryClient.invalidateQueries({ queryKey: ['document-analysis', document.id] });
    }
  });

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
              <Button 
                onClick={() => analyzeDocumentMutation.mutate()}
                disabled={analyzeDocumentMutation.isPending}
                size="sm"
              >
                <Brain className="h-4 w-4 mr-1" />
                {analyzeDocumentMutation.isPending ? 'Analyzing...' : 'Analyze'}
              </Button>
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
                  {analysis.documentType.replace('_', ' ')}
                </p>
              </div>
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <TrendingUp className="h-4 w-4 text-green-600" />
                  <span className="text-sm font-medium">Confidence</span>
                </div>
                <div className="flex items-center gap-2">
                  <Progress value={analysis.confidence * 100} className="h-2 flex-1" />
                  <span className="text-sm">{Math.round(analysis.confidence * 100)}%</span>
                </div>
              </div>
            </div>

            {/* Risk Assessment */}
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-yellow-600" />
                <span className="text-sm font-medium">Risk Assessment</span>
              </div>
              <div className="flex items-center gap-2">
                <Badge className={getRiskColor(analysis.riskAssessment.level)}>
                  {analysis.riskAssessment.level.toUpperCase()}
                </Badge>
                <span className="text-sm text-gray-600 dark:text-gray-400">
                  Score: {analysis.riskAssessment.score}/100
                </span>
              </div>
            </div>

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

            {/* Summary */}
            <div className="space-y-2">
              <span className="text-sm font-medium">Summary</span>
              <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
                {analysis.summary}
              </p>
            </div>

            {/* Toggle Details */}
            <div className="flex items-center gap-2">
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => setShowDetails(!showDetails)}
              >
                <Eye className="h-4 w-4 mr-1" />
                {showDetails ? 'Hide Details' : 'Show Details'}
              </Button>
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => window.open(`/api/documents/download/${document.id}`, '_blank')}
              >
                <Download className="h-4 w-4 mr-1" />
                Download
              </Button>
            </div>

            {/* Detailed Analysis */}
            {showDetails && (
              <div className="space-y-4 border-t pt-4">
                {/* Risk Factors */}
                {analysis.riskAssessment.factors.length > 0 && (
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
                {analysis.recommendations.length > 0 && (
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
                {analysis.keyInformation.financialMetrics && 
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