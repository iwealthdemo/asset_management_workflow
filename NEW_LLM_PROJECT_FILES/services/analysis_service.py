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
        
    def summarize(self, content=None, document_id=None, summary_type="general"):
        """
        Summarize text or document content
        
        Args:
            content (str): Text content to summarize
            document_id (str): Document ID to summarize
            summary_type (str): Type of summary (general, executive, technical)
            
        Returns:
            dict: Summary response
        """
        try:
            if content:
                return self._summarize_text(content, summary_type)
            elif document_id:
                return self._summarize_document(document_id, summary_type)
            else:
                return {'success': False, 'error': 'Either content or document_id required'}
                
        except Exception as e:
            logger.error(f"Summarization error: {str(e)}")
            return {'success': False, 'error': str(e)}
            
    def _summarize_text(self, content, summary_type):
        """Summarize provided text content"""
        prompts = {
            'general': "Provide a comprehensive summary of the following text, highlighting key points and main themes:",
            'executive': "Create an executive summary focusing on key decisions, outcomes, and strategic implications:",
            'technical': "Provide a technical summary emphasizing methodologies, processes, and detailed findings:"
        }
        
        prompt = prompts.get(summary_type, prompts['general'])
        
        response = self.openai_client.chat.completions.create(
            model="gpt-4o",
            messages=[
                {"role": "system", "content": prompt},
                {"role": "user", "content": content}
            ],
            temperature=0.3,
            max_tokens=1000
        )
        
        return {
            'success': True,
            'summary': response.choices[0].message.content,
            'summary_type': summary_type,
            'model': response.model,
            'usage': {
                'input_tokens': response.usage.prompt_tokens,
                'output_tokens': response.usage.completion_tokens,
                'total_tokens': response.usage.total_tokens
            }
        }
        
    def _summarize_document(self, document_id, summary_type):
        """Summarize document using file search"""
        prompts = {
            'general': "Provide a comprehensive summary of this document, highlighting key points and main themes.",
            'executive': "Create an executive summary focusing on key decisions, outcomes, and strategic implications.",
            'technical': "Provide a technical summary emphasizing methodologies, processes, and detailed findings."
        }
        
        query = prompts.get(summary_type, prompts['general'])
        
        # Use document service for file-based summarization
        from services.document_service import DocumentService
        doc_service = DocumentService(self.openai_client)
        
        result = doc_service.search_documents(
            query, [document_id], 
            vector_store_id=os.getenv('DEFAULT_VECTOR_STORE_ID'),
            context={'analysis_type': 'summary'}
        )
        
        if result['success']:
            return {
                'success': True,
                'summary': result['response'],
                'summary_type': summary_type,
                'document_id': document_id,
                'model': result['model'],
                'usage': result['usage']
            }
        else:
            return result
            
    def analyze_document(self, document_id, analysis_type="general", context=None):
        """
        Analyze document content for specific insights
        
        Args:
            document_id (str): Document ID to analyze
            analysis_type (str): Type of analysis
            context (dict): Additional context
            
        Returns:
            dict: Analysis results
        """
        try:
            analysis_prompts = {
                'investment': """
                Analyze this investment document and provide:
                1. Risk assessment (low, medium, high) with justification
                2. Key financial metrics and projections
                3. Market opportunity and competitive landscape
                4. Management team and execution capability
                5. Potential red flags or concerns
                6. Investment recommendation with rationale
                """,
                'financial': """
                Perform financial analysis of this document focusing on:
                1. Revenue trends and growth patterns
                2. Profitability metrics and margins
                3. Cash flow analysis
                4. Debt and leverage ratios
                5. Key performance indicators
                6. Financial health assessment
                """,
                'risk': """
                Conduct risk analysis focusing on:
                1. Business risks and market factors
                2. Financial risks and leverage
                3. Operational risks
                4. Regulatory and compliance risks
                5. Risk mitigation strategies
                6. Overall risk rating and explanation
                """,
                'general': """
                Analyze this document comprehensively:
                1. Document type and purpose
                2. Key information and findings
                3. Important data points and metrics
                4. Conclusions and recommendations
                5. Areas requiring attention
                """
            }
            
            prompt = analysis_prompts.get(analysis_type, analysis_prompts['general'])
            
            # Use file search to analyze the document
            tools = [{
                "type": "file_search",
                "file_search": {
                    "vector_store_ids": [os.getenv('DEFAULT_VECTOR_STORE_ID')],
                    "file_filter": {
                        "type": "eq",
                        "key": "file_id", 
                        "value": document_id
                    }
                }
            }]
            
            response = self.openai_client.responses.create(
                model="gpt-4o",
                messages=[{
                    "role": "user", 
                    "content": prompt
                }],
                tools=tools,
                temperature=0.2
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
                }
            }
            
        except Exception as e:
            logger.error(f"Document analysis error: {str(e)}")
            return {'success': False, 'error': str(e)}
            
    def investment_insights(self, document_ids, analysis_focus="general", context=None):
        """
        Generate investment-specific insights from multiple documents
        
        Args:
            document_ids (list): List of document IDs
            analysis_focus (str): Focus area for analysis
            context (dict): Additional context
            
        Returns:
            dict: Investment insights
        """
        try:
            focus_prompts = {
                'due_diligence': """
                Perform comprehensive due diligence analysis across these documents:
                1. Business model validation
                2. Financial performance analysis
                3. Market position assessment
                4. Management team evaluation
                5. Risk factor identification
                6. Investment thesis validation
                7. Deal structure recommendations
                """,
                'valuation': """
                Focus on valuation analysis:
                1. Financial metrics and multiples
                2. Comparable company analysis
                3. Revenue and growth projections
                4. Discount rates and assumptions
                5. Valuation range and methodology
                6. Value drivers and sensitivities
                """,
                'market_analysis': """
                Analyze market dynamics:
                1. Market size and growth potential
                2. Competitive landscape
                3. Industry trends and disruptions
                4. Customer behavior and demand
                5. Regulatory environment
                6. Market entry barriers
                """,
                'general': """
                Provide comprehensive investment insights:
                1. Executive summary of opportunity
                2. Key strengths and advantages
                3. Risk factors and mitigation
                4. Financial highlights
                5. Market opportunity
                6. Investment recommendation
                """
            }
            
            prompt = focus_prompts.get(analysis_focus, focus_prompts['general'])
            
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
                    "vector_store_ids": [os.getenv('DEFAULT_VECTOR_STORE_ID')],
                    "file_filter": file_filter
                }
            }]
            
            response = self.openai_client.responses.create(
                model="gpt-4o",
                messages=[{
                    "role": "user", 
                    "content": prompt
                }],
                instructions="You are a senior investment analyst with expertise in due diligence and financial analysis. Provide actionable insights based on the documents.",
                tools=tools,
                temperature=0.2
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
                }
            }
            
        except Exception as e:
            logger.error(f"Investment insights error: {str(e)}")
            return {'success': False, 'error': str(e)}