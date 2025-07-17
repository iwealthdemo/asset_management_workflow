import { pgTable, text, serial, integer, boolean, timestamp, decimal, json, uuid, varchar } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Users table
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  email: text("email").notNull().unique(),
  password: text("password").notNull(),
  firstName: text("first_name").notNull(),
  lastName: text("last_name").notNull(),
  role: text("role").notNull().default("analyst"), // analyst, manager, committee_member, finance, admin
  department: text("department"),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Investment requests table
export const investmentRequests = pgTable("investment_requests", {
  id: serial("id").primaryKey(),
  requestId: text("request_id").notNull().unique(), // INV-2024-001
  requesterId: integer("requester_id").references(() => users.id),
  targetCompany: text("target_company").notNull(),
  investmentType: text("investment_type").notNull(), // equity, debt, real_estate, alternative
  amount: decimal("amount", { precision: 15, scale: 2 }).notNull(),
  expectedReturn: decimal("expected_return", { precision: 5, scale: 2 }),
  description: text("description"),
  riskLevel: text("risk_level").notNull(), // low, medium, high
  status: text("status").notNull().default("draft"), // draft, pending, approved, rejected
  currentApprovalStage: integer("current_approval_stage").default(0),
  slaDeadline: timestamp("sla_deadline"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Cash requests table
export const cashRequests = pgTable("cash_requests", {
  id: serial("id").primaryKey(),
  requestId: text("request_id").notNull().unique(), // CASH-2024-001
  requesterId: integer("requester_id").references(() => users.id),
  investmentId: integer("investment_id").references(() => investmentRequests.id),
  amount: decimal("amount", { precision: 15, scale: 2 }).notNull(),
  purpose: text("purpose").notNull(),
  paymentTimeline: text("payment_timeline").notNull(), // immediate, week, month, scheduled
  status: text("status").notNull().default("draft"), // draft, pending, approved, rejected, processed
  slaDeadline: timestamp("sla_deadline"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Approval workflow definitions
export const approvalWorkflows = pgTable("approval_workflows", {
  id: serial("id").primaryKey(),
  workflowType: text("workflow_type").notNull(), // investment, cash_request
  stage: integer("stage").notNull(),
  approverRole: text("approver_role").notNull(),
  slaHours: integer("sla_hours").notNull(),
  isActive: boolean("is_active").default(true),
});

// Individual approval records
export const approvals = pgTable("approvals", {
  id: serial("id").primaryKey(),
  requestType: text("request_type").notNull(), // investment, cash_request
  requestId: integer("request_id").notNull(),
  stage: integer("stage").notNull(),
  approverId: integer("approver_id").references(() => users.id),
  status: text("status").notNull(), // pending, approved, rejected, changes_requested
  comments: text("comments"),
  approvedAt: timestamp("approved_at"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Tasks table
export const tasks = pgTable("tasks", {
  id: serial("id").primaryKey(),
  assigneeId: integer("assignee_id").references(() => users.id),
  requestType: text("request_type").notNull(), // investment, cash_request
  requestId: integer("request_id").notNull(),
  taskType: text("task_type").notNull(), // approval, review, changes_requested
  title: text("title").notNull(),
  description: text("description"),
  status: text("status").notNull().default("pending"), // pending, completed, overdue
  priority: text("priority").default("medium"), // low, medium, high
  dueDate: timestamp("due_date"),
  completedAt: timestamp("completed_at"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Documents table
export const documents = pgTable("documents", {
  id: serial("id").primaryKey(),
  fileName: text("file_name").notNull(),
  originalName: text("original_name").notNull(),
  fileSize: integer("file_size").notNull(),
  mimeType: text("mime_type").notNull(),
  fileUrl: text("file_url").notNull(),
  uploaderId: integer("uploader_id").references(() => users.id),
  requestType: text("request_type").notNull(), // investment, cash_request
  requestId: integer("request_id").notNull(),
  // Document analysis fields
  analysisStatus: text("analysis_status").default("pending"), // pending, processing, completed, failed
  analysisResult: text("analysis_result"), // JSON string with analysis results
  classification: text("classification"), // document type classification
  extractedText: text("extracted_text"), // extracted text content
  keyInformation: text("key_information"), // JSON string with key extracted info
  riskLevel: text("risk_level"), // low, medium, high
  confidence: decimal("confidence", { precision: 5, scale: 2 }), // analysis confidence score
  createdAt: timestamp("created_at").defaultNow(),
  analyzedAt: timestamp("analyzed_at"),
});

// Notifications table
export const notifications = pgTable("notifications", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id),
  title: text("title").notNull(),
  message: text("message").notNull(),
  type: text("type").notNull(), // task_assigned, approval_needed, sla_warning, status_update
  isRead: boolean("is_read").default(false),
  relatedType: text("related_type"), // investment, cash_request, task
  relatedId: integer("related_id"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Audit logs
export const auditLogs = pgTable("audit_logs", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id),
  action: text("action").notNull(),
  resourceType: text("resource_type").notNull(),
  resourceId: integer("resource_id").notNull(),
  details: json("details"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Templates table
export const templates = pgTable("templates", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  type: text("type").notNull(), // investment, cash_request
  templateData: json("template_data").notNull(),
  createdBy: integer("created_by").references(() => users.id),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
});

// Background jobs table
export const backgroundJobs = pgTable("background_jobs", {
  id: serial("id").primaryKey(),
  jobType: varchar("job_type", { length: 50 }).notNull(),
  status: varchar("status", { length: 20 }).notNull().default("pending"), // pending, processing, completed, failed
  currentStep: varchar("current_step", { length: 50 }).default("queued"), // queued, preparing, uploading, analyzing, generating_summary, generating_insights, completed
  stepProgress: integer("step_progress").default(0), // 0-100 percentage for current step
  totalSteps: integer("total_steps").default(4), // Total number of steps in the process
  currentStepNumber: integer("current_step_number").default(0), // Current step number (0-based)
  documentId: integer("document_id").references(() => documents.id),
  requestType: varchar("request_type", { length: 50 }),
  requestId: integer("request_id"),
  priority: varchar("priority", { length: 10 }).notNull().default("normal"), // low, normal, high
  attempts: integer("attempts").notNull().default(0),
  maxAttempts: integer("max_attempts").notNull().default(3),
  errorMessage: text("error_message"),
  result: text("result"),
  createdAt: timestamp("created_at").defaultNow(),
  startedAt: timestamp("started_at"),
  completedAt: timestamp("completed_at"),
});

// Document queries table - stores custom queries and their responses
export const documentQueries = pgTable("document_queries", {
  id: serial("id").primaryKey(),
  documentId: integer("document_id").references(() => documents.id).notNull(),
  userId: integer("user_id").references(() => users.id).notNull(),
  query: text("query").notNull(),
  response: text("response").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

// Relations
export const usersRelations = relations(users, ({ many }) => ({
  investmentRequests: many(investmentRequests),
  cashRequests: many(cashRequests),
  approvals: many(approvals),
  tasks: many(tasks),
  documents: many(documents),
  notifications: many(notifications),
  auditLogs: many(auditLogs),
  templates: many(templates),
  documentQueries: many(documentQueries),
}));

export const investmentRequestsRelations = relations(investmentRequests, ({ one, many }) => ({
  requester: one(users, { fields: [investmentRequests.requesterId], references: [users.id] }),
  cashRequests: many(cashRequests),
  approvals: many(approvals),
  tasks: many(tasks),
  documents: many(documents),
}));

export const cashRequestsRelations = relations(cashRequests, ({ one, many }) => ({
  requester: one(users, { fields: [cashRequests.requesterId], references: [users.id] }),
  investment: one(investmentRequests, { fields: [cashRequests.investmentId], references: [investmentRequests.id] }),
  approvals: many(approvals),
  tasks: many(tasks),
  documents: many(documents),
}));

export const approvalsRelations = relations(approvals, ({ one }) => ({
  approver: one(users, { fields: [approvals.approverId], references: [users.id] }),
}));

export const tasksRelations = relations(tasks, ({ one }) => ({
  assignee: one(users, { fields: [tasks.assigneeId], references: [users.id] }),
}));

export const documentsRelations = relations(documents, ({ one, many }) => ({
  uploader: one(users, { fields: [documents.uploaderId], references: [users.id] }),
  queries: many(documentQueries),
}));

export const notificationsRelations = relations(notifications, ({ one }) => ({
  user: one(users, { fields: [notifications.userId], references: [users.id] }),
}));

export const auditLogsRelations = relations(auditLogs, ({ one }) => ({
  user: one(users, { fields: [auditLogs.userId], references: [users.id] }),
}));

export const templatesRelations = relations(templates, ({ one }) => ({
  creator: one(users, { fields: [templates.createdBy], references: [users.id] }),
}));

export const backgroundJobsRelations = relations(backgroundJobs, ({ one }) => ({
  document: one(documents, { fields: [backgroundJobs.documentId], references: [documents.id] }),
}));

export const documentQueriesRelations = relations(documentQueries, ({ one }) => ({
  document: one(documents, { fields: [documentQueries.documentId], references: [documents.id] }),
  user: one(users, { fields: [documentQueries.userId], references: [users.id] }),
}));

// Zod schemas
export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertInvestmentRequestSchema = createInsertSchema(investmentRequests).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertCashRequestSchema = createInsertSchema(cashRequests).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertApprovalSchema = createInsertSchema(approvals).omit({
  id: true,
  createdAt: true,
  approvedAt: true,
});

export const insertTaskSchema = createInsertSchema(tasks).omit({
  id: true,
  createdAt: true,
  completedAt: true,
});

export const insertDocumentSchema = createInsertSchema(documents).omit({
  id: true,
  createdAt: true,
});

export const insertNotificationSchema = createInsertSchema(notifications).omit({
  id: true,
  createdAt: true,
});

export const insertTemplateSchema = createInsertSchema(templates).omit({
  id: true,
  createdAt: true,
});

export const insertBackgroundJobSchema = createInsertSchema(backgroundJobs).omit({
  id: true,
  createdAt: true,
  startedAt: true,
  completedAt: true,
});

export const insertDocumentQuerySchema = createInsertSchema(documentQueries).omit({
  id: true,
  createdAt: true,
});

// Types
export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;
export type InvestmentRequest = typeof investmentRequests.$inferSelect;
export type InsertInvestmentRequest = z.infer<typeof insertInvestmentRequestSchema>;
export type CashRequest = typeof cashRequests.$inferSelect;
export type InsertCashRequest = z.infer<typeof insertCashRequestSchema>;
export type Approval = typeof approvals.$inferSelect;
export type InsertApproval = z.infer<typeof insertApprovalSchema>;
export type Task = typeof tasks.$inferSelect;
export type InsertTask = z.infer<typeof insertTaskSchema>;
export type Document = typeof documents.$inferSelect;
export type InsertDocument = z.infer<typeof insertDocumentSchema>;
export type Notification = typeof notifications.$inferSelect;
export type InsertNotification = z.infer<typeof insertNotificationSchema>;
export type Template = typeof templates.$inferSelect;
export type InsertTemplate = z.infer<typeof insertTemplateSchema>;
export type BackgroundJob = typeof backgroundJobs.$inferSelect;
export type InsertBackgroundJob = z.infer<typeof insertBackgroundJobSchema>;
export type DocumentQuery = typeof documentQueries.$inferSelect;
export type InsertDocumentQuery = z.infer<typeof insertDocumentQuerySchema>;
