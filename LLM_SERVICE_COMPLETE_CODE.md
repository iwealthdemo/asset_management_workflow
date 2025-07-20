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

## services/chat_service.py
```python
"""
Chat Service - Handles conversational AI interactions
"""

import logging
from datetime import datetime

logger = logging.getLogger(__name__)

class ChatService:
    def __init__(self, openai_client, anthropic_client=None):
        self.openai_client = openai_client
        self.anthropic_client = anthropic_client
        
    def completion(self, messages, model="gpt-4o", context=None):
        """
        Generate chat completion with optional context
        
        Args:
            messages (list): List of message objects with role and content
            model (str): Model to use for completion
            context (dict): Additional context information
            
        Returns:
            dict: Completion response with metadata
        """
        try:
            # Add context to system message if provided
            if context and context.get('system_prompt'):
                system_message = {'role': 'system', 'content': context['system_prompt']}
                if messages and messages[0]['role'] != 'system':
                    messages.insert(0, system_message)
                    
            response = self.openai_client.chat.completions.create(
                model=model,
                messages=messages,
                temperature=context.get('temperature', 0.7) if context else 0.7,
                max_tokens=context.get('max_tokens', 2000) if context else 2000
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
                'finish_reason': response.choices[0].finish_reason
            }
            
        except Exception as e:
            logger.error(f"Chat completion error: {str(e)}")
            return {'success': False, 'error': str(e)}
            
    def document_qa(self, question, document_ids, vector_store_id, context=None):
        """
        Answer questions using document context
        
        Args:
            question (str): Question to answer
            document_ids (list): List of document IDs to search
            vector_store_id (str): Vector store ID
            context (dict): Additional context
            
        Returns:
            dict: Answer with supporting information
        """
        try:
            # Prepare file filters for specific documents
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
                
            # Build tools configuration
            tools = [{
                "type": "file_search",
                "file_search": {
                    "vector_store_ids": [vector_store_id]
                }
            }]
            
            if file_filter:
                tools[0]["file_search"]["file_filter"] = file_filter
                
            instructions = f"""
            You are a knowledgeable document analyst. Answer the user's question using the provided documents.
            
            Provide:
            1. A clear, direct answer
            2. Supporting evidence from the documents
            3. Source references when available
            4. Note any limitations or uncertainties
            
            Question: {question}
            """
            
            response = self.openai_client.responses.create(
                model="gpt-4o",
                messages=[{
                    "role": "user",
                    "content": question
                }],
                instructions=instructions,
                tools=tools,
                temperature=0.3
            )
            
            return {
                'success': True,
                'answer': response.choices[0].message.content,
                'model': response.model,
                'usage': {
                    'input_tokens': response.usage.prompt_tokens,
                    'output_tokens': response.usage.completion_tokens,
                    'total_tokens': response.usage.total_tokens
                },
                'context': {
                    'question': question,
                    'document_ids': document_ids,
                    'vector_store_id': vector_store_id
                }
            }
            
        except Exception as e:
            logger.error(f"Document Q&A error: {str(e)}")
            return {'success': False, 'error': str(e)}
```

## services/analysis_service.py
```python
"""
Analysis Service - Handles document analysis and insights generation
"""

import logging
from datetime import datetime

logger = logging.getLogger(__name__)

class AnalysisService:
    def __init__(self, openai_client, anthropic_client=None):
        self.openai_client = openai_client
        self.anthropic_client = anthropic_client
        
    def analyze_document(self, document_id, analysis_type="general", context=None):
        """
        Analyze a specific document for insights
        
        Args:
            document_id (str): OpenAI file ID to analyze
            analysis_type (str): Type of analysis (general, investment, risk, etc.)
            context (dict): Additional context for analysis
            
        Returns:
            dict: Analysis results with insights
        """
        try:
            # Define analysis prompts based on type
            analysis_prompts = {
                'general': "Provide a comprehensive analysis of this document including key points, themes, and insights.",
                'investment': """Analyze this investment document focusing on:
                1. Investment opportunity and market potential
                2. Financial projections and key metrics
                3. Risk factors and mitigation strategies
                4. Management team and competitive advantages
                5. Recommendation and key concerns""",
                'risk': """Conduct a risk analysis focusing on:
                1. Identified risk factors
                2. Risk severity and probability
                3. Mitigation strategies
                4. Residual risk assessment
                5. Risk monitoring recommendations""",
                'financial': """Analyze the financial aspects including:
                1. Revenue and profitability trends
                2. Cash flow analysis
                3. Balance sheet strength
                4. Key financial ratios
                5. Financial outlook and concerns"""
            }
            
            prompt = analysis_prompts.get(analysis_type, analysis_prompts['general'])
            
            # Use file_search tool to analyze the specific document
            tools = [{
                "type": "file_search",
                "file_search": {
                    "file_filter": {
                        "type": "eq",
                        "key": "file_id",
                        "value": document_id
                    }
                }
            }]
            
            instructions = f"""
            You are an expert analyst. {prompt}
            
            Structure your response with clear sections and actionable insights.
            Include specific references to the document content where relevant.
            """
            
            response = self.openai_client.responses.create(
                model="gpt-4o",
                messages=[{
                    "role": "user",
                    "content": f"Please analyze this document with focus on: {analysis_type}"
                }],
                instructions=instructions,
                tools=tools,
                temperature=0.3
            )
            
            return {
                'success': True,
                'analysis': response.choices[0].message.content,
                'analysis_type': analysis_type,
                'document_id': document_id,
                'model': response.model,
                'usage': {
                    'input_tokens': response.usage.prompt_tokens,
                    'output_tokens': response.usage.completion_tokens,
                    'total_tokens': response.usage.total_tokens
                },
                'timestamp': datetime.now().isoformat()
            }
            
        except Exception as e:
            logger.error(f"Document analysis error: {str(e)}")
            return {'success': False, 'error': str(e)}
            
    def summarize(self, content=None, document_id=None, summary_type="general"):
        """
        Summarize text content or document
        
        Args:
            content (str): Text content to summarize
            document_id (str): Document ID to summarize
            summary_type (str): Type of summary (brief, detailed, executive)
            
        Returns:
            dict: Summary results
        """
        try:
            if document_id:
                # Summarize document using file_search
                tools = [{
                    "type": "file_search",
                    "file_search": {
                        "file_filter": {
                            "type": "eq",
                            "key": "file_id", 
                            "value": document_id
                        }
                    }
                }]
                
                summary_instructions = {
                    'brief': "Provide a concise 2-3 sentence summary of the key points.",
                    'detailed': "Provide a comprehensive summary covering all major sections and key insights.",
                    'executive': "Provide an executive summary suitable for senior management decision-making."
                }
                
                instruction = summary_instructions.get(summary_type, summary_instructions['detailed'])
                
                response = self.openai_client.responses.create(
                    model="gpt-4o",
                    messages=[{
                        "role": "user",
                        "content": f"Please summarize this document: {instruction}"
                    }],
                    tools=tools,
                    temperature=0.3
                )
                
                summary_content = response.choices[0].message.content
                usage = {
                    'input_tokens': response.usage.prompt_tokens,
                    'output_tokens': response.usage.completion_tokens,
                    'total_tokens': response.usage.total_tokens
                }
                
            elif content:
                # Summarize provided text content
                response = self.openai_client.chat.completions.create(
                    model="gpt-4o",
                    messages=[{
                        "role": "user",
                        "content": f"Please provide a {summary_type} summary of the following content:\n\n{content}"
                    }],
                    temperature=0.3
                )
                
                summary_content = response.choices[0].message.content
                usage = {
                    'input_tokens': response.usage.prompt_tokens,
                    'output_tokens': response.usage.completion_tokens,
                    'total_tokens': response.usage.total_tokens
                }
            else:
                return {'success': False, 'error': 'Either content or document_id is required'}
                
            return {
                'success': True,
                'summary': summary_content,
                'summary_type': summary_type,
                'usage': usage,
                'timestamp': datetime.now().isoformat()
            }
            
        except Exception as e:
            logger.error(f"Summarization error: {str(e)}")
            return {'success': False, 'error': str(e)}
            
    def investment_insights(self, document_ids, analysis_focus="general", context=None):
        """
        Generate investment-specific insights from multiple documents
        
        Args:
            document_ids (list): List of document IDs to analyze
            analysis_focus (str): Focus area for analysis
            context (dict): Additional context
            
        Returns:
            dict: Investment insights and recommendations
        """
        try:
            # Prepare file filters for multiple documents
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
                
            tools = [{
                "type": "file_search",
                "file_search": {
                    "file_filter": file_filter
                }
            }]
            
            focus_prompts = {
                'general': "Provide comprehensive investment insights covering opportunity, risks, and recommendations.",
                'risk_assessment': "Focus on risk analysis, risk factors, and risk mitigation strategies.",
                'financial_analysis': "Focus on financial performance, projections, and financial health.",
                'market_opportunity': "Focus on market size, growth potential, and competitive positioning.",
                'due_diligence': "Provide due diligence insights covering all critical investment factors."
            }
            
            prompt = focus_prompts.get(analysis_focus, focus_prompts['general'])
            
            instructions = f"""
            You are a senior investment analyst. Analyze the provided documents and generate actionable investment insights.
            
            {prompt}
            
            Structure your response with:
            1. Executive Summary
            2. Key Investment Highlights  
            3. Risk Assessment
            4. Financial Analysis
            5. Market Opportunity
            6. Investment Recommendation
            7. Next Steps
            
            Provide specific evidence from the documents to support your analysis.
            """
            
            response = self.openai_client.responses.create(
                model="gpt-4o",
                messages=[{
                    "role": "user",
                    "content": f"Generate comprehensive investment insights focusing on: {analysis_focus}"
                }],
                instructions=instructions,
                tools=tools,
                temperature=0.3
            )
            
            return {
                'success': True,
                'insights': response.choices[0].message.content,
                'analysis_focus': analysis_focus,
                'document_ids': document_ids,
                'model': response.model,
                'usage': {
                    'input_tokens': response.usage.prompt_tokens,
                    'output_tokens': response.usage.completion_tokens,
                    'total_tokens': response.usage.total_tokens
                },
                'timestamp': datetime.now().isoformat()
            }
            
        except Exception as e:
            logger.error(f"Investment insights error: {str(e)}")
            return {'success': False, 'error': str(e)}
```

## services/concurrency_manager.py
```python
"""
Concurrency Manager - Handles concurrent requests and rate limiting
"""

import asyncio
import threading
import time
from collections import defaultdict, deque
from functools import wraps
import logging
from datetime import datetime, timedelta

logger = logging.getLogger(__name__)

class ConcurrencyManager:
    def __init__(self, max_concurrent_requests=10, rate_limit_per_minute=100):
        self.max_concurrent_requests = max_concurrent_requests
        self.rate_limit_per_minute = rate_limit_per_minute
        
        # Semaphore for controlling concurrent requests
        self.semaphore = threading.Semaphore(max_concurrent_requests)
        
        # Rate limiting per API key
        self.request_history = defaultdict(deque)
        self.rate_limit_lock = threading.Lock()
        
        # Active request tracking
        self.active_requests = {}
        self.request_counter = 0
        self.request_lock = threading.Lock()
        
        # Metrics
        self.metrics = {
            'total_requests': 0,
            'concurrent_requests': 0,
            'rate_limited_requests': 0,
            'max_concurrent_reached': 0,
            'average_response_time': 0
        }
        
    def limit_concurrent_requests(self, timeout=300):
        """
        Decorator to limit concurrent requests
        """
        def decorator(func):
            @wraps(func)
            def wrapper(*args, **kwargs):
                request_id = self._get_request_id()
                
                # Try to acquire semaphore
                acquired = self.semaphore.acquire(timeout=timeout)
                if not acquired:
                    logger.warning(f"Request {request_id} timed out waiting for semaphore")
                    return {
                        'success': False, 
                        'error': 'Service is busy, please try again later',
                        'retry_after': 30
                    }
                
                try:
                    # Track active request
                    start_time = time.time()
                    self._track_request_start(request_id)
                    
                    # Execute the function
                    result = func(*args, **kwargs)
                    
                    # Update metrics
                    end_time = time.time()
                    self._track_request_end(request_id, end_time - start_time)
                    
                    return result
                    
                finally:
                    # Always release semaphore
                    self.semaphore.release()
                    
            return wrapper
        return decorator
        
    def rate_limit_by_api_key(self, api_key):
        """
        Check if API key has exceeded rate limit
        
        Returns:
            tuple: (allowed, wait_time)
        """
        with self.rate_limit_lock:
            now = datetime.now()
            cutoff = now - timedelta(minutes=1)
            
            # Clean old requests
            history = self.request_history[api_key]
            while history and history[0] < cutoff:
                history.popleft()
                
            # Check rate limit
            if len(history) >= self.rate_limit_per_minute:
                oldest_request = history[0]
                wait_time = (oldest_request + timedelta(minutes=1) - now).total_seconds()
                
                self.metrics['rate_limited_requests'] += 1
                logger.warning(f"Rate limit exceeded for API key: {api_key[:8]}...")
                
                return False, max(0, wait_time)
            
            # Add current request
            history.append(now)
            return True, 0
            
    def _get_request_id(self):
        """Generate unique request ID"""
        with self.request_lock:
            self.request_counter += 1
            return f"req_{self.request_counter}_{int(time.time())}"
            
    def _track_request_start(self, request_id):
        """Track request start"""
        with self.request_lock:
            self.active_requests[request_id] = {
                'start_time': time.time(),
                'thread_id': threading.current_thread().ident
            }
            
            concurrent = len(self.active_requests)
            self.metrics['concurrent_requests'] = concurrent
            self.metrics['total_requests'] += 1
            
            if concurrent > self.metrics['max_concurrent_reached']:
                self.metrics['max_concurrent_reached'] = concurrent
                
            logger.info(f"Request {request_id} started. Active requests: {concurrent}")
            
    def _track_request_end(self, request_id, duration):
        """Track request completion"""
        with self.request_lock:
            if request_id in self.active_requests:
                del self.active_requests[request_id]
                
            # Update average response time
            total = self.metrics['total_requests']
            current_avg = self.metrics['average_response_time']
            self.metrics['average_response_time'] = (current_avg * (total - 1) + duration) / total
            
            self.metrics['concurrent_requests'] = len(self.active_requests)
            
            logger.info(f"Request {request_id} completed in {duration:.2f}s")
            
    def get_metrics(self):
        """Get current concurrency metrics"""
        with self.request_lock:
            return {
                **self.metrics,
                'current_concurrent_requests': len(self.active_requests),
                'available_slots': self.max_concurrent_requests - len(self.active_requests),
                'timestamp': datetime.now().isoformat()
            }
            
    def get_active_requests(self):
        """Get information about active requests"""
        with self.request_lock:
            current_time = time.time()
            return {
                request_id: {
                    'duration': current_time - info['start_time'],
                    'thread_id': info['thread_id']
                }
                for request_id, info in self.active_requests.items()
            }

# Global concurrency manager instance
concurrency_manager = ConcurrencyManager(
    max_concurrent_requests=20,  # Adjust based on your server capacity
    rate_limit_per_minute=200    # Adjust based on your needs
)
```

## utils/auth.py
```python
"""
Authentication utilities
"""

import os
from functools import wraps
from flask import request, jsonify

def require_api_key(func):
    """
    Decorator to require API key authentication
    """
    @wraps(func)
    def wrapper(*args, **kwargs):
        # Get API key from various sources
        api_key = (
            request.headers.get('Authorization', '').replace('Bearer ', '') or
            request.headers.get('X-API-Key') or
            request.args.get('api_key')
        )
        
        expected_key = os.getenv('SERVICE_API_KEY', 'dev-key-change-in-production')
        
        if not api_key:
            return jsonify({
                'success': False,
                'error': 'API key required',
                'message': 'Provide API key in Authorization header, X-API-Key header, or api_key parameter'
            }), 401
            
        if api_key != expected_key:
            return jsonify({
                'success': False,
                'error': 'Invalid API key'
            }), 403
            
        return func(*args, **kwargs)
        
    return wrapper
```

## utils/metadata_extractor.py
```python
"""
Metadata extraction utilities
"""

import re
from datetime import datetime
from pathlib import Path

def extract_metadata_from_filename(filename):
    """
    Extract metadata from filename using patterns
    
    Args:
        filename (str): Original filename
        
    Returns:
        dict: Extracted metadata attributes
    """
    if not filename:
        return {}
        
    metadata = {
        'original_filename': filename,
        'file_extension': Path(filename).suffix.lower().lstrip('.'),
        'extraction_timestamp': datetime.now().isoformat()
    }
    
    filename_lower = filename.lower()
    
    # Document type classification
    if any(term in filename_lower for term in ['annual', 'report', 'yearly']):
        metadata['document_type'] = 'annual_report'
    elif any(term in filename_lower for term in ['financial', 'statement', 'balance', 'income']):
        metadata['document_type'] = 'financial_statement'
    elif any(term in filename_lower for term in ['investment', 'proposal', 'pitch', 'deck']):
        metadata['document_type'] = 'investment_proposal'
    elif any(term in filename_lower for term in ['contract', 'agreement', 'legal']):
        metadata['document_type'] = 'legal_document'
    elif any(term in filename_lower for term in ['research', 'analysis', 'market']):
        metadata['document_type'] = 'research_report'
    else:
        metadata['document_type'] = 'general_document'
    
    # Extract year from filename
    year_match = re.search(r'(20\d{2})', filename)
    if year_match:
        metadata['year'] = year_match.group(1)
        
    # Extract company names (basic patterns)
    # Look for capitalized words that might be company names
    company_pattern = r'\b[A-Z][a-z]+(?:\s+[A-Z][a-z]+)*\b'
    potential_companies = re.findall(company_pattern, filename)
    if potential_companies:
        metadata['potential_company'] = potential_companies[0]
        
    # Category based on file extension and content hints
    ext = metadata['file_extension']
    if ext in ['pdf']:
        metadata['category'] = 'document'
    elif ext in ['xlsx', 'xls', 'csv']:
        metadata['category'] = 'spreadsheet'
    elif ext in ['jpg', 'jpeg', 'png', 'gif']:
        metadata['category'] = 'image'
    elif ext in ['doc', 'docx']:
        metadata['category'] = 'word_document'
    elif ext in ['ppt', 'pptx']:
        metadata['category'] = 'presentation'
    else:
        metadata['category'] = 'unknown'
        
    return metadata
```

## README.md
```md
# LLM API Service

A dedicated microservice for AI/LLM operations including document processing, chat completion, and analysis.

## Features

- **Document Processing**: Upload, vectorize, and analyze documents
- **Advanced Search**: Vector-based document search with AI responses  
- **Chat Completion**: Conversational AI with context support
- **Investment Analysis**: Specialized investment insight generation
- **Concurrency Management**: Production-ready request handling
- **Rate Limiting**: Per-API-key usage controls
- **Multi-Provider Support**: OpenAI and Anthropic integration

## Quick Start

1. **Install dependencies**:
   ```bash
   pip install -r requirements.txt
   ```

2. **Set environment variables**:
   ```bash
   OPENAI_API_KEY=your-openai-key-here
   SERVICE_API_KEY=your-secure-service-key
   DEFAULT_VECTOR_STORE_ID=your-vector-store-id
   ```

3. **Run the service**:
   ```bash
   python main.py
   ```

4. **Test the service**:
   ```bash
   curl -X GET http://localhost:5000/health
   ```

## API Endpoints

### Health & Info
- `GET /health` - Service health check
- `GET /info` - Service capabilities and information
- `GET /metrics` - Real-time service metrics

### Documents
- `POST /documents/upload-and-vectorize` - Upload file to vector store
- `POST /documents/analyze` - Analyze document content
- `POST /documents/search` - Search across documents

### Chat
- `POST /chat/completion` - Generate chat completions
- `POST /chat/document-qa` - Document-based Q&A

### Analysis  
- `POST /analysis/summarize` - Summarize content
- `POST /analysis/investment-insights` - Investment analysis

## Authentication

Include your API key in requests:

```bash
# Header method (recommended)
curl -H "X-API-Key: your-api-key" ...

# Authorization header  
curl -H "Authorization: Bearer your-api-key" ...

# Query parameter
curl "https://api.example.com/endpoint?api_key=your-api-key"
```

## Configuration

### Environment Variables
- `OPENAI_API_KEY` - OpenAI API key (required)
- `ANTHROPIC_API_KEY` - Anthropic API key (optional)  
- `SERVICE_API_KEY` - Service authentication key (required)
- `DEFAULT_VECTOR_STORE_ID` - Default vector store for documents
- `PORT` - Service port (default: 5000)
- `FLASK_ENV` - Environment (development/production)

### Concurrency Settings
- `MAX_CONCURRENT_REQUESTS` - Maximum simultaneous requests (default: 20)
- `RATE_LIMIT_PER_MINUTE` - Requests per minute per API key (default: 200)

## Production Deployment

1. **Set secure API key**:
   ```bash
   SERVICE_API_KEY=super-secure-random-key-here
   ```

2. **Configure production settings**:
   ```bash
   FLASK_ENV=production
   MAX_CONCURRENT_REQUESTS=30
   RATE_LIMIT_PER_MINUTE=500
   ```

3. **Deploy to Replit**:
   - Click "Deploy" button
   - Service will be available at your-repl-name.replit.app

## Usage Examples

### Document Upload
```python
import requests

response = requests.post('https://your-service.replit.app/documents/upload-and-vectorize', 
  headers={'X-API-Key': 'your-api-key'},
  json={
    'file_content': 'base64-encoded-file-content',
    'filename': 'investment-report-2024.pdf',
    'attributes': {
      'company': 'TechCorp',
      'document_type': 'annual_report'
    }
  }
)
```

### Document Search  
```python
response = requests.post('https://your-service.replit.app/documents/search',
  headers={'X-API-Key': 'your-api-key'},
  json={
    'query': 'What are the main risk factors?',
    'document_ids': ['file-abc123', 'file-def456']
  }
)
```

## Monitoring

Monitor service health and performance:

```bash
# Service health
curl https://your-service.replit.app/health

# Real-time metrics
curl https://your-service.replit.app/metrics
```

## Support

For support and questions, refer to the API documentation or contact the development team.
```

---

Great! You now have all the essential files. Next steps:

1. **Create these remaining files** in your new Replit project:
   - `services/chat_service.py`
   - `services/analysis_service.py` 
   - `services/concurrency_manager.py`
   - `utils/auth.py`
   - `utils/metadata_extractor.py`
   - `README.md`

2. **Set up environment secrets** in your new project:
   - `OPENAI_API_KEY` - Your OpenAI API key
   - `SERVICE_API_KEY` - Generate a secure random key
   - `DEFAULT_VECTOR_STORE_ID` - Your existing vector store ID

Would you like me to help with the next steps once you've copied these files?