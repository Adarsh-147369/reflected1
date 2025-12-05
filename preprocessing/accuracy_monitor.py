import time
from collections import deque

class AccuracyMonitor:
    def __init__(self, window_size=100):
        self.window_size = window_size
        self.scores = deque(maxlen=window_size)
        self.timestamps = deque(maxlen=window_size)
        self.confidence_scores = deque(maxlen=window_size)
        
    def monitor(self, score, confidence=1.0):
        """Monitor and record score"""
        current_time = time.time()
        
        self.scores.append(score)
        self.timestamps.append(current_time)
        self.confidence_scores.append(confidence)
        
        return self.get_statistics()
    
    def get_statistics(self):
        """Get current monitoring statistics"""
        if not self.scores:
            return {
                'count': 0,
                'average_score': 0.0,
                'min_score': 0.0,
                'max_score': 0.0,
                'average_confidence': 0.0,
                'score_variance': 0.0
            }
        
        scores_list = list(self.scores)
        confidence_list = list(self.confidence_scores)
        
        avg_score = sum(scores_list) / len(scores_list)
        avg_confidence = sum(confidence_list) / len(confidence_list)
        
        # Calculate variance
        variance = sum((score - avg_score) ** 2 for score in scores_list) / len(scores_list)
        
        return {
            'count': len(scores_list),
            'average_score': round(avg_score, 4),
            'min_score': round(min(scores_list), 4),
            'max_score': round(max(scores_list), 4),
            'average_confidence': round(avg_confidence, 4),
            'score_variance': round(variance, 4),
            'window_size': self.window_size
        }
    
    def get_recent_trend(self, n=10):
        """Get trend of recent n scores"""
        if len(self.scores) < n:
            return "insufficient_data"
        
        recent_scores = list(self.scores)[-n:]
        first_half = recent_scores[:n//2]
        second_half = recent_scores[n//2:]
        
        avg_first = sum(first_half) / len(first_half)
        avg_second = sum(second_half) / len(second_half)
        
        if avg_second > avg_first + 0.05:
            return "improving"
        elif avg_second < avg_first - 0.05:
            return "declining"
        else:
            return "stable"
    
    def is_anomaly(self, score, threshold=2.0):
        """Check if score is an anomaly based on historical data"""
        if len(self.scores) < 10:  # Need sufficient data
            return False
        
        scores_list = list(self.scores)
        avg_score = sum(scores_list) / len(scores_list)
        variance = sum((s - avg_score) ** 2 for s in scores_list) / len(scores_list)
        std_dev = variance ** 0.5
        
        # Check if score is more than threshold standard deviations away
        return abs(score - avg_score) > (threshold * std_dev)
    
    def reset(self):
        """Reset monitoring data"""
        self.scores.clear()
        self.timestamps.clear()
        self.confidence_scores.clear()