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

      // Get approver details to determine status text
      const approver = await storage.getUser(approverId);
      let statusText = action;
      
      if (action === 'approve') {
        switch (approver?.role) {
          case 'manager':
            statusText = 'Manager approved';
            break;
          case 'committee_member':
            statusText = 'Committee approved';
            break;
          case 'finance':
            statusText = 'Finance approved';
            break;
          default:
            statusText = 'approved';
        }
      } else if (action === 'reject') {
        switch (approver?.role) {
          case 'manager':
            statusText = 'Manager rejected';
            break;
          case 'committee_member':
            statusText = 'Committee rejected';
            break;
          case 'finance':
            statusText = 'Finance rejected';
            break;
          default:
            statusText = 'rejected';
        }
      }

      // Update approval record
      await storage.updateApproval(currentApproval.id, {
        approverId,
        status: statusText,
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
        // Update request status with approval status
        if (requestType === 'investment') {
          await storage.updateInvestmentRequest(requestId, { status: statusText });
        } else if (requestType === 'cash_request') {
          await storage.updateCashRequest(requestId, { status: statusText });
        }
        
        await this.moveToNextStage(requestType, requestId, currentApproval.stage);
      } else if (action === 'reject') {
        await this.rejectRequest(requestType, requestId, approver?.role);
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

  private async rejectRequest(requestType: string, requestId: number, approverRole?: string) {
    // Update request status to rejected with specific role information
    let rejectionStatus = 'rejected';
    if (approverRole) {
      switch (approverRole) {
        case 'manager':
          rejectionStatus = 'Manager rejected';
          break;
        case 'committee_member':
          rejectionStatus = 'Committee rejected';
          break;
        case 'finance':
          rejectionStatus = 'Finance rejected';
          break;
      }
    }

    if (requestType === 'investment') {
      await storage.updateInvestmentRequest(requestId, { status: rejectionStatus });
    } else if (requestType === 'cash_request') {
      await storage.updateCashRequest(requestId, { status: rejectionStatus });
    }

    // Send notification
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

    // Get request details to create better task description
    let requestDetails = null;
    if (requestType === 'investment') {
      requestDetails = await storage.getInvestmentRequest(requestId);
    } else {
      requestDetails = await storage.getCashRequest(requestId);
    }

    // Find users with the required role for this stage
    const requiredRole = stageConfig.approverRole;
    console.log(`Looking for users with role: ${requiredRole}`);
    
    // Get all users and find those with the required role
    const allUsers = await storage.getAllUsers();
    const roleUsers = allUsers.filter(user => user.role === requiredRole);
    
    console.log(`Found ${roleUsers.length} users with role ${requiredRole}`);
    
    // Create descriptive task description
    let taskDescription = `Please review and approve the ${requestType.replace('_', ' ')} request.`;
    if (requestDetails && requestType === 'investment') {
      taskDescription = `${requestDetails.requestId} - ${requestDetails.investmentType} - ${requestDetails.targetCompany} - $${requestDetails.amount} - ${requestDetails.status}`;
    } else if (requestDetails && requestType === 'cash_request') {
      taskDescription = `${requestDetails.requestId} - Cash Request - $${requestDetails.amount} - ${requestDetails.status}`;
    }
    
    // Create tasks for all users with the required role
    const dueDate = new Date();
    dueDate.setHours(dueDate.getHours() + stageConfig.slaHours);

    for (const user of roleUsers) {
      await storage.createTask({
        assigneeId: user.id,
        requestType,
        requestId,
        taskType: 'approval',
        title: `Stage ${stage} Approval Required - ${requestType.replace('_', ' ')}`,
        description: taskDescription,
        dueDate,
      });
    }
    
    console.log(`Created approval tasks for ${requestType} request ${requestId}, stage ${stage}`);
  }
}

export const workflowService = new WorkflowService();
