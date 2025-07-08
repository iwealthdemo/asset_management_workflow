import { storage } from "../storage";
import { notificationService } from "./notificationService";

export class WorkflowService {
  private approvalWorkflows = {
    investment: [
      { stage: 1, approverRole: 'manager', slaHours: 48 },
      { stage: 2, approverRole: 'committee_member', slaHours: 72 },
      { stage: 3, approverRole: 'finance', slaHours: 24 },
    ],
    cash_request: [
      { stage: 1, approverRole: 'manager', slaHours: 24 },
      { stage: 2, approverRole: 'finance', slaHours: 12 },
    ],
  };

  async startApprovalWorkflow(requestType: 'investment' | 'cash_request', requestId: number) {
    const workflow = this.approvalWorkflows[requestType];
    const firstStage = workflow[0];

    // Create approval record for first stage
    await storage.createApproval({
      requestType,
      requestId,
      stage: firstStage.stage,
      approverId: null, // Will be assigned when someone claims it
      status: 'pending',
    });

    // Create task for first stage
    await this.createApprovalTask(requestType, requestId, firstStage.stage);
  }

  async processApproval(
    requestType: string,
    requestId: number,
    approverId: number,
    action: 'approve' | 'reject' | 'changes_requested',
    comments?: string
  ) {
    try {
      // Get current approval record
      const approvals = await storage.getApprovalsByRequest(requestType, requestId);
      const currentApproval = approvals.find(a => a.status === 'pending');

      if (!currentApproval) {
        throw new Error('No pending approval found');
      }

      // Update approval record
      await storage.updateApproval(currentApproval.id, {
        approverId,
        status: action,
        comments,
        approvedAt: new Date(),
      });

      // Update task status
      const tasks = await storage.getTasksByUser(approverId);
      const currentTask = tasks.find(t => 
        t.requestType === requestType && 
        t.requestId === requestId && 
        t.status === 'pending'
      );

      if (currentTask) {
        await storage.updateTask(currentTask.id, {
          status: 'completed',
          completedAt: new Date(),
        });
      }

      if (action === 'approve') {
        await this.moveToNextStage(requestType, requestId, currentApproval.stage);
      } else if (action === 'reject') {
        await this.rejectRequest(requestType, requestId);
      } else if (action === 'changes_requested') {
        await this.requestChanges(requestType, requestId);
      }

      return { success: true, message: 'Approval processed successfully' };
    } catch (error) {
      console.error('Error processing approval:', error);
      throw error;
    }
  }

  private async moveToNextStage(requestType: string, requestId: number, currentStage: number) {
    const workflow = this.approvalWorkflows[requestType as keyof typeof this.approvalWorkflows];
    const nextStage = workflow.find(w => w.stage === currentStage + 1);

    if (nextStage) {
      // Create next approval record
      await storage.createApproval({
        requestType,
        requestId,
        stage: nextStage.stage,
        approverId: null,
        status: 'pending',
      });

      // Create next task
      await this.createApprovalTask(requestType, requestId, nextStage.stage);
    } else {
      // Final approval - mark request as approved
      if (requestType === 'investment') {
        await storage.updateInvestmentRequest(requestId, { status: 'approved' });
      } else {
        await storage.updateCashRequest(requestId, { status: 'approved' });
      }

      // Notify requester
      await notificationService.notifyRequestApproved(requestType, requestId);
    }
  }

  private async rejectRequest(requestType: string, requestId: number) {
    if (requestType === 'investment') {
      await storage.updateInvestmentRequest(requestId, { status: 'rejected' });
    } else {
      await storage.updateCashRequest(requestId, { status: 'rejected' });
    }

    // Notify requester
    await notificationService.notifyRequestRejected(requestType, requestId);
  }

  private async requestChanges(requestType: string, requestId: number) {
    if (requestType === 'investment') {
      await storage.updateInvestmentRequest(requestId, { status: 'changes_requested' });
    } else {
      await storage.updateCashRequest(requestId, { status: 'changes_requested' });
    }

    // Notify requester
    await notificationService.notifyChangesRequested(requestType, requestId);
  }

  private async createApprovalTask(requestType: string, requestId: number, stage: number) {
    const workflow = this.approvalWorkflows[requestType as keyof typeof this.approvalWorkflows];
    const stageConfig = workflow.find(w => w.stage === stage);

    if (!stageConfig) return;

    // For now, we'll create a general task. In a real system, you'd assign to specific users based on role
    const dueDate = new Date();
    dueDate.setHours(dueDate.getHours() + stageConfig.slaHours);

    await storage.createTask({
      assigneeId: null, // Will be assigned based on role
      requestType,
      requestId,
      taskType: 'approval',
      title: `Approval Required - ${requestType.replace('_', ' ')}`,
      description: `Please review and approve the ${requestType.replace('_', ' ')} request`,
      dueDate,
    });
  }
}

export const workflowService = new WorkflowService();
