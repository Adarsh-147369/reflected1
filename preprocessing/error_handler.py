import functools
import time
import traceback
from typing import Any, Callable

class ErrorHandler:
    def __init__(self, logger=None):
        self.logger = logger
        self.error_counts = {}
    
    def handle_error(self, error, context="Unknown"):
        """Handle and log errors"""
        error_type = type(error).__name__
        
        # Count errors
        self.error_counts[error_type] = self.error_counts.get(error_type, 0) + 1
        
        error_info = {
            'error_type': error_type,
            'error_message': str(error),
            'context': context,
            'count': self.error_counts[error_type],
            'traceback': traceback.format_exc()
        }
        
        if self.logger:
            self.logger.log_error_with_context(error, error_info)
        else:
            print(f"Error in {context}: {error}")
        
        return error_info
    
    def get_error_stats(self):
        """Get error statistics"""
        return self.error_counts.copy()
    
    def handle_model_loading_error(self, model_name=None, error=None, fallback_models=None, fallback_action=None):
        """Handle model loading errors specifically"""
        context = f"model_loading:{model_name}" if model_name else "model_loading"
        error_info = self.handle_error(error, context)
        
        if fallback_models:
            error_info['fallback_models'] = fallback_models
        
        if fallback_action:
            try:
                fallback_action()
                error_info['fallback_executed'] = True
            except Exception as fallback_error:
                error_info['fallback_error'] = str(fallback_error)
        
        return error_info
    
    def handle_preprocessing_error(self, text, error):
        """Handle preprocessing errors and return original text in expected format"""
        error_info = self.handle_error(error, "preprocessing")
        
        if self.logger:
            self.logger.warning(f"Preprocessing failed, using original text: {str(error)}")
        
        # Return original text in the expected dictionary format
        return {
            'normalized_text': text,
            'corrections': [],
            'preserved_terms': []
        }
    
    def handle_ensemble_evaluation_error(self, error, model_scores=None, fallback_score=0.5):
        """Handle ensemble evaluation errors and return fallback values"""
        error_info = self.handle_error(error, "ensemble_evaluation")
        
        if self.logger:
            self.logger.warning(f"Ensemble evaluation failed, using fallback score: {fallback_score}")
        
        error_info['fallback_score'] = fallback_score
        error_info['model_scores'] = model_scores
        
        return error_info
    
    def handle_low_confidence_evaluation(self, confidence, threshold, evaluation_data=None):
        """Handle low confidence evaluations"""
        context = f"low_confidence_evaluation:confidence={confidence:.4f},threshold={threshold}"
        
        error_info = {
            'error_type': 'LowConfidenceEvaluation',
            'error_message': f'Evaluation confidence {confidence:.4f} below threshold {threshold}',
            'context': context,
            'confidence': confidence,
            'threshold': threshold,
            'evaluation_data': evaluation_data or {}
        }
        
        if self.logger:
            self.logger.warning(f"Low confidence evaluation: {confidence:.4f} < {threshold}")
            self.logger.log_error_with_context(
                Exception(f"Low confidence: {confidence:.4f}"),
                error_info
            )
        
        return error_info

def get_error_handler(logger=None):
    """Factory function to get error handler instance"""
    return ErrorHandler(logger)

def with_timeout(timeout_seconds):
    """Decorator to add timeout to functions"""
    def decorator(func):
        @functools.wraps(func)
        def wrapper(*args, **kwargs):
            start_time = time.time()
            try:
                result = func(*args, **kwargs)
                elapsed = time.time() - start_time
                if elapsed > timeout_seconds:
                    raise TimeoutError(f"Function {func.__name__} took {elapsed:.2f}s, exceeding timeout of {timeout_seconds}s")
                return result
            except Exception as e:
                elapsed = time.time() - start_time
                raise Exception(f"Function {func.__name__} failed after {elapsed:.2f}s: {str(e)}")
        return wrapper
    return decorator

def safe_execute(func, default_return=None, error_handler=None):
    """Safely execute a function with error handling"""
    def wrapper(*args, **kwargs):
        try:
            return func(*args, **kwargs)
        except Exception as e:
            if error_handler:
                error_handler.handle_error(e, f"safe_execute:{func.__name__}")
            return default_return
    return wrapper

class RetryHandler:
    def __init__(self, max_retries=3, delay=1.0):
        self.max_retries = max_retries
        self.delay = delay
    
    def retry(self, func):
        """Decorator to retry function on failure"""
        @functools.wraps(func)
        def wrapper(*args, **kwargs):
            last_exception = None
            
            for attempt in range(self.max_retries + 1):
                try:
                    return func(*args, **kwargs)
                except Exception as e:
                    last_exception = e
                    if attempt < self.max_retries:
                        time.sleep(self.delay * (attempt + 1))  # Exponential backoff
                    else:
                        raise last_exception
            
            return None
        return wrapper