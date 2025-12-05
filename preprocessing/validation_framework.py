class ValidationFramework:
    def __init__(self):
        self.validation_rules = {
            'score_range': (0.0, 1.0),
            'min_text_length': 1,
            'max_text_length': 10000
        }
    
    def validate(self, score, model_answer=None, student_answer=None):
        """Validate score and inputs"""
        validation_results = {
            'is_valid': True,
            'errors': [],
            'warnings': []
        }
        
        # Validate score range
        if not self._validate_score_range(score):
            validation_results['is_valid'] = False
            validation_results['errors'].append(f"Score {score} is outside valid range {self.validation_rules['score_range']}")
        
        # Validate text inputs if provided
        if model_answer is not None:
            if not self._validate_text_length(model_answer):
                validation_results['warnings'].append("Model answer length is outside recommended range")
        
        if student_answer is not None:
            if not self._validate_text_length(student_answer):
                validation_results['warnings'].append("Student answer length is outside recommended range")
            
            if not student_answer.strip():
                validation_results['is_valid'] = False
                validation_results['errors'].append("Student answer is empty")
        
        return validation_results
    
    def _validate_score_range(self, score):
        """Check if score is within valid range"""
        min_score, max_score = self.validation_rules['score_range']
        return min_score <= score <= max_score
    
    def _validate_text_length(self, text):
        """Check if text length is within acceptable range"""
        if not text:
            return False
        
        length = len(text)
        min_length = self.validation_rules['min_text_length']
        max_length = self.validation_rules['max_text_length']
        
        return min_length <= length <= max_length
    
    def validate_input_format(self, data):
        """Validate input data format"""
        required_fields = ['model_answer', 'student_answer']
        
        if not isinstance(data, dict):
            return False, "Input must be a dictionary"
        
        for field in required_fields:
            if field not in data:
                return False, f"Missing required field: {field}"
            
            if not isinstance(data[field], str):
                return False, f"Field {field} must be a string"
        
        return True, "Valid input format"
    
    def sanitize_input(self, text):
        """Sanitize input text"""
        if not isinstance(text, str):
            return ""
        
        # Remove null bytes and control characters
        sanitized = ''.join(char for char in text if ord(char) >= 32 or char in '\n\r\t')
        
        # Limit length
        max_length = self.validation_rules['max_text_length']
        if len(sanitized) > max_length:
            sanitized = sanitized[:max_length]
        
        return sanitized