import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ChevronDown, ChevronRight, MessageCircle, User } from 'lucide-react';

interface QueryCardProps {
  query: {
    id: number;
    query: string;
    response: string;
    createdAt: string;
    user?: {
      firstName: string;
      lastName: string;
    };
  };
  index: number;
}

const QueryCard: React.FC<QueryCardProps> = ({ query, index }) => {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <Card className="border-l-4 border-l-green-500 bg-gray-50 dark:bg-gray-900">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <MessageCircle className="h-4 w-4 text-green-600" />
            <CardTitle className="text-sm font-medium">
              Query #{index + 1}
            </CardTitle>
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
        {/* Always show query preview */}
        <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
          <div className="flex items-center gap-2 mb-1">
            <User className="h-3 w-3" />
            <span>
              {query.user ? `${query.user.firstName} ${query.user.lastName}` : 'Unknown User'}
            </span>
            <span>•</span>
            <span>{new Date(query.createdAt).toLocaleString()}</span>
          </div>
          <p className="line-clamp-2 text-gray-600 dark:text-gray-400">
            {query.query}
          </p>
        </div>
      </CardHeader>
      {isExpanded && (
        <CardContent className="pt-0">
          <div className="space-y-3">
            <div>
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Question:</span>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">{query.query}</p>
            </div>
            <div>
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Answer:</span>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1 whitespace-pre-line">
                {query.response}
              </p>
            </div>
          </div>
        </CardContent>
      )}
    </Card>
  );
};

export default QueryCard;