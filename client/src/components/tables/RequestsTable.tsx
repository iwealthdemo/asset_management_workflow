import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { Card, CardContent } from "@/components/ui/card"
import { RecentRequest } from "@/lib/types"
import { Briefcase, DollarSign, Clock, CheckCircle, AlertTriangle } from "lucide-react"
import { format } from "date-fns"
import { useState } from "react"
import { InvestmentDetailsInline } from "@/components/details/InvestmentDetailsInline"
import { getStatusColor, getStatusIcon } from "@/lib/utils"

interface RequestsTableProps {
  requests: RecentRequest[]
}

export function RequestsTable({ requests }: RequestsTableProps) {
  const [expandedRequest, setExpandedRequest] = useState<number | null>(null)

  const handleToggleDetails = (requestId: number) => {
    setExpandedRequest(expandedRequest === requestId ? null : requestId)
  }

  // Utility functions now imported from @/lib/utils

  const getTypeIcon = (type: string) => {
    return type === 'investment' ? 
      <Briefcase className="h-5 w-5 text-blue-600" /> : 
      <DollarSign className="h-5 w-5 text-green-600" />
  }

  const getTypeColor = (type: string) => {
    return type === 'investment' ? 
      'bg-blue-100 text-blue-800' : 
      'bg-orange-100 text-orange-800'
  }

  const getSLAProgress = (status: string) => {
    switch (status) {
      case 'approved':
        return 100
      case 'pending':
        return Math.floor(Math.random() * 50) + 25
      case 'overdue':
        return 100
      default:
        return 50
    }
  }

  const getSLAColor = (status: string, progress: number) => {
    if (status === 'overdue') return 'bg-red-500'
    if (progress > 75) return 'bg-yellow-500'
    if (status === 'approved') return 'bg-green-500'
    return 'bg-blue-500'
  }

  const getSLAText = (status: string) => {
    switch (status) {
      case 'approved':
        return 'Complete'
      case 'overdue':
        return '5h overdue'
      case 'pending':
        return '18h left'
      default:
        return 'On track'
    }
  }

  if (requests.length === 0) {
    return (
      <div className="text-center py-8">
        <div className="text-gray-400 mb-2">
          <Clock className="h-12 w-12 mx-auto" />
        </div>
        <p className="text-gray-600">No recent requests found</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {requests.map((request) => {
        const slaProgress = getSLAProgress(request.status)
        const slaColor = getSLAColor(request.status, slaProgress)
        const slaText = getSLAText(request.status)

        return (
          <Card key={request.id} className="hover:shadow-lg transition-shadow">
            <CardContent className="p-6">
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="flex items-center gap-2">
                      {getTypeIcon(request.type)}
                      <h3 className="font-semibold text-lg">{request.requestId}</h3>
                    </div>
                    <Badge className={getTypeColor(request.type)}>
                      {request.type === 'cash_request' ? 'Cash Request' : 'Investment'}
                    </Badge>
                    <Badge className={getStatusColor(request.status)}>
                      {getStatusIcon(request.status)}
                      <span className="ml-1 capitalize">{request.status}</span>
                    </Badge>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                    <div className="flex items-center gap-2">
                      <DollarSign className="w-4 h-4 text-green-600" />
                      <span className="text-sm text-gray-600">Amount:</span>
                      <span className="font-semibold">${parseFloat(request.amount).toLocaleString()}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Clock className="w-4 h-4 text-gray-600" />
                      <span className="text-sm text-gray-600">Created:</span>
                      <span className="font-semibold">{format(new Date(request.createdAt), 'MMM dd, yyyy')}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-gray-600">SLA:</span>
                      <div className="flex items-center">
                        <div className="w-16 bg-gray-200 rounded-full h-2">
                          <div 
                            className={`h-2 rounded-full ${slaColor}`} 
                            style={{ width: `${slaProgress}%` }}
                          ></div>
                        </div>
                        <span className={`ml-2 text-xs ${
                          request.status === 'overdue' ? 'text-red-600' :
                          request.status === 'approved' ? 'text-green-600' :
                          'text-gray-600'
                        }`}>
                          {slaText}
                        </span>
                      </div>
                    </div>
                  </div>
                  
                  {/* Enhanced Investment Details */}
                  {request.type === 'investment' && (
                    <div className="bg-gray-50 rounded-lg p-4 mb-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-3">
                        {request.investmentType && (
                          <div className="flex items-center gap-2">
                            <span className="text-sm text-gray-600">Type:</span>
                            <span className="font-medium">{request.investmentType}</span>
                          </div>
                        )}
                        {request.targetCompany && (
                          <div className="flex items-center gap-2">
                            <span className="text-sm text-gray-600">Target:</span>
                            <span className="font-medium">{request.targetCompany}</span>
                          </div>
                        )}
                        {request.expectedReturn && (
                          <div className="flex items-center gap-2">
                            <span className="text-sm text-gray-600">Expected Return:</span>
                            <span className="font-medium">{request.expectedReturn}</span>
                          </div>
                        )}
                        {request.riskLevel && (
                          <div className="flex items-center gap-2">
                            <span className="text-sm text-gray-600">Risk:</span>
                            <Badge className={
                              request.riskLevel === 'high' ? 'bg-red-100 text-red-800' :
                              request.riskLevel === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                              'bg-green-100 text-green-800'
                            }>
                              {request.riskLevel}
                            </Badge>
                          </div>
                        )}
                      </div>
                      {request.description && (
                        <div className="mt-3">
                          <p className="text-sm text-gray-700 line-clamp-2">
                            {request.description.length > 150 
                              ? `${request.description.substring(0, 150)}...` 
                              : request.description}
                          </p>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
              
              {/* Only show inline details for investment requests */}
              {request.type === 'investment' && (
                <InvestmentDetailsInline
                  investment={request}
                  isExpanded={expandedRequest === request.id}
                  onToggle={() => handleToggleDetails(request.id)}
                />
              )}
            </CardContent>
          </Card>
        )
      })}
    </div>
  )
}