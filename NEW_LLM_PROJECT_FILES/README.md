# LLM API Service

A dedicated microservice for AI/LLM operations including document processing, chat, and analysis. This service provides a unified API for multiple AI providers and can be used across different applications.

## Features

- **Multi-provider AI support** (OpenAI, Anthropic)
- **Document upload and vectorization** with rich metadata
- **Advanced document analysis** and classification
- **Conversational AI** with context management
- **Investment-specific insights** and analysis
- **Cross-document search** capabilities
- **CORS enabled** for web applications
- **API key authentication** for security
- **Comprehensive error handling** and logging

## Quick Start

### 1. Environment Setup

```bash
# Copy environment template
cp .env.example .env

# Edit .env with your API keys
OPENAI_API_KEY=sk-your-openai-key-here
ANTHROPIC_API_KEY=sk-ant-your-anthropic-key-here  # Optional
SERVICE_API_KEY=your-secure-api-key-here
DEFAULT_VECTOR_STORE_ID=vs_your_vector_store_id_here
```

### 2. Install Dependencies

```bash
pip install -r requirements.txt
```

### 3. Run the Service

```bash
python main.py
```

The service will be available at `http://localhost:5000`

## API Endpoints

### Health & Info
- `GET /health` - Service health check
- `GET /info` - Service capabilities and documentation

### Document Operations
- `POST /documents/upload-and-vectorize` - Upload file to vector store
- `POST /documents/analyze` - Analyze document content
- `POST /documents/search` - Search across documents

### Chat & Conversation
- `POST /chat/completion` - Generate chat completions
- `POST /chat/document-qa` - Question answering on documents

### Analysis & Insights
- `POST /analysis/summarize` - Text/document summarization
- `POST /analysis/investment-insights` - Investment-specific analysis

## Usage Examples

### Upload and Vectorize Document

```python
import requests

response = requests.post('http://localhost:5000/documents/upload-and-vectorize', 
    headers={'X-API-Key': 'your-api-key'},
    json={
        'file_path': '/path/to/document.pdf',
        'attributes': {
            'source': 'investment_portal',
            'user_id': '123',
            'category': 'financial_report'
        }
    }
)
```

### Search Documents

```python
response = requests.post('http://localhost:5000/documents/search',
    headers={'X-API-Key': 'your-api-key'},
    json={
        'query': 'What are the key financial metrics?',
        'document_ids': ['file-abc123']
    }
)
```

### Investment Analysis

```python
response = requests.post('http://localhost:5000/analysis/investment-insights',
    headers={'X-API-Key': 'your-api-key'},
    json={
        'document_ids': ['file-abc123', 'file-def456'],
        'analysis_focus': 'due_diligence'
    }
)
```

## Authentication

The service supports multiple authentication methods:

1. **Authorization header**: `Authorization: Bearer <api_key>`
2. **X-API-Key header**: `X-API-Key: <api_key>`
3. **Query parameter**: `?api_key=<api_key>`

## Configuration

### Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `OPENAI_API_KEY` | OpenAI API key | Yes |
| `ANTHROPIC_API_KEY` | Anthropic API key | No |
| `SERVICE_API_KEY` | API key for this service | Yes |
| `DEFAULT_VECTOR_STORE_ID` | Default vector store ID | Yes |
| `PORT` | Server port (default: 5000) | No |
| `FLASK_ENV` | Flask environment | No |

### Supported Models

**OpenAI Models:**
- `gpt-4o` (default)
- `gpt-4`
- `gpt-3.5-turbo`

**Anthropic Models:**
- `claude-3-sonnet`
- `claude-3-haiku`

## Deployment

### Local Development
```bash
python main.py
```

### Docker
```bash
docker build -t llm-api-service .
docker run -p 5000:5000 --env-file .env llm-api-service
```

### Replit Deployment
1. Create new Replit project
2. Copy all files to the project
3. Add environment variables in Secrets
4. Click Deploy

## Integration

### From Investment Portal (Node.js)

```javascript
const llmApiClient = {
    baseUrl: 'https://your-llm-service.replit.app',
    apiKey: process.env.LLM_SERVICE_API_KEY,
    
    async analyzeDocument(documentId, analysisType) {
        const response = await fetch(`${this.baseUrl}/documents/analyze`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-API-Key': this.apiKey
            },
            body: JSON.stringify({
                document_id: documentId,
                analysis_type: analysisType
            })
        });
        return response.json();
    }
};
```

### From Google Colab

```python
import requests

api_url = "https://your-llm-service.replit.app"
api_key = "your-api-key"

response = requests.post(f"{api_url}/documents/upload-and-vectorize",
    headers={"X-API-Key": api_key},
    json={
        "file_path": "/content/research-paper.pdf",
        "attributes": {"source": "google_colab"}
    }
)
```

## Error Handling

All endpoints return consistent error responses:

```json
{
    "success": false,
    "error": "error_type",
    "message": "Human readable error message"
}
```

## Logging

The service logs all requests, responses, and errors. Configure log level with `LOG_LEVEL` environment variable.

## Contributing

1. Add new features in appropriate service modules
2. Update API documentation in this README
3. Add comprehensive error handling
4. Include usage examples

## Support

For issues or questions about this microservice, check the logs and ensure all environment variables are properly configured.