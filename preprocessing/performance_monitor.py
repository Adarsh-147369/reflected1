import time
import psutil
import threading
from collections import defaultdict, deque

class PerformanceMonitor:
    def __init__(self):
        self.metrics = defaultdict(list)
        self.active_timers = {}
        self.request_times = deque(maxlen=1000)  # Keep last 1000 requests
        self.start_time = time.time()
        
    def start_timer(self, operation_name):
        """Start timing an operation"""
        self.active_timers[operation_name] = time.time()
        return operation_name
    
    def start_request(self):
        """Start tracking a request and return a request ID"""
        request_id = f"req_{int(time.time() * 1000)}"
        self.active_timers[request_id] = time.time()
        return request_id
    
    def end_request(self, request_id, status_code=200):
        """End tracking a request and record its performance"""
        if request_id in self.active_timers:
            duration = time.time() - self.active_timers[request_id]
            self.record_request(duration, status_code)
            del self.active_timers[request_id]
            return duration
        return None
    
    def end_timer(self, operation_name):
        """End timing an operation and record the duration"""
        if operation_name in self.active_timers:
            duration = time.time() - self.active_timers[operation_name]
            self.metrics[operation_name].append(duration)
            del self.active_timers[operation_name]
            return duration
        return None
    
    def record_request(self, duration, status_code=200):
        """Record request performance"""
        self.request_times.append({
            'duration': duration,
            'status_code': status_code,
            'timestamp': time.time()
        })
    
    def record_memory_usage(self):
        """Record current memory usage"""
        try:
            memory = psutil.virtual_memory()
            return {
                'percent': memory.percent,
                'available_mb': memory.available / (1024 * 1024),
                'used_mb': memory.used / (1024 * 1024)
            }
        except Exception:
            return {
                'percent': 0,
                'available_mb': 0,
                'used_mb': 0
            }
    
    def get_system_metrics(self):
        """Get current system performance metrics"""
        try:
            cpu_percent = psutil.cpu_percent(interval=0.1)
            memory = psutil.virtual_memory()
            disk = psutil.disk_usage('/')
            
            return {
                'cpu_percent': cpu_percent,
                'memory_percent': memory.percent,
                'memory_available_mb': memory.available / (1024 * 1024),
                'disk_percent': disk.percent,
                'disk_free_gb': disk.free / (1024 * 1024 * 1024)
            }
        except Exception:
            return {
                'cpu_percent': 0,
                'memory_percent': 0,
                'memory_available_mb': 0,
                'disk_percent': 0,
                'disk_free_gb': 0
            }
    
    def get_performance_stats(self):
        """Get performance statistics"""
        stats = {}
        
        # Operation timing stats
        for operation, times in self.metrics.items():
            if times:
                stats[operation] = {
                    'count': len(times),
                    'avg_duration': sum(times) / len(times),
                    'min_duration': min(times),
                    'max_duration': max(times),
                    'total_duration': sum(times)
                }
        
        # Request stats
        if self.request_times:
            recent_requests = list(self.request_times)
            durations = [req['duration'] for req in recent_requests]
            
            stats['requests'] = {
                'count': len(recent_requests),
                'avg_response_time': sum(durations) / len(durations),
                'min_response_time': min(durations),
                'max_response_time': max(durations),
                'requests_per_minute': self._calculate_rpm()
            }
        
        # System stats
        stats['system'] = self.get_system_metrics()
        
        # Uptime
        stats['uptime_seconds'] = time.time() - self.start_time
        
        return stats
    
    def _calculate_rpm(self):
        """Calculate requests per minute"""
        if not self.request_times:
            return 0
        
        current_time = time.time()
        one_minute_ago = current_time - 60
        
        recent_requests = [
            req for req in self.request_times 
            if req['timestamp'] > one_minute_ago
        ]
        
        return len(recent_requests)
    
    def get_health_status(self):
        """Get overall health status"""
        system_metrics = self.get_system_metrics()
        
        # Define health thresholds
        cpu_threshold = 80
        memory_threshold = 85
        disk_threshold = 90
        
        health_issues = []
        
        if system_metrics['cpu_percent'] > cpu_threshold:
            health_issues.append(f"High CPU usage: {system_metrics['cpu_percent']:.1f}%")
        
        if system_metrics['memory_percent'] > memory_threshold:
            health_issues.append(f"High memory usage: {system_metrics['memory_percent']:.1f}%")
        
        if system_metrics['disk_percent'] > disk_threshold:
            health_issues.append(f"Low disk space: {system_metrics['disk_percent']:.1f}% used")
        
        status = "healthy" if not health_issues else "warning"
        
        return {
            'status': status,
            'issues': health_issues,
            'uptime_seconds': time.time() - self.start_time,
            'system_metrics': system_metrics
        }
    
    def reset_metrics(self):
        """Reset all metrics"""
        self.metrics.clear()
        self.active_timers.clear()
        self.request_times.clear()
    
    def log_performance_metrics(self):
        """Log current performance metrics"""
        stats = self.get_performance_stats()
        print(f"Performance Stats: {stats}")
        return stats
    
    def get_component_breakdown(self):
        """Get breakdown of performance by component"""
        breakdown = {}
        for operation, times in self.metrics.items():
            if times:
                breakdown[operation] = {
                    'count': len(times),
                    'avg_duration': sum(times) / len(times),
                    'total_duration': sum(times)
                }
        return breakdown
    
    def check_performance_thresholds(self):
        """Check if any performance thresholds are violated"""
        thresholds = {
            'max_response_time': 5.0,  # 5 seconds
            'max_avg_response_time': 2.0,  # 2 seconds average
            'max_memory_percent': 90.0  # 90% memory usage
        }
        
        violations = []
        
        # Check response times
        if self.request_times:
            recent_requests = list(self.request_times)
            durations = [req['duration'] for req in recent_requests]
            
            max_duration = max(durations) if durations else 0
            avg_duration = sum(durations) / len(durations) if durations else 0
            
            if max_duration > thresholds['max_response_time']:
                violations.append(f"Max response time exceeded: {max_duration:.2f}s")
            
            if avg_duration > thresholds['max_avg_response_time']:
                violations.append(f"Average response time exceeded: {avg_duration:.2f}s")
        
        # Check memory
        system_metrics = self.get_system_metrics()
        if system_metrics['memory_percent'] > thresholds['max_memory_percent']:
            violations.append(f"Memory usage high: {system_metrics['memory_percent']:.1f}%")
        
        return {
            'has_violations': len(violations) > 0,
            'violations': violations,
            'thresholds': thresholds
        }
    
    def record_evaluation_time(self, duration_ms, stage):
        """Record evaluation time for a specific stage"""
        stage_key = f"evaluation_{stage}"
        if stage_key not in self.metrics:
            self.metrics[stage_key] = []
        self.metrics[stage_key].append(duration_ms / 1000)  # Convert to seconds

def get_performance_monitor():
    """Factory function to get performance monitor instance"""
    return PerformanceMonitor()