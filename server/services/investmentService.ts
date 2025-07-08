import { storage } from "../storage";
import { workflowService } from "./workflowService";
import { InsertInvestmentRequest, InsertCashRequest } from "@shared/schema";

export class InvestmentService {
  async createInvestmentRequest(requestData: InsertInvestmentRequest) {
    try {
      // Generate request ID
      const requestId = await this.generateRequestId('INV');
      
      // Create the request
      const request = await storage.createInvestmentRequest({
        ...requestData,
        requestId,
        status: 'pending',
      });

      // Start the approval workflow
      await workflowService.startApprovalWorkflow('investment', request.id);

      return request;
    } catch (error) {
      console.error('Error creating investment request:', error);
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
        status: 'pending',
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
