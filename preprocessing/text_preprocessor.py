import re
import string

class TextPreprocessor:
    def __init__(self, domain=None):
        self.domain = domain or 'general'
        self.stop_words = {'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by'}
    
    def preprocess(self, text):
        """
        Basic text preprocessing
        Returns a dictionary with normalized text and metadata
        """
        if not text:
            return {
                'normalized_text': "",
                'corrections': [],
                'preserved_terms': []
            }
        
        original_text = text
        corrections = []
        preserved_terms = []
        
        # Convert to lowercase
        text = text.lower()
        
        # Track if we made any corrections
        if text != original_text:
            corrections.append(f"Converted to lowercase")
        
        # Remove extra whitespace
        cleaned = re.sub(r'\s+', ' ', text)
        if cleaned != text:
            corrections.append(f"Normalized whitespace")
        text = cleaned
        
        # Remove punctuation except periods and commas
        cleaned = re.sub(r'[^\w\s.,]', '', text)
        if cleaned != text:
            corrections.append(f"Removed special punctuation")
        text = cleaned
        
        normalized_text = text.strip()
        
        return {
            'normalized_text': normalized_text,
            'corrections': corrections,
            'preserved_terms': preserved_terms
        }
    
    def clean_text(self, text):
        """More aggressive cleaning - returns plain string for backward compatibility"""
        preprocessed = self.preprocess(text)
        text = preprocessed['normalized_text']
        
        # Remove numbers
        text = re.sub(r'\d+', '', text)
        
        # Remove single characters
        text = re.sub(r'\b\w\b', '', text)
        
        return text.strip()