import { 
  users, investmentRequests, cashRequests, approvals, tasks, documents, 
  notifications, templates, auditLogs, approvalWorkflows, backgroundJobs,
  type User, type InsertUser, type InvestmentRequest, type InsertInvestmentRequest,
  type CashRequest, type InsertCashRequest, type Approval, type InsertApproval,
  type Task, type InsertTask, type Document, type InsertDocument,
  type Notification, type InsertNotification, type Template, type InsertTemplate,
  type BackgroundJob, type InsertBackgroundJob
} from "@shared/schema";
import { db } from "./db";
import { eq, desc, and, or, sql } from "drizzle-orm";

export interface IStorage {
  // User operations
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  getAllUsers(): Promise<User[]>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: number, user: Partial<InsertUser>): Promise<User>;
  
  // Investment operations
  getInvestmentRequest(id: number): Promise<InvestmentRequest | undefined>;
  getInvestmentRequestByRequestId(requestId: string): Promise<InvestmentRequest | undefined>;
  createInvestmentRequest(request: InsertInvestmentRequest): Promise<InvestmentRequest>;
  updateInvestmentRequest(id: number, request: Partial<InsertInvestmentRequest>): Promise<InvestmentRequest>;
  getInvestmentRequests(filters?: { userId?: number; status?: string }): Promise<InvestmentRequest[]>;
  
  // Cash request operations
  getCashRequest(id: number): Promise<CashRequest | undefined>;
  getCashRequestByRequestId(requestId: string): Promise<CashRequest | undefined>;
  createCashRequest(request: InsertCashRequest): Promise<CashRequest>;
  updateCashRequest(id: number, request: Partial<InsertCashRequest>): Promise<CashRequest>;
  getCashRequests(filters?: { userId?: number; status?: string }): Promise<CashRequest[]>;
  
  // Approval operations
  createApproval(approval: InsertApproval): Promise<Approval>;
  updateApproval(id: number, approval: Partial<InsertApproval>): Promise<Approval>;
  getApprovalsByRequest(requestType: string, requestId: number): Promise<Approval[]>;
  getApprovalsByUser(userId: number): Promise<Approval[]>;
  
  // Task operations
  createTask(task: InsertTask): Promise<Task>;
  updateTask(id: number, task: Partial<InsertTask>): Promise<Task>;
  getTasksByUser(userId: number): Promise<Task[]>;
  getTaskById(id: number): Promise<Task | undefined>;
  
  // Document operations
  createDocument(document: InsertDocument): Promise<Document>;
  updateDocument(id: number, document: Partial<InsertDocument>): Promise<Document>;
  getDocumentsByRequest(requestType: string, requestId: number): Promise<Document[]>;
  getDocument(id: number): Promise<Document | undefined>;
  getDocumentsByAnalysisStatus(status: string): Promise<Document[]>;
  getDocumentAnalysis(id: number): Promise<any>;
  
  // Notification operations
  createNotification(notification: InsertNotification): Promise<Notification>;
  getUserNotifications(userId: number): Promise<Notification[]>;
  markNotificationAsRead(id: number): Promise<void>;
  
  // Template operations
  createTemplate(template: InsertTemplate): Promise<Template>;
  getTemplatesByType(type: string): Promise<Template[]>;
  getTemplate(id: number): Promise<Template | undefined>;
  
  // Dashboard stats
  getDashboardStats(userId: number): Promise<{
    pendingApprovals: number;
    activeInvestments: number;
    cashRequests: number;
    slaBreaches: number;
  }>;
  
  // Recent requests
  getRecentRequests(limit?: number, userId?: number): Promise<Array<{
    id: number;
    requestId: string;
    type: 'investment' | 'cash_request';
    amount: string;
    status: string;
    createdAt: Date;
    requester: { firstName: string; lastName: string };
  }>>;
  
  // Background job operations
  createBackgroundJob(job: InsertBackgroundJob): Promise<BackgroundJob>;
  getBackgroundJobsByDocument(documentId: number): Promise<BackgroundJob[]>;
  getBackgroundJob(id: number): Promise<BackgroundJob | undefined>;
  updateBackgroundJob(id: number, job: Partial<InsertBackgroundJob>): Promise<BackgroundJob>;
}

export class DatabaseStorage implements IStorage {
  async getUser(id: number): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user || undefined;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user || undefined;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.email, email));
    return user || undefined;
  }

  async getAllUsers(): Promise<User[]> {
    return await db.select().from(users);
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db.insert(users).values(insertUser).returning();
    return user;
  }

  async updateUser(id: number, updateUser: Partial<InsertUser>): Promise<User> {
    const [user] = await db.update(users).set(updateUser).where(eq(users.id, id)).returning();
    return user;
  }

  async getInvestmentRequest(id: number): Promise<InvestmentRequest | undefined> {
    const [request] = await db.select().from(investmentRequests).where(eq(investmentRequests.id, id));
    return request || undefined;
  }

  async getInvestmentRequestByRequestId(requestId: string): Promise<InvestmentRequest | undefined> {
    const [request] = await db.select().from(investmentRequests).where(eq(investmentRequests.requestId, requestId));
    return request || undefined;
  }

  async createInvestmentRequest(request: InsertInvestmentRequest): Promise<InvestmentRequest> {
    const [created] = await db.insert(investmentRequests).values(request).returning();
    return created;
  }

  async updateInvestmentRequest(id: number, request: Partial<InsertInvestmentRequest>): Promise<InvestmentRequest> {
    const [updated] = await db.update(investmentRequests).set(request).where(eq(investmentRequests.id, id)).returning();
    return updated;
  }

  async getInvestmentRequests(filters?: { userId?: number; status?: string }): Promise<InvestmentRequest[]> {
    let query = db.select().from(investmentRequests);
    
    const conditions: any[] = [];
    
    if (filters?.userId) {
      conditions.push(eq(investmentRequests.requesterId, filters.userId));
    }
    
    if (filters?.status) {
      conditions.push(eq(investmentRequests.status, filters.status));
    }
    
    if (conditions.length > 0) {
      query = query.where(conditions.length === 1 ? conditions[0] : and(...conditions));
    }
    
    const results = await query.orderBy(desc(investmentRequests.createdAt));
    return results;
  }

  async getCashRequest(id: number): Promise<CashRequest | undefined> {
    const [request] = await db.select().from(cashRequests).where(eq(cashRequests.id, id));
    return request || undefined;
  }

  async getCashRequestByRequestId(requestId: string): Promise<CashRequest | undefined> {
    const [request] = await db.select().from(cashRequests).where(eq(cashRequests.requestId, requestId));
    return request || undefined;
  }

  async createCashRequest(request: InsertCashRequest): Promise<CashRequest> {
    const [created] = await db.insert(cashRequests).values(request).returning();
    return created;
  }

  async updateCashRequest(id: number, request: Partial<InsertCashRequest>): Promise<CashRequest> {
    const [updated] = await db.update(cashRequests).set(request).where(eq(cashRequests.id, id)).returning();
    return updated;
  }

  async getCashRequests(filters?: { userId?: number; status?: string }): Promise<CashRequest[]> {
    let query = db.select().from(cashRequests);
    
    const conditions: any[] = [];
    
    if (filters?.userId) {
      conditions.push(eq(cashRequests.requesterId, filters.userId));
    }
    
    if (filters?.status) {
      conditions.push(eq(cashRequests.status, filters.status));
    }
    
    if (conditions.length > 0) {
      query = query.where(conditions.length === 1 ? conditions[0] : and(...conditions));
    }
    
    const results = await query.orderBy(desc(cashRequests.createdAt));
    return results;
  }

  async createApproval(approval: InsertApproval): Promise<Approval> {
    const [created] = await db.insert(approvals).values(approval).returning();
    return created;
  }

  async updateApproval(id: number, approval: Partial<InsertApproval>): Promise<Approval> {
    const [updated] = await db.update(approvals).set(approval).where(eq(approvals.id, id)).returning();
    return updated;
  }

  async getApprovalsByRequest(requestType: string, requestId: number): Promise<Approval[]> {
    return await db.select().from(approvals)
      .where(and(
        eq(approvals.requestType, requestType),
        eq(approvals.requestId, requestId)
      ))
      .orderBy(approvals.stage);
  }

  async getApprovalsByUser(userId: number): Promise<Approval[]> {
    return await db.select().from(approvals)
      .where(eq(approvals.approverId, userId))
      .orderBy(desc(approvals.createdAt));
  }

  async createTask(task: InsertTask): Promise<Task> {
    const [created] = await db.insert(tasks).values(task).returning();
    return created;
  }

  async updateTask(id: number, task: Partial<InsertTask>): Promise<Task> {
    const [updated] = await db.update(tasks).set(task).where(eq(tasks.id, id)).returning();
    return updated;
  }

  async getTasksByUser(userId: number): Promise<Task[]> {
    return await db.select().from(tasks)
      .where(eq(tasks.assigneeId, userId))
      .orderBy(desc(tasks.createdAt));
  }

  async getTaskById(id: number): Promise<Task | undefined> {
    const [task] = await db.select().from(tasks).where(eq(tasks.id, id));
    return task || undefined;
  }

  async createDocument(document: InsertDocument): Promise<Document> {
    const [created] = await db.insert(documents).values(document).returning();
    return created;
  }

  async getDocumentsByRequest(requestType: string, requestId: number): Promise<Document[]> {
    return await db.select().from(documents)
      .where(and(
        eq(documents.requestType, requestType),
        eq(documents.requestId, requestId)
      ))
      .orderBy(desc(documents.createdAt));
  }

  async getDocument(id: number): Promise<Document | undefined> {
    const [document] = await db.select().from(documents).where(eq(documents.id, id));
    return document || undefined;
  }

  async updateDocument(id: number, document: Partial<InsertDocument>): Promise<Document> {
    const [updated] = await db.update(documents).set(document).where(eq(documents.id, id)).returning();
    return updated;
  }

  async getDocumentsByAnalysisStatus(status: string): Promise<Document[]> {
    return await db.select().from(documents)
      .where(eq(documents.analysisStatus, status))
      .orderBy(desc(documents.createdAt));
  }

  async getDocumentAnalysis(id: number): Promise<any> {
    const document = await this.getDocument(id);
    if (!document || !document.analysisResult) {
      return null;
    }
    
    try {
      return JSON.parse(document.analysisResult);
    } catch (error) {
      console.error('Failed to parse document analysis:', error);
      return null;
    }
  }

  async createNotification(notification: InsertNotification): Promise<Notification> {
    const [created] = await db.insert(notifications).values(notification).returning();
    return created;
  }

  async getUserNotifications(userId: number): Promise<Notification[]> {
    return await db.select().from(notifications)
      .where(eq(notifications.userId, userId))
      .orderBy(desc(notifications.createdAt));
  }

  async markNotificationAsRead(id: number): Promise<void> {
    await db.update(notifications).set({ isRead: true }).where(eq(notifications.id, id));
  }

  async createTemplate(template: InsertTemplate): Promise<Template> {
    const [created] = await db.insert(templates).values(template).returning();
    return created;
  }

  async getTemplatesByType(type: string): Promise<Template[]> {
    return await db.select().from(templates)
      .where(and(eq(templates.type, type), eq(templates.isActive, true)))
      .orderBy(desc(templates.createdAt));
  }

  async getTemplate(id: number): Promise<Template | undefined> {
    const [template] = await db.select().from(templates).where(eq(templates.id, id));
    return template || undefined;
  }

  async getDashboardStats(userId: number): Promise<{
    pendingApprovals: number;
    activeInvestments: number;
    cashRequests: number;
    slaBreaches: number;
  }> {
    const [pendingApprovals] = await db.select({ count: sql<number>`count(*)` })
      .from(tasks)
      .where(and(eq(tasks.assigneeId, userId), eq(tasks.status, 'pending')));

    const [activeInvestments] = await db.select({ count: sql<number>`count(*)` })
      .from(investmentRequests)
      .where(eq(investmentRequests.status, 'approved'));

    const [cashRequestsCount] = await db.select({ count: sql<number>`count(*)` })
      .from(cashRequests)
      .where(eq(cashRequests.status, 'pending'));

    const [slaBreaches] = await db.select({ count: sql<number>`count(*)` })
      .from(tasks)
      .where(and(eq(tasks.status, 'overdue')));

    return {
      pendingApprovals: pendingApprovals.count,
      activeInvestments: activeInvestments.count,
      cashRequests: cashRequestsCount.count,
      slaBreaches: slaBreaches.count,
    };
  }

  async getRecentRequests(limit = 10, userId?: number): Promise<Array<{
    id: number;
    requestId: string;
    type: 'investment' | 'cash_request';
    amount: string;
    status: string;
    createdAt: Date;
    requester: { firstName: string; lastName: string };
    investmentType?: string;
    targetCompany?: string;
    expectedReturn?: string;
    riskLevel?: string;
    description?: string;
  }>> {
    try {
      // Get investment requests first
      const investmentRequestsQuery = userId 
        ? db.select().from(investmentRequests).where(eq(investmentRequests.requesterId, userId)).orderBy(desc(investmentRequests.createdAt)).limit(limit)
        : db.select().from(investmentRequests).orderBy(desc(investmentRequests.createdAt)).limit(limit);

      const investmentResults = await investmentRequestsQuery;

      // Get user information for each request
      const resultsWithUsers = await Promise.all(
        investmentResults.map(async (request) => {
          const [user] = await db.select().from(users).where(eq(users.id, request.requesterId));
          return {
            id: request.id,
            requestId: request.requestId,
            type: 'investment' as const,
            amount: request.amount,
            status: request.status,
            createdAt: request.createdAt || new Date(),
            requester: {
              firstName: user.firstName,
              lastName: user.lastName,
            },
            investmentType: request.investmentType,
            targetCompany: request.targetCompany,
            expectedReturn: request.expectedReturn,
            riskLevel: request.riskLevel,
            description: request.investmentRationale,
          };
        })
      );

      return resultsWithUsers;
    } catch (error) {
      console.error('Error in getRecentRequests:', error);
      return [];
    }
  }

  // Background job operations
  async createBackgroundJob(job: InsertBackgroundJob): Promise<BackgroundJob> {
    const [created] = await db.insert(backgroundJobs).values(job).returning();
    return created;
  }

  async getBackgroundJobsByDocument(documentId: number): Promise<BackgroundJob[]> {
    return await db
      .select()
      .from(backgroundJobs)
      .where(eq(backgroundJobs.documentId, documentId))
      .orderBy(desc(backgroundJobs.createdAt));
  }

  async getBackgroundJob(id: number): Promise<BackgroundJob | undefined> {
    const [job] = await db
      .select()
      .from(backgroundJobs)
      .where(eq(backgroundJobs.id, id));
    return job || undefined;
  }

  async updateBackgroundJob(id: number, job: Partial<InsertBackgroundJob>): Promise<BackgroundJob> {
    const [updated] = await db
      .update(backgroundJobs)
      .set(job)
      .where(eq(backgroundJobs.id, id))
      .returning();
    return updated;
  }
}

export const storage = new DatabaseStorage();
