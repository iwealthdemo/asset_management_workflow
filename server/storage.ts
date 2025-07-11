import { 
  users, investmentRequests, cashRequests, approvals, tasks, documents, 
  notifications, templates, auditLogs, approvalWorkflows,
  type User, type InsertUser, type InvestmentRequest, type InsertInvestmentRequest,
  type CashRequest, type InsertCashRequest, type Approval, type InsertApproval,
  type Task, type InsertTask, type Document, type InsertDocument,
  type Notification, type InsertNotification, type Template, type InsertTemplate
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
  
  // Task operations
  createTask(task: InsertTask): Promise<Task>;
  updateTask(id: number, task: Partial<InsertTask>): Promise<Task>;
  getTasksByUser(userId: number): Promise<Task[]>;
  getTaskById(id: number): Promise<Task | undefined>;
  
  // Document operations
  createDocument(document: InsertDocument): Promise<Document>;
  getDocumentsByRequest(requestType: string, requestId: number): Promise<Document[]>;
  getDocument(id: number): Promise<Document | undefined>;
  
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
    const results = await db.select().from(investmentRequests).orderBy(desc(investmentRequests.createdAt));
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
    const results = await db.select().from(cashRequests).orderBy(desc(cashRequests.createdAt));
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
  }>> {
    // Get investment requests
    const investmentQuery = db.select({
      id: investmentRequests.id,
      requestId: investmentRequests.requestId,
      type: sql<'investment'>`'investment'`,
      amount: investmentRequests.amount,
      status: investmentRequests.status,
      createdAt: investmentRequests.createdAt,
      requesterFirstName: users.firstName,
      requesterLastName: users.lastName,
    })
    .from(investmentRequests)
    .innerJoin(users, eq(investmentRequests.requesterId, users.id))
    .orderBy(desc(investmentRequests.createdAt))
    .limit(limit);

    // Add userId filter if provided
    const investmentResults = userId 
      ? await investmentQuery.where(eq(investmentRequests.requesterId, userId))
      : await investmentQuery;

    // Get cash requests
    const cashQuery = db.select({
      id: cashRequests.id,
      requestId: cashRequests.requestId,
      type: sql<'cash_request'>`'cash_request'`,
      amount: cashRequests.amount,
      status: cashRequests.status,
      createdAt: cashRequests.createdAt,
      requesterFirstName: users.firstName,
      requesterLastName: users.lastName,
    })
    .from(cashRequests)
    .innerJoin(users, eq(cashRequests.requesterId, users.id))
    .orderBy(desc(cashRequests.createdAt))
    .limit(limit);

    // Add userId filter if provided
    const cashResults = userId 
      ? await cashQuery.where(eq(cashRequests.requesterId, userId))
      : await cashQuery;

    // Combine and sort results
    const allResults = [...investmentResults, ...cashResults]
      .sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime())
      .slice(0, limit);

    return allResults.map(row => ({
      id: row.id,
      requestId: row.requestId,
      type: row.type,
      amount: row.amount,
      status: row.status,
      createdAt: row.createdAt || new Date(),
      requester: {
        firstName: row.requesterFirstName,
        lastName: row.requesterLastName,
      },
    }));
  }
}

export const storage = new DatabaseStorage();
