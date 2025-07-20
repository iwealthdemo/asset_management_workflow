# Migration to Separate LLM API Service - Checklist

## Pre-Migration Setup

### ✅ Tasks to Complete

- [ ] **Create new Replit project** for LLM API service
- [ ] **Set up Python environment** with AI/ML dependencies
- [ ] **Configure environment secrets** (OpenAI, Anthropic API keys)
- [ ] **Design API endpoints** structure and documentation
- [ ] **Implement authentication** system for API access

## Current Features to Migrate

### Document Processing (High Priority)
- [ ] **Vector store operations** (`pythonVectorStoreService.ts`)
- [ ] **Document analysis** (`prepareAIService.ts`) 
- [ ] **Background job processing** (document processing jobs)
- [ ] **File upload and attachment** with metadata

### Search & Query Features (High Priority)
- [ ] **Cross-document search** (`crossDocumentQueryService.ts`)
- [ ] **Web search integration** (`webSearchService.ts`)
- [ ] **Unified search interface** functionality
- [ ] **Conversation history** management

### Analysis Services (Medium Priority)
- [ ] **Document classification** and metadata extraction
- [ ] **Risk assessment** algorithms
- [ ] **Investment insights** generation
- [ ] **Summarization** services

## New LLM Service Structure

### Core Endpoints to Implement
```
/documents/
  ├── POST /upload-and-vectorize
  ├── POST /analyze  
  ├── POST /classify
  └── GET  /search

/chat/
  ├── POST /completion
  ├── POST /document-qa
  └── POST /multi-document-query

/analysis/
  ├── POST /summarize
  ├── POST /investment-insights
  └── POST /risk-assessment

/utility/
  ├── GET  /health
  ├── GET  /info
  └── POST /embeddings
```

### Implementation Files Needed
- [ ] `app.py` - Main Flask application
- [ ] `services/document_service.py` - Document operations
- [ ] `services/chat_service.py` - Chat and Q&A
- [ ] `services/analysis_service.py` - Analysis and insights
- [ ] `utils/auth.py` - API authentication
- [ ] `config.py` - Configuration management

## Investment Portal Updates

### API Integration Layer
- [ ] **Create LLM client service** (`llmApiClient.ts`)
- [ ] **Replace local AI calls** with API calls
- [ ] **Add error handling** and fallbacks
- [ ] **Update background jobs** to use LLM service

### Files to Update
- [ ] `server/services/prepareAIService.ts` → API calls
- [ ] `server/services/crossDocumentQueryService.ts` → API calls  
- [ ] `server/services/webSearchService.ts` → API calls
- [ ] `server/services/backgroundJobService.ts` → Update job processing
- [ ] Remove: `server/services/pythonVectorStoreService.ts`

### Frontend Components (Minimal Changes)
- [ ] Update error handling for API timeouts
- [ ] Add loading states for external API calls
- [ ] Test all document analysis workflows

## Configuration & Deployment

### Environment Variables
```bash
# LLM Service (.env)
OPENAI_API_KEY=sk-...
ANTHROPIC_API_KEY=sk-ant-...
SERVICE_API_KEY=your-generated-key
DEFAULT_VECTOR_STORE_ID=vs-...
PORT=5000

# Investment Portal (.env)  
LLM_SERVICE_URL=https://your-llm-api.replit.app
LLM_SERVICE_API_KEY=your-generated-key
```

### Deployment Steps
- [ ] **Deploy LLM service** to separate Replit project
- [ ] **Test all endpoints** with Postman/curl
- [ ] **Update Investment Portal** configuration
- [ ] **Deploy updated Investment Portal**
- [ ] **End-to-end testing** of full workflows

## Testing Strategy

### LLM Service Testing
- [ ] **Unit tests** for each endpoint
- [ ] **Integration tests** with OpenAI/Anthropic APIs
- [ ] **Load testing** for performance validation
- [ ] **Authentication testing** with API keys

### Investment Portal Testing  
- [ ] **Document upload workflow** end-to-end
- [ ] **Background job processing** with external API
- [ ] **Search functionality** via API calls
- [ ] **Error scenarios** (API timeout, failures)

### Cross-Service Integration
- [ ] **Network connectivity** between services
- [ ] **API key authentication** working
- [ ] **Response format compatibility**
- [ ] **Performance under load**

## Rollback Plan

### Backup Strategy
- [ ] **Tag current working version** before migration
- [ ] **Keep local AI services** as fallback initially
- [ ] **Gradual migration** endpoint by endpoint
- [ ] **Feature flags** to switch between local/remote

### Rollback Triggers
- [ ] API response time > 10 seconds
- [ ] Success rate < 95%
- [ ] Critical functionality broken
- [ ] User complaints about performance

## Success Metrics

### Performance Targets
- [ ] **API response time** < 5 seconds for document analysis
- [ ] **Search queries** < 3 seconds response time  
- [ ] **Upload processing** < 30 seconds for 50MB files
- [ ] **Service uptime** > 99.5%

### Functional Requirements
- [ ] **All existing features** work identically
- [ ] **New error handling** provides better user feedback
- [ ] **Service discovery** via `/info` endpoint
- [ ] **API documentation** complete and accurate

## Post-Migration Optimization

### Performance Improvements
- [ ] **Implement response caching** for repeated queries
- [ ] **Batch processing** for multiple documents
- [ ] **Async processing** for large operations
- [ ] **Connection pooling** for database operations

### Monitoring & Maintenance
- [ ] **API usage monitoring** and analytics
- [ ] **Error rate tracking** and alerting
- [ ] **Cost monitoring** for AI API usage
- [ ] **Regular health checks** and uptime monitoring

## Timeline Estimate

- **Week 1**: LLM service setup and core endpoints
- **Week 2**: Document processing migration
- **Week 3**: Search and analysis features migration  
- **Week 4**: Integration testing and deployment
- **Week 5**: Performance optimization and monitoring

This checklist ensures a systematic migration to the new microservices architecture while maintaining all current functionality.