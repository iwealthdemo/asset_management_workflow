import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ChevronDown, ChevronRight, FileText, TrendingUp } from 'lucide-react';

interface AnalysisCardProps {
  title: string;
  content: string;
  icon: React.ReactNode;
  defaultExpanded?: boolean;
  type: 'summary' | 'insights';
}

const AnalysisCard: React.FC<AnalysisCardProps> = ({ 
  title, 
  content, 
  icon, 
  defaultExpanded = false,
  type 
}) => {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);

  if (!content) return null;

  return (
    <Card className="border-l-4 border-l-blue-500 bg-gray-50 dark:bg-gray-900">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {icon}
            <CardTitle className="text-sm font-medium">{title}</CardTitle>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsExpanded(!isExpanded)}
            className="h-8 w-8 p-0"
          >
            {isExpanded ? (
              <ChevronDown className="h-4 w-4" />
            ) : (
              <ChevronRight className="h-4 w-4" />
            )}
          </Button>
        </div>
      </CardHeader>
      {isExpanded && (
        <CardContent className="pt-0">
          <div className={`text-sm text-gray-600 dark:text-gray-400 leading-relaxed ${
            type === 'insights' ? 'whitespace-pre-line' : ''
          }`}>
            {content}
          </div>
        </CardContent>
      )}
    </Card>
  );
};

export default AnalysisCard;