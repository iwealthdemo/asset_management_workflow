import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ChevronDown, ChevronRight, ChevronUp, MessageCircle, User } from 'lucide-react';

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

// Enhanced markdown parser for formatting and source references
const parseMarkdown = (text: string): JSX.Element => {
  // First handle source references - convert them to a more readable format
  let processedText = text.replace(/【\d+:\d+†source】/g, (match) => {
    // Extract the numbers from the source reference
    const numbers = match.match(/\d+/g);
    if (numbers && numbers.length >= 2) {
      return `[Source: Page ${numbers[0]}, Section ${numbers[1]}]`;
    }
    return '[Source: Document]';
  });
  
  // Split text by lines to handle headers
  const lines = processedText.split('\n');
  const processedLines = lines.map((line, lineIndex) => {
    // Handle headers
    if (line.startsWith('## ')) {
      return <h3 key={lineIndex} className="text-lg font-semibold mt-4 mb-2">{line.slice(3)}</h3>;
    }
    if (line.startsWith('### ')) {
      return <h4 key={lineIndex} className="text-base font-semibold mt-3 mb-2">{line.slice(4)}</h4>;
    }
    
    // Process inline formatting (bold, italic, sources)
    const parts = line.split(/(\*\*.*?\*\*|\*.*?\*)/g);
    
    return (
      <div key={lineIndex} className="mb-1">
        {parts.map((part, index) => {
          if (part.startsWith('**') && part.endsWith('**')) {
            // Remove the asterisks and make it bold
            const boldText = part.slice(2, -2);
            return <strong key={index}>{boldText}</strong>;
          }
          if (part.startsWith('*') && part.endsWith('*') && !part.startsWith('**')) {
            // Remove the asterisks and make it italic
            const italicText = part.slice(1, -1);
            return <em key={index}>{italicText}</em>;
          }
          // Check if this part contains source references and style them
          if (part.includes('[Source:')) {
            return (
              <span key={index}>
                {part.split(/(\[Source:.*?\])/g).map((subPart, subIndex) => {
                  if (subPart.startsWith('[Source:')) {
                    return (
                      <span 
                        key={subIndex} 
                        className="inline-block bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 px-2 py-1 rounded text-xs ml-1"
                        title="This information came from the analyzed document"
                      >
                        {subPart}
                      </span>
                    );
                  }
                  return <span key={subIndex}>{subPart}</span>;
                })}
              </span>
            );
          }
          return <span key={index}>{part}</span>;
        })}
      </div>
    );
  });
  
  return <>{processedLines}</>;
};

const QueryCard: React.FC<QueryCardProps> = ({ query, index }) => {
  const [isExpanded, setIsExpanded] = useState(true);

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
              <div className="text-sm text-gray-600 dark:text-gray-400 mt-1 whitespace-pre-line">
                {parseMarkdown(query.response)}
              </div>
            </div>
          </div>
          
          {/* Hide Details Button */}
          <div className="flex justify-center pt-3 mt-3 border-t">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsExpanded(false)}
              className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
            >
              <ChevronUp className="h-4 w-4 mr-1" />
              Hide Details
            </Button>
          </div>
        </CardContent>
      )}
    </Card>
  );
};

export default QueryCard;