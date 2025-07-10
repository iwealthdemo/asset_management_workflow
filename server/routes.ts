import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { authMiddleware } from "./middleware/auth";
import { investmentService } from "./services/investmentService";
import { workflowService } from "./services/workflowService";
import { notificationService } from "./services/notificationService";
import { authService } from "./services/authService";
import { fileUpload } from "./utils/fileUpload";
import { insertInvestmentRequestSchema, insertCashRequestSchema, insertUserSchema } from "@shared/schema";
import { z } from "zod";

export async function registerRoutes(app: Express): Promise<Server> {
  // Auth routes
  app.post('/api/auth/login', async (req, res) => {
    try {
      const { username, password } = req.body;
      const result = await authService.login(username, password);
      
      if (!result.success) {
        return res.status(401).json({ message: result.message });
      }
      
      // Set session
      req.session.userId = result.user!.id;
      req.session.userRole = result.user!.role;
      
      res.json({ user: result.user, message: 'Login successful' });
    } catch (error) {
      res.status(500).json({ message: 'Internal server error' });
    }
  });

  app.post('/api/auth/register', async (req, res) => {
    try {
      const userData = insertUserSchema.parse(req.body);
      const result = await authService.register(userData);
      
      if (!result.success) {
        return res.status(400).json({ message: result.message });
      }
      
      res.json({ user: result.user, message: 'Registration successful' });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: 'Validation error', errors: error.errors });
      }
      res.status(500).json({ message: 'Internal server error' });
    }
  });

  app.post('/api/auth/logout', authMiddleware, async (req, res) => {
    req.session.destroy((err: any) => {
      if (err) {
        return res.status(500).json({ message: 'Could not log out' });
      }
      res.json({ message: 'Logged out successfully' });
    });
  });

  app.get('/api/auth/me', authMiddleware, async (req, res) => {
    try {
      const user = await storage.getUser(req.userId!);
      if (!user) {
        return res.status(404).json({ message: 'User not found' });
      }
      res.json({ user });
    } catch (error) {
      res.status(500).json({ message: 'Internal server error' });
    }
  });

  // Dashboard routes
  app.get('/api/dashboard/stats', authMiddleware, async (req, res) => {
    try {
      const stats = await storage.getDashboardStats(req.userId!);
      res.json(stats);
    } catch (error) {
      res.status(500).json({ message: 'Internal server error' });
    }
  });

  app.get('/api/dashboard/recent-requests', authMiddleware, async (req, res) => {
    try {
      const requests = await storage.getRecentRequests(10);
      res.json(requests);
    } catch (error) {
      res.status(500).json({ message: 'Internal server error' });
    }
  });

  // Investment request routes
  app.post('/api/investments', authMiddleware, async (req, res) => {
    try {
      console.log('Request body:', req.body);
      console.log('User ID:', req.userId);
      
      const requestData = {
        ...req.body,
        requesterId: req.userId,
      };
      
      console.log('Request data before validation:', requestData);
      
      // Validate only the necessary fields (requestId will be generated in service)
      const validationSchema = insertInvestmentRequestSchema.omit({
        requestId: true,
        currentApprovalStage: true,
        slaDeadline: true,
        status: true,
      });
      
      const validatedData = validationSchema.parse(requestData);
      console.log('Validated data:', validatedData);
      
      const request = await investmentService.createInvestmentRequest(validatedData);
      res.json(request);
    } catch (error) {
      console.error('Investment creation error:', error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: 'Validation error', errors: error.errors });
      }
      res.status(500).json({ message: 'Internal server error' });
    }
  });

  app.get('/api/investments', authMiddleware, async (req, res) => {
    try {
      const { status, my } = req.query;
      const filters: any = {};
      
      if (status) filters.status = status as string;
      if (my === 'true') filters.userId = req.userId;
      
      const requests = await storage.getInvestmentRequests(filters);
      res.json(requests);
    } catch (error) {
      res.status(500).json({ message: 'Internal server error' });
    }
  });

  app.get('/api/investments/:id', authMiddleware, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const request = await storage.getInvestmentRequest(id);
      
      if (!request) {
        return res.status(404).json({ message: 'Investment request not found' });
      }
      
      res.json(request);
    } catch (error) {
      res.status(500).json({ message: 'Internal server error' });
    }
  });

  app.put('/api/investments/:id', authMiddleware, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const updateData = req.body;
      
      const request = await storage.updateInvestmentRequest(id, updateData);
      res.json(request);
    } catch (error) {
      res.status(500).json({ message: 'Internal server error' });
    }
  });

  // Cash request routes
  app.post('/api/cash-requests', authMiddleware, async (req, res) => {
    try {
      const requestData = insertCashRequestSchema.parse({
        ...req.body,
        requesterId: req.userId,
      });
      
      const request = await investmentService.createCashRequest(requestData);
      res.json(request);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: 'Validation error', errors: error.errors });
      }
      res.status(500).json({ message: 'Internal server error' });
    }
  });

  app.get('/api/cash-requests', authMiddleware, async (req, res) => {
    try {
      const { status, my } = req.query;
      const filters: any = {};
      
      if (status) filters.status = status as string;
      if (my === 'true') filters.userId = req.userId;
      
      const requests = await storage.getCashRequests(filters);
      res.json(requests);
    } catch (error) {
      res.status(500).json({ message: 'Internal server error' });
    }
  });

  app.get('/api/cash-requests/:id', authMiddleware, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const request = await storage.getCashRequest(id);
      
      if (!request) {
        return res.status(404).json({ message: 'Cash request not found' });
      }
      
      res.json(request);
    } catch (error) {
      res.status(500).json({ message: 'Internal server error' });
    }
  });

  // Task routes
  app.get('/api/tasks', authMiddleware, async (req, res) => {
    try {
      const tasks = await storage.getTasksByUser(req.userId!);
      res.json(tasks);
    } catch (error) {
      res.status(500).json({ message: 'Internal server error' });
    }
  });

  app.put('/api/tasks/:id', authMiddleware, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const updateData = req.body;
      
      const task = await storage.updateTask(id, updateData);
      res.json(task);
    } catch (error) {
      res.status(500).json({ message: 'Internal server error' });
    }
  });

  // Approval routes
  app.post('/api/approvals', authMiddleware, async (req, res) => {
    try {
      const { requestType, requestId, action, comments } = req.body;
      
      const result = await workflowService.processApproval(
        requestType,
        requestId,
        req.userId!,
        action,
        comments
      );
      
      res.json(result);
    } catch (error) {
      res.status(500).json({ message: 'Internal server error' });
    }
  });

  app.get('/api/approvals/:requestType/:requestId', authMiddleware, async (req, res) => {
    try {
      const { requestType, requestId } = req.params;
      const approvals = await storage.getApprovalsByRequest(requestType, parseInt(requestId));
      res.json(approvals);
    } catch (error) {
      res.status(500).json({ message: 'Internal server error' });
    }
  });

  // Document routes
  app.post('/api/documents/upload', authMiddleware, fileUpload.array('documents'), async (req, res) => {
    try {
      const { requestType, requestId } = req.body;
      const files = req.files as Express.Multer.File[];
      
      if (!files || files.length === 0) {
        return res.status(400).json({ message: 'No files uploaded' });
      }
      
      const documents = [];
      for (const file of files) {
        const document = await storage.createDocument({
          fileName: file.filename,
          originalName: file.originalname,
          fileSize: file.size,
          mimeType: file.mimetype,
          fileUrl: file.path,
          uploaderId: req.userId!,
          requestType,
          requestId: parseInt(requestId),
        });
        documents.push(document);
      }
      
      res.json(documents);
    } catch (error) {
      res.status(500).json({ message: 'Internal server error' });
    }
  });

  app.get('/api/documents/:requestType/:requestId', authMiddleware, async (req, res) => {
    try {
      const { requestType, requestId } = req.params;
      const documents = await storage.getDocumentsByRequest(requestType, parseInt(requestId));
      res.json(documents);
    } catch (error) {
      res.status(500).json({ message: 'Internal server error' });
    }
  });

  app.get('/api/documents/download/:documentId', authMiddleware, async (req, res) => {
    try {
      const { documentId } = req.params;
      console.log('Download request for document ID:', documentId);
      
      const document = await storage.getDocument(parseInt(documentId));
      console.log('Found document:', document);
      
      if (!document) {
        console.log('Document not found in database');
        return res.status(404).json({ message: 'Document not found' });
      }
      
      const path = require('path');
      const fs = require('fs');
      const filePath = path.join(process.cwd(), document.fileUrl);
      console.log('Checking file path:', filePath);
      
      // Check if file exists
      try {
        await fs.promises.access(filePath);
      } catch (err) {
        console.log('File does not exist on disk:', filePath);
        return res.status(404).json({ message: 'File not found on server' });
      }
      
      console.log('File exists, preparing download');
      res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(document.originalName)}"`);
      res.setHeader('Content-Type', document.mimeType || 'application/octet-stream');
      
      // Get file stats for proper content length
      const stats = await fs.promises.stat(filePath);
      res.setHeader('Content-Length', stats.size.toString());
      
      const fileStream = fs.createReadStream(filePath);
      fileStream.on('error', (err) => {
        console.error('File stream error:', err);
        if (!res.headersSent) {
          res.status(500).json({ message: 'Error reading file' });
        }
      });
      
      fileStream.pipe(res);
    } catch (error) {
      console.error('Download error:', error);
      if (!res.headersSent) {
        res.status(500).json({ message: 'Internal server error' });
      }
    }
  });

  // Add preview endpoint
  app.get('/api/documents/preview/:documentId', authMiddleware, async (req, res) => {
    try {
      const { documentId } = req.params;
      console.log('Preview request for document ID:', documentId);
      
      const document = await storage.getDocument(parseInt(documentId));
      console.log('Found document:', document);
      
      if (!document) {
        console.log('Document not found in database');
        return res.status(404).json({ message: 'Document not found' });
      }
      
      const path = require('path');
      const fs = require('fs');
      const filePath = path.join(process.cwd(), document.fileUrl);
      console.log('Checking file path:', filePath);
      
      if (!fs.existsSync(filePath)) {
        console.log('File does not exist on disk:', filePath);
        return res.status(404).json({ message: 'File not found on server' });
      }
      
      console.log('File exists, preparing preview');
      res.setHeader('Content-Type', document.mimeType || 'application/octet-stream');
      res.setHeader('Content-Length', document.fileSize.toString());
      
      const fileStream = fs.createReadStream(filePath);
      fileStream.on('error', (err) => {
        console.error('File stream error:', err);
        if (!res.headersSent) {
          res.status(500).json({ message: 'Error reading file' });
        }
      });
      
      fileStream.pipe(res);
    } catch (error) {
      console.error('Preview error:', error);
      if (!res.headersSent) {
        res.status(500).json({ message: 'Internal server error' });
      }
    }
  });

  // Notification routes
  app.get('/api/notifications', authMiddleware, async (req, res) => {
    try {
      const notifications = await storage.getUserNotifications(req.userId!);
      res.json(notifications);
    } catch (error) {
      res.status(500).json({ message: 'Internal server error' });
    }
  });

  app.put('/api/notifications/:id/read', authMiddleware, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      await storage.markNotificationAsRead(id);
      res.json({ message: 'Notification marked as read' });
    } catch (error) {
      res.status(500).json({ message: 'Internal server error' });
    }
  });

  // Template routes
  app.get('/api/templates/:type', authMiddleware, async (req, res) => {
    try {
      const { type } = req.params;
      const templates = await storage.getTemplatesByType(type);
      res.json(templates);
    } catch (error) {
      res.status(500).json({ message: 'Internal server error' });
    }
  });

  app.get('/api/templates/:id', authMiddleware, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const template = await storage.getTemplate(id);
      
      if (!template) {
        return res.status(404).json({ message: 'Template not found' });
      }
      
      res.json(template);
    } catch (error) {
      res.status(500).json({ message: 'Internal server error' });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
