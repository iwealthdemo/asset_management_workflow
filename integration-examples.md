# LLM API Service Integration Examples

## 🔌 **Basic Integration Setup**

### **1. Environment Configuration**

Add these to your Investment Portal `.env` or Replit Secrets:

```bash
# LLM Service Configuration
LLM_SERVICE_URL=https://your-llm-service-name.replit.app
LLM_SERVICE_API_KEY=your-secure-api-key-here

# Optional: Timeout and retry settings
LLM_SERVICE_TIMEOUT=300000
LLM_SERVICE_RETRIES=3
```

### **2. Import and Initialize**

```typescript
import { llmApiService, processDocumentViaAPI } from '@/services/llmApiService';

// Check service health
const health = await llmApiService.healthCheck();
if (health.status !== 'healthy') {
  console.error('LLM service unavailable');
}
```

## 📄 **Document Processing Examples**

### **Example 1: Upload and Analyze Investment Document**

```typescript
async function processInvestmentDocument(filePath: string, filename: string, requestId: string) {
  try {
    // Upload and get immediate analysis
    const result = await processDocumentViaAPI(
      filePath,
      filename,
      'investment', // Analysis type
      {
        request_id: requestId,
        document_type: 'investment_proposal',
        company: 'TechCorp Inc',
        year: '2024'
      }
    );

    if (result.uploadResult.success) {
      console.log('Document uploaded:', result.uploadResult.file?.id);
      console.log('Vector store status:', result.uploadResult.vector_store_file?.status);
      
      if (result.analysisResult?.success) {
        console.log('Analysis completed:', result.analysisResult.analysis);
      }
    }

    return result;
  } catch (error) {
    console.error('Document processing failed:', error);
    throw error;
  }
}
```

### **Example 2: Replace Background Job Service**

**Old Python-based background job:**
```typescript
// OLD: Python service call
await backgroundJobService.processDocument(documentId, requestId);
```

**New LLM API service call:**
```typescript
// NEW: LLM API service call
const result = await llmApiService.uploadAndVectorize(
  filePath,
  filename,
  {
    request_id: requestId,
    user_id: userId,
    document_type: 'investment_proposal'
  }
);

if (result.success && result.file?.id) {
  // Follow up with analysis
  const analysis = await llmApiService.analyzeDocument(
    result.file.id,
    'investment',
    { request_id: requestId }
  );
}
```

## 🔍 **Search and Q&A Examples**

### **Example 3: Cross-Document Search**

```typescript
async function searchAcrossDocuments(query: string, documentIds: string[]) {
  const result = await llmApiService.searchDocuments(
    query,
    documentIds,
    {
      user_id: 'user123',
      search_type: 'cross_document',
      context: 'investment_analysis'
    }
  );

  if (result.success) {
    return {
      answer: result.response,
      sources: result.search_context,
      usage: result.usage
    };
  }

  throw new Error(result.error || 'Search failed');
}

// Usage in API route
app.post('/api/cross-document-queries', async (req, res) => {
  try {
    const { query, document_ids } = req.body;
    const result = await searchAcrossDocuments(query, document_ids);
    res.json({ success: true, ...result });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});
```

### **Example 4: Document Q&A with Context**

```typescript
async function askDocumentQuestion(question: string, documentId: string, userContext: any) {
  const result = await llmApiService.documentQA(
    question,
    [documentId],
    {
      user_role: userContext.role,
      investment_id: userContext.investmentId,
      previous_questions: userContext.history || []
    }
  );

  if (result.success) {
    // Save to conversation history
    await saveConversationHistory({
      question,
      answer: result.answer,
      document_id: documentId,
      user_id: userContext.userId
    });

    return result.answer;
  }

  throw new Error(result.error || 'Q&A failed');
}
```

## 💬 **Chat and Analysis Examples**

### **Example 5: Investment Insights Generation**

```typescript
async function generateInvestmentInsights(documentIds: string[], analysisType: string = 'comprehensive') {
  const result = await llmApiService.investmentInsights(
    documentIds,
    analysisType,
    {
      output_format: 'structured',
      include_risks: true,
      include_recommendations: true
    }
  );

  if (result.success) {
    // Parse structured insights
    const insights = parseInvestmentInsights(result.insights);
    
    return {
      summary: insights.executive_summary,
      risks: insights.risk_factors,
      opportunities: insights.opportunities,
      recommendation: insights.recommendation,
      confidence: insights.confidence_score
    };
  }

  throw new Error(result.error || 'Insights generation failed');
}

function parseInvestmentInsights(rawInsights: string) {
  // Parse structured response from LLM
  // Extract sections: Executive Summary, Risk Factors, etc.
  return {
    executive_summary: extractSection(rawInsights, 'Executive Summary'),
    risk_factors: extractSection(rawInsights, 'Risk Assessment'),
    opportunities: extractSection(rawInsights, 'Market Opportunity'),
    recommendation: extractSection(rawInsights, 'Investment Recommendation'),
    confidence_score: extractConfidenceScore(rawInsights)
  };
}
```

### **Example 6: Conversational AI with Context**

```typescript
async function chatWithInvestmentContext(message: string, investmentId: string, userId: string) {
  // Get investment context
  const investment = await getInvestment(investmentId);
  const documents = await getInvestmentDocuments(investmentId);
  
  const result = await llmApiService.chatCompletion([
    {
      role: 'system',
      content: `You are an investment analyst helping with proposal ${investment.target_company}. 
                Current status: ${investment.status}. Available documents: ${documents.length}`
    },
    {
      role: 'user', 
      content: message
    }
  ], 'gpt-4o', {
    investment_context: investment,
    user_role: 'analyst',
    temperature: 0.3
  });

  if (result.success) {
    // Save conversation
    await saveChatMessage({
      user_id: userId,
      investment_id: investmentId,
      message: message,
      response: result.response,
      model: result.model
    });

    return result.response;
  }

  throw new Error(result.error || 'Chat failed');
}
```

## 🔧 **Error Handling and Retry Logic**

### **Example 7: Robust Error Handling**

```typescript
async function robustDocumentProcessing(filePath: string, maxRetries: number = 3) {
  let lastError;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      // Check service health first
      const health = await llmApiService.healthCheck();
      if (health.status !== 'healthy') {
        throw new Error(`LLM service unhealthy: ${health.error}`);
      }

      // Attempt processing
      const result = await processDocumentViaAPI(filePath, path.basename(filePath));
      
      if (result.uploadResult.success) {
        return result;
      }

      throw new Error(result.uploadResult.error);

    } catch (error) {
      lastError = error;
      console.warn(`Attempt ${attempt}/${maxRetries} failed:`, error.message);

      if (attempt < maxRetries) {
        // Exponential backoff
        const delay = Math.pow(2, attempt) * 1000;
        await sleep(delay);
      }
    }
  }

  throw new Error(`Document processing failed after ${maxRetries} attempts: ${lastError.message}`);
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}
```

### **Example 8: Graceful Degradation**

```typescript
async function getDocumentAnalysisWithFallback(documentId: string) {
  try {
    // Try LLM API service first
    const result = await llmApiService.analyzeDocument(documentId, 'investment');
    
    if (result.success) {
      return {
        source: 'llm_api',
        analysis: result.analysis,
        confidence: 'high'
      };
    }

    throw new Error(result.error);

  } catch (error) {
    console.warn('LLM API failed, using fallback:', error.message);

    // Fallback to basic text analysis
    return {
      source: 'fallback',
      analysis: 'Document analysis temporarily unavailable. Please try again later.',
      confidence: 'low',
      error: error.message
    };
  }
}
```

## 📊 **Monitoring and Metrics**

### **Example 9: Service Health Monitoring**

```typescript
class LLMServiceMonitor {
  private lastHealthCheck: Date = new Date(0);
  private healthCheckInterval: number = 60000; // 1 minute
  private isHealthy: boolean = false;

  async checkServiceHealth(): Promise<boolean> {
    const now = new Date();
    
    // Only check if enough time has passed
    if (now.getTime() - this.lastHealthCheck.getTime() < this.healthCheckInterval) {
      return this.isHealthy;
    }

    try {
      const health = await llmApiService.healthCheck();
      this.isHealthy = health.status === 'healthy';
      this.lastHealthCheck = now;

      if (!this.isHealthy) {
        console.error('LLM service health check failed:', health);
        // Alert administrators
        await this.alertAdmins('LLM service health check failed', health);
      }

      return this.isHealthy;

    } catch (error) {
      this.isHealthy = false;
      this.lastHealthCheck = now;
      console.error('LLM service unreachable:', error.message);
      return false;
    }
  }

  async getServiceMetrics() {
    try {
      return await llmApiService.getMetrics();
    } catch (error) {
      return { error: error.message, timestamp: new Date().toISOString() };
    }
  }

  private async alertAdmins(message: string, details: any) {
    // Implement your alerting logic here
    console.error(`ALERT: ${message}`, details);
  }
}

export const serviceMonitor = new LLMServiceMonitor();
```

### **Example 10: Usage Analytics**

```typescript
async function trackLLMServiceUsage(operation: string, result: any, duration: number) {
  const metrics = {
    timestamp: new Date().toISOString(),
    operation: operation,
    success: result.success || false,
    error: result.error || null,
    duration_ms: duration,
    tokens_used: result.usage?.total_tokens || 0,
    model: result.model || 'unknown'
  };

  // Save to analytics database
  await saveAnalytics('llm_service_usage', metrics);

  // Log for immediate monitoring
  console.log(`LLM Service ${operation}: ${result.success ? 'SUCCESS' : 'FAILED'} (${duration}ms)`);
}

// Usage wrapper
async function trackedDocumentAnalysis(documentId: string) {
  const startTime = Date.now();
  
  try {
    const result = await llmApiService.analyzeDocument(documentId, 'investment');
    
    await trackLLMServiceUsage(
      'document_analysis', 
      result, 
      Date.now() - startTime
    );

    return result;
  } catch (error) {
    await trackLLMServiceUsage(
      'document_analysis',
      { success: false, error: error.message },
      Date.now() - startTime
    );
    throw error;
  }
}
```

## 🌐 **Multi-Application Integration**

### **Example 11: Shared Service Configuration**

```typescript
// Configuration for different applications
const APP_CONFIGS = {
  investment_portal: {
    baseUrl: process.env.LLM_SERVICE_URL,
    apiKey: process.env.LLM_SERVICE_API_KEY,
    timeout: 300000,
    defaultAnalysisType: 'investment'
  },
  
  crm_system: {
    baseUrl: process.env.LLM_SERVICE_URL, 
    apiKey: process.env.CRM_API_KEY, // Different API key for rate limiting
    timeout: 120000,
    defaultAnalysisType: 'general'
  },
  
  research_notebook: {
    baseUrl: process.env.LLM_SERVICE_URL,
    apiKey: process.env.RESEARCH_API_KEY,
    timeout: 600000, // Longer timeout for research
    defaultAnalysisType: 'research'
  }
};

// Create service instances for different apps
export const investmentLLMService = new LLMApiService(APP_CONFIGS.investment_portal);
export const crmLLMService = new LLMApiService(APP_CONFIGS.crm_system);
export const researchLLMService = new LLMApiService(APP_CONFIGS.research_notebook);
```

---

## 🎯 **Quick Migration Pattern**

For each existing AI operation in your Investment Portal:

1. **Identify the operation** (document upload, analysis, search, etc.)
2. **Find the equivalent LLM API method** (uploadAndVectorize, analyzeDocument, etc.)
3. **Update the parameters** to match the new API format
4. **Add error handling** for external service calls
5. **Test the functionality** to ensure identical behavior

**Example migration:**
```typescript
// BEFORE: Direct Python/OpenAI call
const result = await pythonVectorStoreService.uploadDocument(filePath, metadata);

// AFTER: LLM API service call  
const result = await llmApiService.uploadAndVectorize(filePath, filename, metadata);
```

This pattern ensures a smooth transition while maintaining all existing functionality!