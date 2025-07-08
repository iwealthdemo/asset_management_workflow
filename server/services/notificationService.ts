import { storage } from "../storage";

export class NotificationService {
  async notifyRequestApproved(requestType: string, requestId: number) {
    // Get request details to find requester
    let request;
    if (requestType === 'investment') {
      request = await storage.getInvestmentRequest(requestId);
    } else {
      request = await storage.getCashRequest(requestId);
    }

    if (!request) return;

    await storage.createNotification({
      userId: request.requesterId!,
      title: 'Request Approved',
      message: `Your ${requestType.replace('_', ' ')} request has been approved`,
      type: 'status_update',
      relatedType: requestType,
      relatedId: requestId,
    });
  }

  async notifyRequestRejected(requestType: string, requestId: number) {
    // Get request details to find requester
    let request;
    if (requestType === 'investment') {
      request = await storage.getInvestmentRequest(requestId);
    } else {
      request = await storage.getCashRequest(requestId);
    }

    if (!request) return;

    await storage.createNotification({
      userId: request.requesterId!,
      title: 'Request Rejected',
      message: `Your ${requestType.replace('_', ' ')} request has been rejected`,
      type: 'status_update',
      relatedType: requestType,
      relatedId: requestId,
    });
  }

  async notifyChangesRequested(requestType: string, requestId: number) {
    // Get request details to find requester
    let request;
    if (requestType === 'investment') {
      request = await storage.getInvestmentRequest(requestId);
    } else {
      request = await storage.getCashRequest(requestId);
    }

    if (!request) return;

    await storage.createNotification({
      userId: request.requesterId!,
      title: 'Changes Requested',
      message: `Changes have been requested for your ${requestType.replace('_', ' ')} request`,
      type: 'status_update',
      relatedType: requestType,
      relatedId: requestId,
    });
  }

  async notifyTaskAssigned(userId: number, taskId: number) {
    await storage.createNotification({
      userId,
      title: 'New Task Assigned',
      message: 'A new task has been assigned to you',
      type: 'task_assigned',
      relatedType: 'task',
      relatedId: taskId,
    });
  }

  async notifySLABreach(userId: number, requestType: string, requestId: number) {
    await storage.createNotification({
      userId,
      title: 'SLA Breach Warning',
      message: `${requestType.replace('_', ' ')} request is approaching SLA deadline`,
      type: 'sla_warning',
      relatedType: requestType,
      relatedId: requestId,
    });
  }
}

export const notificationService = new NotificationService();
