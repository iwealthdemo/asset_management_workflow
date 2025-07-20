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