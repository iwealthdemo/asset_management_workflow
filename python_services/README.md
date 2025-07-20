# OpenAI Vector Store Service

A reusable Python Flask API service for handling OpenAI file uploads and vector store operations with rich metadata support.

## Features

- **File Upload to OpenAI**: Upload files to OpenAI Files API
- **Vector Store Integration**: Attach files to vector stores with custom attributes
- **Automatic Metadata Extraction**: Company, document type, year detection from filenames
- **Custom Attributes**: Add your own metadata to files
- **Cross-Origin Support**: CORS enabled for web applications
- **Production Ready**: Comprehensive error handling and logging

## Quick Start

### 1. Install Dependencies
```bash
pip install -r requirements.txt
```

### 2. Set Environment Variables
```bash
export OPENAI_API_KEY="your-openai-api-key"
export DEFAULT_VECTOR_STORE_ID="your-vector-store-id"  # Optional
export PYTHON_API_PORT=5001  # Optional, defaults to 5001
```

### 3. Start the Service
```bash
python vector_store_service.py
```

The service will be available at `http://localhost:5001`

## API Endpoints

### Health Check
```bash
GET /health
```

### Service Information  
```bash
GET /info
```

### Upload File to OpenAI
```bash
POST /upload_file_to_openai
Content-Type: application/json

{
  "file_path": "/path/to/your/file.pdf"
}
```

### Attach File to Vector Store
```bash
POST /attach_file_to_vector_store
Content-Type: application/json

{
  "file_id": "file-abc123",
  "filename": "document.pdf", 
  "vector_store_id": "vs_abc123",  # Optional, uses default if not provided
  "attributes": {
    "custom_field": "custom_value"
  }
}
```

### Combined Upload and Attach
```bash
POST /upload_and_attach
Content-Type: application/json

{
  "file_path": "/path/to/your/file.pdf",
  "vector_store_id": "vs_abc123",  # Optional
  "attributes": {
    "source": "my_application",
    "category": "financial_report"
  }
}
```

## Integration Examples

### JavaScript/Node.js
```javascript
const response = await fetch('http://localhost:5001/upload_and_attach', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    file_path: '/path/to/document.pdf',
    attributes: {
      app_name: 'my_app',
      user_id: 'user123',
      category: 'investment_report'
    }
  })
});

const result = await response.json();
if (result.success) {
  console.log('File uploaded with ID:', result.file.id);
  console.log('Applied attributes:', result.applied_attributes);
}
```

### Python
```python
import requests

response = requests.post('http://localhost:5001/upload_and_attach', json={
    'file_path': '/path/to/document.pdf',
    'attributes': {
        'app_name': 'my_python_app',
        'category': 'research_paper'
    }
})

result = response.json()
if result['success']:
    print(f"File uploaded: {result['file']['id']}")
```

### cURL
```bash
curl -X POST http://localhost:5001/upload_and_attach \
  -H "Content-Type: application/json" \
  -d '{
    "file_path": "/path/to/document.pdf",
    "attributes": {
      "source": "curl_test",
      "timestamp": "2025-07-20T13:00:00Z"
    }
  }'
```

## Automatic Metadata Extraction

The service automatically extracts metadata from filenames:

- **Company**: Detects HDFC, Reliance, HSBC, SBI, etc.
- **Document Type**: annual_report, quarterly_report, process_guide, etc.
- **Year**: Extracts year patterns like "2020-21", "2024", etc.
- **Category**: Classifies as FinancialReport, ProcessGuide, etc.

## Custom Attributes

You can add any custom attributes that will be merged with auto-extracted metadata:

```json
{
  "file_path": "/path/to/Reliance_Annual-Report_2020-21.pdf",
  "attributes": {
    "application": "investment_tracker",
    "user_id": "analyst_001", 
    "priority": "high",
    "department": "research"
  }
}
```

Final attributes will include both auto-extracted and custom fields:
```json
{
  "company": "Reliance",
  "document_type": "annual_report", 
  "year": "2020-21",
  "category": "FinancialReport",
  "application": "investment_tracker",
  "user_id": "analyst_001",
  "priority": "high",
  "department": "research"
}
```

## Error Handling

All endpoints return consistent error responses:

```json
{
  "success": false,
  "error": "Detailed error message"
}
```

## Production Deployment

For production use:

1. Use a proper WSGI server like Gunicorn:
```bash
pip install gunicorn
gunicorn -w 4 -b 0.0.0.0:5001 vector_store_service:app
```

2. Set up environment variables securely
3. Configure logging and monitoring
4. Use HTTPS in production
5. Consider rate limiting and authentication for public APIs

## License

This service can be used in any application that needs OpenAI vector store integration.