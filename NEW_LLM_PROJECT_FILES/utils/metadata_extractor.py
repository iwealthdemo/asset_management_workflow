"""
Metadata extraction utilities for documents
"""

import re
from datetime import datetime
from pathlib import Path

def extract_metadata_from_filename(filename):
    """
    Extract metadata from filename using pattern matching
    
    Args:
        filename (str): The filename to analyze
        
    Returns:
        dict: Extracted metadata
    """
    metadata = {
        'original_filename': filename,
        'file_extension': Path(filename).suffix.lower(),
        'extracted_at': datetime.now().isoformat()
    }
    
    # Clean filename for analysis
    clean_name = filename.lower().replace('_', ' ').replace('-', ' ')
    
    # Extract year (4-digit number that looks like a year)
    year_match = re.search(r'\b(19|20)\d{2}\b', clean_name)
    if year_match:
        metadata['year'] = year_match.group()
        
    # Extract company names (common patterns)
    company_patterns = [
        r'\b([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)\s+(?:corp|inc|ltd|llc|company|co)\b',
        r'\b([A-Z]{2,})\b',  # Acronyms
        r'\b([A-Z][a-z]+(?:[A-Z][a-z]+)+)\b'  # CamelCase-like patterns
    ]
    
    companies = []
    for pattern in company_patterns:
        matches = re.findall(pattern, filename, re.IGNORECASE)
        companies.extend(matches)
        
    if companies:
        metadata['company'] = companies[0]
        
    # Extract document type
    doc_types = {
        'financial': ['financial', 'finance', 'earnings', 'revenue', 'profit', 'loss', 'balance', 'income', 'cash flow'],
        'annual report': ['annual', 'yearly', '10k', '10-k'],
        'quarterly report': ['quarterly', 'quarter', '10q', '10-q', 'q1', 'q2', 'q3', 'q4'],
        'presentation': ['presentation', 'deck', 'slides', 'ppt', 'pitch'],
        'research': ['research', 'analysis', 'study', 'report'],
        'prospectus': ['prospectus', 'offering', 'ipo'],
        'due_diligence': ['due diligence', 'dd', 'diligence'],
        'investment': ['investment', 'invest', 'funding', 'round'],
        'contract': ['contract', 'agreement', 'terms', 'conditions'],
        'legal': ['legal', 'law', 'regulation', 'compliance'],
    }
    
    detected_types = []
    for doc_type, keywords in doc_types.items():
        for keyword in keywords:
            if keyword in clean_name:
                detected_types.append(doc_type)
                break
                
    if detected_types:
        metadata['document_type'] = detected_types[0]
    else:
        # Default based on file extension
        ext = metadata['file_extension']
        if ext in ['.pdf']:
            metadata['document_type'] = 'document'
        elif ext in ['.xls', '.xlsx', '.csv']:
            metadata['document_type'] = 'financial'
        elif ext in ['.ppt', '.pptx']:
            metadata['document_type'] = 'presentation'
        else:
            metadata['document_type'] = 'unknown'
            
    # Extract category based on content hints
    categories = {
        'financial_statements': ['balance sheet', 'income statement', 'cash flow', 'p&l', 'profit loss'],
        'market_research': ['market', 'industry', 'sector', 'competitive'],
        'investment_materials': ['investment', 'funding', 'valuation', 'term sheet'],
        'legal_documents': ['contract', 'agreement', 'legal', 'terms'],
        'operational': ['operations', 'business plan', 'strategy'],
        'compliance': ['compliance', 'regulatory', 'audit']
    }
    
    for category, keywords in categories.items():
        for keyword in keywords:
            if keyword in clean_name:
                metadata['category'] = category
                break
        if 'category' in metadata:
            break
            
    if 'category' not in metadata:
        metadata['category'] = 'general'
        
    # Add confidence score based on how many fields were extracted
    extracted_fields = sum(1 for key in ['year', 'company', 'document_type'] if key in metadata and metadata[key] != 'unknown')
    metadata['extraction_confidence'] = min(1.0, extracted_fields / 3.0)
    
    return metadata

def enhance_metadata_with_content(metadata, content_sample):
    """
    Enhance metadata using document content analysis
    
    Args:
        metadata (dict): Existing metadata
        content_sample (str): Sample of document content
        
    Returns:
        dict: Enhanced metadata
    """
    if not content_sample:
        return metadata
        
    # Analyze content for additional insights
    content_lower = content_sample.lower()
    
    # Look for financial indicators
    financial_terms = ['revenue', 'ebitda', 'margin', 'profit', 'loss', 'assets', 'liabilities']
    if any(term in content_lower for term in financial_terms):
        if metadata.get('document_type') == 'unknown':
            metadata['document_type'] = 'financial'
            
    # Look for investment terms
    investment_terms = ['valuation', 'funding', 'investment', 'roi', 'irr', 'multiple']
    if any(term in content_lower for term in investment_terms):
        metadata['category'] = 'investment_materials'
        
    # Extract additional company names from content
    if 'company' not in metadata:
        # Look for "Company Name Inc." patterns in content
        company_pattern = r'\b([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)\s+(?:Inc|Corp|Ltd|LLC)\b'
        match = re.search(company_pattern, content_sample)
        if match:
            metadata['company'] = match.group(1)
            
    return metadata