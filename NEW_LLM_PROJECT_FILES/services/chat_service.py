"""
Chat Service - Handles conversational AI and document Q&A
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
        Generate chat completion with context
        
        Args:
            messages (list): Chat messages
            model (str): Model to use
            context (dict): Additional context
            
        Returns:
            dict: Chat completion response
        """
        try:
            # Choose provider based on model
            if model.startswith('claude'):
                if not self.anthropic_client:
                    return {'success': False, 'error': 'Anthropic not configured'}
                return self._anthropic_completion(messages, model, context)
            else:
                return self._openai_completion(messages, model, context)
                
        except Exception as e:
            logger.error(f"Chat completion error: {str(e)}")
            return {'success': False, 'error': str(e)}
            
    def _openai_completion(self, messages, model, context):
        """OpenAI chat completion"""
        response = self.openai_client.chat.completions.create(
            model=model,
            messages=messages,
            temperature=0.7,
            max_tokens=2000
        )
        
        return {
            'success': True,
            'response': response.choices[0].message.content,
            'model': response.model,
            'usage': {
                'input_tokens': response.usage.prompt_tokens,
                'output_tokens': response.usage.completion_tokens,
                'total_tokens': response.usage.total_tokens
            }
        }
        
    def _anthropic_completion(self, messages, model, context):
        """Anthropic chat completion"""
        # Convert OpenAI format to Anthropic format
        system_message = ""
        anthropic_messages = []
        
        for msg in messages:
            if msg["role"] == "system":
                system_message = msg["content"]
            else:
                anthropic_messages.append(msg)
                
        response = self.anthropic_client.messages.create(
            model="claude-3-sonnet-20240229",
            system=system_message,
            messages=anthropic_messages,
            max_tokens=2000
        )
        
        return {
            'success': True,
            'response': response.content[0].text,
            'model': response.model,
            'usage': {
                'input_tokens': response.usage.input_tokens,
                'output_tokens': response.usage.output_tokens,
                'total_tokens': response.usage.input_tokens + response.usage.output_tokens
            }
        }
        
    def document_qa(self, question, document_ids, vector_store_id, context=None):
        """
        Question answering on specific documents
        
        Args:
            question (str): Question to ask
            document_ids (list): Document IDs to search
            vector_store_id (str): Vector store ID
            context (dict): Additional context
            
        Returns:
            dict: Q&A response with sources
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
                
            # Enhanced Q&A instructions
            instructions = f"""
            You are an expert document analyst specializing in precise question answering.
            
            Your task:
            1. Answer the specific question based on the documents
            2. Provide exact quotes or evidence from the source material
            3. Include page numbers and section references when available
            4. If the information is not in the documents, clearly state that
            5. Structure your response clearly with supporting evidence
            
            Question: {question}
            """
            
            # Get conversation history if provided
            messages = [{"role": "user", "content": question}]
            
            if context and context.get('conversation_history'):
                messages = context['conversation_history'] + messages
                
            # Call OpenAI Responses API
            response = self.openai_client.responses.create(
                model="gpt-4o",
                messages=messages,
                instructions=instructions,
                tools=tools,
                temperature=0.1  # Lower temperature for factual Q&A
            )
            
            return {
                'success': True,
                'answer': response.choices[0].message.content,
                'question': question,
                'model': response.model,
                'usage': {
                    'input_tokens': response.usage.prompt_tokens,
                    'output_tokens': response.usage.completion_tokens,
                    'total_tokens': response.usage.total_tokens
                },
                'context': {
                    'document_ids': document_ids,
                    'vector_store_id': vector_store_id
                }
            }
            
        except Exception as e:
            logger.error(f"Document Q&A error: {str(e)}")
            return {'success': False, 'error': str(e)}