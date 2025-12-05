import math

class ScoringAlgorithm:
    def __init__(self, scoring_config=None):
        self.scoring_config = scoring_config or {}
        self.score_ranges = {
            'excellent': (0.9, 1.0),
            'good': (0.7, 0.9),
            'average': (0.5, 0.7),
            'poor': (0.3, 0.5),
            'very_poor': (0.0, 0.3)
        }
        self.max_score = 6.0  # Maximum score out of 6
    
    def calculate_final_score(self, ensemble_score, concept_coverage, key_concepts_present, total_key_concepts):
        """
        Calculate final score with concept coverage bonus
        
        Args:
            ensemble_score: Weighted score from ensemble evaluation (0-1)
            concept_coverage: Percentage of concepts covered (0-1)
            key_concepts_present: Number of key concepts found
            total_key_concepts: Total number of key concepts expected
            
        Returns:
            Dictionary with similarity, score, confidence, and breakdown
        """
        # Apply concept coverage bonus (up to 15% boost)
        concept_bonus = concept_coverage * 0.15
        
        # Calculate adjusted similarity
        adjusted_similarity = ensemble_score + concept_bonus
        adjusted_similarity = min(adjusted_similarity, 1.0)
        
        # Apply partial credit for low scores
        if adjusted_similarity < 0.5:
            # Give some partial credit if at least some concepts are present
            if key_concepts_present > 0:
                partial_credit = (key_concepts_present / total_key_concepts) * 0.3
                adjusted_similarity = max(adjusted_similarity, partial_credit)
        
        # Calculate confidence based on concept coverage and score consistency
        confidence = self._calculate_confidence(
            ensemble_score, 
            concept_coverage, 
            key_concepts_present, 
            total_key_concepts
        )
        
        # Convert to score out of 6
        final_score = round(adjusted_similarity * self.max_score, 2)
        final_score = max(0.0, min(self.max_score, final_score))
        
        # Build breakdown
        breakdown = {
            'ensemble_score': round(ensemble_score, 4),
            'concept_coverage': round(concept_coverage, 4),
            'concept_bonus': round(concept_bonus, 4),
            'adjusted_similarity': round(adjusted_similarity, 4),
            'final_score': final_score,
            'confidence': round(confidence, 4),
            'key_concepts_present': key_concepts_present,
            'total_key_concepts': total_key_concepts
        }
        
        return {
            'similarity': adjusted_similarity,
            'score': final_score,
            'confidence': confidence,
            'breakdown': breakdown
        }
    
    def _calculate_confidence(self, ensemble_score, concept_coverage, key_concepts_present, total_key_concepts):
        """Calculate confidence score based on multiple factors"""
        # Base confidence from ensemble score
        base_confidence = 0.7
        
        # Boost confidence if concept coverage is high
        if concept_coverage > 0.8:
            base_confidence += 0.2
        elif concept_coverage > 0.6:
            base_confidence += 0.1
        
        # Reduce confidence if scores are very low
        if ensemble_score < 0.3:
            base_confidence -= 0.2
        
        # Reduce confidence if no key concepts found
        if key_concepts_present == 0 and total_key_concepts > 0:
            base_confidence -= 0.3
        
        return max(0.3, min(1.0, base_confidence))
    
    def calculate_score(self, similarity, context_weight=1.0, confidence=1.0):
        """Calculate final score with adjustments (legacy method)"""
        if similarity is None or similarity < 0:
            return 0.0
        
        # Apply context weight
        adjusted_score = similarity * context_weight
        
        # Apply confidence adjustment
        confidence_factor = max(0.5, confidence)  # Minimum 50% confidence
        final_score = adjusted_score * confidence_factor
        
        # Normalize to 0-1 range
        final_score = min(max(final_score, 0.0), 1.0)
        
        return final_score
    
    def get_score_category(self, score):
        """Get categorical score description"""
        for category, (min_score, max_score) in self.score_ranges.items():
            if min_score <= score <= max_score:
                return category
        return 'unknown'
    
    def calculate_percentage(self, score):
        """Convert score to percentage"""
        return round(score * 100, 2)
    
    def apply_penalty(self, score, penalty_factor=0.1):
        """Apply penalty for various factors"""
        return max(0.0, score - penalty_factor)
    
    def apply_bonus(self, score, bonus_factor=0.1):
        """Apply bonus for various factors"""
        return min(1.0, score + bonus_factor)
    
    def normalize_score(self, raw_score, min_expected=0.0, max_expected=1.0):
        """Normalize score to expected range"""
        if max_expected == min_expected:
            return 0.5
        
        normalized = (raw_score - min_expected) / (max_expected - min_expected)
        return min(max(normalized, 0.0), 1.0)