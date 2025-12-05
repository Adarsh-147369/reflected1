import numpy as np
import time

class EnsembleEvaluator:
    def __init__(self, model_configs=None):
        self.model_configs = model_configs or {}
        self.weights = {
            'semantic': 0.6,
            'keyword': 0.2,
            'length': 0.1,
            'structure': 0.1
        }
    
    def ensemble_evaluate(self, model_answer, student_answer):
        """
        Ensemble evaluation combining multiple metrics
        Returns a dictionary with scores and metadata
        """
        start_time = time.time()
        
        if not model_answer or not student_answer:
            return {
                'weighted_score': 0.0,
                'confidence': 0.0,
                'model_scores': {},
                'variance': 0.0,
                'processing_time_ms': 0.0
            }
        
        # Calculate individual scores
        semantic_score = self._calculate_semantic_similarity(model_answer, student_answer)
        keyword_score = self._calculate_keyword_similarity(model_answer, student_answer)
        length_score = self._calculate_length_similarity(model_answer, student_answer)
        structure_score = self._calculate_structure_similarity(model_answer, student_answer)
        
        # Store model scores
        model_scores = {
            'semantic_similarity': semantic_score,
            'keyword_matching': keyword_score,
            'length_similarity': length_score,
            'structure_similarity': structure_score
        }
        
        # Calculate weighted ensemble score
        weighted_score = (
            semantic_score * self.weights['semantic'] +
            keyword_score * self.weights['keyword'] +
            length_score * self.weights['length'] +
            structure_score * self.weights['structure']
        )
        
        weighted_score = min(max(weighted_score, 0.0), 1.0)
        
        # Calculate variance (measure of agreement between models)
        scores_array = [semantic_score, keyword_score, length_score, structure_score]
        variance = np.var(scores_array) if len(scores_array) > 1 else 0.0
        
        # Calculate confidence (inverse of variance, normalized)
        # Low variance = high confidence
        confidence = 1.0 - min(variance, 1.0)
        confidence = max(0.5, confidence)  # Minimum confidence of 0.5
        
        processing_time_ms = (time.time() - start_time) * 1000
        
        return {
            'weighted_score': weighted_score,
            'confidence': confidence,
            'model_scores': model_scores,
            'variance': variance,
            'processing_time_ms': processing_time_ms
        }
    
    def evaluate(self, model_answer, student_answer):
        """Legacy method for backward compatibility"""
        result = self.ensemble_evaluate(model_answer, student_answer)
        return result['weighted_score']
    
    def _calculate_semantic_similarity(self, text1, text2):
        """Basic semantic similarity (placeholder)"""
        words1 = set(text1.lower().split())
        words2 = set(text2.lower().split())
        
        if not words1 or not words2:
            return 0.0
        
        intersection = len(words1.intersection(words2))
        union = len(words1.union(words2))
        
        return intersection / union if union > 0 else 0.0
    
    def _calculate_keyword_similarity(self, text1, text2):
        """Keyword-based similarity"""
        words1 = text1.lower().split()
        words2 = text2.lower().split()
        
        if not words1 or not words2:
            return 0.0
        
        matches = sum(1 for word in words1 if word in words2)
        return matches / max(len(words1), len(words2))
    
    def _calculate_length_similarity(self, text1, text2):
        """Length-based similarity"""
        len1, len2 = len(text1.split()), len(text2.split())
        if len1 == 0 and len2 == 0:
            return 1.0
        if len1 == 0 or len2 == 0:
            return 0.0
        
        ratio = min(len1, len2) / max(len1, len2)
        return ratio
    
    def _calculate_structure_similarity(self, text1, text2):
        """Structure-based similarity (sentences, punctuation)"""
        sentences1 = len([s for s in text1.split('.') if s.strip()])
        sentences2 = len([s for s in text2.split('.') if s.strip()])
        
        if sentences1 == 0 and sentences2 == 0:
            return 1.0
        if sentences1 == 0 or sentences2 == 0:
            return 0.5
        
        ratio = min(sentences1, sentences2) / max(sentences1, sentences2)
        return ratio
    
    def get_model_info(self):
        """Get information about the ensemble models"""
        return {
            'weights': self.weights,
            'model_configs': self.model_configs,
            'available_metrics': ['semantic', 'keyword', 'length', 'structure']
        }