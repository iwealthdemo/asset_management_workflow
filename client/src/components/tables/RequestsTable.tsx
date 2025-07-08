import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { RecentRequest } from "@/lib/types"
import { Briefcase, DollarSign, Clock, CheckCircle, AlertTriangle } from "lucide-react"
import { format } from "date-fns"

interface RequestsTableProps {
  requests: RecentRequest[]
}

export function RequestsTable({ requests }: RequestsTableProps) {
  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'approved':
        return <CheckCircle className="h-4 w-4 text-green-600" />
      case 'pending':
        return <Clock className="h-4 w-4 text-yellow-600" />
      case 'overdue':
        return <AlertTriangle className="h-4 w-4 text-red-600" />
      default:
        return <Clock className="h-4 w-4 text-gray-600" />
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
        return 'bg-yellow-100 text-yellow-800'
      case 'approved':
        return 'bg-green-100 text-green-800'
      case 'rejected':
        return 'bg-red-100 text-red-800'
      case 'overdue':
        return 'bg-red-100 text-red-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const getTypeIcon = (type: string) => {
    return type === 'investment' ? (
      <Briefcase className="h-4 w-4" />
    ) : (
      <DollarSign className="h-4 w-4" />
    )
  }

  const getTypeColor = (type: string) => {
    return type === 'investment' ? 
      'bg-blue-100 text-blue-800' : 
      'bg-orange-100 text-orange-800'
  }

  const getSLAProgress = (status: string) => {
    // Mock SLA progress based on status
    switch (status) {
      case 'approved':
        return 100
      case 'pending':
        return Math.floor(Math.random() * 50) + 25 // 25-75%
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
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Request ID
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Type
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Amount
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Status
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              SLA
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Actions
            </th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {requests.map((request) => {
            const slaProgress = getSLAProgress(request.status)
            const slaColor = getSLAColor(request.status, slaProgress)
            const slaText = getSLAText(request.status)

            return (
              <tr key={request.id} className="hover:bg-gray-50 transition-colors">
                <td className="px-6 py-4 whitespace-nowrap text-sm text-primary font-medium">
                  {request.requestId}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <Badge className={getTypeColor(request.type)}>
                    {getTypeIcon(request.type)}
                    <span className="ml-1 capitalize">
                      {request.type === 'cash_request' ? 'Cash Request' : 'Investment'}
                    </span>
                  </Badge>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                  ${parseFloat(request.amount).toLocaleString()}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <Badge className={getStatusColor(request.status)}>
                    {getStatusIcon(request.status)}
                    <span className="ml-1 capitalize">{request.status}</span>
                  </Badge>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center">
                    <div className="w-full bg-gray-200 rounded-full h-2 max-w-[80px]">
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
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                  <Button variant="ghost" size="sm">
                    View
                  </Button>
                  {request.status === 'pending' && (
                    <Button variant="ghost" size="sm" className="text-green-600 hover:text-green-700">
                      Approve
                    </Button>
                  )}
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
