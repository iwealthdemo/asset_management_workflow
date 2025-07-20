# LLM API Service Architecture Plan

## Service Separation Strategy

### Current Investment Portal App (Node.js)
- **Focus**: Business logic, UI, database operations, user management
- **Keeps**: Authentication, workflows, task management, reporting
- **Calls**: LLM service for AI operations

### New LLM API Service (Python/Replit)
- **Focus**: All AI/ML operations using OpenAI, Anthropic, etc.
- **Responsibilities**: Vector store, document analysis, chat, embeddings
- **Deployment**: Separate Replit deployment with its own URL

## LLM Service Endpoints Structure

### Document Operations
```
POST /documents/upload-and-vectorize
POST /documents/analyze
POST /documents/classify
POST /documents/extract-metadata
GET  /documents/search
```

### Conversation & Chat
```
POST /chat/completion
POST /chat/conversation
POST /chat/document-qa
POST /chat/multi-document-query
```

### Analysis & Insights
```
POST /analysis/summarize
POST /analysis/sentiment
POST /analysis/risk-assessment
POST /analysis/investment-insights
```

### Utility Operations
```
POST /embeddings/generate
POST /embeddings/similarity
GET  /models/available
GET  /health
GET  /info
```

## Migration Strategy

### Phase 1: Extract Current AI Features
1. Move vector store operations to LLM service
2. Move document analysis to LLM service
3. Move cross-document search to LLM service
4. Move web search integration to LLM service

### Phase 2: Enhanced LLM Service
1. Add conversation management
2. Add advanced document analysis
3. Add multi-model support (GPT, Claude, etc.)
4. Add caching and optimization

### Phase 3: Integration Updates
1. Update Investment Portal to call LLM service
2. Replace local AI operations with API calls
3. Add error handling and fallbacks
4. Performance optimization

## Benefits for Your Use Cases

### Investment Portal
- Cleaner codebase focused on business logic
- Easier to maintain and test
- Better performance separation

### Future Apps
- Ready-to-use AI backend
- Consistent API across projects
- Shared AI infrastructure

### Research/Notebooks
- Direct access to AI operations
- No business logic coupling
- Easy experimentation

## Implementation Details

### LLM Service Features
- **Multi-provider support**: OpenAI, Anthropic, others
- **Conversation history**: Persistent chat sessions
- **Document management**: Upload, analyze, search
- **Batch operations**: Process multiple files
- **Caching**: Intelligent response caching
- **Rate limiting**: Prevent API abuse
- **Authentication**: API key-based security

### Communication Pattern
```javascript
// From Investment Portal
const llmResponse = await fetch('https://your-llm-service.replit.app/documents/analyze', {
  method: 'POST',
  headers: { 
    'Authorization': 'Bearer your-api-key',
    'Content-Type': 'application/json' 
  },
  body: JSON.stringify({
    document_id: 'doc_123',
    analysis_type: 'investment_insights',
    context: { user_id: 456, request_id: 789 }
  })
});
```

## Deployment Architecture

### LLM Service (Separate Replit)
- **URL**: `https://your-llm-api.replit.app`
- **Environment**: Python with AI/ML libraries
- **Scaling**: Independent autoscaling
- **Secrets**: AI API keys (OpenAI, Anthropic)

### Investment Portal (Current Replit)
- **URL**: `https://investment-portal.replit.app`  
- **Environment**: Node.js for web application
- **Scaling**: Business logic scaling
- **Secrets**: Database, session, LLM service API key

## Security & Configuration

### API Authentication
```python
# LLM Service - API key validation
@require_api_key
def protected_endpoint():
    # AI operations
    pass
```

### Environment Variables
```bash
# LLM Service
OPENAI_API_KEY=sk-...
ANTHROPIC_API_KEY=sk-ant-...
SERVICE_API_KEY=your-service-key

# Investment Portal  
LLM_SERVICE_URL=https://your-llm-api.replit.app
LLM_SERVICE_API_KEY=your-service-key
```

## Cost & Performance Benefits

### Cost Optimization
- **Shared AI infrastructure** across projects
- **Efficient resource usage** for AI operations
- **Cached responses** reduce API costs
- **Batch processing** for bulk operations

### Performance Benefits
- **Specialized optimization** for AI workloads
- **Independent scaling** of AI vs business logic
- **Reduced main app complexity** and load
- **Faster development** with dedicated AI service

## Next Steps

1. **Create new Replit project** for LLM API service
2. **Migrate existing AI functionality** to new service
3. **Update Investment Portal** to use LLM service APIs
4. **Test end-to-end integration**
5. **Deploy both services** independently
6. **Document APIs** for future use

This architecture provides maximum flexibility, reusability, and maintainability for your AI-powered applications.