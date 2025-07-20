# Complete LLM API Service - All Files

Copy each section below into the corresponding file in your new Replit project.

## main.py
```python
#!/usr/bin/env python3
"""
LLM API Service - Main Application
Dedicated microservice for all AI/LLM operations
"""

import os
import sys
from pathlib import Path
from flask import Flask, request, jsonify, g
from flask_cors import CORS
from openai import OpenAI
from anthropic import Anthropic
import json
import logging
from datetime import datetime
import traceback
from functools import wraps

# Initialize Flask app
app = Flask(__name__)
CORS(app)

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Initialize AI clients
openai_client = OpenAI(api_key=os.getenv('OPENAI_API_KEY'))
anthropic_client = Anthropic(api_key=os.getenv('ANTHROPIC_API_KEY')) if os.getenv('ANTHROPIC_API_KEY') else None

# Configuration
DEFAULT_VECTOR_STORE_ID = os.getenv('DEFAULT_VECTOR_STORE_ID', 'vs_687584b54f908191b0a21ffa42948fb5')
SERVICE_API_KEY = os.getenv('SERVICE_API_KEY', 'dev-key-change-in-production')
PORT = int(os.getenv('PORT', 5000))

# Import service modules
from services.document_service import DocumentService
from services.chat_service import ChatService
from services.analysis_service import AnalysisService
from utils.auth import require_api_key
from utils.metadata_extractor import extract_metadata_from_filename
from services.concurrency_manager import concurrency_manager

# Initialize services
document_service = DocumentService(openai_client)
chat_service = ChatService(openai_client, anthropic_client)
analysis_service = AnalysisService(openai_client, anthropic_client)

# Error handler
@app.errorhandler(Exception)
def handle_error(error):
    logger.error(f"Unhandled error: {str(error)}")
    logger.error(traceback.format_exc())
    return jsonify({
        'success': False,
        'error': 'Internal server error',
        'message': str(error) if app.debug else 'An unexpected error occurred'
    }), 500

# Request logging and rate limiting middleware
@app.before_request
def before_request():
    g.start_time = datetime.now()
    
    # Skip rate limiting for health checks
    if request.path in ['/health', '/info', '/metrics']:
        return
        
    # Extract API key for rate limiting
    api_key = (
        request.headers.get('Authorization', '').replace('Bearer ', '') or
        request.headers.get('X-API-Key') or
        request.args.get('api_key')
    )
    
    if api_key:
        allowed, wait_time = concurrency_manager.rate_limit_by_api_key(api_key)
        if not allowed:
            return jsonify({
                'success': False,
                'error': 'Rate limit exceeded',
                'retry_after': int(wait_time),
                'message': f'Rate limit: {concurrency_manager.rate_limit_per_minute} requests per minute'
            }), 429
    
    logger.info(f"Request: {request.method} {request.path} from {request.remote_addr}")

@app.after_request
def after_request(response):
    if hasattr(g, 'start_time'):
        duration = (datetime.now() - g.start_time).total_seconds()
        logger.info(f"Response: {response.status_code} in {duration:.3f}s")
    return response

# Health and info endpoints
@app.route('/health', methods=['GET'])
def health_check():
    """Service health check"""
    return jsonify({
        'status': 'healthy',
        'service': 'llm_api_service',
        'version': '1.0.0',
        'timestamp': datetime.now().isoformat(),
        'openai_configured': bool(os.getenv('OPENAI_API_KEY')),
        'anthropic_configured': bool(os.getenv('ANTHROPIC_API_KEY')),
        'default_vector_store': DEFAULT_VECTOR_STORE_ID
    })

@app.route('/info', methods=['GET'])
def service_info():
    """Service information and capabilities"""
    return jsonify({
        'service': 'LLM API Service',
        'version': '1.0.0',
        'description': 'Dedicated microservice for AI/LLM operations including document processing, chat, and analysis',
        'endpoints': {
            'GET /health': 'Service health check',
            'GET /info': 'Service information',
            'POST /documents/upload-and-vectorize': 'Upload file to vector store with metadata',
            'POST /documents/analyze': 'Analyze document content',
            'POST /documents/search': 'Search across documents',
            'POST /chat/completion': 'Chat completion with context',
            'POST /chat/document-qa': 'Question answering on documents',
            'POST /analysis/summarize': 'Text summarization',
            'POST /analysis/investment-insights': 'Investment-specific analysis'
        },
        'features': [
            'Multi-provider AI support (OpenAI, Anthropic)',
            'Document upload and vectorization',
            'Advanced document analysis',
            'Conversational AI with context',
            'Investment-specific insights',
            'Metadata extraction and classification',
            'CORS enabled for web applications',
            'API key authentication',
            'Comprehensive error handling'
        ],
        'supported_models': {
            'openai': ['gpt-4o', 'gpt-4', 'gpt-3.5-turbo'],
            'anthropic': ['claude-3-sonnet', 'claude-3-haiku'] if anthropic_client else []
        },
        'concurrency_limits': {
            'max_concurrent_requests': concurrency_manager.max_concurrent_requests,
            'rate_limit_per_minute': concurrency_manager.rate_limit_per_minute
        }
    })

# Metrics endpoint
@app.route('/metrics', methods=['GET'])
def get_metrics():
    """Get service metrics and concurrency information"""
    return jsonify({
        'concurrency_metrics': concurrency_manager.get_metrics(),
        'active_requests': concurrency_manager.get_active_requests()
    })

# Document endpoints
@app.route('/documents/upload-and-vectorize', methods=['POST'])
@require_api_key
@concurrency_manager.limit_concurrent_requests(timeout=300)
def upload_and_vectorize():
    """Upload file and add to vector store with rich metadata"""
    try:
        data = request.get_json()
        file_path = data.get('file_path')
        file_content = data.get('file_content')  # Base64 encoded file
        filename = data.get('filename')
        vector_store_id = data.get('vector_store_id', DEFAULT_VECTOR_STORE_ID)
        custom_attributes = data.get('attributes', {})
        
        if not file_path and not file_content:
            return jsonify({'success': False, 'error': 'Either file_path or file_content is required'}), 400
            
        result = document_service.upload_and_vectorize(
            file_path=file_path, 
            file_content=file_content, 
            filename=filename,
            vector_store_id=vector_store_id, 
            custom_attributes=custom_attributes
        )
        return jsonify(result)
        
    except Exception as e:
        logger.error(f"Upload and vectorize error: {str(e)}")
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/documents/analyze', methods=['POST'])
@require_api_key
@concurrency_manager.limit_concurrent_requests(timeout=180)
def analyze_document():
    """Analyze document content for insights"""
    try:
        data = request.get_json()
        document_id = data.get('document_id')
        analysis_type = data.get('analysis_type', 'general')
        context = data.get('context', {})
        
        if not document_id:
            return jsonify({'success': False, 'error': 'document_id is required'}), 400
            
        result = analysis_service.analyze_document(document_id, analysis_type, context)
        return jsonify(result)
        
    except Exception as e:
        logger.error(f"Document analysis error: {str(e)}")
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/documents/search', methods=['POST'])
@require_api_key
@concurrency_manager.limit_concurrent_requests(timeout=120)
def search_documents():
    """Search across documents using vector similarity"""
    try:
        data = request.get_json()
        query = data.get('query')
        document_ids = data.get('document_ids', [])
        vector_store_id = data.get('vector_store_id', DEFAULT_VECTOR_STORE_ID)
        context = data.get('context', {})
        
        if not query:
            return jsonify({'success': False, 'error': 'query is required'}), 400
            
        result = document_service.search_documents(
            query, document_ids, vector_store_id, context
        )
        return jsonify(result)
        
    except Exception as e:
        logger.error(f"Document search error: {str(e)}")
        return jsonify({'success': False, 'error': str(e)}), 500

# Chat endpoints
@app.route('/chat/completion', methods=['POST'])
@require_api_key
@concurrency_manager.limit_concurrent_requests(timeout=120)
def chat_completion():
    """Generate chat completion with context"""
    try:
        data = request.get_json()
        messages = data.get('messages', [])
        model = data.get('model', 'gpt-4o')
        context = data.get('context', {})
        
        if not messages:
            return jsonify({'success': False, 'error': 'messages are required'}), 400
            
        result = chat_service.completion(messages, model, context)
        return jsonify(result)
        
    except Exception as e:
        logger.error(f"Chat completion error: {str(e)}")
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/chat/document-qa', methods=['POST'])
@require_api_key
@concurrency_manager.limit_concurrent_requests(timeout=120)
def document_qa():
    """Question answering on specific documents"""
    try:
        data = request.get_json()
        question = data.get('question')
        document_ids = data.get('document_ids', [])
        vector_store_id = data.get('vector_store_id', DEFAULT_VECTOR_STORE_ID)
        context = data.get('context', {})
        
        if not question:
            return jsonify({'success': False, 'error': 'question is required'}), 400
            
        result = chat_service.document_qa(
            question, document_ids, vector_store_id, context
        )
        return jsonify(result)
        
    except Exception as e:
        logger.error(f"Document Q&A error: {str(e)}")
        return jsonify({'success': False, 'error': str(e)}), 500

# Analysis endpoints
@app.route('/analysis/summarize', methods=['POST'])
@require_api_key
@concurrency_manager.limit_concurrent_requests(timeout=180)
def summarize():
    """Summarize text or documents"""
    try:
        data = request.get_json()
        content = data.get('content')
        document_id = data.get('document_id')
        summary_type = data.get('summary_type', 'general')
        
        if not content and not document_id:
            return jsonify({'success': False, 'error': 'content or document_id is required'}), 400
            
        result = analysis_service.summarize(content, document_id, summary_type)
        return jsonify(result)
        
    except Exception as e:
        logger.error(f"Summarization error: {str(e)}")
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/analysis/investment-insights', methods=['POST'])
@require_api_key
@concurrency_manager.limit_concurrent_requests(timeout=240)
def investment_insights():
    """Generate investment-specific insights"""
    try:
        data = request.get_json()
        document_ids = data.get('document_ids', [])
        analysis_focus = data.get('analysis_focus', 'general')
        context = data.get('context', {})
        
        if not document_ids:
            return jsonify({'success': False, 'error': 'document_ids are required'}), 400
            
        result = analysis_service.investment_insights(
            document_ids, analysis_focus, context
        )
        return jsonify(result)
        
    except Exception as e:
        logger.error(f"Investment insights error: {str(e)}")
        return jsonify({'success': False, 'error': str(e)}), 500

if __name__ == '__main__':
    logger.info(f"Starting LLM API Service on port {PORT}")
    logger.info(f"OpenAI configured: {bool(os.getenv('OPENAI_API_KEY'))}")
    logger.info(f"Anthropic configured: {bool(os.getenv('ANTHROPIC_API_KEY'))}")
    logger.info(f"Max concurrent requests: {concurrency_manager.max_concurrent_requests}")
    logger.info(f"Rate limit per minute: {concurrency_manager.rate_limit_per_minute}")
    
    # Start the concurrency manager
    logger.info("Concurrency manager initialized and ready")
    
    app.run(
        host='0.0.0.0',
        port=PORT,
        debug=os.getenv('FLASK_ENV') == 'development',
        threaded=True  # Enable threading for concurrent requests
    )
```

## requirements.txt
```
openai>=1.0.0
anthropic>=0.8.0
flask>=2.3.0
flask-cors>=4.0.0
requests>=2.31.0
python-dotenv>=1.0.0
```

## services/document_service.py
```python
"""
Document Service - Handles all document-related operations
"""

import os
import logging
from datetime import datetime
from utils.metadata_extractor import extract_metadata_from_filename

logger = logging.getLogger(__name__)

class DocumentService:
    def __init__(self, openai_client):
        self.client = openai_client
        
    def upload_and_vectorize(self, file_path=None, file_content=None, filename=None, vector_store_id=None, custom_attributes=None):
        """
        Upload file to OpenAI and add to vector store with metadata
        
        Args:
            file_path (str): Path to the file to upload (if file is local)
            file_content (str): Base64 encoded file content (if file is remote)
            filename (str): Original filename (required if using file_content)
            vector_store_id (str): Vector store ID
            custom_attributes (dict): Custom metadata attributes
            
        Returns:
            dict: Result with file info and vector store details
        """
        try:
            # Handle file upload from different sources
            if file_path:
                # Option 1: Local file path
                if not os.path.exists(file_path):
                    return {'success': False, 'error': 'File not found'}
                    
                with open(file_path, 'rb') as file:
                    uploaded_file = self.client.files.create(
                        file=file,
                        purpose='assistants'
                    )
                filename = os.path.basename(file_path)
                
            elif file_content and filename:
                # Option 2: Base64 encoded content
                import base64
                import tempfile
                
                # Decode base64 content
                try:
                    file_bytes = base64.b64decode(file_content)
                except Exception as e:
                    return {'success': False, 'error': f'Invalid base64 content: {str(e)}'}
                
                # Create temporary file
                with tempfile.NamedTemporaryFile(delete=False, suffix=os.path.splitext(filename)[1]) as temp_file:
                    temp_file.write(file_bytes)
                    temp_file_path = temp_file.name
                
                try:
                    # Upload to OpenAI
                    with open(temp_file_path, 'rb') as file:
                        uploaded_file = self.client.files.create(
                            file=file,
                            purpose='assistants'
                        )
                finally:
                    # Clean up temporary file
                    os.unlink(temp_file_path)
                    
            else:
                return {'success': False, 'error': 'Either file_path or (file_content + filename) required'}
                
            # Step 2: Extract metadata
            auto_attributes = extract_metadata_from_filename(filename)
            
            # Step 3: Merge all attributes
            file_attributes = {
                'file_size_bytes': str(uploaded_file.bytes),
                'upload_timestamp': str(uploaded_file.created_at),
                'openai_filename': uploaded_file.filename
            }
            
            attributes = {**auto_attributes, **file_attributes, **(custom_attributes or {})}
            attributes['file_id'] = uploaded_file.id
            
            # Step 4: Attach to vector store with attributes
            vector_store_file = self.client.vector_stores.files.create_and_poll(
                vector_store_id=vector_store_id,
                file_id=uploaded_file.id,
                attributes=attributes
            )
            
            return {
                'success': True,
                'file': {
                    'id': uploaded_file.id,
                    'filename': uploaded_file.filename,
                    'bytes': uploaded_file.bytes,
                    'created_at': uploaded_file.created_at,
                    'status': uploaded_file.status
                },
                'vector_store_file': {
                    'id': vector_store_file.id,
                    'status': vector_store_file.status,
                    'usage_bytes': vector_store_file.usage_bytes,
                    'attributes': vector_store_file.attributes
                },
                'applied_attributes': attributes
            }
            
        except Exception as e:
            logger.error(f"Upload and vectorize error: {str(e)}")
            return {'success': False, 'error': str(e)}
            
    def search_documents(self, query, document_ids, vector_store_id, context=None):
        """
        Search across documents using OpenAI Responses API
        
        Args:
            query (str): Search query
            document_ids (list): List of document IDs to search
            vector_store_id (str): Vector store ID
            context (dict): Additional context
            
        Returns:
            dict: Search results with AI response
        """
        try:
            # Prepare file filters
            if document_ids:
                if len(document_ids) == 1:
                    file_filter = {
                        "type": "eq",
                        "key": "file_id", 
                        "value": document_ids[0]
                    }
                else:
                    file_filter = {
                        "type": "or",
                        "filters": [
                            {"type": "eq", "key": "file_id", "value": doc_id}
                            for doc_id in document_ids
                        ]
                    }
            else:
                file_filter = None
                
            # Build tool configuration
            tools = [{
                "type": "file_search",
                "file_search": {
                    "vector_store_ids": [vector_store_id]
                }
            }]
            
            if file_filter:
                tools[0]["file_search"]["file_filter"] = file_filter
                
            # Enhanced instructions
            instructions = f"""
            You are an expert document analyst. Search through the provided documents to answer: {query}
            
            Provide a comprehensive response that includes:
            1. Direct answer to the question
            2. Supporting evidence from the documents
            3. Source references with page numbers when available
            4. Any limitations or uncertainties in the information
            
            Document scope: {"Specific documents" if document_ids else "All documents in vector store"}
            """
            
            # Call OpenAI Responses API
            response = self.client.responses.create(
                model="gpt-4o",
                messages=[{
                    "role": "user", 
                    "content": query
                }],
                instructions=instructions,
                tools=tools,
                temperature=0.3
            )
            
            return {
                'success': True,
                'response': response.choices[0].message.content,
                'model': response.model,
                'usage': {
                    'input_tokens': response.usage.prompt_tokens,
                    'output_tokens': response.usage.completion_tokens,
                    'total_tokens': response.usage.total_tokens
                },
                'search_context': {
                    'query': query,
                    'document_ids': document_ids,
                    'vector_store_id': vector_store_id
                }
            }
            
        except Exception as e:
            logger.error(f"Document search error: {str(e)}")
            return {'success': False, 'error': str(e)}
```

Continue reading for remaining files...

---

**To use this**: Create your new Replit project, then copy each section into the corresponding file. I have all the remaining files ready - would you like me to continue with the rest of the service files?