import { storage } from "../storage";
import { workflowService } from "./workflowService";
import { InsertInvestmentRequest, InsertCashRequest } from "@shared/schema";

export class InvestmentService {
  async createInvestmentRequest(requestData: any) {
    try {
      // Generate request ID
      const requestId = await this.generateRequestId('INV');
      
      // Create the request with generated fields
      const request = await storage.createInvestmentRequest({
        ...requestData,
        requestId,
        status: 'New',
      });

      // Start the approval workflow
      await workflowService.startApprovalWorkflow('investment', request.id);

      return request;
    } catch (error) {
      console.error('Error creating investment request:', error);
      throw error;
    }
  }

  async modifyInvestmentRequest(requestId: number, requestData: any, userId: number) {
    try {
      // Check if request exists and belongs to user
      const existingRequest = await storage.getInvestmentRequest(requestId);
      if (!existingRequest) {
        throw new Error('Investment request not found');
      }
      
      if (existingRequest.requesterId !== userId) {
        throw new Error('Unauthorized to modify this request');
      }
      
      // Check if request is in a rejectable state
      const rejectedStates = ['Manager rejected', 'Committee rejected', 'Finance rejected'];
      if (!rejectedStates.includes(existingRequest.status)) {
        throw new Error('Request cannot be modified in current state');
      }
      
      // Update the request
      const updatedRequest = await storage.updateInvestmentRequest(requestId, {
        ...requestData,
        status: 'Modified',
        currentApprovalStage: 0, // Reset to first stage
      });

      // Start the approval workflow again from stage 1
      await workflowService.startApprovalWorkflow('investment', requestId);

      return updatedRequest;
    } catch (error) {
      console.error('Error modifying investment request:', error);
      throw error;
    }
  }

  async submitDraftRequest(requestId: number, userId: number) {
    try {
      // Check if request exists and belongs to user
      const existingRequest = await storage.getInvestmentRequest(requestId);
      if (!existingRequest) {
        throw new Error('Investment request not found');
      }
      
      if (existingRequest.requesterId !== userId) {
        throw new Error('Unauthorized to submit this request');
      }
      
      if (existingRequest.status !== 'Draft') {
        throw new Error('Only draft requests can be submitted');
      }
      
      // Update status to New and start workflow
      const updatedRequest = await storage.updateInvestmentRequest(requestId, {
        status: 'New',
      });

      // Start the approval workflow
      await workflowService.startApprovalWorkflow('investment', requestId);

      return updatedRequest;
    } catch (error) {
      console.error('Error submitting investment request:', error);
      throw error;
    }
  }

  async createCashRequest(requestData: InsertCashRequest) {
    try {
      // Generate request ID
      const requestId = await this.generateRequestId('CASH');
      
      // Create the request
      const request = await storage.createCashRequest({
        ...requestData,
        requestId,
        status: 'New',
      });

      // Start the approval workflow
      await workflowService.startApprovalWorkflow('cash_request', request.id);

      return request;
    } catch (error) {
      console.error('Error creating cash request:', error);
      throw error;
    }
  }

  private async generateRequestId(prefix: string): Promise<string> {
    const year = new Date().getFullYear();
    const timestamp = Date.now().toString().slice(-6);
    return `${prefix}-${year}-${timestamp}`;
  }
}

export const investmentService = new InvestmentService();
