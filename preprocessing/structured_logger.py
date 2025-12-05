import logging
import json
import time
from datetime import datetime

class StructuredLogger:
    def __init__(self, name="sbert_service", level=logging.INFO):
        self.logger = logging.getLogger(name)
        self.logger.setLevel(level)
        
        # Create formatter for structured logging
        formatter = logging.Formatter(
            '%(asctime)s - %(name)s - %(levelname)s - %(message)s'
        )
        
        # Create console handler if not already exists
        if not self.logger.handlers:
            console_handler = logging.StreamHandler()
            console_handler.setFormatter(formatter)
            self.logger.addHandler(console_handler)
    
    def info(self, message, extra_data=None):
        """Log info message with optional structured data"""
        log_data = self._format_log_data(message, extra_data)
        self.logger.info(log_data)
    
    def error(self, message, extra_data=None):
        """Log error message with optional structured data"""
        log_data = self._format_log_data(message, extra_data)
        self.logger.error(log_data)
    
    def warning(self, message, extra_data=None):
        """Log warning message with optional structured data"""
        log_data = self._format_log_data(message, extra_data)
        self.logger.warning(log_data)
    
    def debug(self, message, extra_data=None):
        """Log debug message with optional structured data"""
        log_data = self._format_log_data(message, extra_data)
        self.logger.debug(log_data)
    
    def _format_log_data(self, message, extra_data):
        """Format log message with structured data"""
        if extra_data:
            try:
                # Convert extra_data to JSON string for structured logging
                extra_json = json.dumps(extra_data, default=str)
                return f"{message} | Data: {extra_json}"
            except (TypeError, ValueError):
                return f"{message} | Data: {str(extra_data)}"
        return message
    
    def log_evaluation(self, model_answer=None, student_answer=None, result=None, domain=None, 
                      detailed=False, processing_time_ms=None, metadata=None, score=None, confidence=None, processing_time=None):
        """
        Log evaluation with structured data
        Supports both old and new parameter formats for backward compatibility
        """
        # Handle old format (score, confidence, processing_time)
        if score is not None and result is None:
            evaluation_data = {
                'timestamp': datetime.now().isoformat(),
                'model_answer_length': len(model_answer) if model_answer else 0,
                'student_answer_length': len(student_answer) if student_answer else 0,
                'score': score,
                'confidence': confidence,
                'processing_time_ms': processing_time * 1000 if processing_time else 0,
                'evaluation_type': 'sbert_similarity'
            }
        # Handle new format (result dict)
        else:
            evaluation_data = {
                'timestamp': datetime.now().isoformat(),
                'model_answer_length': len(model_answer) if model_answer else 0,
                'student_answer_length': len(student_answer) if student_answer else 0,
                'domain': domain,
                'detailed': detailed,
                'processing_time_ms': processing_time_ms or 0,
                'evaluation_type': 'enhanced_evaluation'
            }
            
            # Add result data if provided
            if result:
                evaluation_data['score'] = result.get('score', 0)
                evaluation_data['similarity'] = result.get('similarity', 0)
                evaluation_data['confidence'] = result.get('confidence', 0)
                evaluation_data['needs_review'] = result.get('needs_review', False)
            
            # Add metadata if provided
            if metadata:
                evaluation_data['metadata'] = metadata
        
        self.info("Evaluation completed", evaluation_data)
    
    def log_error_with_context(self, error, context):
        """Log error with contextual information"""
        error_data = {
            'error_type': type(error).__name__,
            'error_message': str(error),
            'context': context,
            'timestamp': datetime.now().isoformat()
        }
        
        self.error("Error occurred", error_data)
    
    def log_error(self, error_type=None, error_message=None, context=None, stack_trace=None):
        """Log error with structured data (compatibility method)"""
        error_data = {
            'error_type': error_type,
            'error_message': error_message,
            'context': context,
            'stack_trace': stack_trace,
            'timestamp': datetime.now().isoformat()
        }
        
        self.error("Error occurred", error_data)
    
    def log_performance(self, operation, duration_ms):
        """Log performance metrics for an operation"""
        performance_data = {
            'operation': operation,
            'duration_ms': duration_ms,
            'timestamp': datetime.now().isoformat()
        }
        
        self.debug(f"Performance: {operation}", performance_data)
    
    def log_preprocessing(self, original_text=None, normalized_text=None, corrections=None, 
                         preserved_terms=None, domain=None, text_type=None):
        """Log preprocessing operations"""
        preprocessing_data = {
            'text_type': text_type,
            'domain': domain,
            'original_length': len(original_text) if original_text else 0,
            'normalized_length': len(normalized_text) if normalized_text else 0,
            'corrections_count': len(corrections) if corrections else 0,
            'preserved_terms_count': len(preserved_terms) if preserved_terms else 0,
            'timestamp': datetime.now().isoformat()
        }
        
        self.debug(f"Preprocessing: {text_type}", preprocessing_data)
    
    def log_model_scores(self, model_scores=None, weighted_score=None, confidence=None, 
                        variance=None, processing_time_ms=None):
        """Log model scoring information"""
        scoring_data = {
            'model_scores': model_scores or {},
            'weighted_score': weighted_score,
            'confidence': confidence,
            'variance': variance,
            'processing_time_ms': processing_time_ms,
            'timestamp': datetime.now().isoformat()
        }
        
        self.debug("Model scores calculated", scoring_data)
    
    def log_validation_results(self, validation_results=None, context=None):
        """Log validation results"""
        validation_data = {
            'context': context,
            'overall_accuracy': validation_results.get('overall_accuracy') if validation_results else None,
            'total_cases': validation_results.get('total_cases') if validation_results else 0,
            'passed_cases': validation_results.get('passed_cases') if validation_results else 0,
            'timestamp': datetime.now().isoformat()
        }
        
        self.info("Validation completed", validation_data)

def get_structured_logger():
    """Factory function to get structured logger instance"""
    return StructuredLogger()